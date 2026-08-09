// App component with authentication and routing
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createPersistentQueryClient } from "@/lib/query-persist";
import { lazyDefault } from "@/lib/lazy-module";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { TenantProvider } from "@/contexts/TenantContext";
import { AuthDiagnosticsGate } from "@/components/auth/AuthDiagnosticsGate";
import { BuildVersionBadge } from "@/components/system/BuildVersionBadge";
import Auth from "./pages/Auth";

import NotFound from "./pages/NotFound";


// Route-level code splitting: the admin/platform console, support portal and
// tender screens no longer ship inside the initial bundle.
const Index = lazyDefault(() => import("./pages/Index"));
const Notifications = lazyDefault(() => import("./pages/Notifications"));
const EmployeeDirectory = lazyDefault(() => import("./pages/EmployeeDirectory"));
const AdminLayout = lazyDefault(() => import("./pages/admin/AdminLayout"));
const AdminOrganization = lazyDefault(() => import("./pages/admin/AdminOrganization"));
const AdminUsers = lazyDefault(() => import("./pages/admin/AdminUsers"));
const AdminIntegrations = lazyDefault(() => import("./pages/admin/AdminIntegrations"));
const AdminDocumentation = lazyDefault(() => import("./pages/admin/AdminDocumentation"));
const AdminHealth = lazyDefault(() => import("./pages/admin/AdminHealth"));
const AdminTenants = lazyDefault(() => import("./pages/admin/AdminTenants"));
const AdminAlliance = lazyDefault(() => import("./pages/admin/AdminAlliance"));
const AdminOfferings = lazyDefault(() => import("./pages/admin/AdminOfferings"));
const AdminProcurement = lazyDefault(() => import("./pages/admin/AdminProcurement"));
const AdminSupportManagement = lazyDefault(() => import("./pages/admin/AdminSupportManagement"));
const AdminDocumentTemplates = lazyDefault(() => import("./pages/admin/AdminDocumentTemplates"));
const AdminWhitelabel = lazyDefault(() => import("./pages/admin/AdminWhitelabel"));
const AdminAuthorizedDomains = lazyDefault(() => import("./pages/admin/AdminAuthorizedDomains"));
const PlatformLayout = lazyDefault(() => import("./pages/admin/platform/PlatformLayout"));
const PlatformTenants = lazyDefault(() => import("./pages/admin/platform/PlatformTenants"));
const PlatformUsers = lazyDefault(() => import("./pages/admin/platform/PlatformUsers"));
const PlatformLicenses = lazyDefault(() => import("./pages/admin/platform/PlatformLicenses"));
const PlatformIntegrations = lazyDefault(() => import("./pages/admin/platform/PlatformIntegrations"));
const PlatformStatus = lazyDefault(() => import("./pages/admin/platform/PlatformStatus"));
const PlatformObservability = lazyDefault(() => import("./pages/admin/platform/PlatformObservability"));
const PlatformDiagnostics = lazyDefault(() => import("./pages/admin/platform/PlatformDiagnostics"));

const CreateWorkspace = lazyDefault(() => import("./pages/workspace/CreateWorkspace"));
const SelectWorkspace = lazyDefault(() => import("./pages/workspace/SelectWorkspace"));
const SupportPortal = lazyDefault(() => import("./pages/SupportPortal"));
const SupportDashboard = lazyDefault(() => import("./pages/SupportDashboard"));
const Tenders = lazyDefault(() => import("./pages/Tenders"));

// A single client whose cache survives reloads, so reopening a module paints
// from the last known data and revalidates in the background.
const queryClient = createPersistentQueryClient(__APP_BUILD_TIME__);


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
              <Suspense fallback={<ModuleSkeleton />}>
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
                    <Route path="observability" element={<PlatformObservability />} />
                    <Route path="diagnostics" element={<PlatformDiagnostics />} />

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
              </Suspense>
              <AuthDiagnosticsGate />
              <BuildVersionBadge />
            </TooltipProvider>
          </TenantProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
