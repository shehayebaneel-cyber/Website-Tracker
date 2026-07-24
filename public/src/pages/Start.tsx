import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "../components/icons";
import { waLink } from "../data/content";
import { loadCatalogue, startingOptions, useCatalogue } from "../lib/catalogue";

type Dict = Record<string, boolean>;
interface Form {
  businessName: string; category: string; contactPerson: string; phone: string; whatsapp: string; email: string;
  city: string; country: string; instagram: string; existingWebsite: string; isOperating: boolean; description: string;
  needType: string; plan: string; needs: Dict; otherFeatures: string;
  hasContent: Dict; files: { name: string; url: string; size: number; type: string }[];
  launchTimeline: string; contactMethod: string; bestTime: string; meetingType: string; additionalInfo: string; hearAbout: string;
  referralCode: string;
  consentContact: boolean; priceMayChange: boolean; privacyAgreed: boolean;
}

const EMPTY: Form = {
  businessName: "", category: "", contactPerson: "", phone: "", whatsapp: "", email: "", city: "", country: "Lebanon",
  instagram: "", existingWebsite: "", isOperating: true, description: "",
  needType: "new", plan: "", needs: {}, otherFeatures: "",
  hasContent: {}, files: [],
  launchTimeline: "", contactMethod: "WhatsApp", bestTime: "", meetingType: "", additionalInfo: "", hearAbout: "",
  referralCode: "",
  consentContact: false, priceMayChange: false, privacyAgreed: false,
};

const NEEDS: { key: string; label: string; hint: string }[] = [
  { key: "bookings", label: "Bookings / appointments", hint: "Let customers book a time online." },
  { key: "ordering", label: "Online ordering", hint: "Take food or product orders." },
  { key: "store", label: "Online store", hint: "Sell products with a cart & checkout." },
  { key: "customerAccounts", label: "Customer accounts", hint: "Customers log in and see their history." },
  { key: "staffAccounts", label: "Staff accounts", hint: "Your team gets their own logins." },
  { key: "inventory", label: "Inventory", hint: "Track stock and suppliers." },
  { key: "delivery", label: "Delivery management", hint: "Zones, fees and driver tracking." },
  { key: "reports", label: "Reports", hint: "See revenue and customer insights." },
  { key: "payments", label: "Online payments", hint: "Accept card / Whish online." },
  { key: "multiLanguage", label: "More than one language", hint: "e.g. Arabic + English." },
  { key: "multiBranch", label: "More than one branch", hint: "Multiple locations." },
];

const HAS: { key: string; label: string }[] = [
  { key: "logo", label: "Logo" }, { key: "description", label: "Business description" },
  { key: "serviceList", label: "Service list" }, { key: "productList", label: "Product list" },
  { key: "prices", label: "Prices" }, { key: "photos", label: "Photos" }, { key: "videos", label: "Videos" },
  { key: "brandColors", label: "Brand colors" }, { key: "domain", label: "Domain name" },
];

const STEP_TITLES = ["Your business", "What you need", "Your content", "Timeline", "Review"];
const STORAGE = "ignis-application";

