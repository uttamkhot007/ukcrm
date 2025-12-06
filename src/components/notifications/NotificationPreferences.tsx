import { useState } from "react";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  Monitor,
  BellRing,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const { isSupported, permission, requestPermission, isEnabled } = useBrowserNotifications();
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, boolean>>({});
  const [requestingPermission, setRequestingPermission] = useState(false);

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

  const handleRequestPermission = async () => {
    setRequestingPermission(true);
    const result = await requestPermission();
    setRequestingPermission(false);
    
    if (result === "granted") {
      toast.success("Browser notifications enabled!");
    } else if (result === "denied") {
      toast.error("Notification permission denied. You can enable it in browser settings.");
    }
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
      {/* Browser Push Notifications */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Monitor className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Browser Notifications</CardTitle>
                <CardDescription>Get notified even when the app is in the background</CardDescription>
              </div>
            </div>
            {isEnabled ? (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Enabled
              </Badge>
            ) : permission === "denied" ? (
              <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                Blocked
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {!isSupported ? (
            <p className="text-sm text-muted-foreground">
              Browser notifications are not supported in your browser.
            </p>
          ) : isEnabled ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
              <BellRing className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-foreground">You're all set!</p>
                <p className="text-xs text-muted-foreground">
                  You'll receive notifications when new alerts arrive while the app is in the background.
                </p>
              </div>
            </div>
          ) : permission === "denied" ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Browser notifications are blocked. To enable them:
              </p>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                <li>Click the lock/info icon in your browser's address bar</li>
                <li>Find "Notifications" in the permissions</li>
                <li>Change it from "Block" to "Allow"</li>
                <li>Refresh the page</li>
              </ol>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Enable browser notifications to get alerts even when the app is in the background.
              </p>
              <Button onClick={handleRequestPermission} disabled={requestingPermission} size="sm">
                {requestingPermission ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                Enable
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
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
