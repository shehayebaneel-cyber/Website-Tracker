// ---------------------------------------------------------------------------
// Plan Builder — the customer assembles their system and sees the price move.
//
// Every rule applied here (what a plan includes, what an add-on depends on,
// which add-on forces a higher plan, what is charged versus already covered)
// comes from the pricing engine the SERVER prices with, running against the
// catalogue this page fetched. The estimate on screen and the price stored on
// submission are produced by the same code — the server re-prices anyway.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "../components/icons";
import { LoadError, SectionHeading } from "../components/ui";
import { waLink } from "../data/content";
import {
  addOnBadges,
  addOnPrice,
  priceLabel,
  useCatalogue,
  type Catalogue,
  type CatalogueAddOn,
} from "../lib/catalogue";
import { allowanceFor, priceSelection, quoteMessage, type CoreSystem, type Quote } from "../lib/quote";

interface Contact {
  contactName: string;
  businessName: string;
  phone: string;
  email: string;
  businessType: string;
  notes: string;
  website: string; // honeypot
}

const EMPTY_CONTACT: Contact = {
  contactName: "", businessName: "", phone: "", email: "", businessType: "", notes: "", website: "",
};

export default function Builder() {
  const { catalogue, loading, error } = useCatalogue();
  const [params] = useSearchParams();

  const [planKey, setPlanKey] = useState<string | null>(null);
  const [coreSystem, setCoreSystem] = useState<CoreSystem | null>(null);
  const [capacities, setCapacities] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string; monthlyTotal: number; oneTimeTotal: number; needsQuotation: boolean } | null>(null);

  // Start on the plan the customer arrived with, else the popular one.
  useEffect(() => {
    if (!catalogue || planKey) return;
    const wanted = params.get("plan");
    const start =
      catalogue.plans.find((p) => p.key === wanted) ??
      catalogue.plans.find((p) => p.popular) ??
      catalogue.plans[0];
    if (start) setPlanKey(start.key);
    const feature = params.getAll("feature").filter((k) => catalogue.addOns.some((a) => a.key === k));
    if (feature.length) setSelected((s) => [...new Set([...s, ...feature])]);
  }, [catalogue, params, planKey]);

  const quote: Quote | null = useMemo(() => {
    if (!catalogue || !planKey) return null;
    return priceSelection(catalogue, { planKey, coreSystem, capacities, addOnKeys: selected });
  }, [catalogue, planKey, coreSystem, capacities, selected]);

  if (error) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 720 }}>
          <LoadError message={error} whatsappText="Hi IGNIS, I'd like help choosing a plan." />
        </div>
      </section>
    );
  }
  if (loading || !catalogue || !planKey || !quote) {
    return (
      <section className="section">
        <div className="container"><div className="skeleton" style={{ height: 420 }} /></div>
      </section>
    );
  }

  if (done) return <Confirmation done={done} />;

  // The engine may have moved the customer to a higher plan; everything below
  // is priced against that plan, so it is what the page must reflect.
  const activePlan = catalogue.plans.find((p) => p.key === quote.planKey)!;
  const requestedPlan = catalogue.plans.find((p) => p.key === planKey)!;
  const autoAddedKeys = new Set(quote.autoAdded.map((a) => a.key));
  const includedKeys = new Set(quote.included.map((l) => l.key));
  const blocking = quote.issues.filter((i) => i.blocking);

  const sellable = catalogue.addOns.filter((a) => !(a.pricingType === "bundled" && a.bundledWith));

  function toggleAddOn(key: string) {
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
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
          planKey,
          coreSystem,
          capacities,
          addOnKeys: selected,
          contactName: contact.contactName,
          businessName: contact.businessName || undefined,
          phone: contact.phone,
          email: contact.email || undefined,
          businessType: contact.businessType || undefined,
          notes: contact.notes || undefined,
          website: contact.website,
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
            eyebrow="Plan builder"
            title="Build your plan and see the price"
            sub="Pick what your business actually needs. The total updates as you choose, and nothing is charged twice."
          />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="builder-grid">
              {/* ---------------- choices ---------------- */}
              <div className="flex flex-col gap-10">
                {/* 1. plan */}
                <Step n={1} title="Choose your starting plan" hint="You can change this at any time — features that need a bigger plan will say so.">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {catalogue.plans.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setPlanKey(p.key)}
                        className="flex flex-col rounded-2xl p-4 text-left transition-colors"
                        style={{
                          border: `1.5px solid ${planKey === p.key ? "var(--orange)" : "var(--line)"}`,
                          background: planKey === p.key ? "var(--orange-soft)" : "var(--paper)",
                        }}
                      >
                        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)", fontFamily: "var(--font-display)" }}>{p.name}</span>
                        <span className="mt-1 font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: planKey === p.key ? "var(--orange)" : "var(--ink)" }}>
                          {priceLabel(p.basePrice, p.priceIsFrom)}
                          <span className="text-sm font-normal" style={{ color: "var(--muted)" }}>{p.priceNote}</span>
                        </span>
                        <span className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>{p.heading}</span>
                      </button>
                    ))}
                  </div>
                </Step>

                {/* 2. core system */}
                {activePlan.coreSystemMode !== "none" && (
                  <Step n={2} title="What should customers be able to do?" hint="This is the heart of your system.">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <CoreOption on={coreSystem === "booking"} onClick={() => setCoreSystem("booking")} label="Book appointments" note="Services, staff and a schedule." />
                      <CoreOption on={coreSystem === "store"} onClick={() => setCoreSystem("store")} label="Order or buy" note="Products, cart and orders." />
                      <CoreOption
                        on={coreSystem === "both"}
                        onClick={() => setCoreSystem("both")}
                        label="Both"
                        note={
                          activePlan.coreSystemMode === "one-included-both-available" && activePlan.bothSystemsPrice != null
                            ? `Adds ${priceLabel(activePlan.bothSystemsPrice)}/month.`
                            : "Booking and store together."
                        }
                        tag={activePlan.coreSystemMode === "choose-one" ? "Needs a bigger plan" : undefined}
                      />
                    </div>
                  </Step>
                )}

                {/* 3. capacity */}
                <CapacityStep
                  n={activePlan.coreSystemMode === "none" ? 2 : 3}
                  catalogue={catalogue}
                  planKey={activePlan.key}
                  coreSystem={quote.coreSystem}
                  capacities={capacities}
                  setCapacities={setCapacities}
                />

                {/* 4. features */}
                <Step
                  n={activePlan.coreSystemMode === "none" ? 3 : 4}
                  title="Add the features you need"
                  hint="Anything already included in your plan is marked — you are never charged for it twice."
                >
                  <div className="flex flex-col gap-8">
                    {catalogue.categories.map((c) => {
                      const items = sellable.filter((a) => a.categoryKey === c.key);
                      if (!items.length) return null;
                      return (
                        <div key={c.key}>
                          <div className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>{c.name}</div>
                          {c.blurb && <p className="mt-0.5 text-sm" style={{ color: "var(--muted)" }}>{c.blurb}</p>}
                          <div className="mt-3 grid gap-2 lg:grid-cols-2">
                            {items.map((a) => (
                              <AddOnRow
                                key={a.key}
                                addOn={a}
                                catalogue={catalogue}
                                checked={selected.includes(a.key) || autoAddedKeys.has(a.key)}
                                auto={autoAddedKeys.has(a.key) && !selected.includes(a.key)}
                                includedFree={includedKeys.has(a.key)}
                                onToggle={() => toggleAddOn(a.key)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Step>

                {/* 5. contact */}
                <Step
                  n={activePlan.coreSystemMode === "none" ? 4 : 5}
                  title="Send it to us"
                  hint="We'll confirm the final price with you before anything starts. No payment is taken here."
                >
                  <form onSubmit={submit} className="flex flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Your name" required>
                        <input className="in" required value={contact.contactName} onChange={(e) => setContact({ ...contact, contactName: e.target.value })} />
                      </Field>
                      <Field label="Business name">
                        <input className="in" value={contact.businessName} onChange={(e) => setContact({ ...contact, businessName: e.target.value })} />
                      </Field>
                      <Field label="Phone / WhatsApp" required>
                        <input className="in" required inputMode="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                      </Field>
                      <Field label="Email">
                        <input className="in" type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                      </Field>
                    </div>
                    {catalogue.businessTypes.length > 0 && (
                      <Field label="Type of business">
                        <select className="in" value={contact.businessType} onChange={(e) => setContact({ ...contact, businessType: e.target.value })}>
                          <option value="">Select…</option>
                          {catalogue.businessTypes.map((b) => <option key={b.key} value={b.name}>{b.name}</option>)}
                        </select>
                      </Field>
                    )}
                    <Field label="Anything else we should know?">
                      <textarea className="in" rows={3} value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })} />
                    </Field>

                    {/* honeypot — hidden from people, filled by bots */}
                    <input
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden
                      value={contact.website}
                      onChange={(e) => setContact({ ...contact, website: e.target.value })}
                      style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }}
                    />

                    {blocking.length > 0 && (
                      <p className="text-sm" style={{ color: "var(--red, #c0392b)" }}>
                        Please resolve the highlighted point above before sending.
                      </p>
                    )}
                    {submitError && <p className="text-sm" style={{ color: "var(--red, #c0392b)" }}>{submitError}</p>}

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button type="submit" className="btn btn-primary" disabled={busy || blocking.length > 0}>
                        {busy ? "Sending…" : "Send my plan"}
                      </button>
                      <a href={waLink(quoteMessage(catalogue, quote))} target="_blank" rel="noreferrer" className="btn btn-wa">
                        <Icon.whatsapp size={18} /> Send on WhatsApp
                      </a>
                    </div>
                  </form>
                </Step>
              </div>

            {/* ---------------- summary ---------------- */}
            <Summary
              catalogue={catalogue}
              quote={quote}
              requestedPlanName={requestedPlan.name}
              onSwitchPlan={setPlanKey}
            />
          </div>
        </div>
      </section>

      {/* On a phone the summary is far below the choices, so the total follows
          the customer down the page. */}
      <div className="builder-bar lg:hidden">
        <div>
          <div className="text-xs" style={{ color: "rgba(255,255,255,.7)" }}>Estimated total</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.15rem" }}>
            {priceLabel(quote.monthlyTotal)}<span style={{ fontSize: ".8rem", fontWeight: 400, color: "rgba(255,255,255,.7)" }}>/month</span>
            {quote.oneTimeTotal > 0 && <span style={{ fontSize: ".8rem", fontWeight: 400, color: "rgba(255,255,255,.7)" }}> + {priceLabel(quote.oneTimeTotal)} once</span>}
          </div>
        </div>
        <a href="#summary" className="btn btn-primary" style={{ padding: "0.6rem 1rem", fontSize: "0.85rem" }}>
          {blocking.length > 0 ? "Fix 1 issue" : "See summary"}
        </a>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
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

function CoreOption({ on, onClick, label, note, tag }: { on: boolean; onClick: () => void; label: string; note: string; tag?: string }) {
  return (
    <button type="button" onClick={onClick} className={`choice ${on ? "on" : ""}`} style={{ textAlign: "left" }}>
      <span className="box">{on && <Icon.check />}</span>
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="hint block" style={{ marginTop: 0 }}>{note}</span>
        {tag && <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs" style={{ background: "var(--cream)", color: "var(--muted)" }}>{tag}</span>}
      </span>
    </button>
  );
}

function AddOnRow({
  addOn: a, catalogue, checked, auto, includedFree, onToggle,
}: {
  addOn: CatalogueAddOn; catalogue: Catalogue; checked: boolean; auto: boolean; includedFree: boolean; onToggle: () => void;
}) {
  const badges = addOnBadges(catalogue, a).filter((b) => b.tone !== "popular");
  return (
    <button type="button" onClick={onToggle} className={`choice ${checked ? "on" : ""}`} style={{ textAlign: "left", width: "100%" }}>
      <span className="box">{checked && <Icon.check />}</span>
      <span style={{ flex: 1 }}>
        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-sm font-semibold">{a.name}</span>
          <span className="text-sm font-semibold" style={{ color: includedFree ? "var(--muted)" : "var(--orange)", fontFamily: "var(--font-display)" }}>
            {includedFree ? "Included" : addOnPrice(a)}
          </span>
        </span>
        {a.blurb && <span className="hint block" style={{ marginTop: 2 }}>{a.blurb}</span>}
        {(auto || badges.length > 0) && (
          <span className="mt-1.5 flex flex-wrap gap-1.5">
            {auto && <Tag tone="auto">Added automatically</Tag>}
            {badges.map((b) => <Tag key={b.label} tone={b.tone === "included" ? "included" : "plain"}>{b.label}</Tag>)}
          </span>
        )}
      </span>
    </button>
  );
}

function Tag({ tone, children }: { tone: "auto" | "included" | "plain"; children: React.ReactNode }) {
  const style =
    tone === "auto" ? { background: "var(--orange)", color: "#fff" }
    : tone === "included" ? { background: "var(--peach)", color: "var(--orange)" }
    : { background: "var(--cream)", color: "var(--muted)" };
  return <span className="rounded-full px-2 py-0.5 text-xs" style={style}>{children}</span>;
}

// ---------------------------------------------------------------------------

function CapacityStep({
  n, catalogue, planKey, coreSystem, capacities, setCapacities,
}: {
  n: number; catalogue: Catalogue; planKey: string; coreSystem: CoreSystem | null;
  capacities: Record<string, number>; setCapacities: (v: Record<string, number>) => void;
}) {
  // Only dimensions this plan actually offers, and only where the chosen core
  // system makes them meaningful.
  const dims = catalogue.capacity.filter((c) => {
    if (c.appliesToPlans.length && !c.appliesToPlans.includes(planKey)) return false;
    if (c.requiresCoreSystem) {
      if (!coreSystem) return false;
      if (coreSystem !== "both" && !c.requiresCoreSystem.split("|").includes(coreSystem)) return false;
    }
    return allowanceFor(catalogue, planKey, c.key) != null;
  });

  if (!dims.length) return null;

  return (
    <Step n={n} title="How much do you need?" hint="Every plan comes with an allowance. Only what goes beyond it is charged.">
      <div className="flex flex-col gap-3">
        {dims.map((c) => {
          const base = allowanceFor(catalogue, planKey, c.key)!;
          const value = capacities[c.key] ?? base;
          const steps = Math.max(0, Math.ceil((value - base) / c.stepSize));
          const atMax = c.maxSteps != null && steps >= c.maxSteps;
          const change = (delta: number) => {
            const next = Math.max(base, value + delta * c.stepSize);
            const capped = c.maxSteps != null ? Math.min(next, base + c.maxSteps * c.stepSize) : next;
            setCapacities({ ...capacities, [c.key]: capped });
          };
          return (
            <div key={c.key} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4" style={{ border: "1px solid var(--line)", background: "var(--paper)" }}>
              <div style={{ minWidth: 200, flex: 1 }}>
                <div className="text-sm font-semibold">{c.name}</div>
                <div className="hint" style={{ marginTop: 2 }}>
                  {base} {c.unitLabel} included · +{priceLabel(c.pricePerStep)}/month per {c.stepSize} {c.unitLabel}
                </div>
                {c.helpText && <div className="hint" style={{ marginTop: 2 }}>{c.helpText}</div>}
              </div>
              <div className="flex items-center gap-3">
                <Stepper label={`Fewer ${c.unitLabel}`} disabled={steps === 0} onClick={() => change(-1)}>−</Stepper>
                <div className="text-center" style={{ minWidth: 74 }}>
                  <div className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>{value}</div>
                  <div className="hint" style={{ marginTop: 0 }}>{steps ? `+${priceLabel(steps * c.pricePerStep)}/mo` : "included"}</div>
                </div>
                <Stepper label={`More ${c.unitLabel}`} disabled={atMax} onClick={() => change(1)}>+</Stepper>
              </div>
            </div>
          );
        })}
      </div>
    </Step>
  );
}

function Stepper({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid place-items-center rounded-full"
      style={{
        width: 40, height: 40, fontSize: "1.2rem", lineHeight: 1,
        border: `1.5px solid ${disabled ? "var(--line-2)" : "var(--line)"}`,
        color: disabled ? "var(--line)" : "var(--ink)",
        background: "var(--paper)",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------

function Summary({
  catalogue, quote: q, requestedPlanName, onSwitchPlan,
}: {
  catalogue: Catalogue; quote: Quote; requestedPlanName: string; onSwitchPlan: (key: string) => void;
}) {
  const rec = q.recommendation;
  const recPlanName = rec ? catalogue.plans.find((p) => p.key === rec.switchTo)?.name ?? rec.switchTo : null;

  return (
    <aside className="builder-summary" id="summary">
      <div className="card p-5" style={{ background: "var(--paper)" }}>
        <div className="font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>Your plan</div>

        {/* Anything the engine decided FOR the customer must be visible. */}
        {q.upgrades.map((u) => (
          <Note key={u.to} tone="attention">{u.message}</Note>
        ))}
        {q.autoAdded.map((a) => (
          <Note key={a.key} tone="info">{a.message}</Note>
        ))}
        {q.issues.map((i) => (
          <Note key={i.code + i.message} tone={i.blocking ? "blocking" : "attention"}>{i.message}</Note>
        ))}

        <div className="mt-4 flex flex-col gap-2">
          {q.monthly.map((l) => (
            <Line key={l.kind + l.key} label={l.label} detail={l.detail} amount={`${l.isFrom ? "from " : ""}${priceLabel(l.amount)}`} />
          ))}
        </div>
        <div className="mt-3 flex items-baseline justify-between border-t pt-3" style={{ borderColor: "var(--line)" }}>
          <span className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>Monthly total</span>
          <span className="font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--orange)" }}>
            {priceLabel(q.monthlyTotal)}<span className="text-sm font-normal" style={{ color: "var(--muted)" }}>/month</span>
          </span>
        </div>

        {q.oneTime.length > 0 && (
          <>
            <div className="mt-5 text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--muted)", fontFamily: "var(--font-display)" }}>One-time</div>
            <div className="mt-2 flex flex-col gap-2">
              {q.oneTime.map((l) => <Line key={l.key} label={l.label} detail={l.detail} amount={`${l.isFrom ? "from " : ""}${priceLabel(l.amount)}`} />)}
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-sm font-semibold">One-time total</span>
              <span className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>{priceLabel(q.oneTimeTotal)}</span>
            </div>
          </>
        )}

        {q.included.length > 0 && (
          <Group title="Already included">
            {q.included.map((l) => <Line key={l.key} label={l.label} detail={l.detail} amount="Included" muted />)}
          </Group>
        )}

        {q.quoteItems.length > 0 && (
          <Group title="We'll quote these">
            {q.quoteItems.map((l) => <Line key={l.key} label={l.label} amount="By quotation" muted />)}
          </Group>
        )}

        {q.external.length > 0 && (
          <Group title="Paid to other providers">
            {q.external.map((l) => <Line key={l.key} label={l.label} amount="Provider's price" muted />)}
          </Group>
        )}

        {rec && recPlanName && (
          <div className="mt-5 rounded-xl p-4" style={{ background: rec.kind === "saves" ? "var(--peach)" : "var(--cream)" }}>
            <div className="text-sm" style={{ color: "var(--ink-2)" }}>{rec.message}</div>
            <button type="button" onClick={() => onSwitchPlan(rec.switchTo)} className="btn btn-dark mt-3" style={{ padding: "0.6rem 1rem", fontSize: "0.85rem" }}>
              {rec.kind === "saves" ? `Switch to ${recPlanName}` : `Try ${recPlanName}`}
            </button>
          </div>
        )}

        <p className="mt-5 text-xs" style={{ color: "var(--muted)" }}>
          An estimate, not an invoice — we confirm the final price with you before any work begins.
          {q.planKey !== q.requestedPlanKey && ` Priced on ${catalogue.plans.find((p) => p.key === q.planKey)?.name}, not ${requestedPlanName}.`}
        </p>
      </div>
    </aside>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <div className="mt-5 text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--muted)", fontFamily: "var(--font-display)" }}>{title}</div>
      <div className="mt-2 flex flex-col gap-2">{children}</div>
    </>
  );
}

function Line({ label, detail, amount, muted }: { label: string; detail?: string; amount: string; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span style={{ color: muted ? "var(--muted)" : "var(--ink-2)" }}>
        {label}
        {detail && <span className="block text-xs" style={{ color: "var(--muted)" }}>{detail}</span>}
      </span>
      <span className="whitespace-nowrap" style={{ color: muted ? "var(--muted)" : "var(--ink)", fontFamily: "var(--font-display)", fontWeight: 600 }}>{amount}</span>
    </div>
  );
}

function Note({ tone, children }: { tone: "info" | "attention" | "blocking"; children: React.ReactNode }) {
  const style =
    tone === "blocking" ? { background: "#fdecea", color: "#a5342a" }
    : tone === "attention" ? { background: "var(--peach)", color: "var(--orange)" }
    : { background: "var(--cream)", color: "var(--ink-2)" };
  return <div className="mt-3 rounded-xl p-3 text-sm" style={style}>{children}</div>;
}

// ---------------------------------------------------------------------------

function Confirmation({ done }: { done: { reference: string; monthlyTotal: number; oneTimeTotal: number; needsQuotation: boolean } }) {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="card p-8 text-center">
          <span className="mx-auto grid place-items-center" style={{ width: 64, height: 64, borderRadius: 999, background: "var(--peach)", color: "var(--orange)" }}>
            <Icon.check />
          </span>
          <h1 className="mt-5" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.6rem" }}>We've got your plan</h1>
          <p className="mt-3" style={{ color: "var(--ink-2)" }}>
            Your reference is <b style={{ color: "var(--ink)" }}>{done.reference}</b>. We'll be in touch to confirm the details and the final price.
          </p>
          <div className="mt-5 rounded-xl p-4" style={{ background: "var(--cream)" }}>
            <div className="font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "var(--orange)" }}>
              {priceLabel(done.monthlyTotal)}<span className="text-sm font-normal" style={{ color: "var(--muted)" }}>/month</span>
            </div>
            {done.oneTimeTotal > 0 && <div className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>plus {priceLabel(done.oneTimeTotal)} one-time</div>}
            {done.needsQuotation && <div className="mt-2 text-sm" style={{ color: "var(--muted)" }}>Some of what you chose needs a quotation — we'll price those with you.</div>}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/" className="btn btn-dark">Back to home</Link>
            <a href={waLink(`Hi IGNIS, I just sent plan ${done.reference}.`)} target="_blank" rel="noreferrer" className="btn btn-wa">
              <Icon.whatsapp size={18} /> Message us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
