import markUrl from "@/assets/brand-mark.png";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * The product mark is drawn, not an image: it inherits the current theme
 * (light/dark) and the accent colour the person chose in Aparência.
 */
export function BrandMark({
  size = "md",
  showName = true,
  className,
}: {
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  className?: string;
}) {
  const box = size === "lg" ? "h-10 w-10" : size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const text =
    size === "lg" ? "text-[1.6rem]" : size === "sm" ? "text-[1.0625rem]" : "text-[1.25rem]";

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex items-center justify-center rounded-[32%] bg-primary text-primary-foreground",
          box,
        )}
      >
        <span
          className="h-[66%] w-[66%] bg-current"
          style={{
            WebkitMaskImage: `url(${markUrl})`,
            maskImage: `url(${markUrl})`,
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
          }}
        />
      </span>
      {showName ? (
        <span className={cn("font-semibold tracking-[-0.02em] text-foreground", text)}>
          {APP_NAME}
        </span>
      ) : null}
      <span className="sr-only">{APP_NAME}</span>
    </span>
  );
}
