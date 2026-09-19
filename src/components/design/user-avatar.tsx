import { cn } from "@/lib/utils";

/** Photo when the person has one, elegant initials otherwise. */
export function UserAvatar({
  name,
  email,
  imageUrl,
  size = "md",
  className,
}: {
  name?: string | null;
  email?: string | null;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = computeInitials(name, email);
  const sizing =
    size === "lg"
      ? "size-16 text-lg"
      : size === "sm"
        ? "size-8 text-[0.6875rem]"
        : "size-10 text-[0.8125rem]";

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name ? `Fotografia de ${name}` : "Fotografia de perfil"}
        className={cn("shrink-0 rounded-full object-cover", sizing, className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-accent font-semibold tracking-tight text-accent-foreground",
        sizing,
        className,
      )}
    >
      {initials}
    </span>
  );
}

function computeInitials(name?: string | null, email?: string | null): string {
  const source = (name ?? "").trim() || (email ?? "").split("@")[0] || "";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "•";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
