import { Link } from "react-router-dom";
import { Icon } from "../components/icons";
import { waLink } from "../data/content";

export default function Stub({ title, phase }: { title: string; phase: string }) {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 640, textAlign: "center" }}>
        <div className="eyebrow mb-3">Coming soon</div>
        <h1 className="h-section">{title}</h1>
        <p className="lead mt-4">
          This part of the IGNIS website is on the way — it's {phase}. In the meantime, message us on WhatsApp and we'll help you personally.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <a href={waLink(`Hi IGNIS, I'm interested in "${title}".`)} target="_blank" rel="noreferrer" className="btn btn-wa"><Icon.whatsapp size={18} /> Message us on WhatsApp</a>
          <Link to="/plans" className="btn btn-outline">View website plans</Link>
        </div>
      </div>
    </section>
  );
}
