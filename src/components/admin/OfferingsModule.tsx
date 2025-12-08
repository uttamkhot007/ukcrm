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
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Package, Shield, Server, Briefcase, Target, Cpu, Building2, ChevronDown, ChevronRight, Link, X } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";

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
}

interface JunctionRecord {
  id: string;
  tenant_id: string | null;
  created_by: string;
}

interface OemTechnology extends JunctionRecord {
  oem_id: string;
  technology_id: string;
}

interface SolutionOem extends JunctionRecord {
  solution_id: string;
  oem_id: string;
}

interface SolutionTechnology extends JunctionRecord {
  solution_id: string;
  technology_id: string;
}

type OfferingType = "products" | "offensive_security" | "managed_security" | "professional_services" | "problem_areas" | "technologies" | "oems";

const offeringTabs: { value: OfferingType; label: string; icon: React.ElementType; table: string }[] = [
  { value: "products", label: "Products", icon: Package, table: "offerings_solutions" },
  { value: "offensive_security", label: "Offensive Security", icon: Shield, table: "offerings_offensive_security" },
  { value: "managed_security", label: "Managed Security", icon: Server, table: "offerings_managed_security" },
  { value: "professional_services", label: "Professional Services", icon: Briefcase, table: "offerings_professional_services" },
  { value: "problem_areas", label: "Problem & Requirement Areas", icon: Target, table: "offerings_problem_areas" },
  { value: "technologies", label: "Technologies", icon: Cpu, table: "offerings_technologies" },
  { value: "oems", label: "OEMs", icon: Building2, table: "offerings_oems" },
];

