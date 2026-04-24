import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  Shield, 
  FileText, 
  Users, 
  Plus, 
  Package,
  Server,
  Briefcase
} from "lucide-react";

interface OrganizationSupportConfigProps {
  organizationId: string;
  organizationName: string;
}

type SolutionCategory = "products" | "offensive_security" | "managed_security" | "professional_services";

const solutionCategories: { value: SolutionCategory; label: string; icon: React.ElementType }[] = [
  { value: "products", label: "Products", icon: Package },
  { value: "offensive_security", label: "Offensive Security Services", icon: Shield },
  { value: "managed_security", label: "Managed Services", icon: Server },
  { value: "professional_services", label: "Professional Services", icon: Briefcase },
];

export default function OrganizationSupportConfig({
  organizationId,
  organizationName,
}: OrganizationSupportConfigProps) {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  const [isAddingSolution, setIsAddingSolution] = useState(false);

  const { data: supportConfig } = useQuery({
    queryKey: ["org-support-config", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_support_config")
        .select("*")
        .eq("organization_id", organizationId)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  const { data: solutions } = useQuery({
    queryKey: ["org-support-solutions", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_support_solutions")
        .select("*")
        .eq("organization_id", organizationId);
      if (error) throw error;
      return data;
    },
  });

  const { data: customerAccess } = useQuery({
    queryKey: ["org-customer-access", organizationId],
    queryFn: async () => {
      const { data: accessData, error } = await supabase
        .from("customer_organization_access")
        .select("*")
        .eq("organization_id", organizationId);
      if (error) throw error;
      if (accessData && accessData.length > 0) {
        const userIds = accessData.map((a: any) => a.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);
        return accessData.map((access: any) => ({
          ...access,
          profile: profiles?.find((p: any) => p.user_id === access.user_id) || null,
        }));
      }
      return accessData;
    },
  });

  const { data: escalationTemplates } = useQuery({
    queryKey: ["escalation-templates", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await supabase
        .from("escalation_matrix_templates")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  const { data: offeringsProducts } = useQuery({
    queryKey: ["offerings", "products", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase.from("offerings_products" as any).select("id, name").eq("tenant_id", currentTenant.id).eq("status", "active");
      if (error) throw error;
      return (data || []) as unknown as { id: string; name: string }[];
    },
    enabled: !!currentTenant,
  });

  const { data: offeringsOffensive } = useQuery({
    queryKey: ["offerings", "offensive_security", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase.from("offerings_offensive_security").select("id, name").eq("tenant_id", currentTenant.id).eq("status", "active");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant,
  });

  const { data: offeringsManaged } = useQuery({
    queryKey: ["offerings", "managed_security", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase.from("offerings_managed_security").select("id, name").eq("tenant_id", currentTenant.id).eq("status", "active");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant,
  });

  const { data: offeringsProfessional } = useQuery({
    queryKey: ["offerings", "professional_services", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase.from("offerings_professional_services").select("id, name").eq("tenant_id", currentTenant.id).eq("status", "active");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant,
  });

  const getOfferingsForCategory = (category: SolutionCategory) => {
    switch (category) {
      case "products": return offeringsProducts || [];
      case "offensive_security": return offeringsOffensive || [];
      case "managed_security": return offeringsManaged || [];
      case "professional_services": return offeringsProfessional || [];
      default: return [];
    }
  };

  const handleSaveConfig = async (formData: any) => {
    try {
      const configData = { organization_id: organizationId, ...formData };
      if (supportConfig?.id) {
        const { error } = await supabase.from("organization_support_config").update(configData).eq("id", supportConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("organization_support_config").insert(configData);
        if (error) throw error;
      }
      toast.success("Support configuration saved");
      queryClient.invalidateQueries({ queryKey: ["org-support-config", organizationId] });
    } catch (error: any) {
      toast.error(error.message || "Failed to save configuration");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Support Center Configuration</h2>
          <p className="text-muted-foreground">Manage support settings for {organizationName}</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general" className="gap-2"><Shield className="h-4 w-4" />General</TabsTrigger>
          <TabsTrigger value="documents" className="gap-2"><FileText className="h-4 w-4" />Documents</TabsTrigger>
          <TabsTrigger value="solutions" className="gap-2"><Shield className="h-4 w-4" />Solutions</TabsTrigger>
          <TabsTrigger value="access" className="gap-2"><Users className="h-4 w-4" />Customer Access</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Support Period</CardTitle>
              <CardDescription>Configure the support period and level for this organization</CardDescription>
            </CardHeader>
            <CardContent>
              <SupportConfigForm initialData={supportConfig} onSave={handleSaveConfig} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Support Documents</CardTitle>
              <CardDescription>SLA, MSA, and other support-related documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h4 className="font-medium">SLA Document</h4>
                  </div>
                  {supportConfig?.sla_document_url ? (
                    <a href={supportConfig.sla_document_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">View Document</a>
                  ) : (
                    <p className="text-sm text-muted-foreground">No SLA uploaded</p>
                  )}
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h4 className="font-medium">MSA Document</h4>
                  </div>
                  {supportConfig?.msa_document_url ? (
                    <a href={supportConfig.msa_document_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">View Document</a>
                  ) : (
                    <p className="text-sm text-muted-foreground">No MSA uploaded</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="solutions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Support Solutions</CardTitle>
                <CardDescription>Products and services available for support</CardDescription>
              </div>
              <Dialog open={isAddingSolution} onOpenChange={setIsAddingSolution}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Add Solution</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add Solution</DialogTitle>
                    <DialogDescription>Select a category and product/service for support</DialogDescription>
                  </DialogHeader>
                  <SolutionForm
                    organizationId={organizationId}
                    getOfferingsForCategory={getOfferingsForCategory}
                    escalationTemplates={escalationTemplates || []}
                    onSuccess={() => {
                      setIsAddingSolution(false);
                      queryClient.invalidateQueries({ queryKey: ["org-support-solutions", organizationId] });
                    }}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {solutionCategories.map((category) => {
                  const Icon = category.icon;
                  const categorySolutions = solutions?.filter((s) => (s as any).category === category.value) || [];
                  return (
                    <div key={category.value} className={`p-4 rounded-lg border-2 transition-colors ${categorySolutions.length > 0 ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-2 rounded-lg ${categorySolutions.length > 0 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-sm">{category.label}</span>
                      </div>
                      <p className="text-2xl font-bold">{categorySolutions.length}</p>
                    </div>
                  );
                })}
              </div>
              {solutions?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No solutions configured</div>
              ) : (
                <div className="space-y-2">
                  {solutions?.map((solution) => {
                    const category = solutionCategories.find(c => c.value === (solution as any).category);
                    const Icon = category?.icon || Package;
                    const sol = solution as any;
                    return (
                      <div key={solution.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-4 w-4 text-primary" /></div>
                          <div>
                            <p className="font-medium">{solution.solution_name}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {category && <Badge variant="outline" className="text-xs">{category.label}</Badge>}
                              <Badge variant="secondary" className={`text-xs ${sol.support_type === 'continuous' ? 'bg-green-500/20 text-green-600' : ''}`}>
                                {sol.support_type === 'continuous' ? 'Continuous' : 'One-time'}
                              </Badge>
                              {sol.support_tier && (
                                <Badge variant="outline" className="text-xs capitalize">{sol.support_tier}</Badge>
                              )}
                              {sol.support_period_start && sol.support_period_end && (
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(sol.support_period_start), "MMM d, yyyy")} - {format(new Date(sol.support_period_end), "MMM d, yyyy")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge variant={solution.is_active ? "default" : "secondary"}>{solution.is_active ? "Active" : "Inactive"}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access">
          <Card>
            <CardHeader>
              <CardTitle>Customer Portal Access</CardTitle>
              <CardDescription>Users who can access the support portal for this organization</CardDescription>
            </CardHeader>
            <CardContent>
              {customerAccess?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No customers have access yet</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Primary Contact</TableHead>
                      <TableHead>Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerAccess?.map((access: any) => (
                      <TableRow key={access.id}>
                        <TableCell>{access.profile?.full_name || "-"}</TableCell>
                        <TableCell>{access.profile?.email || "-"}</TableCell>
                        <TableCell>{access.is_primary_contact && <Badge variant="secondary">Primary</Badge>}</TableCell>
                        <TableCell>{format(new Date(access.created_at), "MMM d, yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SupportConfigForm({ initialData, onSave }: { initialData: any; onSave: (data: any) => void }) {
  const [supportStartDate, setSupportStartDate] = useState(initialData?.support_start_date || "");
  const [supportEndDate, setSupportEndDate] = useState(initialData?.support_end_date || "");
  const [supportLevel, setSupportLevel] = useState(initialData?.support_level || "standard");

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Support Start Date</Label>
          <Input type="date" value={supportStartDate} onChange={(e) => setSupportStartDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Support End Date</Label>
          <Input type="date" value={supportEndDate} onChange={(e) => setSupportEndDate(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Support Level</Label>
        <Select value={supportLevel} onValueChange={setSupportLevel}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={() => onSave({ support_start_date: supportStartDate || null, support_end_date: supportEndDate || null, support_level: supportLevel })}>
        Save Configuration
      </Button>
    </div>
  );
}

function SolutionForm({ 
  organizationId, 
  getOfferingsForCategory,
  escalationTemplates,
  onSuccess 
}: { 
  organizationId: string; 
  getOfferingsForCategory: (category: SolutionCategory) => any[];
  escalationTemplates: any[];
  onSuccess: () => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<SolutionCategory | "">("");
  const [selectedOffering, setSelectedOffering] = useState("");
  const [supportType, setSupportType] = useState<"one_time" | "continuous">("one_time");
  const [supportTier, setSupportTier] = useState("");
  const [supportPeriodStart, setSupportPeriodStart] = useState("");
  const [supportPeriodEnd, setSupportPeriodEnd] = useState("");
  const [escalationMatrixId, setEscalationMatrixId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const offerings = selectedCategory ? getOfferingsForCategory(selectedCategory) : [];
  const showEscalationMatrix = selectedCategory === "managed_security";

  const handleSubmit = async () => {
    if (!selectedCategory || !selectedOffering) return;
    setIsLoading(true);
    try {
      const offering = offerings.find(o => o.id === selectedOffering);
      const { error } = await supabase.from("organization_support_solutions").insert({
        organization_id: organizationId,
        solution_name: offering?.name || selectedOffering,
        category: selectedCategory,
        support_type: supportType,
        support_tier: supportType === "continuous" ? supportTier || null : null,
        support_period_start: supportType === "continuous" ? supportPeriodStart || null : null,
        support_period_end: supportType === "continuous" ? supportPeriodEnd || null : null,
        escalation_matrix_id: showEscalationMatrix && escalationMatrixId ? escalationMatrixId : null,
      });
      if (error) throw error;
      toast.success("Solution added");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
      <div className="space-y-2">
        <Label>Solution Category</Label>
        <div className="grid grid-cols-2 gap-2">
          {solutionCategories.map((category) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.value;
            return (
              <button key={category.value} type="button" onClick={() => { setSelectedCategory(category.value); setSelectedOffering(""); }}
                className={`p-3 rounded-lg border-2 text-left transition-all ${isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted"}`}><Icon className="h-3.5 w-3.5" /></div>
                  <span className="text-sm font-medium">{category.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedCategory && (
        <div className="space-y-2">
          <Label>Select Offering</Label>
          <Select value={selectedOffering} onValueChange={setSelectedOffering}>
            <SelectTrigger><SelectValue placeholder="Select an offering..." /></SelectTrigger>
            <SelectContent>
              {offerings.length === 0 ? <SelectItem value="none" disabled>No offerings available</SelectItem> : offerings.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Support Type</Label>
        <Select value={supportType} onValueChange={(v: "one_time" | "continuous") => setSupportType(v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="one_time">One-time</SelectItem>
            <SelectItem value="continuous">Continuous</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {supportType === "continuous" && (
        <>
          <div className="space-y-2">
            <Label>Support Tier</Label>
            <Select value={supportTier} onValueChange={setSupportTier}>
              <SelectTrigger><SelectValue placeholder="Select tier..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bronze">Bronze</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="diamond">Diamond</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Period Start</Label>
              <Input type="date" value={supportPeriodStart} onChange={(e) => setSupportPeriodStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Period End</Label>
              <Input type="date" value={supportPeriodEnd} onChange={(e) => setSupportPeriodEnd(e.target.value)} />
            </div>
          </div>
        </>
      )}

      {showEscalationMatrix && escalationTemplates.length > 0 && (
        <div className="space-y-2">
          <Label>Escalation Matrix (for Managed Security)</Label>
          <Select value={escalationMatrixId} onValueChange={setEscalationMatrixId}>
            <SelectTrigger><SelectValue placeholder="Select escalation matrix..." /></SelectTrigger>
            <SelectContent>
              {escalationTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button onClick={handleSubmit} disabled={isLoading || !selectedCategory || !selectedOffering} className="w-full">
        {isLoading ? "Adding..." : "Add Solution"}
      </Button>
    </div>
  );
}
