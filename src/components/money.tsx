import { usePrefs } from "@/hooks/use-prefs";
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
  const { prefs } = usePrefs();
  const code = currency ?? setup.currencyCode;
  const resolved: FormatMoneyOptions = {
    ...(prefs.showCurrencyCode ? {} : { withSymbol: false }),
    ...(options ?? {}),
  };

  if (setup.privacyMode) {
    return (
      <span className={cn(className)} aria-label="Valor oculto">
        {MASK} {getCurrency(code).symbol}
      </span>
    );
  }

  return (
    <span className={cn("numeric", className)}>{formatMoney(minor, code, resolved)}</span>
  );
}

/** For places that need a string (inputs, labels, aria text). */
export function useMoneyFormatter() {
  const { setup } = useSetup();
  const { prefs } = usePrefs();
  return (minor: number, currency?: string, options?: FormatMoneyOptions) => {
    const code = currency ?? setup.currencyCode;
    if (setup.privacyMode) return `${MASK} ${getCurrency(code).symbol}`;
    return formatMoney(minor, code, {
      ...(prefs.showCurrencyCode ? {} : { withSymbol: false }),
      ...(options ?? {}),
    });
  };
}
