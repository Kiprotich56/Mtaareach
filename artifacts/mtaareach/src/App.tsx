import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuthStore } from "@/lib/auth";
import { useEffect } from "react";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Contacts from "@/pages/contacts/index";
import Campaigns from "@/pages/campaigns/index";
import Groups from "@/pages/groups/index";
import Villages from "@/pages/villages/index";
import PollingStations from "@/pages/polling-stations/index";
import Templates from "@/pages/templates/index";
import Wallet from "@/pages/wallet/index";
import Reports from "@/pages/reports/index";
import Users from "@/pages/users/index";
import SenderIds from "@/pages/sender-ids/index";
import Settings from "@/pages/settings/index";

// Super Admin Pages
import SuperDashboard from "@/pages/super/dashboard";
import SuperTenants from "@/pages/super/tenants";
import SuperSenderIds from "@/pages/super/sender-ids";
import SuperWallets from "@/pages/super/wallet-management";
import SuperGateways from "@/pages/super/sms-gateways";
import SuperAuditLogs from "@/pages/super/audit-logs";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, superAdminOnly = false, ...rest }: any) {
  const [location, setLocation] = useLocation();
  const { user, isSuperAdmin } = useAuthStore();

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    } else if (superAdminOnly && !isSuperAdmin) {
      setLocation("/dashboard");
    } else if (!superAdminOnly && isSuperAdmin && location === "/") {
      setLocation("/super/dashboard");
    }
  }, [user, isSuperAdmin, location, setLocation, superAdminOnly]);

  if (!user || (superAdminOnly && !isSuperAdmin)) {
    return null; // Will redirect
  }

  return <Route {...rest} component={() => <AppLayout><Component /></AppLayout>} />;
}

function Router() {
  const { user, isSuperAdmin } = useAuthStore();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (location === "/") {
      if (!user) {
        setLocation("/login");
      } else if (isSuperAdmin) {
        setLocation("/super/dashboard");
      } else {
        setLocation("/dashboard");
      }
    }
  }, [location, user, isSuperAdmin, setLocation]);

  return (
    <Switch>
      <Route path="/login" component={Login} />

      {/* Tenant Routes */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/contacts" component={Contacts} />
      <ProtectedRoute path="/groups" component={Groups} />
      <ProtectedRoute path="/geography/villages" component={Villages} />
      <ProtectedRoute path="/geography/polling-stations" component={PollingStations} />
      <ProtectedRoute path="/campaigns" component={Campaigns} />
      <ProtectedRoute path="/templates" component={Templates} />
      <ProtectedRoute path="/wallet" component={Wallet} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/users" component={Users} />
      <ProtectedRoute path="/sender-ids" component={SenderIds} />
      <ProtectedRoute path="/settings" component={Settings} />

      {/* Super Admin Routes */}
      <ProtectedRoute path="/super/dashboard" component={SuperDashboard} superAdminOnly={true} />
      <ProtectedRoute path="/super/tenants" component={SuperTenants} superAdminOnly={true} />
      <ProtectedRoute path="/super/sender-ids" component={SuperSenderIds} superAdminOnly={true} />
      <ProtectedRoute path="/super/wallet-management" component={SuperWallets} superAdminOnly={true} />
      <ProtectedRoute path="/super/sms-gateways" component={SuperGateways} superAdminOnly={true} />
      <ProtectedRoute path="/super/audit-logs" component={SuperAuditLogs} superAdminOnly={true} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
