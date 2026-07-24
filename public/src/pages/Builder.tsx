// ---------------------------------------------------------------------------
// The guided website builder.
//
// Every rule applied here — what a system includes, which packs a system can
// run, what a pack costs, what the limits become — comes from the pricing
// engine the SERVER prices with, running against the catalogue this page
// fetched. The estimate on screen and the price stored on submission are
// produced by the same code, and the server re-prices anyway.
//
// The customer's choices live in the shared configuration, not in this
// component, so wandering off to read a pack's details never loses them.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "../components/icons";
import { LoadError, SectionHeading } from "../components/ui";
import { waLink } from "../data/content";
import { useConfiguration } from "../lib/configuration";
import {
  compatibilityLabel,
  missingSystemsFor,
  oneTimePrice,
  packIsUsable,
  priceLabel,
  text,
  useCatalogue,
  websiteTypeName,
  type Catalogue,
  type CoreSystem,
  type FeaturePack,
} from "../lib/catalogue";
import { packsLostWithout, priceSelection, quoteMessage, type Quote } from "../lib/quote";
import { useMediaQuery } from "../lib/useMediaQuery";

export default function Builder() {
  const { catalogue, loading, error } = useCatalogue();
  const { config, setInfo, addSystem, removeSystem, togglePack, addPacks, toggleOneTime, reset } =
    useConfiguration();
  const [params] = useSearchParams();

  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [step, setStep] = useState(0);
  const compact = useMediaQuery("(max-width: 1023px)");

  // Prompts the customer must answer, never silent changes to their basket.
  const [addSystemFor, setAddSystemFor] = useState<{ pack: FeaturePack; systems: CoreSystem[] } | null>(null);
  const [removeSystemFor, setRemoveSystemFor] = useState<{ system: CoreSystem; lost: FeaturePack[] } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // ?feature= arrives from a pack card, ?systems= from a starting option.
  useEffect(() => {
    if (!catalogue) return;
    const wanted = params.getAll("feature").filter((k) => catalogue.packs.some((p) => p.key === k));
    if (wanted.length) addPacks(wanted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogue]);

  const quote: Quote | null = useMemo(() => {
    if (!catalogue) return null;
    return priceSelection(catalogue, {
      systemKeys: config.systemKeys,
      packKeys: config.packKeys,
      oneTimeKeys: config.oneTimeKeys,
      externalKeys: config.externalKeys,
    });
  }, [catalogue, config]);

  if (error) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 720 }}>
          <LoadError message={error} whatsappText="Hi IGNIS, I'd like help putting a website together." />
        </div>
      </section>
    );
  }
  if (loading || !catalogue || !quote) {
    return (
      <section className="section">
        <div className="container"><div className="skeleton" style={{ height: 420 }} /></div>
      </section>
    );
  }
  if (done) return <Confirmation done={done} />;

  const websiteType = websiteTypeName(catalogue, quote.systemKeys);
  const blocked = quote.unmet.some((u) => u.blocking);
  const canSubmit = Boolean(config.info.contactName.trim() && config.info.phone.trim()) && !blocked;

  // Which steps exist right now — "what you already have" only appears once a
  // system is chosen, so the numbering and the phone's paging follow the same
  // list rather than two hand-kept ones.
  const hasSystems = quote.systemKeys.length > 0;
  const stepKeys = ["info", "type", ...(hasSystems ? ["included"] : []), "packs", "onetime", "send"];
  const at = (key: string) => stepKeys.indexOf(key);
  const current = Math.min(step, stepKeys.length - 1);
  const isHidden = (key: string) => compact && current !== at(key);

  /** Ask before adding a system on the customer's behalf. */
  function requestPack(pack: FeaturePack) {
    if (config.packKeys.includes(pack.key)) return togglePack(pack.key);
    if (packIsUsable(pack, config.systemKeys)) return togglePack(pack.key);
    setAddSystemFor({ pack, systems: missingSystemsFor(catalogue!, pack, config.systemKeys) });
  }

  /** Ask before dropping packs that depend on a system. */
  function requestRemoveSystem(system: CoreSystem) {
    // The engine answers with its own leaner pack shape; resolve back to the
    // catalogue so the prompt can name them the way the customer saw them.
    const lostKeys = packsLostWithout(catalogue!, config.systemKeys, system.key, config.packKeys)
      .map((p) => p.key);
    const lost = catalogue!.packs.filter((p) => lostKeys.includes(p.key));
    if (!lost.length) return removeSystem(system.key, []);
    setRemoveSystemFor({ system, lost });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/public/pricing/configurations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemKeys: config.systemKeys,
          packKeys: config.packKeys,
          oneTimeKeys: config.oneTimeKeys,
          externalKeys: config.externalKeys,
          contactName: config.info.contactName,
          businessName: config.info.businessName || undefined,
          phone: config.info.phone,
          email: config.info.email || undefined,
          businessType: config.info.businessType || undefined,
          contactMethod: config.info.contactMethod || undefined,
          notes: config.info.notes || undefined,
          website: "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setDone(data);
    } catch (err: any) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="container">
          <SectionHeading
            center
            eyebrow="Website builder"
            title={text(catalogue, "builder.heading", "Build your website")}
            sub={text(catalogue, "builder.estimateNote")}
          />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="builder-grid">
            <div className="flex flex-col gap-10">
              {/* Phones page through the steps; desktops see them all at once. */}
              {compact && (
                <div>
                  <div className="flex items-center justify-between text-sm" style={{ color: "var(--muted)" }}>
                    <span>Step {current + 1} of {stepKeys.length}</span>
                    <span>{priceLabel(quote.monthlyTotal)}/month so far</span>
                  </div>
                  <div className="mt-2 flex gap-1" aria-hidden>
                    {stepKeys.map((k, i) => (
                      <span key={k} style={{ flex: 1, height: 4, borderRadius: 999, background: i <= current ? "var(--orange)" : "var(--line)" }} />
                    ))}
                  </div>
                </div>
              )}

              {/* 1 — business information */}
              <Step n={at("info") + 1} hidden={isHidden("info")} title="Tell us about your business" hint="So we can recommend what fits and reach you afterwards.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Business name">
                    <input className="in" value={config.info.businessName} onChange={(e) => setInfo({ businessName: e.target.value })} />
                  </Field>
                  <Field label="Type of business">
                    <select className="in" value={config.info.businessType} onChange={(e) => setInfo({ businessType: e.target.value })}>
                      <option value="">Select…</option>
                      {catalogue.businessTypes.map((b) => <option key={b.key} value={b.name}>{b.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Your name" required>
                    <input className="in" value={config.info.contactName} onChange={(e) => setInfo({ contactName: e.target.value })} />
                  </Field>
                  <Field label="Phone / WhatsApp" required>
                    <input className="in" inputMode="tel" value={config.info.phone} onChange={(e) => setInfo({ phone: e.target.value })} />
                  </Field>
                  <Field label="Email">
                    <input className="in" type="email" value={config.info.email} onChange={(e) => setInfo({ email: e.target.value })} />
                  </Field>
                  <Field label="Preferred contact method">
                    <select className="in" value={config.info.contactMethod} onChange={(e) => setInfo({ contactMethod: e.target.value })}>
                      {["WhatsApp", "Phone call", "Email"].map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </Field>
                </div>
              </Step>

              {/* 2 — website type */}
              <Step n={at("type") + 1} hidden={isHidden("type")} title="Choose your website type" hint={`The ${priceLabel(catalogue.base!.price)} base website is always included.`}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {catalogue.systems.map((s) => {
                    const on = config.systemKeys.includes(s.key);
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => (on ? requestRemoveSystem(s) : addSystem(s.key))}
                        className={`choice ${on ? "on" : ""}`}
                        style={{ textAlign: "left" }}
                      >
                        <span className="box">{on && <Icon.check />}</span>
                        <span style={{ flex: 1 }}>
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-semibold">{s.name}</span>
                            <span className="text-sm font-semibold" style={{ color: "var(--orange)", fontFamily: "var(--font-display)" }}>
                              {priceLabel(s.price, true)}/month
                            </span>
                          </span>
                          <span className="hint block" style={{ marginTop: 2 }}>{s.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
                  Currently building: <b style={{ color: "var(--ink)" }}>{websiteType}</b> ·{" "}
                  {priceLabel(quote.monthlyTotal)}/month
                </p>
              </Step>

              {/* 3 — what is already included */}
              {quote.systemKeys.length > 0 && (
                <Step n={at("included") + 1} hidden={isHidden("included")} title="What you already have" hint="These are part of your systems — you never pay a pack for them.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {catalogue.systems
                      .filter((s) => quote.systemKeys.includes(s.key))
                      .map((s) => (
                        <div key={s.key} className="rounded-2xl p-4" style={{ border: "1px solid var(--line)", background: "var(--paper)" }}>
                          <div className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>{s.name}</div>
                          <ul className="mt-2 flex flex-col gap-1.5">
                            {s.inclusions.slice(0, 8).map((i) => (
                              <li key={i.label} className="flex items-start gap-2 text-sm" style={{ color: "var(--ink-2)" }}>
                                <Icon.check /> {i.label}
                              </li>
                            ))}
                          </ul>
                          {s.inclusions.length > 8 && (
                            <div className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
                              + {s.inclusions.length - 8} more included
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </Step>
              )}

              {/* 4 — feature packs */}
              <Step
                n={at("packs") + 1}
                hidden={isHidden("packs")}
                title="Add feature packs"
                hint={`Each pack is ${priceLabel(catalogue.packs[0]?.price ?? 5)}/month and groups everything related, so nothing overlaps.`}
              >
                {config.systemKeys.length === 0 && (
                  <p className="mb-3 rounded-xl p-3 text-sm" style={{ background: "var(--cream)", color: "var(--ink-2)" }}>
                    Feature packs extend a booking or e-commerce system. Choose one above and the packs become available.
                  </p>
                )}
                <div className="grid gap-2 lg:grid-cols-2">
                  {catalogue.packs.map((p) => {
                    const on = config.packKeys.includes(p.key);
                    const usable = packIsUsable(p, config.systemKeys);
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => requestPack(p)}
                        className={`choice ${on ? "on" : ""}`}
                        style={{ textAlign: "left", opacity: usable || on ? 1 : 0.75 }}
                      >
                        <span className="box">{on && <Icon.check />}</span>
                        <span style={{ flex: 1 }}>
                          <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <span className="text-sm font-semibold">{p.name}</span>
                            <span className="text-sm font-semibold" style={{ color: "var(--orange)", fontFamily: "var(--font-display)" }}>
                              {priceLabel(p.price, true)}/month
                            </span>
                          </span>
                          <span className="hint block" style={{ marginTop: 2 }}>{p.blurb}</span>
                          <span className="mt-1.5 flex flex-wrap gap-1.5">
                            {on && <Tag tone="on">Added to your website</Tag>}
                            <Tag tone={usable ? "plain" : "needs"}>{compatibilityLabel(catalogue, p)}</Tag>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <Link to="/business-systems" className="mt-3 inline-block text-sm font-semibold" style={{ color: "var(--orange)", fontFamily: "var(--font-display)" }}>
                  Read what each pack includes →
                </Link>
              </Step>

              {/* 5 — one-time services */}
              <Step
                n={at("onetime") + 1}
                hidden={isHidden("onetime")}
                title="Any one-time services?"
                hint="Setup, design and data work. Charged once — never added to your monthly total."
              >
                <div className="grid gap-2 lg:grid-cols-2">
                  {catalogue.oneTime.map((o) => {
                    const on = config.oneTimeKeys.includes(o.key);
                    return (
                      <button key={o.key} type="button" onClick={() => toggleOneTime(o.key)} className={`choice ${on ? "on" : ""}`} style={{ textAlign: "left" }}>
                        <span className="box">{on && <Icon.check />}</span>
                        <span style={{ flex: 1 }}>
                          <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <span className="text-sm font-semibold">{o.name}</span>
                            <span className="text-xs font-semibold" style={{ color: o.isQuote ? "var(--muted)" : "var(--orange)", fontFamily: "var(--font-display)" }}>
                              {oneTimePrice(o)}
                            </span>
                          </span>
                          {o.description && <span className="hint block" style={{ marginTop: 2 }}>{o.description}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Step>

              {/* 6 — send */}
              <Step
                n={at("send") + 1}
                hidden={isHidden("send")}
                title="Send us your website"
                hint="We review the configuration and confirm the final price before anything starts. No payment is taken here."
              >
                <form onSubmit={submit} className="flex flex-col gap-4">
                  <Field label="Anything else we should know?">
                    <textarea className="in" rows={3} value={config.info.notes} onChange={(e) => setInfo({ notes: e.target.value })} />
                  </Field>

                  {blocked && (
                    <p className="rounded-xl p-3 text-sm" style={{ background: "#fdecea", color: "#a5342a" }}>
                      {quote.unmet[0].message}
                    </p>
                  )}
                  {!canSubmit && !blocked && (
                    <p className="text-sm" style={{ color: "var(--muted)" }}>Add your name and phone number to send this.</p>
                  )}
                  {submitError && <p className="text-sm" style={{ color: "#a5342a" }}>{submitError}</p>}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button type="submit" className="btn btn-primary" disabled={busy || !canSubmit}>
                      {busy ? "Sending…" : "Request This Website"}
                    </button>
                    <a href={waLink(quoteMessage(catalogue, quote, websiteType))} target="_blank" rel="noreferrer" className="btn btn-wa">
                      <Icon.whatsapp size={18} /> Send Configuration on WhatsApp
                    </a>
                    <a href={waLink("Hi IGNIS, I'd like to talk about my website.")} target="_blank" rel="noreferrer" className="btn btn-ghost">
                      Talk to IGNIS
                    </a>
                  </div>
                </form>
              </Step>
              {compact && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ flex: 1 }}
                    disabled={current === 0}
                    onClick={() => { setStep(current - 1); window.scrollTo({ top: 0 }); }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-dark"
                    style={{ flex: 1 }}
                    disabled={current >= stepKeys.length - 1}
                    onClick={() => { setStep(current + 1); window.scrollTo({ top: 0 }); }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            <Summary
              catalogue={catalogue}
              quote={quote}
              websiteType={websiteType}
              onRemoveSystem={(key) => {
                const s = catalogue.systems.find((x) => x.key === key);
                if (s) requestRemoveSystem(s);
              }}
              onRemovePack={togglePack}
              onRemoveOneTime={toggleOneTime}
              onReset={() => setConfirmReset(true)}
            />
          </div>
        </div>
      </section>

      {/* Running total on phones */}
      <div className="builder-bar lg:hidden">
        <div>
          <div className="text-xs" style={{ color: "rgba(255,255,255,.7)" }}>{websiteType}</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.15rem" }}>
            {priceLabel(quote.monthlyTotal)}<span style={{ fontSize: ".8rem", fontWeight: 400, color: "rgba(255,255,255,.7)" }}>/month</span>
          </div>
        </div>
        <a href="#summary" className="btn btn-primary" style={{ padding: "0.6rem 1rem", fontSize: "0.85rem" }}>
          {blocked ? "Fix 1 issue" : "View My Website"}
        </a>
      </div>

      {/* --- prompts ---------------------------------------------------------- */}
      {addSystemFor && (
        <Modal title={`${addSystemFor.pack.name} needs another system`} onClose={() => setAddSystemFor(null)}>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            {addSystemFor.pack.requiresReason ??
              `${addSystemFor.pack.name} needs ${addSystemFor.systems.map((s) => s.shortName).join(" or ")} to work.`}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            {addSystemFor.systems.map((s) => (
              <button
                key={s.key}
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => {
                  addSystem(s.key);
                  togglePack(addSystemFor.pack.key);
                  setAddSystemFor(null);
                }}
              >
                Add {s.name} for {priceLabel(s.price, true)}/month
              </button>
            ))}
            <button type="button" className="btn btn-ghost btn-block" onClick={() => setAddSystemFor(null)}>
              Cancel this feature
            </button>
          </div>
        </Modal>
      )}

      {removeSystemFor && (
        <Modal title={`Removing ${removeSystemFor.system.shortName}`} onClose={() => setRemoveSystemFor(null)}>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            Removing {removeSystemFor.system.name} will also remove{" "}
            {removeSystemFor.lost.map((p) => p.name).join(" and ")}, because {removeSystemFor.lost.length > 1 ? "they need" : "it needs"} it to work.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              className="btn btn-dark btn-block"
              onClick={() => {
                removeSystem(removeSystemFor.system.key, removeSystemFor.lost.map((p) => p.key));
                setRemoveSystemFor(null);
              }}
            >
              Remove {removeSystemFor.system.shortName} and {removeSystemFor.lost.length} pack{removeSystemFor.lost.length > 1 ? "s" : ""}
            </button>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => setRemoveSystemFor(null)}>Keep everything</button>
          </div>
        </Modal>
      )}

      {confirmReset && (
        <Modal title="Start over?" onClose={() => setConfirmReset(false)}>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            This clears every system, pack and service you selected, and the details you entered.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button type="button" className="btn btn-dark btn-block" onClick={() => { reset(); setConfirmReset(false); }}>
              Yes, start over
            </button>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => setConfirmReset(false)}>Keep my configuration</button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

interface Done {
  reference: string;
  websiteType: string;
  monthlyTotal: number;
  oneTimeTotal: number;
  needsQuotation: boolean;
}

function Step({
  n, title, hint, hidden, children,
}: { n: number; title: string; hint?: string; hidden?: boolean; children: React.ReactNode }) {
  // On a phone the builder shows one step at a time; on a desktop every step is
  // on screen at once and this is never set.
  if (hidden) return null;
  return (
    <section>
      <div className="flex items-center gap-3">
        <span className="step-num" style={{ width: 34, height: 34, fontSize: "0.95rem" }}>{n}</span>
        <h2 className="font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem" }}>{title}</h2>
      </div>
      {hint && <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="lbl">{label}{required && <span style={{ color: "var(--orange)" }}> *</span>}</span>
      {children}
    </label>
  );
}

function Tag({ tone, children }: { tone: "on" | "plain" | "needs"; children: React.ReactNode }) {
  const style =
    tone === "on" ? { background: "var(--orange)", color: "#fff" }
    : tone === "needs" ? { background: "var(--peach)", color: "var(--orange)" }
    : { background: "var(--cream)", color: "var(--muted)" };
  return <span className="rounded-full px-2 py-0.5 text-xs" style={style}>{children}</span>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.15rem" }}>{title}</h3>
          <button type="button" aria-label="Close" onClick={onClose} style={{ color: "var(--muted)", fontSize: "1.5rem", lineHeight: 1 }}>×</button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Summary({
  catalogue, quote: q, websiteType, onRemoveSystem, onRemovePack, onRemoveOneTime, onReset,
}: {
  catalogue: Catalogue;
  quote: Quote;
  websiteType: string;
  onRemoveSystem: (key: string) => void;
  onRemovePack: (key: string) => void;
  onRemoveOneTime: (key: string) => void;
  onReset: () => void;
}) {
  return (
    <aside className="builder-summary" id="summary">
      <div className="card p-5" style={{ background: "var(--paper)" }}>
        <div className="font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>Your website</div>
        <div className="text-sm" style={{ color: "var(--muted)" }}>{websiteType}</div>

        {q.unmet.map((u) => (
          <div key={u.packKey} className="mt-3 rounded-xl p-3 text-sm" style={{ background: "#fdecea", color: "#a5342a" }}>
            {u.message}
          </div>
        ))}
        {q.issues.map((i) => (
          <div key={i.code + i.message} className="mt-3 rounded-xl p-3 text-sm" style={{ background: "var(--peach)", color: "var(--orange)" }}>
            {i.message}
          </div>
        ))}

        <div className="mt-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)", fontFamily: "var(--font-display)" }}>
          Monthly IGNIS subscription
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {q.monthly.map((l) => (
            <Line
              key={l.key}
              label={l.label}
              amount={priceLabel(l.amount, l.kind !== "base")}
              onRemove={
                l.kind === "system" ? () => onRemoveSystem(l.key)
                : l.kind === "pack" ? () => onRemovePack(l.key)
                : undefined
              }
            />
          ))}
        </div>
        <div className="mt-3 flex items-baseline justify-between border-t pt-3" style={{ borderColor: "var(--line)" }}>
          <span className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>Monthly total</span>
          <span className="font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--orange)" }}>
            {priceLabel(q.monthlyTotal)}<span className="text-sm font-normal" style={{ color: "var(--muted)" }}>/month</span>
          </span>
        </div>
        <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
          Standard maximum {priceLabel(q.maxStandardMonthly)}/month.
        </p>

        {/* Limits, so the customer can see what the packs actually bought. */}
        {q.limits.length > 0 && (
          <>
            <Group title="Your limits" />
            <div className="mt-2 flex flex-col gap-1.5">
              {q.limits.map((l) => (
                <div key={l.systemKey + l.key} className="flex items-baseline justify-between gap-3 text-sm">
                  <span style={{ color: "var(--ink-2)" }}>{l.label}</span>
                  <span style={{ color: l.upgraded ? "var(--orange)" : "var(--muted)", fontFamily: "var(--font-display)", fontWeight: 600 }}>
                    {l.value} {l.unitLabel}{l.upgraded ? " ↑" : ""}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {q.oneTime.length > 0 && (
          <>
            <Group title="One-time services" />
            <div className="mt-2 flex flex-col gap-2">
              {q.oneTime.map((l) => (
                <Line
                  key={l.key}
                  label={l.label}
                  amount={l.isQuote ? "Requires quotation" : priceLabel(l.amount ?? 0)}
                  muted={l.isQuote}
                  onRemove={() => onRemoveOneTime(l.key)}
                />
              ))}
            </div>
            {q.oneTimeTotal > 0 && (
              <div className="mt-2 flex items-baseline justify-between text-sm">
                <span className="font-semibold">One-time total</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{priceLabel(q.oneTimeTotal)}</span>
              </div>
            )}
          </>
        )}

        {catalogue.external.length > 0 && (
          <>
            <Group title="External costs" />
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
              Paid to other providers, never part of your IGNIS total: {catalogue.external.slice(0, 4).map((e) => e.name).join(", ")}
              {catalogue.external.length > 4 ? ", and others where they apply." : "."}
            </p>
          </>
        )}

        <p className="mt-5 text-xs" style={{ color: "var(--muted)" }}>{text(catalogue, "builder.estimateNote")}</p>

        <button type="button" onClick={onReset} className="mt-4 text-sm font-semibold" style={{ color: "var(--muted)" }}>
          Start Over
        </button>
      </div>
    </aside>
  );
}

function Group({ title }: { title: string }) {
  return (
    <div className="mt-5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)", fontFamily: "var(--font-display)" }}>
      {title}
    </div>
  );
}

function Line({
  label, amount, muted, onRemove,
}: { label: string; amount: string; muted?: boolean; onRemove?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span style={{ color: muted ? "var(--muted)" : "var(--ink-2)" }}>{label}</span>
      <span className="flex items-center gap-2 whitespace-nowrap">
        <span style={{ color: muted ? "var(--muted)" : "var(--ink)", fontFamily: "var(--font-display)", fontWeight: 600 }}>{amount}</span>
        {onRemove && (
          <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} style={{ color: "var(--muted)", fontSize: "1.1rem", lineHeight: 1 }}>×</button>
        )}
      </span>
    </div>
  );
}

function Confirmation({ done }: { done: Done }) {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="card p-8 text-center">
          <span className="mx-auto grid place-items-center" style={{ width: 64, height: 64, borderRadius: 999, background: "var(--peach)", color: "var(--orange)" }}>
            <Icon.check />
          </span>
          <h1 className="mt-5" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.6rem" }}>We've got your website</h1>
          <p className="mt-3" style={{ color: "var(--ink-2)" }}>
            Your reference is <b style={{ color: "var(--ink)" }}>{done.reference}</b>. We'll confirm the details and the final price with you.
          </p>
          <div className="mt-5 rounded-xl p-4" style={{ background: "var(--cream)" }}>
            <div className="text-sm" style={{ color: "var(--muted)" }}>{done.websiteType}</div>
            <div className="font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "var(--orange)" }}>
              {priceLabel(done.monthlyTotal)}<span className="text-sm font-normal" style={{ color: "var(--muted)" }}>/month</span>
            </div>
            {done.oneTimeTotal > 0 && <div className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>plus {priceLabel(done.oneTimeTotal)} one-time</div>}
            {done.needsQuotation && <div className="mt-2 text-sm" style={{ color: "var(--muted)" }}>Some of what you chose needs a quotation — we'll price that with you.</div>}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/" className="btn btn-dark">Back to home</Link>
            <a href={waLink(`Hi IGNIS, I just sent website configuration ${done.reference}.`)} target="_blank" rel="noreferrer" className="btn btn-wa">
              <Icon.whatsapp size={18} /> Message us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
