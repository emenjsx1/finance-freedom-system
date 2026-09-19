import { useEffect, useState } from "react";
import { Download, Trash2, X } from "lucide-react";

import { attachmentUrl } from "@/lib/attachments/storage";
import type { Attachment } from "@/lib/finance/ledger-types";

/** Full-screen viewer with pinch/scroll zoom, export and delete. */
export function AttachmentViewer({
  attachment,
  onClose,
  onDelete,
}: {
  attachment: Attachment | null;
  onClose: () => void;
  onDelete?: (attachment: Attachment) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setUrl(null);
    if (!attachment) return;
    if (attachment.dataUrl) {
      setUrl(attachment.dataUrl);
      return;
    }
    if (attachment.storagePath) {
      void attachmentUrl(attachment.storagePath).then((signed) => {
        if (active) setUrl(signed);
      });
    }
    return () => {
      active = false;
    };
  }, [attachment]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!attachment) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Comprovativo ${attachment.name}`}
      className="fixed inset-0 z-50 flex flex-col bg-foreground/95 backdrop-blur"
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(env(safe-area-inset-top),1rem)]">
        <button type="button" onClick={onClose} aria-label="Fechar" className="text-background">
          <X className="size-6" aria-hidden />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-sm text-background/80">{attachment.name}</p>
        <div className="flex items-center gap-4">
          {url ? (
            <a href={url} download={attachment.name} aria-label="Guardar ficheiro" className="text-background">
              <Download className="size-5" aria-hidden />
            </a>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              aria-label="Eliminar comprovativo"
              onClick={() => onDelete(attachment)}
              className="text-background"
            >
              <Trash2 className="size-5" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
        {!url ? (
          <p className="pt-10 text-center text-sm text-background/70">A abrir…</p>
        ) : attachment.mime === "application/pdf" ? (
          <iframe src={url} title={attachment.name} className="h-full w-full rounded-xl bg-background" />
        ) : (
          <img
            src={url}
            alt={attachment.name}
            className="mx-auto max-w-none touch-pinch-zoom rounded-xl"
            style={{ maxHeight: "100%" }}
          />
        )}
      </div>
    </div>
  );
}
