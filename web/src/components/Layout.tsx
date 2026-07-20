import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { canAccess, type Section } from "../lib/perms";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  section: Section;
  group: "main" | "sales";
  soon?: boolean;
}

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: "▦", section: "dashboard", group: "main" },
  { to: "/clients", label: "Clients", icon: "◈", section: "clients", group: "main" },
  { to: "/websites", label: "Websites", icon: "◍", section: "websites", group: "main" },
  { to: "/billing", label: "Billing & Invoices", icon: "▤", section: "billing", group: "main" },
  { to: "/payments", label: "Payments", icon: "▣", section: "payments", group: "main" },
  { to: "/expenses", label: "Expenses", icon: "▨", section: "expenses", group: "main" },
  { to: "/support", label: "Support Tickets", icon: "◆", section: "support", group: "main" },
  { to: "/monthly", label: "Monthly Overview", icon: "▧", section: "monthly", group: "main" },
  { to: "/alerts", label: "Alerts", icon: "◔", section: "alerts", group: "main" },
  { to: "/reports", label: "Reports", icon: "▥", section: "reports", group: "main" },
  { to: "/activity", label: "Activity Log", icon: "❯", section: "activity", group: "main" },
  { to: "/settings", label: "Settings", icon: "⚙", section: "settings", group: "main" },
  // Sales Management
  { to: "/sales", label: "Sales Dashboard", icon: "◇", section: "salesDashboard", group: "sales" },
  { to: "/sales/team", label: "Sales Team", icon: "◈", section: "salesTeam", group: "sales" },
  { to: "/sales/leads", label: "Leads", icon: "✦", section: "leads", group: "sales" },
  { to: "/sales/applications", label: "Applications", icon: "▤", section: "applications", group: "sales" },
  { to: "/sales/clients", label: "My Clients", icon: "◍", section: "salesClients", group: "sales" },
];

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">(
    () => (localStorage.getItem("wt-theme") as any) || "system",
  );
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    localStorage.setItem("wt-theme", theme);
  }, [theme]);
  return { theme, setTheme };
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // close drawer on route change
  useEffect(() => setMobileOpen(false), [location.pathname]);

  const visibleNav = NAV.filter((item) => canAccess(user?.role, item.section));
  const mainItems = visibleNav.filter((i) => i.group === "main");
  const salesItems = visibleNav.filter((i) => i.group === "sales");

  const renderItem = (item: NavItem) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === "/" || item.to === "/sales"}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive ? "nav-active" : "nav-idle"
        }`
      }
    >
      <span className="w-4 text-center opacity-80">{item.icon}</span>
      <span className="flex-1">{item.label}</span>
      {item.soon && <span className="text-[10px] uppercase tracking-wide opacity-50">soon</span>}
    </NavLink>
  );

  const nav = (
    <nav className="flex flex-col gap-0.5 px-3">
      {mainItems.map(renderItem)}
      {salesItems.length > 0 && (
        <>
          {mainItems.length > 0 && <div className="mx-3 my-2 border-t" style={{ borderColor: "var(--sidebar-active)" }} />}
          <div className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--sidebar-ink-dim)" }}>Sales Management</div>
          {salesItems.map(renderItem)}
        </>
      )}
    </nav>
  );

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex md:w-60 md:flex-col md:shrink-0 md:justify-between py-5"
        style={{ background: "var(--sidebar)", color: "var(--sidebar-ink)" }}
      >
        <div>
          <div className="px-6 pb-6">
            <div className="text-[15px] font-bold tracking-tight text-white">Website Tracker</div>
            <div className="text-[11px]" style={{ color: "var(--sidebar-ink-dim)" }}>Client & business manager</div>
          </div>
          {nav}
        </div>
        <UserFooter name={user?.name} email={user?.email} onLogout={logout} theme={theme} setTheme={setTheme} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside
            className="absolute left-0 top-0 flex h-full w-64 flex-col justify-between py-5"
            style={{ background: "var(--sidebar)", color: "var(--sidebar-ink)" }}
          >
            <div>
              <div className="px-6 pb-6 text-[15px] font-bold text-white">Website Tracker</div>
              {nav}
            </div>
            <UserFooter name={user?.name} email={user?.email} onLogout={logout} theme={theme} setTheme={setTheme} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex items-center gap-3 border-b px-4 py-3 md:hidden"
          style={{ background: "var(--surface)" }}
        >
          <button className="btn btn-sm" onClick={() => setMobileOpen(true)} aria-label="Menu">☰</button>
          <span className="font-bold">Website Tracker</span>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <style>{`
        .nav-idle { color: var(--sidebar-ink); }
        .nav-idle:hover { background: var(--sidebar-active); color: #fff; }
        .nav-active { background: var(--accent); color: #fff; }
      `}</style>
    </div>
  );
}

function UserFooter({
  name,
  email,
  onLogout,
  theme,
  setTheme,
}: {
  name?: string;
  email?: string;
  onLogout: () => void;
  theme: string;
  setTheme: (t: "light" | "dark" | "system") => void;
}) {
  const cycle = () => setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");
  const icon = theme === "light" ? "☀" : theme === "dark" ? "☾" : "◐";
  return (
    <div className="mt-6 px-4">
      <div className="flex items-center gap-2 rounded-lg px-2 py-2" style={{ background: "var(--sidebar-active)" }}>
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ background: "var(--accent)" }}
        >
          {name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-white">{name}</div>
          <div className="truncate text-[10px]" style={{ color: "var(--sidebar-ink-dim)" }}>{email}</div>
        </div>
        <button
          onClick={cycle}
          title={`Theme: ${theme}`}
          className="rounded-md px-1.5 py-1 text-sm hover:bg-white/10"
        >
          {icon}
        </button>
      </div>
      <button
        onClick={onLogout}
        className="mt-2 w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-white/5"
        style={{ color: "var(--sidebar-ink-dim)" }}
      >
        Sign out
      </button>
    </div>
  );
}
