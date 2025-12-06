import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Globe, Linkedin, Twitter, MapPin, Users, DollarSign, Plus, X, Save, UserCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface SeniorManager {
  name: string;
  title: string;
  email: string;
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
  total_employees: number;
  senior_management: SeniorManager[];
}

export function OrganizationSettings() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [newCountry, setNewCountry] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newManager, setNewManager] = useState<SeniorManager>({ name: "", title: "", email: "" });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["organization-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .single();

      if (error) throw error;
      const seniorMgmt = data.senior_management;
      return {
        ...data,
        senior_management: Array.isArray(seniorMgmt) ? (seniorMgmt as unknown as SeniorManager[]) : [],
      } as OrgSettings;
    },
  });

  const [formData, setFormData] = useState<Partial<OrgSettings>>({});

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<OrgSettings>) => {
      const updateData = {
        ...data,
        senior_management: data.senior_management ? JSON.parse(JSON.stringify(data.senior_management)) : undefined,
      };
      const { error } = await supabase
        .from("organization_settings")
        .update(updateData)
        .eq("id", settings?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-settings"] });
      toast.success("Organization settings updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update settings: " + error.message);
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={formData.currency || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                  disabled={!isAdmin}
                />
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
              <Input
                id="website"
                value={formData.website_url || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, website_url: e.target.value }))}
                placeholder="https://yourcompany.com"
                disabled={!isAdmin}
              />
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
      </div>
    </div>
  );
}
