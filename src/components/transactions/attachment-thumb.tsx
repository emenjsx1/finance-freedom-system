import { useEffect, useState } from "react";
import { FileText } from "lucide-react";

import { attachmentUrl } from "@/lib/attachments/storage";
import type { Attachment } from "@/lib/finance/ledger-types";

/** Thumbnail that resolves a private receipt through a short-lived signed URL. */
export function AttachmentThumb({
  attachment,
  className = "size-10 rounded-lg object-cover",
}: {
  attachment: Attachment;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(attachment.dataUrl ?? null);

  useEffect(() => {
    let active = true;
    if (attachment.dataUrl) {
      setUrl(attachment.dataUrl);
      return;
    }
    if (!attachment.storagePath) return;
    void attachmentUrl(attachment.storagePath).then((signed) => {
      if (active) setUrl(signed);
    });
    return () => {
      active = false;
    };
  }, [attachment.dataUrl, attachment.storagePath]);

  if (!url) {
    return (
      <span className={`flex items-center justify-center bg-muted ${className}`}>
        <FileText className="size-4 text-muted-foreground" aria-hidden />
      </span>
    );
  }
  return <img src={url} alt={attachment.name} className={className} loading="lazy" />;
}
