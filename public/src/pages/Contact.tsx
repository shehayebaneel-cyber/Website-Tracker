import { useState, type FormEvent } from "react";
import { SectionHeading } from "../components/ui";
import { Icon } from "../components/icons";
import { CONTACT, waLink } from "../data/content";

export default function Contact() {
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [message, setMessage] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = `Hi IGNIS!\nName: ${name}\nBusiness: ${business}\n\n${message}`;
    window.open(waLink(text), "_blank");
  }

  return (
    <section className="section">
      <div className="container">
        <SectionHeading center eyebrow="Contact" title="Let's talk about your business" sub="Reach us on WhatsApp for the fastest reply, or send a message below." />

        <div className="mt-12 grid gap-8 lg:grid-cols-2" style={{ maxWidth: 980, marginInline: "auto" }}>
          {/* Contact methods */}
          <div className="flex flex-col gap-3">
            <a href={waLink()} target="_blank" rel="noreferrer" className="card flex items-center gap-4 p-5 transition-transform hover:-translate-y-0.5">
              <span className="grid place-items-center" style={{ width: 48, height: 48, borderRadius: 12, background: "#25d366", color: "#fff" }}><Icon.whatsapp size={22} /></span>
              <div><div className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>WhatsApp</div><div className="text-sm" style={{ color: "var(--muted)" }}>{CONTACT.whatsapp}</div></div>
            </a>
            <a href={`tel:${CONTACT.phone}`} className="card flex items-center gap-4 p-5 transition-transform hover:-translate-y-0.5">
              <span className="grid place-items-center" style={{ width: 48, height: 48, borderRadius: 12, background: "var(--peach)", color: "var(--orange)" }}><Icon.phone /></span>
              <div><div className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>Call us</div><div className="text-sm" style={{ color: "var(--muted)" }}>{CONTACT.phone}</div></div>
            </a>
            <a href={`mailto:${CONTACT.email}`} className="card flex items-center gap-4 p-5 transition-transform hover:-translate-y-0.5">
              <span className="grid place-items-center" style={{ width: 48, height: 48, borderRadius: 12, background: "var(--cream)", color: "var(--ink)" }}><Icon.chat /></span>
              <div><div className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>Email</div><div className="text-sm" style={{ color: "var(--muted)" }}>{CONTACT.email}</div></div>
            </a>
            <div className="rounded-2xl p-5" style={{ background: "var(--cream)" }}>
              <div className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>Business hours</div>
              <div className="text-sm" style={{ color: "var(--muted)" }}>{CONTACT.hours}</div>
            </div>
          </div>

          {/* Quick message → WhatsApp */}
          <form onSubmit={submit} className="card p-6">
            <div className="mb-4 font-semibold" style={{ fontFamily: "var(--font-display)" }}>Send a quick message</div>
            <div className="flex flex-col gap-3">
              <input className="input-field" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
              <input className="input-field" placeholder="Business name" value={business} onChange={(e) => setBusiness(e.target.value)} />
              <textarea className="input-field" rows={4} placeholder="How can we help?" value={message} onChange={(e) => setMessage(e.target.value)} required />
              <button className="btn btn-primary btn-block" style={{ padding: "1rem" }} type="submit">Send via WhatsApp <Icon.arrow /></button>
              <p className="text-xs" style={{ color: "var(--muted)" }}>This opens WhatsApp with your message ready to send. A full contact form arrives with the application system.</p>
            </div>
          </form>
        </div>
      </div>
      <style>{`.input-field{width:100%;font-size:0.95rem;color:var(--ink);background:var(--paper);border:1.5px solid var(--line);border-radius:12px;padding:0.8rem 0.9rem;font-family:var(--font-body);}
      .input-field:focus{outline:none;border-color:var(--orange);box-shadow:0 0 0 3px var(--orange-soft);}`}</style>
    </section>
  );
}
