import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Package, Shield, Server, Briefcase, Target, Cpu, Building2, ChevronDown, ChevronRight, Link } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Offering {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  category?: string | null;
  service_type?: string | null;
  area_type?: string | null;
  vendor?: string | null;
  website?: string | null;
  partnership_level?: string | null;
  status: string;
  created_at: string;
  created_by: string;
  oem_id?: string | null;
  technology_id?: string | null;
}

interface OemTechnology {
  id: string;
  oem_id: string;
  technology_id: string;
  tenant_id: string | null;
}

type OfferingType = "solutions" | "offensive_security" | "managed_security" | "professional_services" | "problem_areas" | "technologies" | "oems";

const offeringTabs: { value: OfferingType; label: string; icon: React.ElementType; table: string }[] = [
  { value: "solutions", label: "Solutions", icon: Package, table: "offerings_solutions" },
  { value: "offensive_security", label: "Offensive Security", icon: Shield, table: "offerings_offensive_security" },
  { value: "managed_security", label: "Managed Security", icon: Server, table: "offerings_managed_security" },
  { value: "professional_services", label: "Professional Services", icon: Briefcase, table: "offerings_professional_services" },
  { value: "problem_areas", label: "Problem & Requirement Areas", icon: Target, table: "offerings_problem_areas" },
  { value: "technologies", label: "Technologies", icon: Cpu, table: "offerings_technologies" },
  { value: "oems", label: "OEMs", icon: Building2, table: "offerings_oems" },
];