export function OfferingsModule() {
  const [activeTab, setActiveTab] = useState<OfferingType>("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Offering | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkDialogType, setLinkDialogType] = useState<"oem-tech" | "product-oem" | "product-tech" | "tech-oem" | "tech-product">("oem-tech");
  const [selectedItemForLink, setSelectedItemForLink] = useState<Offering | null>(null);
  
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch OEMs
  const { data: oems = [] } = useQuery({
    queryKey: ["offerings", "oems", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase
        .from("offerings_oems")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .order("name");
      if (error) throw error;
      return data as Offering[];
    },
    enabled: !!currentTenant,
  });

  // Fetch Technologies
  const { data: technologies = [] } = useQuery({
    queryKey: ["offerings", "technologies", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase
        .from("offerings_technologies")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .order("name");
      if (error) throw error;
      return data as Offering[];
    },
    enabled: !!currentTenant,
  });

  // Fetch Products (formerly Solutions)
  const { data: products = [] } = useQuery({
    queryKey: ["offerings", "products", currentTenant?.id],
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

  // Fetch junction tables
  const { data: oemTechnologies = [] } = useQuery({
    queryKey: ["oem_technologies", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase.from("oem_technologies").select("*").eq("tenant_id", currentTenant.id);
      if (error) throw error;
      return data as OemTechnology[];
    },
    enabled: !!currentTenant,
  });

  const { data: solutionOems = [] } = useQuery({
    queryKey: ["solution_oems", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase.from("solution_oems").select("*").eq("tenant_id", currentTenant.id);
      if (error) throw error;
      return data as SolutionOem[];
    },
    enabled: !!currentTenant,
  });

  const { data: solutionTechnologies = [] } = useQuery({
    queryKey: ["solution_technologies", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase.from("solution_technologies").select("*").eq("tenant_id", currentTenant.id);
      if (error) throw error;
      return data as SolutionTechnology[];
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
        case "products":
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

  // Generic link mutation
  const linkMutation = useMutation({
    mutationFn: async ({ table, data }: { table: string; data: any }) => {
      const { error } = await supabase.from(table as any).insert({
        ...data,
        tenant_id: currentTenant?.id,
        created_by: user?.id!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oem_technologies"] });
      queryClient.invalidateQueries({ queryKey: ["solution_oems"] });
      queryClient.invalidateQueries({ queryKey: ["solution_technologies"] });
      toast.success("Link created");
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("This link already exists");
      } else {
        toast.error("Failed to link: " + error.message);
      }
    },
  });

  // Generic unlink mutation
  const unlinkMutation = useMutation({
    mutationFn: async ({ table, id }: { table: string; id: string }) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oem_technologies"] });
      queryClient.invalidateQueries({ queryKey: ["solution_oems"] });
      queryClient.invalidateQueries({ queryKey: ["solution_technologies"] });
      toast.success("Link removed");
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
      
      if (activeTab === "products") {
        baseData.category = itemData.category;
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
          case "products":
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
          case "products":
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
      queryClient.invalidateQueries({ queryKey: ["offerings"] });
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
        case "products":
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
      queryClient.invalidateQueries({ queryKey: ["offerings"] });
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
    });
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // Helper functions for relationships
  const getOemTechs = (oemId: string) => {
    const linkedIds = oemTechnologies.filter(ot => ot.oem_id === oemId).map(ot => ot.technology_id);
    return technologies.filter(t => linkedIds.includes(t.id));
  };

  const getOemProducts = (oemId: string) => {
    const linkedIds = solutionOems.filter(so => so.oem_id === oemId).map(so => so.solution_id);
    return products.filter(s => linkedIds.includes(s.id));
  };

  const getTechOems = (techId: string) => {
    const linkedIds = oemTechnologies.filter(ot => ot.technology_id === techId).map(ot => ot.oem_id);
    return oems.filter(o => linkedIds.includes(o.id));
  };

  const getTechProducts = (techId: string) => {
    const linkedIds = solutionTechnologies.filter(st => st.technology_id === techId).map(st => st.solution_id);
    return products.filter(s => linkedIds.includes(s.id));
  };

  const getProductOems = (productId: string) => {
    const linkedIds = solutionOems.filter(so => so.solution_id === productId).map(so => so.oem_id);
    return oems.filter(o => linkedIds.includes(o.id));
  };

  const getProductTechs = (productId: string) => {
    const linkedIds = solutionTechnologies.filter(st => st.solution_id === productId).map(st => st.technology_id);
    return technologies.filter(t => linkedIds.includes(t.id));
  };

  const getUnlinkedItems = (type: typeof linkDialogType, itemId: string) => {
    switch (type) {
      case "oem-tech":
        const linkedTechIds = oemTechnologies.filter(ot => ot.oem_id === itemId).map(ot => ot.technology_id);
        return technologies.filter(t => !linkedTechIds.includes(t.id) && t.status === "active");
      case "product-oem":
        const linkedOemIds = solutionOems.filter(so => so.solution_id === itemId).map(so => so.oem_id);
        return oems.filter(o => !linkedOemIds.includes(o.id) && o.status === "active");
      case "product-tech":
        const linkedTechIds2 = solutionTechnologies.filter(st => st.solution_id === itemId).map(st => st.technology_id);
        return technologies.filter(t => !linkedTechIds2.includes(t.id) && t.status === "active");
      case "tech-oem":
        const linkedOemIds2 = oemTechnologies.filter(ot => ot.technology_id === itemId).map(ot => ot.oem_id);
        return oems.filter(o => !linkedOemIds2.includes(o.id) && o.status === "active");
      case "tech-product":
        const linkedSolIds = solutionTechnologies.filter(st => st.technology_id === itemId).map(st => st.solution_id);
        return products.filter(s => !linkedSolIds.includes(s.id) && s.status === "active");
      default:
        return [];
    }
  };

  const handleLink = (targetId: string) => {
    if (!selectedItemForLink) return;
    
    let table = "";
    let data: any = {};
    
    switch (linkDialogType) {
      case "oem-tech":
        table = "oem_technologies";
        data = { oem_id: selectedItemForLink.id, technology_id: targetId };
        break;
      case "product-oem":
        table = "solution_oems";
        data = { solution_id: selectedItemForLink.id, oem_id: targetId };
        break;
      case "product-tech":
        table = "solution_technologies";
        data = { solution_id: selectedItemForLink.id, technology_id: targetId };
        break;
      case "tech-oem":
        table = "oem_technologies";
        data = { technology_id: selectedItemForLink.id, oem_id: targetId };
        break;
      case "tech-product":
        table = "solution_technologies";
        data = { technology_id: selectedItemForLink.id, solution_id: targetId };
        break;
    }
    
    linkMutation.mutate({ table, data });
  };

  const handleUnlink = (type: string, itemId: string, linkedId: string) => {
    let table = "";
    let record: JunctionRecord | undefined;
    
    switch (type) {
      case "oem-tech":
        table = "oem_technologies";
        record = oemTechnologies.find(ot => ot.oem_id === itemId && ot.technology_id === linkedId);
        break;
      case "product-oem":
        table = "solution_oems";
        record = solutionOems.find(so => so.solution_id === itemId && so.oem_id === linkedId);
        break;
      case "product-tech":
        table = "solution_technologies";
        record = solutionTechnologies.find(st => st.solution_id === itemId && st.technology_id === linkedId);
        break;
      case "tech-oem":
        table = "oem_technologies";
        record = oemTechnologies.find(ot => ot.technology_id === itemId && ot.oem_id === linkedId);
        break;
      case "tech-product":
        table = "solution_technologies";
        record = solutionTechnologies.find(st => st.technology_id === itemId && st.solution_id === linkedId);
        break;
    }
    
    if (record) {
      unlinkMutation.mutate({ table, id: record.id });
    }
  };

  const openLinkDialog = (item: Offering, type: typeof linkDialogType) => {
    setSelectedItemForLink(item);
    setLinkDialogType(type);
    setLinkDialogOpen(true);
  };

  const getLinkDialogTitle = () => {
    switch (linkDialogType) {
      case "oem-tech":
        return `Link Technologies to ${selectedItemForLink?.name}`;
      case "product-oem":
        return `Link OEMs to ${selectedItemForLink?.name}`;
      case "product-tech":
        return `Link Technologies to ${selectedItemForLink?.name}`;
      case "tech-oem":
        return `Link OEMs to ${selectedItemForLink?.name}`;
      case "tech-product":
        return `Link Products to ${selectedItemForLink?.name}`;
      default:
        return "Link Items";
    }
  };

  const renderFormFields = () => {
    switch (activeTab) {
      case "products":
        return (
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input id="category" name="category" defaultValue={editingItem?.category || ""} />
          </div>
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

  const renderLinkedBadges = (items: Offering[], type: string, parentId: string, icon: React.ElementType) => {
    const Icon = icon;
    return (
      <div className="flex flex-wrap gap-1">
        {items.map(item => (
          <Badge key={item.id} variant="secondary" className="gap-1 pr-1">
            <Icon className="h-3 w-3" />
            {item.name}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUnlink(type, parentId, item.id);
              }}
              className="ml-1 hover:bg-destructive/20 rounded p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    );
  };

  const renderExpandableCard = (item: Offering) => {
    const isExpanded = expandedItems.has(item.id);
    
    let linkedTechs: Offering[] = [];
    let linkedOems: Offering[] = [];
    let linkedProducts: Offering[] = [];
    
    if (activeTab === "oems") {
      linkedTechs = getOemTechs(item.id);
      linkedProducts = getOemProducts(item.id);
    } else if (activeTab === "technologies") {
      linkedOems = getTechOems(item.id);
      linkedProducts = getTechProducts(item.id);
    } else if (activeTab === "products") {
      linkedOems = getProductOems(item.id);
      linkedTechs = getProductTechs(item.id);
    }

    return (
      <Card key={item.id} className="overflow-hidden">
        <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(item.id)}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="font-medium flex items-center gap-2 flex-wrap">
                    {item.name}
                    <Badge variant={item.status === "active" ? "default" : "secondary"} className="text-xs">
                      {item.status}
                    </Badge>
                    {activeTab === "oems" && item.partnership_level && (
                      <Badge variant="outline" className="text-xs capitalize">{item.partnership_level}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activeTab === "oems" && `${linkedTechs.length} technologies · ${linkedProducts.length} products`}
                    {activeTab === "technologies" && `${linkedOems.length} OEMs · ${linkedProducts.length} products`}
                    {activeTab === "products" && `${linkedOems.length} OEMs · ${linkedTechs.length} technologies`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                {activeTab === "oems" && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => openLinkDialog(item, "oem-tech")}>
                    <Link className="h-3 w-3" />
                    <span className="hidden sm:inline">Technology</span>
                  </Button>
                )}
                {activeTab === "technologies" && (
                  <>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => openLinkDialog(item, "tech-oem")}>
                      <Link className="h-3 w-3" />
                      <span className="hidden sm:inline">OEM</span>
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => openLinkDialog(item, "tech-product")}>
                      <Link className="h-3 w-3" />
                      <span className="hidden sm:inline">Product</span>
                    </Button>
                  </>
                )}
                {activeTab === "products" && (
                  <>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => openLinkDialog(item, "product-oem")}>
                      <Link className="h-3 w-3" />
                      <span className="hidden sm:inline">OEM</span>
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => openLinkDialog(item, "product-tech")}>
                      <Link className="h-3 w-3" />
                      <span className="hidden sm:inline">Technology</span>
                    </Button>
                  </>
                )}
                <Button size="icon" variant="ghost" onClick={() => { setEditingItem(item); setIsDialogOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t bg-muted/30 p-4 space-y-4">
              {item.description && (
                <p className="text-sm text-muted-foreground">{item.description}</p>
              )}
              
              {activeTab === "oems" && (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Linked Technologies</p>
                    {linkedTechs.length > 0 ? renderLinkedBadges(linkedTechs, "oem-tech", item.id, Cpu) : (
                      <p className="text-sm text-muted-foreground">No technologies linked</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Linked Products</p>
                    {linkedProducts.length > 0 ? renderLinkedBadges(linkedProducts, "product-oem", item.id, Package) : (
                      <p className="text-sm text-muted-foreground">No products linked</p>
                    )}
                  </div>
                </div>
              )}
              
              {activeTab === "technologies" && (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Linked OEMs</p>
                    {linkedOems.length > 0 ? renderLinkedBadges(linkedOems, "tech-oem", item.id, Building2) : (
                      <p className="text-sm text-muted-foreground">No OEMs linked</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Linked Products</p>
                    {linkedProducts.length > 0 ? renderLinkedBadges(linkedProducts, "tech-product", item.id, Package) : (
                      <p className="text-sm text-muted-foreground">No products linked</p>
                    )}
                  </div>
                </div>
              )}
              
              {activeTab === "products" && (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Linked OEMs</p>
                    {linkedOems.length > 0 ? renderLinkedBadges(linkedOems, "product-oem", item.id, Building2) : (
                      <p className="text-sm text-muted-foreground">No OEMs linked</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Linked Technologies</p>
                    {linkedTechs.length > 0 ? renderLinkedBadges(linkedTechs, "product-tech", item.id, Cpu) : (
                      <p className="text-sm text-muted-foreground">No technologies linked</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  const shouldShowExpandableView = activeTab === "oems" || activeTab === "technologies" || activeTab === "products";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Offerings Management</h2>
          <p className="text-muted-foreground">Manage your products, services, technologies and OEM partnerships</p>
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

            {shouldShowExpandableView && tab.value === activeTab ? (
              <div className="space-y-3">
                {isLoading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : filteredOfferings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No items found</div>
                ) : (
                  filteredOfferings.map(item => renderExpandableCard(item))
                )}
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>
                        {tab.value === "problem_areas" ? "Area Type" : "Service Type"}
                      </TableHead>
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
                          <TableCell>{item.area_type || item.service_type || "-"}</TableCell>
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

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{getLinkDialogTitle()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedItemForLink && getUnlinkedItems(linkDialogType, selectedItemForLink.id).length === 0 ? (
              <p className="text-muted-foreground text-center py-4">All items are already linked.</p>
            ) : (
              <div className="space-y-2">
                {selectedItemForLink && getUnlinkedItems(linkDialogType, selectedItemForLink.id).map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.category && <p className="text-sm text-muted-foreground">{item.category}</p>}
                      {item.partnership_level && <p className="text-sm text-muted-foreground capitalize">{item.partnership_level}</p>}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleLink(item.id)}
                      disabled={linkMutation.isPending}
                    >
                      Link
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