export default function Start() {
  const [params] = useSearchParams();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>(() => {
    try { const saved = localStorage.getItem(STORAGE); if (saved) return { ...EMPTY, ...JSON.parse(saved) }; } catch { /* ignore */ }
    return EMPTY;
  });
  const [refName, setRefName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ code: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (field: "needs" | "hasContent", key: string) => setForm((f) => ({ ...f, [field]: { ...f[field], [key]: !f[field][key] } }));

  // The website types on offer, straight from the catalogue.
  const { catalogue } = useCatalogue();
  const websiteTypes = catalogue
    ? startingOptions(catalogue).map((o) => ({ key: o.key, label: o.name.replace(" Website", "") }))
    : [];

  // prefill plan + referral from URL
  useEffect(() => {
    const plan = params.get("plan"); const mod = params.get("module"); const ref = params.get("ref");
    if (plan) set("plan", plan);
    if (mod) set("needs", { ...form.needs, [mod]: true });

    // ?feature=<packKey> — arrives from a feature-pack card. The catalogue owns
    // the name, so the form asks for it rather than trusting the URL's text.
    const features = params.getAll("feature");
    if (features.length) {
      loadCatalogue()
        .then((cat) => {
          const names = features
            .map((k) => cat.packs.find((p) => p.key === k)?.name)
            .filter((n): n is string => Boolean(n));
          if (names.length) {
            setForm((f) => {
              // Idempotent: a re-mount (or a saved draft) must not list a
              // feature twice.
              const fresh = names.filter((n) => !f.otherFeatures.includes(n));
              if (!fresh.length) return f;
              return { ...f, otherFeatures: [f.otherFeatures, ...fresh].filter(Boolean).join(", ") };
            });
          }
        })
        .catch(() => { /* the field simply stays empty */ });
    }

    if (ref) {
      set("referralCode", ref);
      fetch(`/api/public/ref/${encodeURIComponent(ref)}`).then((r) => r.json()).then((d) => { if (d.valid) setRefName(d.salespersonName); }).catch(() => {});
    }
    // eslint-disable-next-line
  }, []);

  // save & continue later
  useEffect(() => { try { localStorage.setItem(STORAGE, JSON.stringify(form)); } catch { /* ignore */ } }, [form]);

  const store = form.needs.store || form.needs.ordering;
  const booking = form.needs.bookings;

  async function onFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setUploading(true); setError(null);
    try {
      const fd = new FormData();
      Array.from(list).forEach((f) => fd.append("files", f));
      const res = await fetch("/api/public/uploads", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Upload failed");
      set("files", [...form.files, ...d.files]);
    } catch (e: any) { setError(e.message); } finally { setUploading(false); }
  }

  async function submit() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/public/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Something went wrong. Please try again.");
      localStorage.removeItem(STORAGE);
      setDone({ code: d.code });
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  const canNext = useMemo(() => {
    if (step === 1) return form.businessName.trim() && (form.phone.trim() || form.whatsapp.trim());
    if (step === 5) return form.consentContact && form.privacyAgreed;
    return true;
  }, [step, form]);

  if (done) return <Confirmation code={done.code} />;

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="text-center">
          <div className="eyebrow mb-2">Start your website</div>
          <h1 className="h-section">Tell us about your business</h1>
          <p className="lead mt-3">It only takes a few minutes — and you can save and finish later.</p>
        </div>

        {refName && (
          <div className="mt-6 flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: "var(--orange-soft)", color: "var(--orange-deep)" }}>
            <Icon.sparkle /> Referred by <b>{refName}</b> — we'll connect you with them.
          </div>
        )}

        <Stepper step={step} />

        <div className="card mt-6 p-6 sm:p-8">
          {error && <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: "#fdeceb", color: "#c0392b" }}>{error}</div>}

          {step === 1 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <F label="Business name *" full><input className="in" value={form.businessName} onChange={(e) => set("businessName", e.target.value)} /></F>
              <F label="Business category"><input className="in" placeholder="e.g. Café, Salon, Clinic" value={form.category} onChange={(e) => set("category", e.target.value)} /></F>
              <F label="Contact person"><input className="in" value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} /></F>
              <F label="Phone"><input className="in" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></F>
              <F label="WhatsApp"><input className="in" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} /></F>
              <F label="Email"><input className="in" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></F>
              <F label="City"><input className="in" value={form.city} onChange={(e) => set("city", e.target.value)} /></F>
              <F label="Instagram"><input className="in" placeholder="@yourbusiness" value={form.instagram} onChange={(e) => set("instagram", e.target.value)} /></F>
              <F label="Existing website (if any)" full><input className="in" value={form.existingWebsite} onChange={(e) => set("existingWebsite", e.target.value)} /></F>
              <F label="Is the business already operating?" full>
                <div className="flex gap-2">
                  <Toggle on={form.isOperating} onClick={() => set("isOperating", true)}>Yes, we're open</Toggle>
                  <Toggle on={!form.isOperating} onClick={() => set("isOperating", false)}>Opening soon</Toggle>
                </div>
              </F>
              <F label="Short description of your business" full><textarea className="in" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} /></F>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5">
              <F label="Do you need a new website or a redesign?">
                <div className="flex gap-2">
                  <Toggle on={form.needType === "new"} onClick={() => set("needType", "new")}>New website</Toggle>
                  <Toggle on={form.needType === "redesign"} onClick={() => set("needType", "redesign")}>Redesign</Toggle>
                </div>
              </F>
              {/* The website types come from the catalogue, so this form can
                  never offer something the pricing pages no longer sell. */}
              <F label="What kind of website do you need?">
                <div className="grid grid-cols-2 gap-2">
                  {websiteTypes.map((t) => (
                    <Toggle key={t.key} on={form.plan === t.key} onClick={() => set("plan", t.key)}>{t.label}</Toggle>
                  ))}
                </div>
                <div className="hint">Not sure? <Link to="/help-me-build" style={{ color: "var(--orange)" }}>Answer a few questions</Link> and we'll suggest one.</div>
              </F>
              <div>
                <div className="lbl">What do you need? <span style={{ fontWeight: 400, color: "var(--muted)" }}>(pick any)</span></div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {NEEDS.map((n) => (
                    <div key={n.key} className={`choice ${form.needs[n.key] ? "on" : ""}`} onClick={() => toggle("needs", n.key)}>
                      <span className="box">{form.needs[n.key] && <Icon.check />}</span>
                      <span><div className="text-sm font-semibold">{n.label}</div><div className="hint" style={{ marginTop: 0 }}>{n.hint}</div></span>
                    </div>
                  ))}
                </div>
              </div>
              {(store || booking) && (
                <div className="rounded-xl p-3 text-sm" style={{ background: "var(--cream)", color: "var(--ink-2)" }}>
                  Great — we'll set up {booking ? "online booking" : ""}{booking && store ? " and " : ""}{store ? "online ordering / store" : ""} for you.
                </div>
              )}
              <F label="Anything else you need?"><input className="in" value={form.otherFeatures} onChange={(e) => set("otherFeatures", e.target.value)} /></F>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div>
                <div className="lbl">What do you already have?</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {HAS.map((h) => (
                    <div key={h.key} className={`choice ${form.hasContent[h.key] ? "on" : ""}`} onClick={() => toggle("hasContent", h.key)} style={{ padding: "0.7rem 0.85rem" }}>
                      <span className="box" style={{ width: 20, height: 20 }}>{form.hasContent[h.key] && <Icon.check />}</span>
                      <span className="text-sm font-medium">{h.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="lbl">Upload files <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional — you can send these later)</span></div>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-7 text-center" style={{ borderColor: "var(--line)", background: "var(--cream)" }}>
                  <span style={{ color: "var(--orange)" }}><Icon.sparkle /></span>
                  <span className="text-sm font-semibold">{uploading ? "Uploading…" : "Tap to add photos, logo, menu…"}</span>
                  <span className="hint" style={{ marginTop: 0 }}>Images, PDF, Word, Excel or video · up to 15 MB each</span>
                  <input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,video/*" style={{ display: "none" }} onChange={(e) => onFiles(e.target.files)} />
                </label>
                {form.files.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2">
                    {form.files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ background: "var(--cream)" }}>
                        <span className="truncate">{f.name}</span>
                        <button onClick={() => set("files", form.files.filter((_, j) => j !== i))} style={{ color: "var(--muted)" }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <F label="When would you like to launch?"><select className="in" value={form.launchTimeline} onChange={(e) => set("launchTimeline", e.target.value)}><option value="">Choose…</option>{["As soon as possible", "Within 1 month", "1–3 months", "Just exploring"].map((o) => <option key={o}>{o}</option>)}</select></F>
              <F label="Preferred contact method"><select className="in" value={form.contactMethod} onChange={(e) => set("contactMethod", e.target.value)}>{["WhatsApp", "Phone", "Email", "In Person"].map((o) => <option key={o}>{o}</option>)}</select></F>
              <F label="Best time to contact you"><input className="in" placeholder="e.g. Weekday afternoons" value={form.bestTime} onChange={(e) => set("bestTime", e.target.value)} /></F>
              <F label="Preferred meeting type"><select className="in" value={form.meetingType} onChange={(e) => set("meetingType", e.target.value)}><option value="">Choose…</option>{["WhatsApp call", "Phone call", "In person", "Video call"].map((o) => <option key={o}>{o}</option>)}</select></F>
              <F label="How did you hear about IGNIS?"><input className="in" value={form.hearAbout} onChange={(e) => set("hearAbout", e.target.value)} /></F>
              <F label="Salesperson / referral code"><input className="in" placeholder="e.g. SP001" value={form.referralCode} onChange={(e) => set("referralCode", e.target.value)} /></F>
              <F label="Anything else you'd like us to know?" full><textarea className="in" rows={3} value={form.additionalInfo} onChange={(e) => set("additionalInfo", e.target.value)} /></F>
            </div>
          )}

          {step === 5 && (
            <div className="flex flex-col gap-4">
              <Review form={form} />
              <div className="flex flex-col gap-2.5 rounded-xl p-4" style={{ background: "var(--cream)" }}>
                <Consent on={form.consentContact} onClick={() => set("consentContact", !form.consentContact)}>I agree to be contacted by IGNIS about my application. *</Consent>
                <Consent on={form.priceMayChange} onClick={() => set("priceMayChange", !form.priceMayChange)}>I understand the final price may change based on my requirements.</Consent>
                <Consent on={form.privacyAgreed} onClick={() => set("privacyAgreed", !form.privacyAgreed)}>I agree to the <Link to="/privacy" style={{ color: "var(--orange)" }}>privacy policy</Link>. Submitting this form does not create a contract. *</Consent>
              </div>
            </div>
          )}

          {/* nav */}
          <div className="mt-7 flex items-center justify-between gap-3">
            <button className="btn btn-ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1 || busy} style={{ visibility: step === 1 ? "hidden" : "visible" }}>Back</button>
            {step < 5
              ? <button className="btn btn-primary" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>Continue <Icon.arrow /></button>
              : <button className="btn btn-primary" onClick={submit} disabled={!canNext || busy}>{busy ? "Submitting…" : "Submit application"}</button>}
          </div>
        </div>

        <p className="mt-4 text-center text-xs" style={{ color: "var(--muted)" }}>Your progress is saved on this device — you can close this and finish later.</p>
      </div>
    </section>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="mt-8 flex items-center justify-between gap-1">
      {STEP_TITLES.map((t, i) => {
        const n = i + 1; const active = n === step; const done = n < step;
        return (
          <div key={t} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full items-center">
              <div style={{ flex: 1, height: 3, borderRadius: 999, background: i === 0 ? "transparent" : done || active ? "var(--orange)" : "var(--line)" }} />
              <span className="grid place-items-center" style={{ width: 30, height: 30, borderRadius: 999, flexShrink: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.8rem", background: done || active ? "var(--orange)" : "var(--cream)", color: done || active ? "#fff" : "var(--muted)" }}>{done ? "✓" : n}</span>
              <div style={{ flex: 1, height: 3, borderRadius: 999, background: i === STEP_TITLES.length - 1 ? "transparent" : done ? "var(--orange)" : "var(--line)" }} />
            </div>
            <span className="hidden text-xs sm:block" style={{ color: active ? "var(--ink)" : "var(--muted)", fontWeight: active ? 600 : 400 }}>{t}</span>
          </div>
        );
      })}
    </div>
  );
}

function F({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <label className={full ? "sm:col-span-2" : ""}><span className="lbl">{label}</span>{children}</label>;
}
function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors" style={{ fontFamily: "var(--font-display)", border: `1.5px solid ${on ? "var(--orange)" : "var(--line)"}`, background: on ? "var(--orange-soft)" : "var(--paper)", color: on ? "var(--orange-deep)" : "var(--ink-2)" }}>{children}</button>;
}
function Consent({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm" style={{ color: "var(--ink-2)" }} onClick={onClick}>
      <span className="grid place-items-center" style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1, background: on ? "var(--orange)" : "var(--paper)", border: `1.5px solid ${on ? "var(--orange)" : "var(--line)"}`, color: "#fff" }}>{on && <Icon.check />}</span>
      <span>{children}</span>
    </label>
  );
}

