import { useRef, useState } from "react";
import { Camera, FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { newId } from "@/hooks/use-ledger";
import type { Attachment } from "@/lib/finance/ledger-types";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

export function AttachmentsField({
  value,
  onChange,
}: {
  value: Attachment[];
  onChange: (next: Attachment[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    try {
      const next: Attachment[] = [];
      for (const file of Array.from(list)) {
        if (!ALLOWED.includes(file.type)) {
          toast.error("Tipo de ficheiro não suportado.");
          continue;
        }
        if (file.size > MAX_BYTES) {
          toast.error("O ficheiro é demasiado grande (máx. 2 MB).");
          continue;
        }
        const dataUrl = await readAsDataUrl(file);
        next.push({ id: newId(), name: file.name, size: file.size, mime: file.type, dataUrl });
      }
      if (next.length) onChange([...value, ...next]);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Recibo <span className="font-normal normal-case">(opcional)</span>
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm"
        >
          <Camera className="size-4" /> Tirar foto
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm"
        >
          <Upload className="size-4" /> Carregar
        </button>
      </div>
      {busy ? <p className="text-xs text-muted-foreground">A carregar…</p> : null}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={fileRef}
        type="file"
        accept={ALLOWED.join(",")}
        multiple
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {value.length > 0 ? (
        <ul className="space-y-2">
          {value.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface p-2"
            >
              {attachment.mime.startsWith("image/") && attachment.dataUrl ? (
                <img src={attachment.dataUrl} alt={attachment.name} className="size-10 rounded-lg object-cover" />
              ) : (
                <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <FileText className="size-4 text-muted-foreground" />
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm">{attachment.name}</span>
              <button
                type="button"
                aria-label={`Remover ${attachment.name}`}
                onClick={() => onChange(value.filter((a) => a.id !== attachment.id))}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Paperclip className="size-3" /> Imagem ou PDF até 2 MB.
        </p>
      )}
    </div>
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
