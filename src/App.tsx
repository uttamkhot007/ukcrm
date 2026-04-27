// App component with authentication and routing
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { TenantProvider } from "@/contexts/TenantContext";
import { AuthDiagnosticsGate } from "@/components/auth/AuthDiagnosticsGate";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Notifications from "./pages/Notifications";
import EmployeeDirectory from "./pages/EmployeeDirectory";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminOrganization from "./pages/admin/AdminOrganization";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminIntegrations from "./pages/admin/AdminIntegrations";
import AdminDocumentation from "./pages/admin/AdminDocumentation";

import AdminHealth from "./pages/admin/AdminHealth";
import AdminTenants from "./pages/admin/AdminTenants";
import AdminAlliance from "./pages/admin/AdminAlliance";
import AdminOfferings from "./pages/admin/AdminOfferings";
import AdminProcurement from "./pages/admin/AdminProcurement";
import AdminSupportManagement from "./pages/admin/AdminSupportManagement";
import AdminDocumentTemplates from "./pages/admin/AdminDocumentTemplates";
import AdminWhitelabel from "./pages/admin/AdminWhitelabel";
import AdminAuthorizedDomains from "./pages/admin/AdminAuthorizedDomains";
import PlatformLayout from "./pages/admin/platform/PlatformLayout";
import PlatformTenants from "./pages/admin/platform/PlatformTenants";
import PlatformUsers from "./pages/admin/platform/PlatformUsers";
import PlatformLicenses from "./pages/admin/platform/PlatformLicenses";
import PlatformIntegrations from "./pages/admin/platform/PlatformIntegrations";
import PlatformStatus from "./pages/admin/platform/PlatformStatus";
import CreateWorkspace from "./pages/workspace/CreateWorkspace";
import SelectWorkspace from "./pages/workspace/SelectWorkspace";
import SupportPortal from "./pages/SupportPortal";
import SupportDashboard from "./pages/SupportDashboard";
import Tenders from "./pages/Tenders";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Main application component with providers
const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <TenantProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/employee-directory" element={<EmployeeDirectory />} />
                
                {/* Workspace Routes */}
                <Route path="/workspace/new" element={<CreateWorkspace />} />
                <Route path="/workspace/select" element={<SelectWorkspace />} />
                
                {/* Support Center Routes */}
                <Route path="/support" element={<SupportPortal />} />
                <Route path="/support/dashboard" element={<SupportDashboard />} />
                
                {/* Tender Management */}
                <Route path="/tenders" element={<Tenders />} />
                
                {/* Admin Center Routes */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="/admin/organization" replace />} />
                  <Route path="organization" element={<AdminOrganization />} />
                  <Route path="whitelabel" element={<AdminWhitelabel />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="alliance" element={<AdminAlliance />} />
                  <Route path="offerings" element={<AdminOfferings />} />
                  <Route path="integrations" element={<AdminIntegrations />} />
                  <Route path="documentation" element={<AdminDocumentation />} />
                  <Route path="portal" element={<Navigate to="/admin/users" replace />} />
                  <Route path="tenants" element={<Navigate to="/admin/platform/tenants" replace />} />
                  <Route path="platform" element={<PlatformLayout />}>
                    <Route index element={<Navigate to="/admin/platform/tenants" replace />} />
                    <Route path="tenants" element={<PlatformTenants />} />
                    <Route path="users" element={<PlatformUsers />} />
                    <Route path="licenses" element={<PlatformLicenses />} />
                    <Route path="integrations" element={<PlatformIntegrations />} />
                    <Route path="status" element={<PlatformStatus />} />
                  </Route>
                  <Route path="health" element={<AdminHealth />} />
                  <Route path="procurement" element={<AdminProcurement />} />
                  <Route path="support-management" element={<AdminSupportManagement />} />
                  <Route path="document-templates" element={<AdminDocumentTemplates />} />
                  <Route path="authorized-domains" element={<AdminAuthorizedDomains />} />
                </Route>
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <AuthDiagnosticsGate />
            </TooltipProvider>
          </TenantProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
