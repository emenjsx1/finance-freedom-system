import { supabase } from "@/integrations/supabase/client";
import type { Attachment } from "@/lib/finance/ledger-types";

export const ATTACHMENT_BUCKET = "receipts";
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
];

function extensionFor(file: File): string {
  const fromName = file.name.includes(".") ? file.name.split(".").pop() : null;
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type === "application/pdf" ? "pdf" : "jpg";
}

/**
 * Receipts are private: they live under `<user-id>/…` in a non-public bucket
 * and are only ever read back through short-lived signed URLs.
 */
export async function uploadAttachment(
  file: File,
  transactionId: string,
): Promise<{ attachment: Attachment } | { error: string }> {
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    return { error: "Tipo de ficheiro não suportado. Usa imagem ou PDF." };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { error: "O ficheiro é demasiado grande (máx. 10 MB)." };
  }

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { error: "Inicia sessão para guardar comprovativos." };

  const path = `${userId}/${transactionId}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const upload = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upload.error) return { error: "Não foi possível carregar o ficheiro." };

  const row = await supabase
    .from("attachments")
    .insert({
      user_id: userId,
      transaction_id: transactionId,
      storage_path: path,
      mime_type: file.type,
      file_size: file.size,
      original_name: file.name,
    })
    .select("id")
    .single();

  if (row.error || !row.data) {
    await supabase.storage.from(ATTACHMENT_BUCKET).remove([path]);
    return { error: "Não foi possível guardar o comprovativo." };
  }

  return {
    attachment: {
      id: row.data.id,
      name: file.name,
      size: file.size,
      mime: file.type,
      storagePath: path,
    },
  };
}

/** Short-lived read link; never a public URL. */
export async function attachmentUrl(storagePath: string, seconds = 300): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(storagePath, seconds);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function deleteAttachment(attachment: Attachment): Promise<boolean> {
  if (!attachment.storagePath) return true;
  const { error } = await supabase.from("attachments").delete().eq("id", attachment.id);
  if (error) return false;
  await supabase.storage.from(ATTACHMENT_BUCKET).remove([attachment.storagePath]);
  return true;
}
