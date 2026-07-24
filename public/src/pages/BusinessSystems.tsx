// Business Feature Packs — the six packs, in full, from the catalogue.
//
// Related capability lives in exactly one pack, so this page is short by
// design: six cards, each expandable, rather than a wall of overlapping
// features. Adding one here carries straight into the builder with everything
// the customer already chose still selected.

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/icons";
import { SectionHeading, CTABand, LoadingCards, LoadError } from "../components/ui";
import { useConfiguration } from "../lib/configuration";
import {
  compatibilityLabel,
  missingSystemsFor,
  packIsUsable,
  priceLabel,
  text,
  useCatalogue,
  type Catalogue,
  type FeaturePack,
} from "../lib/catalogue";

type Filter = { key: string; label: string; test: (p: FeaturePack) => boolean };

export default function BusinessSystems() {
  const { catalogue, loading, error } = useCatalogue();
  const { config, togglePack, addSystem } = useConfiguration();
  const navigate = useNavigate();

  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const filters = useMemo<Filter[]>(() => {
    if (!catalogue) return [];
    const bySystem = (key: string): Filter => ({
      key,
      label: `${catalogue.systems.find((s) => s.key === key)?.shortName} compatible`,
      test: (p) => packIsUsable(p, [key]),
    });
    return [
      { key: "all", label: "All packs", test: () => true },
      ...catalogue.systems.map((s) => bySystem(s.key)),
      { key: "both", label: "Needs both systems", test: (p) => p.requiresSystems.length > 0 },
      { key: "any", label: "Works with any system", test: (p) => p.requiresSystems.length === 0 },
    ];
  }, [catalogue]);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!catalogue) return [];
    const active = filters.find((f) => f.key === filter) ?? filters[0];
    return catalogue.packs.filter((p) => {
      if (active && !active.test(p)) return false;
      if (!q) return true;
      const haystack = [p.name, p.blurb, p.description, ...p.features.map((f) => f.label)]
        .join(" ")
        .toLowerCase();
      return q.split(/\s+/).every((w) => haystack.includes(w));
    });
  }, [catalogue, filters, filter, q]);

  /** Add a pack and go to the builder, pulling in a required system if asked. */
  function addAndBuild(pack: FeaturePack, withSystems: string[] = []) {
    withSystems.forEach(addSystem);
    if (!config.packKeys.includes(pack.key)) togglePack(pack.key);
    navigate("/builder");
  }

  return (
    <>
      <section className="section" style={{ paddingBottom: 24 }}>
        <div className="container">
          <SectionHeading
            center
            eyebrow="Feature packs"
            title={text(catalogue, "packs.heading", "Business Feature Packs")}
            sub={text(catalogue, "packs.sub")}
          />
        </div>
      </section>

      <section style={{ paddingBottom: 40 }}>
        <div className="container">
          {catalogue && (
            <div className="mb-8 flex flex-col gap-4">
              <label className="block" style={{ maxWidth: 460 }}>
                <span className="sr-only">Search feature packs</span>
                <input
                  className="in"
                  type="search"
                  placeholder="Search — loyalty, gift cards, drivers, reports…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {filters.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className="rounded-full px-4 py-2 text-sm font-semibold transition-colors"
                    style={{
                      fontFamily: "var(--font-display)",
                      background: filter === f.key ? "var(--orange)" : "var(--cream)",
                      color: filter === f.key ? "#fff" : "var(--ink-2)",
                      border: `1px solid ${filter === f.key ? "var(--orange)" : "var(--line)"}`,
                    }}
                  >
                    {f.label} ({catalogue.packs.filter(f.test).length})
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" style={{ alignItems: "start" }}>
            {loading && <LoadingCards count={6} height={340} />}
            {catalogue &&
              results.map((p) => (
                <PackCard
                  key={p.key}
                  pack={p}
                  catalogue={catalogue}
                  selected={config.packKeys.includes(p.key)}
                  systemKeys={config.systemKeys}
                  expanded={open === p.key}
                  onToggleDetails={() => setOpen(open === p.key ? null : p.key)}
                  onAdd={(withSystems) => addAndBuild(p, withSystems)}
                  onRemove={() => togglePack(p.key)}
                />
              ))}
          </div>

          {catalogue && results.length === 0 && (
            <div className="card p-8 text-center">
              <p style={{ color: "var(--ink-2)" }}>Nothing matches “{query}”.</p>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                We build custom features too — tell us what you need and we'll quote it.
              </p>
            </div>
          )}

          {error && <LoadError message={error} whatsappText="Hi IGNIS, could you send me your feature packs?" />}
        </div>
      </section>

      {catalogue && (
        <section className="section" style={{ background: "var(--cream)" }}>
          <div className="container" style={{ maxWidth: 900 }}>
            <SectionHeading title="How packs are priced" sub={text(catalogue, "pricing.maxNote")} />
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ["Every pack", `${priceLabel(catalogue.packs[0]?.price ?? 5)}/month`],
                ["Base website", `${priceLabel(catalogue.base!.price)}/month`],
                ["Standard maximum", `${priceLabel(catalogue.maxStandardMonthly)}/month`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl p-4 text-center" style={{ background: "var(--paper)" }}>
                  <div className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>{label}</div>
                  <div className="mt-1 font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "var(--orange)" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <CTABand
        title="Ready to put your website together?"
        primary={{ label: "Open the builder", to: "/builder" }}
        whatsappText="Hi IGNIS, I'd like help choosing feature packs."
      />
    </>
  );
}

function PackCard({
  pack, catalogue, selected, systemKeys, expanded, onToggleDetails, onAdd, onRemove,
}: {
  pack: FeaturePack;
  catalogue: Catalogue;
  selected: boolean;
  systemKeys: string[];
  expanded: boolean;
  onToggleDetails: () => void;
  onAdd: (withSystems: string[]) => void;
  onRemove: () => void;
}) {
  const Ic = (Icon as any)[pack.icon ?? "sparkle"] ?? Icon.sparkle;
  const usable = packIsUsable(pack, systemKeys);
  const missing = missingSystemsFor(catalogue, pack, systemKeys);
  const shown = expanded ? pack.features : pack.features.slice(0, 5);

  return (
    <div
      className="card flex h-full flex-col p-6"
      style={{ border: selected ? "1.5px solid var(--orange)" : undefined, background: selected ? "var(--orange-soft)" : "var(--paper)" }}
    >
      <div className="flex items-center gap-3">
        <span className="grid place-items-center" style={{ width: 44, height: 44, borderRadius: 12, background: "var(--peach)", color: "var(--orange)", flexShrink: 0 }}><Ic /></span>
        <div>
          <div className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>{pack.name}</div>
          <div className="text-sm font-semibold" style={{ color: "var(--orange)", fontFamily: "var(--font-display)" }}>
            {priceLabel(pack.price, true)}/month
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>{pack.blurb}</p>

      <div className="mt-3">
        <span className="rounded-full px-2.5 py-1 text-xs" style={{ background: "var(--cream)", color: "var(--ink-2)" }}>
          {compatibilityLabel(catalogue, pack)}
        </span>
      </div>

      <ul className="mt-4 flex flex-1 flex-col gap-1.5">
        {shown.map((f) => (
          <li key={f.label} className="flex items-start gap-2 text-sm" style={{ color: "var(--ink-2)" }}>
            <Icon.check /> {f.label}
          </li>
        ))}
      </ul>

      {expanded && (
        <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>{pack.description}</p>
      )}

      <button
        type="button"
        onClick={onToggleDetails}
        className="mt-3 self-start text-sm font-semibold"
        style={{ color: "var(--orange)", fontFamily: "var(--font-display)" }}
      >
        {expanded ? "Show less" : `View full details (${pack.features.length} features)`}
      </button>

      {/* A pack that can't run yet says what would make it work, and its price. */}
      {!usable && missing.length > 0 && (
        <div className="mt-4 rounded-xl p-3 text-xs" style={{ background: "var(--cream)", color: "var(--ink-2)" }}>
          {pack.requiresReason ?? `${pack.name} needs ${missing.map((m) => m.shortName).join(" or ")}.`}
        </div>
      )}

      <div className="mt-4">
        {selected ? (
          <button type="button" onClick={onRemove} className="btn btn-ghost btn-block">Remove from my website</button>
        ) : usable ? (
          <button type="button" onClick={() => onAdd([])} className="btn btn-dark btn-block">Add to My Website</button>
        ) : (
          <button type="button" onClick={() => onAdd(missing.map((m) => m.key))} className="btn btn-primary btn-block">
            {missing.length === 1
              ? `Add ${missing[0].shortName} (${priceLabel(missing[0].price, true)}/month) and this pack`
              : "Choose a system and add this pack"}
          </button>
        )}
      </div>
    </div>
  );
}
