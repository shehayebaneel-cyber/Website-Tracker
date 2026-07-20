import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { homeFor } from "./lib/perms";
import { loadAppConfig } from "./lib/appConfig";
import { Spinner } from "./components/ui";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";
import Websites from "./pages/Websites";
import WebsiteDetail from "./pages/WebsiteDetail";
import Billing from "./pages/Billing";
import Payments from "./pages/Payments";
import Expenses from "./pages/Expenses";
import Support from "./pages/Support";
import MonthlyOverview from "./pages/MonthlyOverview";
import Alerts from "./pages/Alerts";
import Reports from "./pages/Reports";
import Activity from "./pages/Activity";
import Settings from "./pages/Settings";
import SalesDashboard from "./pages/sales/SalesDashboard";
import SalesTeam from "./pages/sales/SalesTeam";
import SalespersonProfile from "./pages/sales/SalespersonProfile";
import Leads from "./pages/sales/Leads";
import LeadDetail from "./pages/sales/LeadDetail";
import SalesClients from "./pages/sales/SalesClients";
import Commissions from "./pages/sales/Commissions";
import Applications from "./pages/sales/Applications";
import ApplicationDetail from "./pages/sales/ApplicationDetail";

export default function App() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user) loadAppConfig().catch(() => {});
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner label="Starting Website Tracker…" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const home = homeFor(user.role);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientProfile />} />
        <Route path="/websites" element={<Websites />} />
        <Route path="/websites/:id" element={<WebsiteDetail />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/support" element={<Support />} />
        <Route path="/monthly" element={<MonthlyOverview />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/settings" element={<Settings />} />
        {/* Sales Management */}
        <Route path="/sales" element={<SalesDashboard />} />
        <Route path="/sales/team" element={<SalesTeam />} />
        <Route path="/sales/team/:id" element={<SalespersonProfile />} />
        <Route path="/sales/leads" element={<Leads />} />
        <Route path="/sales/leads/:id" element={<LeadDetail />} />
        <Route path="/sales/applications" element={<Applications />} />
        <Route path="/sales/applications/:id" element={<ApplicationDetail />} />
        <Route path="/sales/clients" element={<SalesClients />} />
        <Route path="/sales/commissions" element={<Commissions />} />
        <Route path="/login" element={<Navigate to={home} replace />} />
        <Route path="*" element={<Navigate to={home} replace />} />
      </Route>
    </Routes>
  );
}
