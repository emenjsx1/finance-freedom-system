import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { activeCategories, type Category } from "@/lib/finance/categories";
import type { TxKind } from "@/lib/finance/ledger-types";
import type { Account, AllocationRuleItem } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

export interface TxFilters {
  kinds: TxKind[];
  categoryIds: string[];
  accountIds: string[];
  bucketIds: string[];
  from?: string | undefined;
  to?: string | undefined;
  minMinor?: number | undefined;
  maxMinor?: number | undefined;
  tags: string[];
}

export const EMPTY_FILTERS: TxFilters = {
  kinds: [],
  categoryIds: [],
  accountIds: [],
  bucketIds: [],
  tags: [],
};

export function activeFilterCount(filters: TxFilters): number {
  let count = 0;
  if (filters.kinds.length) count++;
  if (filters.categoryIds.length) count++;
  if (filters.accountIds.length) count++;
  if (filters.bucketIds.length) count++;
  if (filters.from || filters.to) count++;
  if (filters.minMinor || filters.maxMinor) count++;
  if (filters.tags.length) count++;
  return count;
}

const KIND_LABELS: Record<TxKind, string> = {
  income: "Entrada",
  expense: "Despesa",
  transfer: "Transferência",
  reallocation: "Redistribuição",
  adjustment: "Ajuste de saldo",
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function isoDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function FilterSheet({
  filters,
  onChange,
  onClose,
  categories,
  accounts,
  buckets,
  allTags,
}: {
  filters: TxFilters;
  onChange: (filters: TxFilters) => void;
  onClose: () => void;
  categories: Category[];
  accounts: Account[];
  buckets: AllocationRuleItem[];
  allTags: string[];
}) {
  const set = (patch: Partial<TxFilters>) => onChange({ ...filters, ...patch });

  const quickRanges: { label: string; value: () => Partial<TxFilters> }[] = [
    { label: "Hoje", value: () => ({ from: new Date().toISOString().slice(0, 10), to: undefined }) },
    { label: "7 dias", value: () => ({ from: isoDaysAgo(7), to: undefined }) },
    { label: "30 dias", value: () => ({ from: isoDaysAgo(30), to: undefined }) },
    {
      label: "Este mês",
      value: () => {
        const now = new Date();
        return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10), to: undefined };
      },
    },
    {
      label: "Mês passado",
      value: () => {
        const now = new Date();
        return {
          from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10),
          to: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10),
        };
      },
    },
  ];

  return (
    <div className="space-y-5 pb-4">
      <Block title="Tipo">
        {(Object.keys(KIND_LABELS) as TxKind[]).map((kind) => (
          <Chip key={kind} active={filters.kinds.includes(kind)} onClick={() => set({ kinds: toggle(filters.kinds, kind) })}>
            {KIND_LABELS[kind]}
          </Chip>
        ))}
      </Block>

      <Block title="Período">
        {quickRanges.map((range) => (
          <Chip key={range.label} active={false} onClick={() => set(range.value())}>
            {range.label}
          </Chip>
        ))}
      </Block>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="from">De</Label>
          <Input id="from" type="date" value={filters.from ?? ""} onChange={(e) => set({ from: e.target.value || undefined })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">Até</Label>
          <Input id="to" type="date" value={filters.to ?? ""} onChange={(e) => set({ to: e.target.value || undefined })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="min">Valor mínimo</Label>
          <Input
            id="min"
            inputMode="numeric"
            value={filters.minMinor ? String(filters.minMinor / 100) : ""}
            onChange={(e) => set({ minMinor: e.target.value ? Number(e.target.value.replace(/\D/g, "")) * 100 : undefined })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="max">Valor máximo</Label>
          <Input
            id="max"
            inputMode="numeric"
            value={filters.maxMinor ? String(filters.maxMinor / 100) : ""}
            onChange={(e) => set({ maxMinor: e.target.value ? Number(e.target.value.replace(/\D/g, "")) * 100 : undefined })}
          />
        </div>
      </div>

      <Block title="Categoria">
        {[...activeCategories(categories, "expense"), ...activeCategories(categories, "income")].map((category) => (
          <Chip
            key={category.id}
            active={filters.categoryIds.includes(category.id)}
            onClick={() => set({ categoryIds: toggle(filters.categoryIds, category.id) })}
          >
            <span aria-hidden>{category.icon}</span> {category.name}
          </Chip>
        ))}
      </Block>

      <Block title="Conta">
        {accounts.map((account) => (
          <Chip
            key={account.id}
            active={filters.accountIds.includes(account.id)}
            onClick={() => set({ accountIds: toggle(filters.accountIds, account.id) })}
          >
            {account.name || "Conta"}
          </Chip>
        ))}
      </Block>

      <Block title="Propósito">
        {buckets.map((bucket) => (
          <Chip
            key={bucket.id}
            active={filters.bucketIds.includes(bucket.id)}
            onClick={() => set({ bucketIds: toggle(filters.bucketIds, bucket.id) })}
          >
            <span aria-hidden>{bucket.icon}</span> {bucket.name}
          </Chip>
        ))}
      </Block>

      {allTags.length ? (
        <Block title="Etiquetas">
          {allTags.map((tag) => (
            <Chip key={tag} active={filters.tags.includes(tag)} onClick={() => set({ tags: toggle(filters.tags, tag) })}>
              #{tag}
            </Chip>
          ))}
        </Block>
      ) : null}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => onChange(EMPTY_FILTERS)}>
          Limpar filtros
        </Button>
        <Button className="flex-1" onClick={onClose}>
          Ver resultados
        </Button>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-1.5 text-sm transition-colors",
        active ? "border-primary bg-primary-soft text-primary" : "border-border/70 bg-surface",
      )}
    >
      {children}
    </button>
  );
}
