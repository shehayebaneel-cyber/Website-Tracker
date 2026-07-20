import { useState, type FormEvent } from "react";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="flame-mark mx-auto mb-3 block" aria-hidden="true" style={{ width: 26, height: 32 }} />
          <h1 className="text-lg font-bold" style={{ color: "var(--ink)" }}>IGNIS <span style={{ fontWeight: 500, color: "var(--muted)" }}>System</span></h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>Sign in to your management console</p>
        </div>

        <form onSubmit={onSubmit} className="card flex flex-col gap-4 p-5">
          {error && (
            <div className="pill pill-crit w-full justify-center py-2">{error}</div>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="label">Email</span>
            <input
              className="input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label">Password</span>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button className="btn btn-primary w-full justify-center py-2.5" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs" style={{ color: "var(--muted)" }}>
          Internal admin system · authorized users only
        </p>
      </div>
    </div>
  );
}
