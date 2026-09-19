import { useEffect, useState } from "react";
import { APP_QUOTES } from "@/lib/brand";
import { cn } from "@/lib/utils";

const ROTATE_MS = 5000;

/**
 * Rotates through the brand lines with a soft crossfade — one at a time,
 * calm, never bouncing the layout around.
 */
export function BrandQuote({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % APP_QUOTES.length);
        setVisible(true);
      }, 350);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <p
      className={cn(
        "transition-opacity duration-500",
        visible ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      {APP_QUOTES[index]}
    </p>
  );
}
