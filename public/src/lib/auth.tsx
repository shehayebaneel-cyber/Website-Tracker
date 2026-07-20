import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";

export interface PortalUser { id: string; name: string; email: string; role: string }

interface AuthState {
  user: PortalUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ user: PortalUser }>("/auth/me").then((r) => setUser(r.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const r = await api.post<{ user: PortalUser }>("/auth/login", { email, password });
    setUser(r.user);
  }
  async function logout() {
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    setUser(null);
  }

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