export function OfferingsModule() {
  const [activeTab, setActiveTab] = useState<OfferingType>("solutions");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Offering | null>(null);
  const [expandedOems, setExpandedOems] = useState<Set<string>>(new Set());
  const [linkTechDialogOpen, setLinkTechDialogOpen] = useState(false);
  const [selectedOemForLink, setSelectedOemForLink] = useState<Offering | null>(null);
  
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const currentTabConfig = offeringTabs.find(t => t.value === activeTab)!;

  // Fetch OEMs for dropdown
  const { data: oems = [] } = useQuery({
    queryKey: ["offerings", "oems", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase
        .from("offerings_oems")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data as Offering[];
    },
    enabled: !!currentTenant,
  });

  // Fetch Technologies for dropdown
  const { data: technologies = [] } = useQuery({
    queryKey: ["offerings", "technologies", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase
        .from("offerings_technologies")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data as Offering[];
    },
    enabled: !!currentTenant,
  });

  // Fetch OEM-Technology relationships
  const { data: oemTechnologies = [] } = useQuery({
    queryKey: ["oem_technologies", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase
        .from("oem_technologies")
        .select("*")
        .eq("tenant_id", currentTenant.id);
      if (error) throw error;
      return data as OemTechnology[];
    },
    enabled: !!currentTenant,
  });

  // Fetch all solutions for OEM view
  const { data: allSolutions = [] } = useQuery({
    queryKey: ["offerings", "solutions", "all", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase
        .from("offerings_solutions")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .order("name");
      if (error) throw error;
      return data as Offering[];
    },
    enabled: !!currentTenant,
  });

  // Fetch offerings for current tab
  const { data: offerings = [], isLoading } = useQuery({
    queryKey: ["offerings", activeTab, currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      let query;
      switch (activeTab) {
        case "solutions":
          query = supabase.from("offerings_solutions").select("*").eq("tenant_id", currentTenant.id).order("name");
          break;
        case "offensive_security":
          query = supabase.from("offerings_offensive_security").select("*").eq("tenant_id", currentTenant.id).order("name");
          break;
        case "managed_security":
          query = supabase.from("offerings_managed_security").select("*").eq("tenant_id", currentTenant.id).order("name");
          break;
        case "professional_services":
          query = supabase.from("offerings_professional_services").select("*").eq("tenant_id", currentTenant.id).order("name");
          break;
        case "problem_areas":
          query = supabase.from("offerings_problem_areas").select("*").eq("tenant_id", currentTenant.id).order("name");
          break;
        case "technologies":
          query = supabase.from("offerings_technologies").select("*").eq("tenant_id", currentTenant.id).order("name");
          break;
        case "oems":
          query = supabase.from("offerings_oems").select("*").eq("tenant_id", currentTenant.id).order("name");
          break;
        default:
          return [];
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Offering[];
    },
    enabled: !!currentTenant,
  });

  // Link technology to OEM mutation
  const linkTechMutation = useMutation({
    mutationFn: async ({ oemId, technologyId }: { oemId: string; technologyId: string }) => {
      const { error } = await supabase.from("oem_technologies").insert({
        oem_id: oemId,
        technology_id: technologyId,
        tenant_id: currentTenant?.id,
        created_by: user?.id!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oem_technologies"] });
      toast.success("Technology linked to OEM");
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("This technology is already linked to this OEM");
      } else {
        toast.error("Failed to link: " + error.message);
      }
    },
  });

  // Unlink technology from OEM mutation
  const unlinkTechMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("oem_technologies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oem_technologies"] });
      toast.success("Technology unlinked from OEM");
    },
    onError: (error) => {
      toast.error("Failed to unlink: " + error.message);
    },
  });

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: async (itemData: Partial<Offering>) => {
      const baseData: any = {
        name: itemData.name,
        description: itemData.description,
        status: itemData.status,
      };
      
      // Add type-specific fields
      if (activeTab === "solutions") {
        baseData.category = itemData.category;
        baseData.oem_id = itemData.oem_id || null;
        baseData.technology_id = itemData.technology_id || null;
      } else if (activeTab === "problem_areas") {
        baseData.area_type = itemData.area_type;
      } else if (activeTab === "technologies") {
        baseData.category = itemData.category;
        baseData.vendor = itemData.vendor;
      } else if (activeTab === "oems") {
        baseData.website = itemData.website;
        baseData.partnership_level = itemData.partnership_level;
      } else {
        baseData.service_type = itemData.service_type;
      }

      if (editingItem) {
        let updateQuery;
        switch (activeTab) {
          case "solutions":
            updateQuery = supabase.from("offerings_solutions").update(baseData).eq("id", editingItem.id);
            break;
          case "offensive_security":
            updateQuery = supabase.from("offerings_offensive_security").update(baseData).eq("id", editingItem.id);
            break;
          case "managed_security":
            updateQuery = supabase.from("offerings_managed_security").update(baseData).eq("id", editingItem.id);
            break;
          case "professional_services":
            updateQuery = supabase.from("offerings_professional_services").update(baseData).eq("id", editingItem.id);
            break;
          case "problem_areas":
            updateQuery = supabase.from("offerings_problem_areas").update(baseData).eq("id", editingItem.id);
            break;
          case "technologies":
            updateQuery = supabase.from("offerings_technologies").update(baseData).eq("id", editingItem.id);
            break;
          case "oems":
            updateQuery = supabase.from("offerings_oems").update(baseData).eq("id", editingItem.id);
            break;
        }
        const { error } = await updateQuery!;
        if (error) throw error;
      } else {
        const insertData: any = {
          ...baseData,
          tenant_id: currentTenant?.id,
          created_by: user?.id!,
        };
        let insertQuery;
        switch (activeTab) {
          case "solutions":
            insertQuery = supabase.from("offerings_solutions").insert(insertData);
            break;
          case "offensive_security":
            insertQuery = supabase.from("offerings_offensive_security").insert(insertData);
            break;
          case "managed_security":
            insertQuery = supabase.from("offerings_managed_security").insert(insertData);
            break;
          case "professional_services":
            insertQuery = supabase.from("offerings_professional_services").insert(insertData);
            break;
          case "problem_areas":
            insertQuery = supabase.from("offerings_problem_areas").insert(insertData);
            break;
          case "technologies":
            insertQuery = supabase.from("offerings_technologies").insert(insertData);
            break;
          case "oems":
            insertQuery = supabase.from("offerings_oems").insert(insertData);
            break;
        }
        const { error } = await insertQuery!;
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offerings", activeTab] });
      queryClient.invalidateQueries({ queryKey: ["offerings", "solutions", "all"] });
      setIsDialogOpen(false);
      setEditingItem(null);
      toast.success(editingItem ? "Item updated" : "Item created");
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      let deleteQuery;
      switch (activeTab) {
        case "solutions":
          deleteQuery = supabase.from("offerings_solutions").delete().eq("id", id);
          break;
        case "offensive_security":
          deleteQuery = supabase.from("offerings_offensive_security").delete().eq("id", id);
          break;
        case "managed_security":
          deleteQuery = supabase.from("offerings_managed_security").delete().eq("id", id);
          break;
        case "professional_services":
          deleteQuery = supabase.from("offerings_professional_services").delete().eq("id", id);
          break;
        case "problem_areas":
          deleteQuery = supabase.from("offerings_problem_areas").delete().eq("id", id);
          break;
        case "technologies":
          deleteQuery = supabase.from("offerings_technologies").delete().eq("id", id);
          break;
        case "oems":
          deleteQuery = supabase.from("offerings_oems").delete().eq("id", id);
          break;
      }
      const { error } = await deleteQuery!;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offerings", activeTab] });
      queryClient.invalidateQueries({ queryKey: ["offerings", "solutions", "all"] });
      toast.success("Item deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete: " + error.message);
    },
  });

  const filteredOfferings = offerings.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    mutation.mutate({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      category: formData.get("category") as string,
      service_type: formData.get("service_type") as string,
      area_type: formData.get("area_type") as string,
      vendor: formData.get("vendor") as string,
      website: formData.get("website") as string,
      partnership_level: formData.get("partnership_level") as string,
      status: formData.get("status") as string,
      oem_id: formData.get("oem_id") as string || null,
      technology_id: formData.get("technology_id") as string || null,
    });
  };

  const getSecondaryColumnHeader = () => {
    switch (activeTab) {
      case "solutions":
        return "OEM / Technology";
      case "problem_areas":
        return "Area Type";
      case "technologies":
        return "Vendor";
      case "oems":
        return "Partnership Level";
      default:
        return "Service Type";
    }
  };

  const getSecondaryColumnValue = (item: Offering) => {
    switch (activeTab) {
      case "solutions":
        const oem = oems.find(o => o.id === item.oem_id);
        const tech = technologies.find(t => t.id === item.technology_id);
        if (oem && tech) return `${oem.name} / ${tech.name}`;
        if (oem) return oem.name;
        if (tech) return tech.name;
        return item.category || "-";
      case "problem_areas":
        return item.area_type;
      case "technologies":
        return item.vendor;
      case "oems":
        return item.partnership_level;
      default:
        return item.service_type;
    }
  };

  const toggleOemExpanded = (oemId: string) => {
    const newExpanded = new Set(expandedOems);
    if (newExpanded.has(oemId)) {
      newExpanded.delete(oemId);
    } else {
      newExpanded.add(oemId);
    }
    setExpandedOems(newExpanded);
  };

  const getOemTechnologies = (oemId: string) => {
    const linkedTechIds = oemTechnologies
      .filter(ot => ot.oem_id === oemId)
      .map(ot => ot.technology_id);
    return technologies.filter(t => linkedTechIds.includes(t.id));
  };

  const getOemSolutions = (oemId: string) => {
    return allSolutions.filter(s => s.oem_id === oemId);
  };

  const getTechnologySolutions = (oemId: string, techId: string) => {
    return allSolutions.filter(s => s.oem_id === oemId && s.technology_id === techId);
  };

  const getUnlinkedTechnologies = (oemId: string) => {
    const linkedTechIds = oemTechnologies
      .filter(ot => ot.oem_id === oemId)
      .map(ot => ot.technology_id);
    return technologies.filter(t => !linkedTechIds.includes(t.id));
  };

  const renderFormFields = () => {
    switch (activeTab) {
      case "solutions":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="oem_id">OEM</Label>
              <Select name="oem_id" defaultValue={editingItem?.oem_id || ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Select OEM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {oems.map(oem => (
                    <SelectItem key={oem.id} value={oem.id}>{oem.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="technology_id">Technology</Label>
              <Select name="technology_id" defaultValue={editingItem?.technology_id || ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Technology" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {technologies.map(tech => (
                    <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" defaultValue={editingItem?.category || ""} />
            </div>
          </>
        );
      case "problem_areas":
        return (
          <div className="space-y-2">
            <Label htmlFor="area_type">Area Type</Label>
            <Select name="area_type" defaultValue={editingItem?.area_type || "problem"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="problem">Problem Area</SelectItem>
                <SelectItem value="requirement">Requirement Area</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case "technologies":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" defaultValue={editingItem?.category || ""} placeholder="e.g., Security, Cloud, DevOps" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Input id="vendor" name="vendor" defaultValue={editingItem?.vendor || ""} />
            </div>
          </>
        );
      case "oems":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" type="url" defaultValue={editingItem?.website || ""} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partnership_level">Partnership Level</Label>
              <Select name="partnership_level" defaultValue={editingItem?.partnership_level || "partner"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platinum">Platinum</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="reseller">Reseller</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );
      default:
        return (
          <div className="space-y-2">
            <Label htmlFor="service_type">Service Type</Label>
            <Input id="service_type" name="service_type" defaultValue={editingItem?.service_type || ""} />
          </div>
        );
    }
  };

  const renderOemsTable = () => {
    return (
      <div className="space-y-4">
        {filteredOfferings.map(oem => {
          const isExpanded = expandedOems.has(oem.id);
          const oemTechs = getOemTechnologies(oem.id);
          const oemSolutions = getOemSolutions(oem.id);

          return (
            <Card key={oem.id} className="overflow-hidden">
              <Collapsible open={isExpanded} onOpenChange={() => toggleOemExpanded(oem.id)}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {oem.name}
                          <Badge variant={oem.status === "active" ? "default" : "secondary"} className="text-xs">
                            {oem.status}
                          </Badge>
                          {oem.partnership_level && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {oem.partnership_level}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {oemTechs.length} technologies · {oemSolutions.length} solutions
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => {
                          setSelectedOemForLink(oem);
                          setLinkTechDialogOpen(true);
                        }}
                      >
                        <Link className="h-3 w-3" />
                        Link Technology
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingItem(oem);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(oem.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t bg-muted/30 p-4">
                    {oemTechs.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No technologies linked yet. Click "Link Technology" to add.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {oemTechs.map(tech => {
                          const techSolutions = getTechnologySolutions(oem.id, tech.id);
                          const linkRecord = oemTechnologies.find(
                            ot => ot.oem_id === oem.id && ot.technology_id === tech.id
                          );
                          
                          return (
                            <div key={tech.id} className="bg-background rounded-lg p-3 border">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Cpu className="h-4 w-4 text-primary" />
                                  <span className="font-medium">{tech.name}</span>
                                  {tech.category && (
                                    <Badge variant="outline" className="text-xs">
                                      {tech.category}
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive h-7"
                                  onClick={() => linkRecord && unlinkTechMutation.mutate(linkRecord.id)}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Unlink
                                </Button>
                              </div>
                              {techSolutions.length > 0 ? (
                                <div className="ml-6 space-y-1">
                                  <p className="text-xs text-muted-foreground mb-1">Solutions:</p>
                                  {techSolutions.map(sol => (
                                    <div key={sol.id} className="flex items-center gap-2 text-sm">
                                      <Package className="h-3 w-3 text-muted-foreground" />
                                      <span>{sol.name}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="ml-6 text-xs text-muted-foreground">No solutions mapped to this technology</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
        {filteredOfferings.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">No OEMs found</div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Offerings Management</h2>
          <p className="text-muted-foreground">Manage your solutions, services, technologies and OEM partnerships</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as OfferingType)}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {offeringTabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
              <tab.icon className="h-4 w-4" />
              <span className="hidden lg:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {offeringTabs.map(tab => (
          <TabsContent key={tab.value} value={tab.value} className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{tab.label} ({filteredOfferings.length})</h3>
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) setEditingItem(null);
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add {tab.label.includes("&") ? tab.label.split("&")[0].trim() : tab.label.replace(" Services", "").replace("s", "")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingItem ? "Edit" : "Add"} {tab.label.includes("&") ? "Item" : tab.label.replace(" Services", "")}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input id="name" name="name" required defaultValue={editingItem?.name} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" name="description" defaultValue={editingItem?.description || ""} />
                    </div>
                    {renderFormFields()}
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select name="status" defaultValue={editingItem?.status || "active"}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={mutation.isPending}>
                        {mutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {tab.value === "oems" ? (
              renderOemsTable()
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>{getSecondaryColumnHeader()}</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                      </TableRow>
                    ) : filteredOfferings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No items found</TableCell>
                      </TableRow>
                    ) : (
                      filteredOfferings.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="max-w-xs truncate">{item.description || "-"}</TableCell>
                          <TableCell>{getSecondaryColumnValue(item) || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={item.status === "active" ? "default" : "secondary"}>
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingItem(item);
                                  setIsDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteMutation.mutate(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Link Technology Dialog */}
      <Dialog open={linkTechDialogOpen} onOpenChange={setLinkTechDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Technology to {selectedOemForLink?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedOemForLink && getUnlinkedTechnologies(selectedOemForLink.id).length === 0 ? (
              <p className="text-muted-foreground text-center py-4">All technologies are already linked to this OEM.</p>
            ) : (
              <div className="space-y-2">
                {selectedOemForLink && getUnlinkedTechnologies(selectedOemForLink.id).map(tech => (
                  <div key={tech.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div>
                      <p className="font-medium">{tech.name}</p>
                      {tech.category && <p className="text-sm text-muted-foreground">{tech.category}</p>}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        linkTechMutation.mutate({
                          oemId: selectedOemForLink.id,
                          technologyId: tech.id,
                        });
                      }}
                      disabled={linkTechMutation.isPending}
                    >
                      Link
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setLinkTechDialogOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
