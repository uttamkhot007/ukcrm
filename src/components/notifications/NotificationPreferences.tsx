import { useState } from "react";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useNotificationSound, SoundType } from "@/hooks/useNotificationSound";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Volume2,
  VolumeX,
  Moon,
  Play,
  Smartphone,
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

const soundOptions: { value: SoundType; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "chime", label: "Chime" },
  { value: "bell", label: "Bell" },
  { value: "pop", label: "Pop" },
  { value: "none", label: "None (Silent)" },
];

type CategoryKey = typeof categories[number]["key"];

export function NotificationPreferences() {
  const { preferences, isLoading, updatePreferences, isUpdating } = useNotificationPreferences();
  const { isSupported, permission, requestPermission, isEnabled } = useBrowserNotifications();
  const { 
    isSupported: isPushSupported, 
    isSubscribed: isPushSubscribed, 
    isLoading: isPushLoading,
    permission: pushPermission,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
  } = usePushNotifications();
  const { testSound } = useNotificationSound();
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

  const handleSelectChange = (key: string, value: string) => {
    setPendingUpdates(prev => ({ ...prev, [key]: true }));
    updatePreferences({ [key]: value } as any);
    setTimeout(() => {
      setPendingUpdates(prev => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    }, 500);
  };

  const handleTimeChange = (key: string, value: string) => {
    const timeValue = value + ":00";
    handleSelectChange(key, timeValue);
  };

  const formatTimeForInput = (time: string) => {
    return time.slice(0, 5);
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
      {/* Browser Notifications */}
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
              <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
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

      {/* Push Notifications */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Smartphone className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Push Notifications</CardTitle>
                <CardDescription>Receive alerts even when the app is closed</CardDescription>
              </div>
            </div>
            {isPushSubscribed ? (
              <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Active
              </Badge>
            ) : pushPermission === "denied" ? (
              <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                Blocked
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {!isPushSupported ? (
            <p className="text-sm text-muted-foreground">
              Push notifications are not supported in your browser.
            </p>
          ) : isPushSubscribed ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20 flex-1 mr-4">
                <BellRing className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium text-foreground">Push notifications active</p>
                  <p className="text-xs text-muted-foreground">
                    You'll receive push alerts even when the app is closed.
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={unsubscribePush}
                disabled={isPushLoading}
              >
                {isPushLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Disable"
                )}
              </Button>
            </div>
          ) : pushPermission === "denied" ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Push notifications are blocked. To enable them, allow notifications in your browser settings.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Enable push notifications to receive alerts even when the app is closed.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Note: Server configuration required for full functionality.
                </p>
              </div>
              <Button 
                size="sm" 
                disabled={isPushLoading}
                onClick={() => {
                  toast.info("Push notifications require VAPID keys to be configured.");
                }}
              >
                {isPushLoading ? (
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

      {/* Sound & Quiet Hours */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                {preferences.sound_enabled ? (
                  <Volume2 className="w-5 h-5 text-purple-500" />
                ) : (
                  <VolumeX className="w-5 h-5 text-purple-500" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">Sound & Quiet Hours</CardTitle>
                <CardDescription>Customize notification sounds and quiet times</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pendingUpdates["sound_enabled"] && (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              )}
              <Switch
                checked={preferences.sound_enabled}
                onCheckedChange={(v) => handleToggle("sound_enabled", v)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sound Type */}
          <div className={cn(
            "space-y-3 transition-opacity",
            !preferences.sound_enabled && "opacity-50 pointer-events-none"
          )}>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Notification Sound</Label>
                <p className="text-xs text-muted-foreground">Choose a sound for notifications</p>
              </div>
              <div className="flex items-center gap-2">
                {pendingUpdates["sound_type"] && (
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                )}
                <Select
                  value={preferences.sound_type}
                  onValueChange={(v) => handleSelectChange("sound_type", v)}
                  disabled={!preferences.sound_enabled}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {soundOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => testSound(preferences.sound_type as SoundType)}
                  disabled={!preferences.sound_enabled || preferences.sound_type === "none"}
                >
                  <Play className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Moon className="w-4 h-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Quiet Hours (Do Not Disturb)</Label>
                  <p className="text-xs text-muted-foreground">Mute sounds during specific hours</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pendingUpdates["quiet_hours_enabled"] && (
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                )}
                <Switch
                  checked={preferences.quiet_hours_enabled}
                  onCheckedChange={(v) => handleToggle("quiet_hours_enabled", v)}
                />
              </div>
            </div>
            
            <div className={cn(
              "flex items-center gap-4 transition-opacity",
              !preferences.quiet_hours_enabled && "opacity-50 pointer-events-none"
            )}>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Start</Label>
                <Input
                  type="time"
                  value={formatTimeForInput(preferences.quiet_hours_start)}
                  onChange={(e) => handleTimeChange("quiet_hours_start", e.target.value)}
                  disabled={!preferences.quiet_hours_enabled}
                  className="w-full"
                />
              </div>
              <span className="text-muted-foreground mt-5">to</span>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1.5 block">End</Label>
                <Input
                  type="time"
                  value={formatTimeForInput(preferences.quiet_hours_end)}
                  onChange={(e) => handleTimeChange("quiet_hours_end", e.target.value)}
                  disabled={!preferences.quiet_hours_enabled}
                  className="w-full"
                />
              </div>
            </div>
            {preferences.quiet_hours_enabled && (
              <p className="text-xs text-muted-foreground mt-2">
                Sounds will be muted from {formatTimeForInput(preferences.quiet_hours_start)} to {formatTimeForInput(preferences.quiet_hours_end)}
              </p>
            )}
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
