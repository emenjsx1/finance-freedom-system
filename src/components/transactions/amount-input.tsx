import { useMemo } from "react";

import { getCurrency } from "@/lib/finance/currency";
import { cn } from "@/lib/utils";

/**
 * Premium amount entry. Keeps a raw digit string in minor units so no
 * floating point ever touches the value, and formats it for display.
 */
export function AmountInput({
  valueMinor,
  onChange,
  currencyCode,
  label,
  tone = "neutral",
}: {
  valueMinor: number;
  onChange: (minor: number) => void;
  currencyCode: string;
  label: string;
  tone?: "neutral" | "income" | "expense";
}) {
  const currency = getCurrency(currencyCode);

  const display = useMemo(() => {
    const units = valueMinor / 10 ** currency.decimals;
    return new Intl.NumberFormat(currency.locale, {
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
    }).format(units);
  }, [valueMinor, currency]);

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 12);
    onChange(digits ? Number(digits) : 0);
  }

  const toneClass =
    tone === "income" ? "text-income" : tone === "expense" ? "text-expense" : "text-foreground";

  return (
    <div className="rounded-2xl border border-border/70 bg-surface px-5 py-6 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline justify-center gap-2">
        <input
          aria-label={label}
          inputMode="numeric"
          autoComplete="off"
          value={display}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          className={cn(
            "numeric w-full bg-transparent text-center text-4xl font-semibold outline-none",
            toneClass,
          )}
        />
      </div>
      <p className="mt-1 text-sm font-medium text-muted-foreground">{currency.code}</p>
    </div>
  );
}
