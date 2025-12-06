import { useState } from "react";
import { Settings, Puzzle, Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminPanel } from "./AdminPanel";
import { IntegrationsModule } from "./IntegrationsModule";
import { OrganizationSettings } from "./OrganizationSettings";

export function AdminCenter() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
          <Settings className="w-6 h-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Center</h1>
          <p className="text-muted-foreground">Manage system settings, integrations, and configurations</p>
        </div>
      </div>

      <Tabs defaultValue="organization" className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Puzzle className="w-4 h-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Admin Panel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organization">
          <OrganizationSettings />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsModule />
        </TabsContent>

        <TabsContent value="admin">
          <AdminPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
