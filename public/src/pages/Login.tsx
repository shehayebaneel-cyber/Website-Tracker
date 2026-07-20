import { useState, type FormEvent } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { waLink, CONTACT } from "../data/content";

export default function Login() {
  const { user, loading, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && user) return <Navigate to="/portal" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try { await login(email, password); nav("/portal"); }
    catch (err: any) { setError(err?.status === 401 ? "That email or password doesn't match." : err?.message || "Could not sign in."); }
    finally { setBusy(false); }
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 440 }}>
        <div className="text-center">
          <div className="eyebrow mb-2">Client portal</div>
          <h1 className="h-section">Welcome back</h1>
          <p className="lead mt-3">Sign in to manage your website, payments and requests.</p>
        </div>

        <form onSubmit={submit} className="card mt-8 p-6">
          {error && <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: "#fdeceb", color: "#c0392b" }}>{error}</div>}
          <label className="mb-4 block"><span className="lbl">Email</span><input className="in" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label className="mb-4 block"><span className="lbl">Password</span><input className="in" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <button className="btn btn-primary btn-block" style={{ padding: "1rem" }} disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>

        <p className="mt-4 text-center text-sm" style={{ color: "var(--muted)" }}>
          No login yet? <a href={waLink("Hi IGNIS, I'd like access to my client portal.")} target="_blank" rel="noreferrer" style={{ color: "var(--orange)", fontWeight: 600 }}>Ask us on WhatsApp</a> ({CONTACT.whatsapp})
        </p>
      </div>
    </section>
  );
}
