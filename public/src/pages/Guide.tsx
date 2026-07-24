// ---------------------------------------------------------------------------
// "Help me build my website" — the guided questionnaire.
//
// The questions are generated FROM the catalogue: one per core system and one
// per feature pack, with the wording held in editable content keys. Add a pack
// in the admin console and its question appears here, with no code change.
//
// The recommendation is priced by the engine, never assembled by hand, and it
// is only ever a starting point — the customer lands in the builder able to
// change every part of it.
// ---------------------------------------------------------------------------

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/icons";
import { LoadError, SectionHeading } from "../components/ui";
import { useConfiguration } from "../lib/configuration";
import {
  packIsUsable,
  priceLabel,
  text,
  useCatalogue,
  websiteTypeName,
  type Catalogue,
  type FeaturePack,
} from "../lib/catalogue";
import { listSentence, priceSelection } from "../lib/quote";

type Answers = Record<string, boolean>;

export default function Guide() {
  const { catalogue, loading, error } = useCatalogue();
  const { apply, setInfo } = useConfiguration();
  const navigate = useNavigate();

  const [businessType, setBusinessType] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [answered, setAnswered] = useState(false);

  const recommendation = useMemo(
    () => (catalogue ? recommend(catalogue, businessType, answers) : null),
    [catalogue, businessType, answers]
  );

  if (error) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 720 }}>
          <LoadError message={error} whatsappText="Hi IGNIS, could you help me choose a setup?" />
        </div>
      </section>
    );
  }
  if (loading || !catalogue || !recommendation) {
    return (
      <section className="section">
        <div className="container"><div className="skeleton" style={{ height: 420 }} /></div>
      </section>
    );
  }

  const set = (key: string, value: boolean) => setAnswers((a) => ({ ...a, [key]: value }));

  function useRecommendation() {
    apply({ systemKeys: recommendation!.systemKeys, packKeys: recommendation!.packKeys });
    const name = catalogue!.businessTypes.find((b) => b.key === businessType)?.name;
    if (name) setInfo({ businessType: name });
    navigate("/builder");
  }

  return (
    <>
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="container">
          <SectionHeading
            center
            eyebrow="Not sure what you need?"
            title={text(catalogue, "guide.heading", "Help me build my website")}
            sub={text(catalogue, "guide.sub")}
          />
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 820 }}>
          {/* Business type */}
          <Question n={1} title="What type of business do you operate?">
            <div className="grid gap-2 sm:grid-cols-3">
              {catalogue.businessTypes.map((b) => {
                const Ic = (Icon as any)[b.icon ?? "sparkle"] ?? Icon.sparkle;
                const on = businessType === b.key;
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => { setBusinessType(b.key); setAnswered(true); }}
                    className="flex items-center gap-2.5 rounded-2xl p-3 text-left text-sm font-medium transition-colors"
                    style={{
                      border: `1.5px solid ${on ? "var(--orange)" : "var(--line)"}`,
                      background: on ? "var(--orange-soft)" : "var(--paper)",
                      color: on ? "var(--orange)" : "var(--ink-2)",
                    }}
                  >
                    <Ic /> {b.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
              This only shapes the suggestion — you can still choose anything.
            </p>
          </Question>

          {/* One question per core system */}
          {catalogue.systems.map((s, i) => (
            <Question key={s.key} n={2 + i} title={text(catalogue, `question.system.${s.key}`, `Do you need ${s.name}?`)}>
              <YesNo value={answers[`system:${s.key}`]} onChange={(v) => { set(`system:${s.key}`, v); setAnswered(true); }} />
              <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>{s.description}</p>
            </Question>
          ))}

          {/* One question per feature pack */}
          {catalogue.packs.map((p, i) => (
            <Question
              key={p.key}
              n={2 + catalogue.systems.length + i}
              title={text(catalogue, `question.pack.${p.key}`, `Do you need ${p.name}?`)}
            >
              <YesNo value={answers[`pack:${p.key}`]} onChange={(v) => { set(`pack:${p.key}`, v); setAnswered(true); }} />
              <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>{p.blurb}</p>
            </Question>
          ))}

          {/* Recommendation */}
          <div className="mt-10 card p-6" style={{ background: "var(--paper)" }}>
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)", fontFamily: "var(--font-display)" }}>
              Our suggestion
            </div>
            <h3 className="mt-1" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.3rem" }}>
              {websiteTypeName(catalogue, recommendation.systemKeys)}
            </h3>

            {recommendation.notes.map((n) => (
              <p key={n} className="mt-3 rounded-xl p-3 text-sm" style={{ background: "var(--cream)", color: "var(--ink-2)" }}>{n}</p>
            ))}

            <div className="mt-4 flex flex-col gap-2">
              {recommendation.quote.monthly.map((l) => (
                <div key={l.key} className="flex items-baseline justify-between gap-3 text-sm">
                  <span style={{ color: "var(--ink-2)" }}>{l.label}</span>
                  <span style={{ color: "var(--muted)", fontFamily: "var(--font-display)", fontWeight: 600 }}>
                    {priceLabel(l.amount, l.kind !== "base")}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-baseline justify-between border-t pt-3" style={{ borderColor: "var(--line)" }}>
              <span className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>Estimated monthly total</span>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.5rem", color: "var(--orange)" }}>
                {priceLabel(recommendation.quote.monthlyTotal)}
                <span className="text-sm font-normal" style={{ color: "var(--muted)" }}>/month</span>
              </span>
            </div>

            <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>{text(catalogue, "builder.estimateNote")}</p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={useRecommendation} className="btn btn-primary">
                {answered ? "Use this suggestion" : "Open the builder"}
              </button>
              <button
                type="button"
                onClick={() => { setAnswers({}); setBusinessType(""); setAnswered(false); }}
                className="btn btn-ghost"
              >
                Clear my answers
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Question({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8 first:mt-0">
      <div className="flex items-baseline gap-3">
        <span className="text-sm font-semibold" style={{ color: "var(--orange)", fontFamily: "var(--font-display)" }}>{n}.</span>
        <h2 className="font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem" }}>{title}</h2>
      </div>
      <div className="mt-3 pl-6">{children}</div>
    </div>
  );
}

function YesNo({ value, onChange }: { value: boolean | undefined; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      {[true, false].map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className="rounded-full px-5 py-2 text-sm font-semibold transition-colors"
          style={{
            fontFamily: "var(--font-display)",
            border: `1.5px solid ${value === v ? "var(--orange)" : "var(--line)"}`,
            background: value === v ? "var(--orange)" : "var(--paper)",
            color: value === v ? "#fff" : "var(--ink-2)",
          }}
        >
          {v ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

interface Recommendation {
  systemKeys: string[];
  packKeys: string[];
  notes: string[];
  quote: ReturnType<typeof priceSelection>;
}

/**
 * Turn answers into a configuration.
 *
 * A pack the customer said yes to may need a system they said nothing about —
 * so the system is added and the reason is stated, never applied silently.
 */
export function recommend(cat: Catalogue, businessType: string, answers: Answers): Recommendation {
  const notes: string[] = [];
  const type = cat.businessTypes.find((b) => b.key === businessType);

  // Start from the business type's own suggestion, then let answers override.
  const systemKeys = new Set<string>(type?.recommendedSystems ?? []);
  for (const s of cat.systems) {
    const answer = answers[`system:${s.key}`];
    if (answer === true) systemKeys.add(s.key);
    if (answer === false) systemKeys.delete(s.key);
  }

  const wantedPacks = new Set<string>();
  for (const p of cat.packs) {
    const answer = answers[`pack:${p.key}`];
    if (answer === true) wantedPacks.add(p.key);
    else if (answer === undefined && type?.priorityPacks.includes(p.key)) wantedPacks.add(p.key);
  }

  // A pack that needs a system the customer hasn't got: add it, and say so.
  const pulledIn: { pack: FeaturePack; system: string }[] = [];
  for (const key of wantedPacks) {
    const pack = cat.packs.find((p) => p.key === key)!;
    if (packIsUsable(pack, [...systemKeys])) continue;
    const needed = pack.requiresSystems.find((k) => !systemKeys.has(k));
    if (needed) {
      systemKeys.add(needed);
      pulledIn.push({ pack, system: needed });
    }
  }

  for (const { pack, system } of pulledIn) {
    const s = cat.systems.find((x) => x.key === system)!;
    notes.push(`${pack.name} needs ${s.name}, so it is included above (${priceLabel(s.price, true)}/month).`);
  }

  // Packs still unusable — because no system was chosen at all — are dropped
  // from the suggestion rather than shown at a price that cannot apply.
  const packKeys: string[] = [];
  const dropped: string[] = [];
  for (const key of wantedPacks) {
    const pack = cat.packs.find((p) => p.key === key)!;
    if (packIsUsable(pack, [...systemKeys])) packKeys.push(key);
    else dropped.push(pack.name);
  }
  if (dropped.length) {
    notes.push(
      `${listSentence(dropped)} ${dropped.length > 1 ? "need" : "needs"} a booking or e-commerce system, so ${dropped.length > 1 ? "they are" : "it is"} not included yet.`
    );
  }

  const ordered = cat.packs.filter((p) => packKeys.includes(p.key)).map((p) => p.key);
  const systems = cat.systems.filter((s) => systemKeys.has(s.key)).map((s) => s.key);

  // Only when nothing was wanted and dropped — telling someone the base website
  // covers everything, right after telling them a pack they asked for could not
  // be included, would contradict itself.
  if (!systems.length && !ordered.length && !dropped.length) {
    notes.push("Based on your answers, the base website on its own covers what you need.");
  }

  return {
    systemKeys: systems,
    packKeys: ordered,
    notes,
    quote: priceSelection(cat, { systemKeys: systems, packKeys: ordered }),
  };
}
