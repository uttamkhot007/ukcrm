import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Palette, Save, Image, Type, RotateCcw } from "lucide-react";
import { useTenant, TenantBranding } from "@/contexts/TenantContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Json } from "@/integrations/supabase/types";

export function WhitelabelSettings() {
  const { currentTenant, isAdmin, refetchTenants } = useTenant();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<{
    logo_url: string;
    branding: TenantBranding;
  }>({
    logo_url: "",
    branding: {
      display_name: "",
      primary_color: "",
      secondary_color: "",
      favicon_url: "",
    },
  });

  useEffect(() => {
    if (currentTenant) {
      setFormData({
        logo_url: currentTenant.logo_url || "",
        branding: {
          display_name: currentTenant.branding?.display_name || "",
          primary_color: currentTenant.branding?.primary_color || "",
          secondary_color: currentTenant.branding?.secondary_color || "",
          favicon_url: currentTenant.branding?.favicon_url || "",
        },
      });
    }
  }, [currentTenant]);

  const updateMutation = useMutation({
    mutationFn: async (data: { logo_url: string; branding: TenantBranding }) => {
      if (!currentTenant?.id) throw new Error("No tenant selected");
      
      const { error } = await supabase
        .from("tenants")
        .update({
          logo_url: data.logo_url || null,
          branding: data.branding as Json,
        })
        .eq("id", currentTenant.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      await refetchTenants();
      queryClient.invalidateQueries({ queryKey: ["tenant"] });
      toast.success("Whitelabel settings updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update settings: " + error.message);
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleReset = () => {
    if (currentTenant) {
      setFormData({
        logo_url: currentTenant.logo_url || "",
        branding: {
          display_name: currentTenant.branding?.display_name || "",
          primary_color: currentTenant.branding?.primary_color || "",
          secondary_color: currentTenant.branding?.secondary_color || "",
          favicon_url: currentTenant.branding?.favicon_url || "",
        },
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = formData.branding.display_name || currentTenant?.name || "Workspace";

  if (!currentTenant) {
    return <div className="flex items-center justify-center p-8">No workspace selected</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Palette className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Whitelabel Settings</h2>
            <p className="text-sm text-muted-foreground">Customize your workspace branding</p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} disabled={updateMutation.isPending}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Logo & Name */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Image className="w-4 h-4" />
              Logo & Identity
            </CardTitle>
            <CardDescription>Customize how your workspace appears</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={formData.branding.display_name || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    branding: { ...prev.branding, display_name: e.target.value },
                  }))
                }
                placeholder={currentTenant.name}
                disabled={!isAdmin}
              />
              <p className="text-xs text-muted-foreground">
                Custom name shown in the sidebar. Leave empty to use workspace name.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                value={formData.logo_url || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, logo_url: e.target.value }))}
                placeholder="https://example.com/logo.png"
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="favicon_url">Favicon URL</Label>
              <Input
                id="favicon_url"
                value={formData.branding.favicon_url || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    branding: { ...prev.branding, favicon_url: e.target.value },
                  }))
                }
                placeholder="https://example.com/favicon.ico"
                disabled={!isAdmin}
              />
            </div>

            {/* Preview */}
            <div className="pt-4 border-t">
              <Label className="mb-3 block">Preview</Label>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={formData.logo_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{displayName}</p>
                  <p className="text-xs text-muted-foreground">Your workspace</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Type className="w-4 h-4" />
              Brand Colors
            </CardTitle>
            <CardDescription>Set your brand colors (optional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  type="color"
                  value={formData.branding.primary_color || "#6366f1"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      branding: { ...prev.branding, primary_color: e.target.value },
                    }))
                  }
                  className="w-14 h-10 p-1 cursor-pointer"
                  disabled={!isAdmin}
                />
                <Input
                  value={formData.branding.primary_color || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      branding: { ...prev.branding, primary_color: e.target.value },
                    }))
                  }
                  placeholder="#6366f1"
                  className="flex-1"
                  disabled={!isAdmin}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Main brand color for buttons and highlights
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondary_color">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary_color"
                  type="color"
                  value={formData.branding.secondary_color || "#8b5cf6"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      branding: { ...prev.branding, secondary_color: e.target.value },
                    }))
                  }
                  className="w-14 h-10 p-1 cursor-pointer"
                  disabled={!isAdmin}
                />
                <Input
                  value={formData.branding.secondary_color || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      branding: { ...prev.branding, secondary_color: e.target.value },
                    }))
                  }
                  placeholder="#8b5cf6"
                  className="flex-1"
                  disabled={!isAdmin}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Accent color for secondary elements
              </p>
            </div>

            {/* Color Preview */}
            <div className="pt-4 border-t">
              <Label className="mb-3 block">Color Preview</Label>
              <div className="flex gap-3">
                <div
                  className="w-16 h-16 rounded-lg shadow-sm flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: formData.branding.primary_color || "#6366f1" }}
                >
                  Primary
                </div>
                <div
                  className="w-16 h-16 rounded-lg shadow-sm flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: formData.branding.secondary_color || "#8b5cf6" }}
                >
                  Secondary
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Palette className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h4 className="font-medium mb-1">About Whitelabeling</h4>
              <p className="text-sm text-muted-foreground">
                Whitelabel settings allow you to customize the appearance of this workspace for your team.
                The display name and logo will appear in the sidebar and workspace switcher.
                Brand colors can be used to match your organization's identity.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}