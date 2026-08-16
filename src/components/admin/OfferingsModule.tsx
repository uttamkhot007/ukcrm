import { useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
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
import { Plus, Search, Pencil, Trash2, Package, Shield, Briefcase, Target, Cpu, Building2, ChevronDown, ChevronRight, Link, X, Sparkles, Loader2, Award, TrendingUp, Lightbulb, Building, Users, Trophy, CheckCircle, AlertCircle, BarChart3, Upload, ShieldAlert, Zap, FileWarning, Scale, CircleDot } from "lucide-react";
import { BulkUploadDialog, BulkUploadType } from "./BulkUploadDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

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
  // AI Enrichment fields
  ai_enriched_data?: any;
  last_enriched_at?: string | null;
  // Product specific
  unique_selling_points?: string[] | null;
  awards?: string[] | null;
  competitive_advantages?: string | null;
  market_position?: string | null;
  // OEM specific
  founded_year?: number | null;
  headquarters?: string | null;
  employee_count?: string | null;
  market_cap?: string | null;
  key_products?: string[] | null;
  certifications?: string[] | null;
  // Technology specific
  use_cases?: string[] | null;
  benefits?: string[] | null;
  limitations?: string[] | null;
  adoption_rate?: string | null;
  market_trends?: string | null;
  // Problem Area enrichment fields
  recommended_controls?: string[] | null;
  possible_impact?: string | null;
  attack_vectors?: string[] | null;
  risk_level?: string | null;
  mitigation_strategies?: string[] | null;
  compliance_frameworks?: string[] | null;
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

interface ProductOem extends JunctionRecord {
  product_id: string;
  oem_id: string;
}

interface ProductTechnology extends JunctionRecord {
  product_id: string;
  technology_id: string;
}

interface OfferingProblemAreaMapping extends JunctionRecord {
  offering_id: string;
  offering_type: "product" | "professional_services";
  problem_area_id: string;
}

type OfferingType = "products" | "professional_services" | "problem_areas" | "technologies" | "oems";

const offeringTabs: { value: OfferingType; label: string; icon: React.ElementType; table: string }[] = [
  { value: "products", label: "Products", icon: Package, table: "offerings_products" },
  { value: "professional_services", label: "Professional Services", icon: Briefcase, table: "offerings_professional_services" },
  { value: "problem_areas", label: "Problem & Requirement Areas", icon: Target, table: "offerings_problem_areas" },
  { value: "technologies", label: "Technologies", icon: Cpu, table: "offerings_technologies" },
  { value: "oems", label: "OEMs", icon: Building2, table: "offerings_oems" },
];

interface OfferingsModuleProps {
  readOnly?: boolean;
}

export function OfferingsModule({ readOnly = false }: OfferingsModuleProps) {
  const [activeTab, setActiveTab] = useState<OfferingType>("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Offering | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkDialogType, setLinkDialogType] = useState<"oem-tech" | "product-oem" | "product-tech" | "tech-oem" | "tech-product" | "product-problem" | "professional-problem">("oem-tech");
  const [selectedItemForLink, setSelectedItemForLink] = useState<Offering | null>(null);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [bulkUploadType, setBulkUploadType] = useState<BulkUploadType>("products");
  
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

  // Fetch Products
  const { data: products = [] } = useQuery({
    queryKey: ["offerings", "products", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase
        .from("offerings_products" as any)
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .order("name");
      if (error) throw error;
      return (data || []) as unknown as Offering[];
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

  const { data: productOems = [] } = useQuery({
    queryKey: ["product_oems", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase.from("product_oems" as any).select("*").eq("tenant_id", currentTenant.id);
      if (error) throw error;
      return (data || []) as unknown as ProductOem[];
    },
    enabled: !!currentTenant,
  });

  const { data: productTechnologies = [] } = useQuery({
    queryKey: ["product_technologies", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase.from("product_technologies" as any).select("*").eq("tenant_id", currentTenant.id);
      if (error) throw error;
      return (data || []) as unknown as ProductTechnology[];
    },
    enabled: !!currentTenant,
  });

  // Fetch problem areas
  const { data: problemAreas = [] } = useQuery({
    queryKey: ["offerings", "problem_areas", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase
        .from("offerings_problem_areas")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data as Offering[];
    },
    enabled: !!currentTenant,
  });

  // Fetch problem area mappings
  const { data: problemAreaMappings = [] } = useQuery({
    queryKey: ["offering_problem_area_mappings", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase
        .from("offering_problem_area_mappings" as any)
        .select("*")
        .eq("tenant_id", currentTenant.id);
      if (error) throw error;
      return (data || []) as unknown as OfferingProblemAreaMapping[];
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
          query = supabase.from("offerings_products" as any).select("*").eq("tenant_id", currentTenant.id).order("name");
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
      return (data || []) as unknown as Offering[];
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
      queryClient.invalidateQueries({ queryKey: ["product_oems"] });
      queryClient.invalidateQueries({ queryKey: ["product_technologies"] });
      queryClient.invalidateQueries({ queryKey: ["offering_problem_area_mappings"] });
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

  // AI Enrichment mutation
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  
  const enrichMutation = useMutation({
    mutationFn: async (item: Offering) => {
      if (activeTab === "problem_areas") {
        // Use problem area enrichment function
        const { data, error } = await supabase.functions.invoke("enrich-problem-area", {
          body: {
            id: item.id,
            name: item.name,
            description: item.description,
            area_type: item.area_type,
          },
        });
        
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        return data;
      }
      
      let type: "product" | "oem" | "technology";
      if (activeTab === "products") {
        type = "product";
      } else if (activeTab === "oems") {
        type = "oem";
      } else if (activeTab === "technologies") {
        type = "technology";
      } else {
        throw new Error("Enrichment not supported for this type");
      }
      
      const { data, error } = await supabase.functions.invoke("enrich-offering", {
        body: {
          type,
          id: item.id,
          name: item.name,
          description: item.description,
          category: item.category,
          vendor: item.vendor,
          website: item.website,
        },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offerings"] });
      toast.success("AI enrichment complete");
      setEnrichingId(null);
    },
    onError: (error) => {
      toast.error("Enrichment failed: " + error.message);
      setEnrichingId(null);
    },
  });

  const handleEnrich = (item: Offering) => {
    setEnrichingId(item.id);
    enrichMutation.mutate(item);
  };

  const getRiskLevelColor = (level: string | null | undefined) => {
    switch (level) {
      case "critical": return "text-red-600 bg-red-100 border-red-200";
      case "high": return "text-orange-600 bg-orange-100 border-orange-200";
      case "medium": return "text-yellow-600 bg-yellow-100 border-yellow-200";
      case "low": return "text-green-600 bg-green-100 border-green-200";
      default: return "text-muted-foreground bg-muted border-muted";
    }
  };

  // Generic unlink mutation
  const unlinkMutation = useMutation({
    mutationFn: async ({ table, id }: { table: string; id: string }) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oem_technologies"] });
      queryClient.invalidateQueries({ queryKey: ["product_oems"] });
      queryClient.invalidateQueries({ queryKey: ["product_technologies"] });
      queryClient.invalidateQueries({ queryKey: ["offering_problem_area_mappings"] });
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
            updateQuery = supabase.from("offerings_products" as any).update(baseData).eq("id", editingItem.id);
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
            insertQuery = supabase.from("offerings_products" as any).insert(insertData);
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
          deleteQuery = supabase.from("offerings_products" as any).delete().eq("id", id);
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
    const linkedIds = productOems.filter(po => po.oem_id === oemId).map(po => po.product_id);
    return products.filter(s => linkedIds.includes(s.id));
  };

  const getTechOems = (techId: string) => {
    const linkedIds = oemTechnologies.filter(ot => ot.technology_id === techId).map(ot => ot.oem_id);
    return oems.filter(o => linkedIds.includes(o.id));
  };

  const getTechProducts = (techId: string) => {
    const linkedIds = productTechnologies.filter(pt => pt.technology_id === techId).map(pt => pt.product_id);
    return products.filter(s => linkedIds.includes(s.id));
  };

  const getProductOems = (productId: string) => {
    const linkedIds = productOems.filter(po => po.product_id === productId).map(po => po.oem_id);
    return oems.filter(o => linkedIds.includes(o.id));
  };

  const getProductTechs = (productId: string) => {
    const linkedIds = productTechnologies.filter(pt => pt.product_id === productId).map(pt => pt.technology_id);
    return technologies.filter(t => linkedIds.includes(t.id));
  };

  // Get problem areas linked to an offering
  const getOfferingProblemAreas = (offeringId: string, offeringType: string) => {
    const linkedIds = problemAreaMappings
      .filter(m => m.offering_id === offeringId && m.offering_type === offeringType)
      .map(m => m.problem_area_id);
    return problemAreas.filter(pa => linkedIds.includes(pa.id));
  };

  const getUnlinkedItems = (type: typeof linkDialogType, itemId: string) => {
    switch (type) {
      case "oem-tech":
        const linkedTechIds = oemTechnologies.filter(ot => ot.oem_id === itemId).map(ot => ot.technology_id);
        return technologies.filter(t => !linkedTechIds.includes(t.id) && t.status === "active");
      case "product-oem":
        const linkedOemIds = productOems.filter(po => po.product_id === itemId).map(po => po.oem_id);
        return oems.filter(o => !linkedOemIds.includes(o.id) && o.status === "active");
      case "product-tech":
        const linkedTechIds2 = productTechnologies.filter(pt => pt.product_id === itemId).map(pt => pt.technology_id);
        return technologies.filter(t => !linkedTechIds2.includes(t.id) && t.status === "active");
      case "tech-oem":
        const linkedOemIds2 = oemTechnologies.filter(ot => ot.technology_id === itemId).map(ot => ot.oem_id);
        return oems.filter(o => !linkedOemIds2.includes(o.id) && o.status === "active");
      case "tech-product":
        const linkedProdIds = productTechnologies.filter(pt => pt.technology_id === itemId).map(pt => pt.product_id);
        return products.filter(s => !linkedProdIds.includes(s.id) && s.status === "active");
      case "product-problem":
        const linkedProblemIds1 = problemAreaMappings.filter(m => m.offering_id === itemId && m.offering_type === "product").map(m => m.problem_area_id);
        return problemAreas.filter(pa => !linkedProblemIds1.includes(pa.id));
      case "offensive-problem":
        const linkedProblemIds2 = problemAreaMappings.filter(m => m.offering_id === itemId && m.offering_type === "offensive_security").map(m => m.problem_area_id);
        return problemAreas.filter(pa => !linkedProblemIds2.includes(pa.id));
      case "managed-problem":
        const linkedProblemIds3 = problemAreaMappings.filter(m => m.offering_id === itemId && m.offering_type === "managed_security").map(m => m.problem_area_id);
        return problemAreas.filter(pa => !linkedProblemIds3.includes(pa.id));
      case "professional-problem":
        const linkedProblemIds4 = problemAreaMappings.filter(m => m.offering_id === itemId && m.offering_type === "professional_services").map(m => m.problem_area_id);
        return problemAreas.filter(pa => !linkedProblemIds4.includes(pa.id));
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
        table = "product_oems";
        data = { product_id: selectedItemForLink.id, oem_id: targetId };
        break;
      case "product-tech":
        table = "product_technologies";
        data = { product_id: selectedItemForLink.id, technology_id: targetId };
        break;
      case "tech-oem":
        table = "oem_technologies";
        data = { technology_id: selectedItemForLink.id, oem_id: targetId };
        break;
      case "tech-product":
        table = "product_technologies";
        data = { technology_id: selectedItemForLink.id, product_id: targetId };
        break;
      case "product-problem":
        table = "offering_problem_area_mappings";
        data = { offering_id: selectedItemForLink.id, offering_type: "product", problem_area_id: targetId };
        break;
      case "offensive-problem":
        table = "offering_problem_area_mappings";
        data = { offering_id: selectedItemForLink.id, offering_type: "offensive_security", problem_area_id: targetId };
        break;
      case "managed-problem":
        table = "offering_problem_area_mappings";
        data = { offering_id: selectedItemForLink.id, offering_type: "managed_security", problem_area_id: targetId };
        break;
      case "professional-problem":
        table = "offering_problem_area_mappings";
        data = { offering_id: selectedItemForLink.id, offering_type: "professional_services", problem_area_id: targetId };
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
        table = "product_oems";
        record = productOems.find(po => po.product_id === itemId && po.oem_id === linkedId);
        break;
      case "product-tech":
        table = "product_technologies";
        record = productTechnologies.find(pt => pt.product_id === itemId && pt.technology_id === linkedId);
        break;
      case "tech-oem":
        table = "oem_technologies";
        record = oemTechnologies.find(ot => ot.technology_id === itemId && ot.oem_id === linkedId);
        break;
      case "tech-product":
        table = "product_technologies";
        record = productTechnologies.find(pt => pt.technology_id === itemId && pt.product_id === linkedId);
        break;
      case "product-problem":
      case "offensive-problem":
      case "managed-problem":
      case "professional-problem":
        table = "offering_problem_area_mappings";
        record = problemAreaMappings.find(m => m.offering_id === itemId && m.problem_area_id === linkedId);
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
      case "product-problem":
      case "offensive-problem":
      case "managed-problem":
      case "professional-problem":
        return `Link Problem Areas to ${selectedItemForLink?.name}`;
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
          <Badge key={item.id} variant="secondary" className={cn("gap-1", !readOnly && "pr-1")}>
            <Icon className="h-3 w-3" />
            {item.name}
            {!readOnly && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnlink(type, parentId, item.id);
                }}
                className="ml-1 hover:bg-destructive/20 rounded p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
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
    let linkedProblemAreas: Offering[] = [];
    
    if (activeTab === "oems") {
      linkedTechs = getOemTechs(item.id);
      linkedProducts = getOemProducts(item.id);
    } else if (activeTab === "technologies") {
      linkedOems = getTechOems(item.id);
      linkedProducts = getTechProducts(item.id);
    } else if (activeTab === "products") {
      linkedOems = getProductOems(item.id);
      linkedTechs = getProductTechs(item.id);
      linkedProblemAreas = getOfferingProblemAreas(item.id, "product");
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
                    {activeTab === "products" && `${linkedOems.length} OEMs · ${linkedTechs.length} technologies · ${linkedProblemAreas.length} problem areas`}
                    {activeTab === "problem_areas" && (
                      <>
                        {item.area_type && <span className="capitalize">{item.area_type}</span>}
                        {item.risk_level && (
                          <Badge variant="outline" className={cn("ml-2 text-xs capitalize", getRiskLevelColor(item.risk_level))}>
                            {item.risk_level} risk
                          </Badge>
                        )}
                        {item.last_enriched_at && <span className="ml-2">· AI Enriched</span>}
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                {!readOnly && (
                  <>
                    {/* AI Enrich Button */}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="gap-1 text-primary border-primary/30 hover:bg-primary/10"
                      onClick={() => handleEnrich(item)}
                      disabled={enrichingId === item.id}
                    >
                      {enrichingId === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      <span className="hidden sm:inline">{enrichingId === item.id ? "Enriching..." : "AI Enrich"}</span>
                    </Button>
                    
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
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => openLinkDialog(item, "product-problem")}>
                          <Target className="h-3 w-3" />
                          <span className="hidden sm:inline">Problem</span>
                        </Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => { setEditingItem(item); setIsDialogOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t bg-muted/30 p-4 space-y-4">
              {item.description && (
                <p className="text-sm text-muted-foreground">{item.description}</p>
              )}
              
              {/* AI Enriched Data Display */}
              {item.last_enriched_at && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">AI Enriched Data</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Last updated: {format(new Date(item.last_enriched_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  
                  {/* Product Enrichment */}
                  {activeTab === "products" && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {item.unique_selling_points && item.unique_selling_points.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Lightbulb className="h-4 w-4 text-yellow-500" />
                            Unique Selling Points
                          </div>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {item.unique_selling_points.map((usp, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <CheckCircle className="h-3 w-3 text-green-500 mt-1 shrink-0" />
                                {usp}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {item.awards && item.awards.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Trophy className="h-4 w-4 text-amber-500" />
                            Awards & Recognitions
                          </div>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {item.awards.map((award, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <Award className="h-3 w-3 text-amber-500 mt-1 shrink-0" />
                                {award}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {item.competitive_advantages && (
                        <div className="space-y-2 md:col-span-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <TrendingUp className="h-4 w-4 text-blue-500" />
                            Competitive Advantages
                          </div>
                          <p className="text-sm text-muted-foreground">{item.competitive_advantages}</p>
                        </div>
                      )}
                      
                      {item.market_position && (
                        <div className="space-y-2 md:col-span-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <BarChart3 className="h-4 w-4 text-purple-500" />
                            Market Position
                          </div>
                          <p className="text-sm text-muted-foreground">{item.market_position}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* OEM Enrichment */}
                  {activeTab === "oems" && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-3">
                        {item.headquarters && (
                          <div className="flex items-center gap-2 text-sm">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">HQ:</span>
                            <span>{item.headquarters}</span>
                          </div>
                        )}
                        {item.founded_year && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Founded:</span>
                            <span>{item.founded_year}</span>
                          </div>
                        )}
                        {item.employee_count && (
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Employees:</span>
                            <span>{item.employee_count}</span>
                          </div>
                        )}
                        {item.market_cap && (
                          <div className="flex items-center gap-2 text-sm">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Market Cap:</span>
                            <span>{item.market_cap}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        {item.key_products && item.key_products.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Package className="h-4 w-4 text-blue-500" />
                              Key Products
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {item.key_products.map((product, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">{product}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {item.certifications && item.certifications.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Shield className="h-4 w-4 text-green-500" />
                              Certifications
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {item.certifications.map((cert, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{cert}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Technology Enrichment */}
                  {activeTab === "technologies" && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {item.use_cases && item.use_cases.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Target className="h-4 w-4 text-blue-500" />
                            Use Cases
                          </div>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {item.use_cases.map((uc, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <CheckCircle className="h-3 w-3 text-green-500 mt-1 shrink-0" />
                                {uc}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {item.benefits && item.benefits.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Lightbulb className="h-4 w-4 text-green-500" />
                            Benefits
                          </div>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {item.benefits.map((benefit, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <CheckCircle className="h-3 w-3 text-green-500 mt-1 shrink-0" />
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {item.limitations && item.limitations.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                            Limitations
                          </div>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {item.limitations.map((limitation, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <AlertCircle className="h-3 w-3 text-orange-500 mt-1 shrink-0" />
                                {limitation}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        {item.adoption_rate && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <TrendingUp className="h-4 w-4 text-purple-500" />
                              Adoption Rate
                            </div>
                            <p className="text-sm text-muted-foreground">{item.adoption_rate}</p>
                          </div>
                        )}
                      </div>
                      
                      {item.market_trends && (
                        <div className="space-y-2 md:col-span-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <BarChart3 className="h-4 w-4 text-blue-500" />
                            Market Trends
                          </div>
                          <p className="text-sm text-muted-foreground">{item.market_trends}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Problem Areas Solved</p>
                    {linkedProblemAreas.length > 0 ? renderLinkedBadges(linkedProblemAreas, "product-problem", item.id, Target) : (
                      <p className="text-sm text-muted-foreground">No problem areas linked</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Problem Areas AI Enrichment Display */}
              {activeTab === "problem_areas" && item.last_enriched_at && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">AI Security Intelligence</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Last updated: {format(new Date(item.last_enriched_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  
                  {/* Risk Level and Impact */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {item.risk_level && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <ShieldAlert className="h-4 w-4 text-red-500" />
                          Risk Level
                        </div>
                        <Badge variant="outline" className={cn("capitalize", getRiskLevelColor(item.risk_level))}>
                          {item.risk_level}
                        </Badge>
                      </div>
                    )}
                    
                    {item.possible_impact && (
                      <div className="space-y-2 md:col-span-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <FileWarning className="h-4 w-4 text-orange-500" />
                          Possible Impact
                        </div>
                        <p className="text-sm text-muted-foreground">{item.possible_impact}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Attack Vectors and Controls */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {item.attack_vectors && item.attack_vectors.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Zap className="h-4 w-4 text-red-500" />
                          Attack Vectors
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {item.attack_vectors.map((vector, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <AlertCircle className="h-3 w-3 text-red-500 mt-1 shrink-0" />
                              {vector}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {item.recommended_controls && item.recommended_controls.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Shield className="h-4 w-4 text-green-500" />
                          Recommended Controls
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {item.recommended_controls.map((control, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500 mt-1 shrink-0" />
                              {control}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  {/* Mitigation Strategies */}
                  {item.mitigation_strategies && item.mitigation_strategies.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        Mitigation Strategies
                      </div>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {item.mitigation_strategies.map((strategy, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CircleDot className="h-3 w-3 text-primary mt-1 shrink-0" />
                            {strategy}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Compliance Frameworks */}
                  {item.compliance_frameworks && item.compliance_frameworks.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Scale className="h-4 w-4 text-blue-500" />
                        Related Compliance Frameworks
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.compliance_frameworks.map((framework, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {framework}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  const shouldShowExpandableView = activeTab === "oems" || activeTab === "technologies" || activeTab === "products" || activeTab === "problem_areas";

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
              {!readOnly && (
                <div className="flex gap-2">
                  {(tab.value === "products" || tab.value === "technologies" || tab.value === "oems") && (
                    <Button 
                      variant="outline" 
                      className="gap-2"
                      onClick={() => {
                        setBulkUploadType(tab.value as BulkUploadType);
                        setBulkUploadOpen(true);
                      }}
                    >
                      <Upload className="h-4 w-4" />
                      Bulk Upload
                    </Button>
                  )}
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
              )}
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
                      {!readOnly && <TableHead className="w-[100px]">Actions</TableHead>}
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
                          {!readOnly && (
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
                          )}
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

      <BulkUploadDialog
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        uploadType={bulkUploadType}
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["offerings"] });
        }}
      />
    </div>
  );
}
