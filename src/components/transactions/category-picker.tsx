import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { activeCategories, type Category } from "@/lib/finance/categories";
import { cn } from "@/lib/utils";

export function CategoryPicker({
  categories,
  kind,
  value,
  onChange,
  recentIds = [],
  frequentIds = [],
}: {
  categories: Category[];
  kind: "expense" | "income";
  value: string | undefined;
  onChange: (id: string) => void;
  recentIds?: string[];
  frequentIds?: string[];
}) {
  const [query, setQuery] = useState("");
  const all = useMemo(() => activeCategories(categories, kind), [categories, kind]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? all.filter((c) => c.name.toLowerCase().includes(q)) : all;
  }, [all, query]);

  const byId = (ids: string[]) =>
    ids.map((id) => all.find((c) => c.id === id)).filter((c): c is Category => Boolean(c));

  const recent = byId(recentIds);
  const frequent = byId(frequentIds).filter((c) => !recentIds.includes(c.id));

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Procurar categoria"
          aria-label="Procurar categoria"
        />
      </div>

      {!query && recent.length > 0 ? (
        <Group title="Usados recentemente" items={recent} value={value} onChange={onChange} />
      ) : null}
      {!query && frequent.length > 0 ? (
        <Group title="Mais usados" items={frequent} value={value} onChange={onChange} />
      ) : null}
      <Group title={query ? "Resultados" : "Todas"} items={filtered} value={value} onChange={onChange} />
    </div>
  );
}

function Group({
  title,
  items,
  value,
  onChange,
}: {
  title: string;
  items: Category[];
  value: string | undefined;
  onChange: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((category) => (
          <button
            key={category.id}
            type="button"
            aria-pressed={value === category.id}
            onClick={() => onChange(category.id)}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
              value === category.id
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-surface text-foreground hover:border-muted-foreground/40",
            )}
          >
            <span aria-hidden>{category.icon}</span>
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}
