import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { NAV_GROUPS } from "@/lib/nav/catalogue";

export const Route = createFileRoute("/app/all")({
  head: () => ({
    meta: [
      { title: "Tudo — Norte" },
      { name: "description", content: "Todas as secções da aplicação num sítio só, com pesquisa." },
      { property: "og:title", content: "Tudo — Norte" },
      { property: "og:description", content: "Encontra qualquer secção sem procurar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AllPage,
});

function normalise(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function AllPage() {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = normalise(query.trim());
    if (!q) return NAV_GROUPS;
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => normalise(item.label).includes(q) || normalise(item.hint ?? "").includes(q),
      ),
    })).filter((group) => group.items.length > 0);
  }, [query]);

  return (
    <div className="space-y-6">
      <PageHeader title="Tudo" subtitle="Todas as secções, num sítio só." />

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Procurar secção"
        aria-label="Procurar secção"
      />

      {groups.length === 0 ? (
        <p className="type-secondary">Nada com esse nome.</p>
      ) : (
        groups.map((group) => (
          <section key={group.title} className="space-y-2">
            <p className="type-section">{group.title}</p>
            <div className="list-group">
              {group.items.map((item) => (
                <Link key={item.to} to={item.to} className="list-row gap-3">
                  <span className="icon-tile" aria-hidden>
                    <item.icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem]">{item.label}</span>
                    {item.hint ? <span className="type-meta block truncate">{item.hint}</span> : null}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
