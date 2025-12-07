import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Building2, Globe, Linkedin, Twitter, MapPin, Users, DollarSign, Plus, X, Save, UserCircle, AlertTriangle, Loader2, Search } from "lucide-react";

const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "MXN", name: "Mexican Peso", symbol: "$" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  { code: "DKK", name: "Danish Krone", symbol: "kr" },
  { code: "COP", name: "Colombian Peso", symbol: "$" },
  { code: "ARS", name: "Argentine Peso", symbol: "$" },
];

import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";

interface SeniorManager {
  name: string;
  title: string;
  email: string;
}

interface MaintenanceSettings {
  maintenance_mode?: boolean;
  maintenance_message?: string;
}

interface OrgSettings {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  address: string | null;
  countries: string[];
  cities: string[];
  currency: string;
  alternate_currency: string;
  total_employees: number;
  senior_management: SeniorManager[];
}

export function OrganizationSettings() {
  const { isAdmin } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [newCountry, setNewCountry] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newManager, setNewManager] = useState<SeniorManager>({ name: "", title: "", email: "" });
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("System maintenance in progress. Some features may be temporarily unavailable.");
  const [isFetchingCompanyInfo, setIsFetchingCompanyInfo] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["organization-settings", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .single();

      if (error) {
        // If no settings exist for this tenant, return default values
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      const seniorMgmt = data.senior_management;
      return {
        ...data,
        senior_management: Array.isArray(seniorMgmt) ? (seniorMgmt as unknown as SeniorManager[]) : [],
      } as OrgSettings;
    },
    enabled: !!currentTenant?.id,
  });

  const [formData, setFormData] = useState<Partial<OrgSettings>>({});

  useEffect(() => {
    if (settings) {
      setFormData(settings);
      // Load maintenance settings from senior_management JSON
      const seniorMgmt = settings.senior_management as unknown as MaintenanceSettings;
      if (seniorMgmt && typeof seniorMgmt === 'object' && !Array.isArray(seniorMgmt)) {
        setMaintenanceMode(seniorMgmt.maintenance_mode || false);
        if (seniorMgmt.maintenance_message) {
          setMaintenanceMessage(seniorMgmt.maintenance_message);
        }
      }
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<OrgSettings>) => {
      if (!currentTenant?.id) throw new Error("No tenant selected");
      
      const updateData = {
        ...data,
        senior_management: data.senior_management ? JSON.parse(JSON.stringify(data.senior_management)) : undefined,
      };
      
      if (settings?.id) {
        // Update existing settings
        const { error } = await supabase
          .from("organization_settings")
          .update(updateData)
          .eq("id", settings.id)
          .eq("tenant_id", currentTenant.id);
        if (error) throw error;
      } else {
        // Create new settings for this tenant
        const { error } = await supabase
          .from("organization_settings")
          .insert({ ...updateData, tenant_id: currentTenant.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-settings", currentTenant?.id] });
      toast.success("Organization settings updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update settings: " + error.message);
    },
  });

  const maintenanceMutation = useMutation({
    mutationFn: async ({ mode, message }: { mode: boolean; message: string }) => {
      if (!currentTenant?.id || !settings?.id) throw new Error("No tenant or settings found");
      
      const { error } = await supabase
        .from("organization_settings")
        .update({
          senior_management: {
            maintenance_mode: mode,
            maintenance_message: message,
          },
        })
        .eq("id", settings.id)
        .eq("tenant_id", currentTenant.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-settings", currentTenant?.id] });
      toast.success(maintenanceMode ? "Maintenance mode enabled" : "Maintenance mode disabled");
    },
    onError: (error) => {
      toast.error("Failed to update maintenance mode: " + error.message);
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleMaintenanceToggle = (enabled: boolean) => {
    setMaintenanceMode(enabled);
    maintenanceMutation.mutate({ mode: enabled, message: maintenanceMessage });
  };

  const handleMaintenanceMessageSave = () => {
    maintenanceMutation.mutate({ mode: maintenanceMode, message: maintenanceMessage });
  };

  const fetchCompanyInfo = async () => {
    const url = formData.website_url;
    if (!url) {
      toast.error("Please enter a website URL first");
      return;
    }

    setIsFetchingCompanyInfo(true);
    try {
      const response = await supabase.functions.invoke('fetch-company-info', {
        body: { url }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { data } = response.data;
      if (data) {
        setFormData(prev => ({
          ...prev,
          name: data.name || prev.name,
          logo_url: data.logo_url || prev.logo_url,
          linkedin_url: data.linkedin_url || prev.linkedin_url,
          twitter_url: data.twitter_url || prev.twitter_url,
          address: data.address || prev.address,
          website_url: data.website_url || prev.website_url,
        }));
        toast.success("Company information fetched successfully");
      }
    } catch (error: any) {
      console.error('Error fetching company info:', error);
      toast.error("Failed to fetch company info: " + (error.message || "Unknown error"));
    } finally {
      setIsFetchingCompanyInfo(false);
    }
  };

  const addCountry = () => {
    if (newCountry.trim()) {
      setFormData((prev) => ({
        ...prev,
        countries: [...(prev.countries || []), newCountry.trim()],
      }));
      setNewCountry("");
    }
  };

  const removeCountry = (country: string) => {
    setFormData((prev) => ({
      ...prev,
      countries: (prev.countries || []).filter((c) => c !== country),
    }));
  };

  const addCity = () => {
    if (newCity.trim()) {
      setFormData((prev) => ({
        ...prev,
        cities: [...(prev.cities || []), newCity.trim()],
      }));
      setNewCity("");
    }
  };

  const removeCity = (city: string) => {
    setFormData((prev) => ({
      ...prev,
      cities: (prev.cities || []).filter((c) => c !== city),
    }));
  };

  const addManager = () => {
    if (newManager.name.trim() && newManager.title.trim()) {
      setFormData((prev) => ({
        ...prev,
        senior_management: [...(prev.senior_management || []), newManager],
      }));
      setNewManager({ name: "", title: "", email: "" });
    }
  };

  const removeManager = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      senior_management: (prev.senior_management || []).filter((_, i) => i !== index),
    }));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Organization Settings</h2>
            <p className="text-sm text-muted-foreground">Manage your organization details</p>
          </div>
        </div>
        {isAdmin && (
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
            <CardDescription>Your organization's core details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL</Label>
              <Input
                id="logo"
                value={formData.logo_url || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, logo_url: e.target.value }))}
                placeholder="https://example.com/logo.png"
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Primary Currency</Label>
              <Select
                value={formData.currency || "USD"}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, currency: value }))}
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      <span className="flex items-center gap-2">
                        <span className="font-mono">{currency.symbol}</span>
                        <span>{currency.code}</span>
                        <span className="text-muted-foreground">- {currency.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="alternate_currency">Alternate Currency (for conversions)</Label>
              <Select
                value={formData.alternate_currency || "USD"}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, alternate_currency: value }))}
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select alternate currency" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {CURRENCIES.filter((c) => c.code !== formData.currency).map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      <span className="flex items-center gap-2">
                        <span className="font-mono">{currency.symbol}</span>
                        <span>{currency.code}</span>
                        <span className="text-muted-foreground">- {currency.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used for displaying converted amounts across the app
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="employees">Total Employees</Label>
              <Input
                id="employees"
                type="number"
                value={formData.total_employees || 0}
                onChange={(e) => setFormData((prev) => ({ ...prev, total_employees: parseInt(e.target.value) || 0 }))}
                disabled={!isAdmin}
              />
            </div>
          </CardContent>
        </Card>

        {/* URLs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Online Presence
            </CardTitle>
            <CardDescription>Website and social media links</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="website">Website URL</Label>
              <div className="flex gap-2">
                <Input
                  id="website"
                  value={formData.website_url || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, website_url: e.target.value }))}
                  placeholder="https://yourcompany.com"
                  disabled={!isAdmin}
                  className="flex-1"
                />
                {isAdmin && (
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={fetchCompanyInfo}
                    disabled={isFetchingCompanyInfo || !formData.website_url}
                    title="Fetch company details from website"
                  >
                    {isFetchingCompanyInfo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span className="ml-2 hidden sm:inline">Fetch Info</span>
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Enter website URL and click "Fetch Info" to auto-populate company details
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin" className="flex items-center gap-2">
                <Linkedin className="w-4 h-4" />
                LinkedIn URL
              </Label>
              <Input
                id="linkedin"
                value={formData.linkedin_url || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, linkedin_url: e.target.value }))}
                placeholder="https://linkedin.com/company/yourcompany"
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitter" className="flex items-center gap-2">
                <Twitter className="w-4 h-4" />
                Twitter URL
              </Label>
              <Input
                id="twitter"
                value={formData.twitter_url || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, twitter_url: e.target.value }))}
                placeholder="https://twitter.com/yourcompany"
                disabled={!isAdmin}
              />
            </div>
          </CardContent>
        </Card>

        {/* Address & Locations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Locations
            </CardTitle>
            <CardDescription>Business address and locations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Headquarters Address</Label>
              <Textarea
                id="address"
                value={formData.address || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Enter full address..."
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>Countries</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(formData.countries || []).map((country) => (
                  <Badge key={country} variant="secondary" className="flex items-center gap-1">
                    {country}
                    {isAdmin && (
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeCountry(country)}
                      />
                    )}
                  </Badge>
                ))}
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <Input
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value)}
                    placeholder="Add country..."
                    onKeyPress={(e) => e.key === "Enter" && addCountry()}
                  />
                  <Button type="button" size="icon" onClick={addCountry}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Cities</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(formData.cities || []).map((city) => (
                  <Badge key={city} variant="outline" className="flex items-center gap-1">
                    {city}
                    {isAdmin && (
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeCity(city)}
                      />
                    )}
                  </Badge>
                ))}
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <Input
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="Add city..."
                    onKeyPress={(e) => e.key === "Enter" && addCity()}
                  />
                  <Button type="button" size="icon" onClick={addCity}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Senior Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-4 h-4" />
              Senior Management
            </CardTitle>
            <CardDescription>Key leadership team members</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {(formData.senior_management || []).map((manager, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{manager.name}</p>
                    <p className="text-sm text-muted-foreground">{manager.title}</p>
                    {manager.email && (
                      <p className="text-xs text-muted-foreground">{manager.email}</p>
                    )}
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeManager(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {isAdmin && (
              <div className="space-y-3 pt-3 border-t">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={newManager.name}
                    onChange={(e) => setNewManager((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Name"
                  />
                  <Input
                    value={newManager.title}
                    onChange={(e) => setNewManager((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Title"
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newManager.email}
                    onChange={(e) => setNewManager((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="Email (optional)"
                    type="email"
                  />
                  <Button type="button" onClick={addManager}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Maintenance Mode */}
        {isAdmin && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Maintenance Mode
              </CardTitle>
              <CardDescription>Display a warning banner to all users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="maintenance-mode">Enable Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Shows a warning banner at the top of the portal
                  </p>
                </div>
                <Switch
                  id="maintenance-mode"
                  checked={maintenanceMode}
                  onCheckedChange={handleMaintenanceToggle}
                  disabled={maintenanceMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenance-message">Maintenance Message</Label>
                <Textarea
                  id="maintenance-message"
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  placeholder="Enter maintenance message..."
                  rows={2}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleMaintenanceMessageSave}
                  disabled={maintenanceMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Update Message
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
