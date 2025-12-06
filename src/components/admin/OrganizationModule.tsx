import { useState } from "react";
import { Building2, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrganizationSettings } from "./OrganizationSettings";
import { AttendanceSettings } from "./AttendanceSettings";

export function OrganizationModule() {
  const [activeTab, setActiveTab] = useState("settings");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Organization Settings</h2>
          <p className="text-muted-foreground text-sm">
            Configure organization details and attendance policies
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Attendance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <OrganizationSettings />
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
