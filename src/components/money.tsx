import { useSetup } from "@/hooks/use-setup";
import { formatMoney, getCurrency, type FormatMoneyOptions } from "@/lib/finance/currency";
import { cn } from "@/lib/utils";

const MASK = "••••••";

/** Privacy-aware money label. Every monetary value in the app renders through this. */
export function Money({
  minor,
  currency,
  className,
  options,
}: {
  minor: number;
  currency?: string | undefined;
  className?: string | undefined;
  options?: FormatMoneyOptions | undefined;
}) {
  const { setup } = useSetup();
  const code = currency ?? setup.currencyCode;

  if (setup.privacyMode) {
    return (
      <span className={cn(className)} aria-label="Valor oculto">
        {MASK} {getCurrency(code).symbol}
      </span>
    );
  }

  return (
    <span className={cn("numeric", className)}>{formatMoney(minor, code, options ?? {})}</span>
  );
}

/** For places that need a string (inputs, labels, aria text). */
export function useMoneyFormatter() {
  const { setup } = useSetup();
  return (minor: number, currency?: string, options?: FormatMoneyOptions) => {
    const code = currency ?? setup.currencyCode;
    if (setup.privacyMode) return `${MASK} ${getCurrency(code).symbol}`;
    return formatMoney(minor, code, options ?? {});
  };
}
