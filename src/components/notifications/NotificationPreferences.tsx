import { useState } from "react";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  Mail,
  FileText,
  CheckCircle2,
  DollarSign,
  Ticket,
  Calendar,
  Shield,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const categories = [
  { key: "requests", label: "Employee Requests", icon: FileText, description: "Leave, WFH, hardware requests" },
  { key: "approvals", label: "Approvals", icon: CheckCircle2, description: "Approval workflow notifications" },
  { key: "deals", label: "Deals & Sales", icon: DollarSign, description: "Deal updates, stage changes" },
  { key: "tickets", label: "Support Tickets", icon: Ticket, description: "Ticket assignments, updates" },
  { key: "renewals", label: "Renewals", icon: Calendar, description: "Expiring contracts, licenses" },
  { key: "compliance", label: "Compliance", icon: Shield, description: "Framework updates, assessments" },
] as const;

type CategoryKey = typeof categories[number]["key"];

export function NotificationPreferences() {
  const { preferences, isLoading, updatePreferences, isUpdating } = useNotificationPreferences();
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, boolean>>({});

  const handleToggle = (key: string, value: boolean) => {
    setPendingUpdates(prev => ({ ...prev, [key]: true }));
    updatePreferences({ [key]: value } as any);
    setTimeout(() => {
      setPendingUpdates(prev => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    }, 500);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* In-App Notifications */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">In-App Notifications</CardTitle>
                <CardDescription>Notifications shown in the app</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pendingUpdates["in_app_enabled"] && (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              )}
              <Switch
                checked={preferences.in_app_enabled}
                onCheckedChange={(v) => handleToggle("in_app_enabled", v)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={cn(
            "space-y-4 transition-opacity",
            !preferences.in_app_enabled && "opacity-50 pointer-events-none"
          )}>
            {categories.map((category) => {
              const key = `in_app_${category.key}` as keyof typeof preferences;
              const Icon = category.icon;
              return (
                <div key={category.key} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <Label className="text-sm font-medium">{category.label}</Label>
                      <p className="text-xs text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pendingUpdates[key] && (
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    )}
                    <Switch
                      checked={preferences[key] as boolean}
                      onCheckedChange={(v) => handleToggle(key, v)}
                      disabled={!preferences.in_app_enabled}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Mail className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Email Notifications</CardTitle>
                <CardDescription>Receive notifications via email</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pendingUpdates["email_enabled"] && (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              )}
              <Switch
                checked={preferences.email_enabled}
                onCheckedChange={(v) => handleToggle("email_enabled", v)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={cn(
            "space-y-4 transition-opacity",
            !preferences.email_enabled && "opacity-50 pointer-events-none"
          )}>
            {categories.map((category) => {
              const key = `email_${category.key}` as keyof typeof preferences;
              const Icon = category.icon;
              return (
                <div key={category.key} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <Label className="text-sm font-medium">{category.label}</Label>
                      <p className="text-xs text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pendingUpdates[key] && (
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    )}
                    <Switch
                      checked={preferences[key] as boolean}
                      onCheckedChange={(v) => handleToggle(key, v)}
                      disabled={!preferences.email_enabled}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
