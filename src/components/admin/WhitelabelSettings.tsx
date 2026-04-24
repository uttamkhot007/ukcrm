import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Palette, Save, Image, Type, RotateCcw, Upload, Loader2, X } from "lucide-react";
import { useTenant, TenantBranding } from "@/contexts/TenantContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Json } from "@/integrations/supabase/types";

export function WhitelabelSettings() {
  const { currentTenant, isAdmin, refetchTenants, isLoading: tenantLoading } = useTenant();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
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

  // Initialize form data from currentTenant - only on first load or tenant change
  useEffect(() => {
    if (currentTenant && !tenantLoading) {
      setFormData({
        logo_url: currentTenant.logo_url || "",
        branding: {
          display_name: currentTenant.branding?.display_name || "",
          primary_color: currentTenant.branding?.primary_color || "",
          secondary_color: currentTenant.branding?.secondary_color || "",
          favicon_url: currentTenant.branding?.favicon_url || "",
        },
      });
      setIsInitialized(true);
    }
  }, [currentTenant?.id, tenantLoading]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentTenant?.id) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a JPG or PNG image");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${currentTenant.id}/logo-${Date.now()}.${fileExt}`;

      // Delete old logo if exists
      if (formData.logo_url && formData.logo_url.includes('tenant-logos')) {
        const oldPath = formData.logo_url.split('/tenant-logos/')[1];
        if (oldPath) {
          await supabase.storage.from('tenant-logos').remove([oldPath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('tenant-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tenant-logos')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, logo_url: publicUrl }));
      toast.success("Logo uploaded successfully");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to upload logo: " + message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!currentTenant?.id) return;

    try {
      if (formData.logo_url && formData.logo_url.includes('tenant-logos')) {
        const oldPath = formData.logo_url.split('/tenant-logos/')[1];
        if (oldPath) {
          await supabase.storage.from('tenant-logos').remove([oldPath]);
        }
      }
      setFormData(prev => ({ ...prev, logo_url: '' }));
      toast.success("Logo removed");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to remove logo: " + message);
    }
  };

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
      
      // Return the saved data so we can use it in onSuccess
      return data;
    },
    onSuccess: async (savedData) => {
      // First refetch to update the context with fresh DB data
      await refetchTenants();
      // Invalidate any tenant-related queries
      queryClient.invalidateQueries({ queryKey: ["tenant"] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      
      // Ensure form data stays in sync with what was saved
      setFormData({
        logo_url: savedData.logo_url,
        branding: savedData.branding,
      });
      
      toast.success("Whitelabel settings saved and applied!");
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

  // Show loading state while tenant data is being fetched
  if (tenantLoading || !isInitialized) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading whitelabel settings...</span>
        </div>
      </div>
    );
  }

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
              <Label>Logo Upload</Label>
              <div className="flex flex-col gap-3">
                {formData.logo_url ? (
                  <div className="relative w-full">
                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                      <div className="bg-background p-2 rounded-lg border">
                        <img 
                          src={formData.logo_url} 
                          alt="Tenant logo" 
                          className="h-16 max-w-[200px] object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Logo uploaded</p>
                        <p className="text-xs text-muted-foreground truncate mt-1">{formData.logo_url}</p>
                      </div>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleRemoveLogo}
                          className="shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ) : null}
                
                {isAdmin && (
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          {formData.logo_url ? 'Change Logo' : 'Upload Logo'}
                        </>
                      )}
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Accepts JPG or PNG format. Max 5MB.
                </p>
              </div>
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
              <Label className="mb-3 block">Sidebar Preview</Label>
              <div className="flex items-center gap-3 p-4 bg-sidebar rounded-lg border">
                {formData.logo_url ? (
                  <img 
                    src={formData.logo_url} 
                    alt="Logo preview" 
                    className="h-10 max-w-[160px] object-contain"
                  />
                ) : (
                  <>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-semibold">{displayName}</p>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                When a logo is uploaded, only the logo appears at the top of the sidebar.
              </p>
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