function Review({ form }: { form: Form }) {
  const needs = Object.keys(form.needs).filter((k) => form.needs[k]);
  const rows: [string, string][] = [
    ["Business", form.businessName], ["Category", form.category], ["Contact", form.contactPerson],
    ["Phone", form.phone || form.whatsapp], ["City", form.city], ["Website type", form.plan ? form.plan[0].toUpperCase() + form.plan.slice(1).replace("both","Booking + E-commerce") : "—"],
    ["Type", form.needType === "redesign" ? "Redesign" : "New website"], ["Needs", needs.length ? needs.join(", ") : "—"],
    ["Files", form.files.length ? `${form.files.length} uploaded` : "—"], ["Launch", form.launchTimeline || "—"],
  ];
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--paper)", border: "1px solid var(--line)" }}>
      <div className="mb-2 text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>Review your application</div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 text-sm" style={{ borderBottom: "1px solid var(--line-2)", paddingBottom: 4 }}>
            <span style={{ color: "var(--muted)" }}>{k}</span><span className="text-right font-medium" style={{ color: "var(--ink)" }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Confirmation({ code }: { code: string }) {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 620, textAlign: "center" }}>
        <div className="mx-auto grid place-items-center" style={{ width: 72, height: 72, borderRadius: 999, background: "var(--orange-soft)", color: "var(--orange)" }}><Icon.check /></div>
        <h1 className="h-section mt-5">Your application has been received</h1>
        <p className="lead mt-3">Thank you! Our team will review it and get back to you {`within 1 business day`}.</p>
        <div className="mt-6 inline-flex flex-col items-center rounded-2xl px-8 py-5" style={{ background: "var(--cream)" }}>
          <span className="text-xs uppercase tracking-widest" style={{ color: "var(--muted)", fontFamily: "var(--font-display)" }}>Your reference number</span>
          <span className="tnum mt-1 text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--orange)" }}>{code}</span>
        </div>
        <div className="mt-8 text-left" style={{ maxWidth: 440, marginInline: "auto" }}>
          <div className="mb-2 text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>What happens next</div>
          <ol className="flex flex-col gap-2 text-sm" style={{ color: "var(--ink-2)" }}>
            {["We review your application and requirements.", "Your IGNIS representative contacts you to confirm details.", "We prepare a proposal and, once approved, start building."].map((t, i) => (
              <li key={i} className="flex gap-2.5"><span className="step-num" style={{ width: 26, height: 26, fontSize: "0.8rem" }}>{i + 1}</span> {t}</li>
            ))}
          </ol>
        </div>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <a href={waLink(`Hi IGNIS, I just submitted application ${code}.`)} target="_blank" rel="noreferrer" className="btn btn-wa"><Icon.whatsapp size={18} /> Message us on WhatsApp</a>
          <Link to="/" className="btn btn-outline">Back to home</Link>
        </div>
      </div>
    </section>
  );
}
