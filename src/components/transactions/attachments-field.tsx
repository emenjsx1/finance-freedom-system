import { useRef, useState } from "react";
import { Camera, FileText, Image as ImageIcon, Paperclip, Trash2, Upload } from "lucide-react";

import { AttachmentThumb } from "@/components/transactions/attachment-thumb";
import { AttachmentViewer } from "@/components/transactions/attachment-viewer";
import { useAuth } from "@/hooks/use-auth";
import { newId } from "@/hooks/use-ledger";
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
  deleteAttachment,
  uploadAttachment,
} from "@/lib/attachments/storage";
import type { Attachment } from "@/lib/finance/ledger-types";
import { notifyError } from "@/lib/ui/feedback";

/**
 * Receipts and proofs. When signed in the file goes straight into private
 * storage; offline/signed-out it stays on the device as a local preview.
 * The camera is only opened when the person chooses "Tirar foto", so the
 * permission prompt appears just in time.
 */
export function AttachmentsField({
  value,
  onChange,
  transactionId,
}: {
  value: Attachment[];
  onChange: (next: Attachment[]) => void;
  transactionId?: string;
}) {
  const { session } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<Attachment | null>(null);

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    try {
      const next: Attachment[] = [];
      for (const file of Array.from(list)) {
        if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
          notifyError("Tipo de ficheiro não suportado. Usa imagem ou PDF.");
          continue;
        }
        if (file.size > MAX_ATTACHMENT_BYTES) {
          notifyError("O ficheiro é demasiado grande (máx. 10 MB).");
          continue;
        }

        if (session) {
          const result = await uploadAttachment(file, transactionId ?? "rascunho");
          if ("error" in result) {
            notifyError(result.error);
            continue;
          }
          next.push(result.attachment);
        } else {
          const dataUrl = await readAsDataUrl(file);
          next.push({ id: newId(), name: file.name, size: file.size, mime: file.type, dataUrl });
        }
      }
      if (next.length) onChange([...value, ...next]);
    } finally {
      setBusy(false);
      for (const ref of [fileRef, photoRef, cameraRef]) {
        if (ref.current) ref.current.value = "";
      }
    }
  }

  async function remove(attachment: Attachment) {
    if (attachment.storagePath) {
      const ok = await deleteAttachment(attachment);
      if (!ok) {
        notifyError("Não foi possível eliminar o comprovativo.");
        return;
      }
    }
    onChange(value.filter((a) => a.id !== attachment.id));
    setViewing(null);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Comprovativo <span className="font-normal normal-case">(opcional)</span>
      </p>

      <div className="flex gap-2">
        <ChoiceButton icon={Camera} label="Tirar foto" onClick={() => cameraRef.current?.click()} />
        <ChoiceButton icon={ImageIcon} label="Fotografia" onClick={() => photoRef.current?.click()} />
        <ChoiceButton icon={Upload} label="Ficheiro" onClick={() => fileRef.current?.click()} />
      </div>
      {busy ? <p className="text-xs text-muted-foreground">A carregar…</p> : null}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <input
        ref={fileRef}
        type="file"
        accept={ALLOWED_ATTACHMENT_TYPES.join(",")}
        multiple
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {value.length > 0 ? (
        <ul className="space-y-2">
          {value.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface p-2"
            >
              <button
                type="button"
                onClick={() => setViewing(attachment)}
                aria-label={`Abrir ${attachment.name}`}
                className="shrink-0"
              >
                {attachment.mime.startsWith("image/") ? (
                  <AttachmentThumb attachment={attachment} />
                ) : (
                  <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
                    <FileText className="size-4 text-muted-foreground" aria-hidden />
                  </span>
                )}
              </button>
              <span className="min-w-0 flex-1 truncate text-sm">{attachment.name}</span>
              <button
                type="button"
                aria-label={`Remover ${attachment.name}`}
                onClick={() => void remove(attachment)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Paperclip className="size-3" aria-hidden /> Imagem ou PDF até 10 MB, guardado só para ti.
        </p>
      )}

      <AttachmentViewer
        attachment={viewing}
        onClose={() => setViewing(null)}
        onDelete={(attachment) => void remove(attachment)}
      />
    </div>
  );
}

function ChoiceButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Camera;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-surface px-2 py-2.5 text-xs font-medium"
    >
      <Icon className="size-4" aria-hidden /> {label}
    </button>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}
