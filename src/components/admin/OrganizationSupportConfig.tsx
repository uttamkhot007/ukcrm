import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Calendar,
  Trash2,
  Edit,
  Package,
  Server,
  Briefcase,
  Award
} from "lucide-react";

interface OrganizationSupportConfigProps {
  organizationId: string;
  organizationName: string;
}

// Solution category types matching Offerings
type SolutionCategory = "solutions" | "offensive_security" | "managed_security" | "professional_services";

const solutionCategories: { value: SolutionCategory; label: string; icon: React.ElementType; table: string }[] = [
  { value: "solutions", label: "Solutions", icon: Package, table: "offerings_solutions" },
  { value: "offensive_security", label: "Offensive Security Services", icon: Shield, table: "offerings_offensive_security" },
  { value: "managed_security", label: "Managed Services", icon: Server, table: "offerings_managed_security" },
  { value: "professional_services", label: "Professional Services", icon: Briefcase, table: "offerings_professional_services" },
];

export default function OrganizationSupportConfig({
  organizationId,
  organizationName,
}: OrganizationSupportConfigProps) {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  const [isAddingEscalation, setIsAddingEscalation] = useState(false);
  const [isAddingSolution, setIsAddingSolution] = useState(false);
  const [isAddingSupportType, setIsAddingSupportType] = useState(false);
  const [editingSupportType, setEditingSupportType] = useState<any>(null);

  // Fetch support config
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

  // Fetch escalation matrix
  const { data: escalationMatrix } = useQuery({
    queryKey: ["org-escalation-matrix", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_escalation_matrix")
        .select("*")
        .eq("organization_id", organizationId);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch support solutions
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

  // Fetch support types
  const { data: supportTypes } = useQuery({
    queryKey: ["org-support-types", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_support_types")
        .select("*")
        .eq("organization_id", organizationId)
        .order("type", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch customer access
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

  // Fetch offerings for each category
  const { data: offeringsSolutions } = useQuery({
    queryKey: ["offerings", "solutions", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase
        .from("offerings_solutions")
        .select("id, name")
        .eq("tenant_id", currentTenant.id)
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant,
  });

  const { data: offeringsOffensive } = useQuery({
    queryKey: ["offerings", "offensive_security", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase
        .from("offerings_offensive_security")
        .select("id, name")
        .eq("tenant_id", currentTenant.id)
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant,
  });

  const { data: offeringsManaged } = useQuery({
    queryKey: ["offerings", "managed_security", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase
        .from("offerings_managed_security")
        .select("id, name")
        .eq("tenant_id", currentTenant.id)
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant,
  });

  const { data: offeringsProfessional } = useQuery({
    queryKey: ["offerings", "professional_services", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase
        .from("offerings_professional_services")
        .select("id, name")
        .eq("tenant_id", currentTenant.id)
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant,
  });

  const getOfferingsForCategory = (category: SolutionCategory) => {
    switch (category) {
      case "solutions":
        return offeringsSolutions || [];
      case "offensive_security":
        return offeringsOffensive || [];
      case "managed_security":
        return offeringsManaged || [];
      case "professional_services":
        return offeringsProfessional || [];
      default:
        return [];
    }
  };

  const handleSaveConfig = async (formData: any) => {
    try {
      const configData = {
        organization_id: organizationId,
        ...formData,
      };

      if (supportConfig?.id) {
        const { error } = await supabase
          .from("organization_support_config")
          .update(configData)
          .eq("id", supportConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("organization_support_config")
          .insert(configData);
        if (error) throw error;
      }

      toast.success("Support configuration saved");
      queryClient.invalidateQueries({ queryKey: ["org-support-config", organizationId] });
    } catch (error: any) {
      toast.error(error.message || "Failed to save configuration");
    }
  };

  const handleDeleteSupportType = async (id: string) => {
    try {
      const { error } = await supabase
        .from("organization_support_types")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Support type deleted");
      queryClient.invalidateQueries({ queryKey: ["org-support-types", organizationId] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Support Center Configuration</h2>
          <p className="text-muted-foreground">
            Manage support settings for {organizationName}
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general" className="gap-2">
            <Shield className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="escalation" className="gap-2">
            <Users className="h-4 w-4" />
            Escalation Matrix
          </TabsTrigger>
          <TabsTrigger value="solutions" className="gap-2">
            <Shield className="h-4 w-4" />
            Solutions
          </TabsTrigger>
          <TabsTrigger value="support-types" className="gap-2">
            <Award className="h-4 w-4" />
            Support Types
          </TabsTrigger>
          <TabsTrigger value="access" className="gap-2">
            <Users className="h-4 w-4" />
            Customer Access
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Support Period</CardTitle>
              <CardDescription>
                Configure the support period and level for this organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SupportConfigForm
                initialData={supportConfig}
                onSave={handleSaveConfig}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Support Documents</CardTitle>
              <CardDescription>
                SLA, MSA, and other support-related documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h4 className="font-medium">SLA Document</h4>
                  </div>
                  {supportConfig?.sla_document_url ? (
                    <a
                      href={supportConfig.sla_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      View Document
                    </a>
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
                    <a
                      href={supportConfig.msa_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      View Document
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">No MSA uploaded</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="escalation">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Escalation Matrix</CardTitle>
                <CardDescription>
                  Define escalation paths for each solution
                </CardDescription>
              </div>
              <Dialog open={isAddingEscalation} onOpenChange={setIsAddingEscalation}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Escalation
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Escalation Path</DialogTitle>
                    <DialogDescription>
                      Define escalation levels for a solution
                    </DialogDescription>
                  </DialogHeader>
                  <EscalationForm
                    organizationId={organizationId}
                    onSuccess={() => {
                      setIsAddingEscalation(false);
                      queryClient.invalidateQueries({ queryKey: ["org-escalation-matrix", organizationId] });
                    }}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {escalationMatrix?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No escalation paths configured
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Solution</TableHead>
                      <TableHead>Level 1</TableHead>
                      <TableHead>Level 2</TableHead>
                      <TableHead>Level 3</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {escalationMatrix?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.solution_name}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{item.level_1_email || "-"}</p>
                            <p className="text-muted-foreground">{item.level_1_response_hours}h SLA</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{item.level_2_email || "-"}</p>
                            <p className="text-muted-foreground">{item.level_2_response_hours}h SLA</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{item.level_3_email || "-"}</p>
                            <p className="text-muted-foreground">{item.level_3_response_hours}h SLA</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="solutions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Support Solutions</CardTitle>
                <CardDescription>
                  Products and services available for support
                </CardDescription>
              </div>
              <Dialog open={isAddingSolution} onOpenChange={setIsAddingSolution}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Solution
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add Solution</DialogTitle>
                    <DialogDescription>
                      Select a category and product/service for support
                    </DialogDescription>
                  </DialogHeader>
                  <SolutionForm
                    organizationId={organizationId}
                    getOfferingsForCategory={getOfferingsForCategory}
                    onSuccess={() => {
                      setIsAddingSolution(false);
                      queryClient.invalidateQueries({ queryKey: ["org-support-solutions", organizationId] });
                    }}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {/* Solution Category Cards */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {solutionCategories.map((category) => {
                  const Icon = category.icon;
                  const categorySolutions = solutions?.filter(
                    (s) => (s as any).category === category.value
                  ) || [];
                  return (
                    <div
                      key={category.value}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        categorySolutions.length > 0
                          ? "border-primary bg-primary/5"
                          : "border-border bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-2 rounded-lg ${categorySolutions.length > 0 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-sm">{category.label}</span>
                      </div>
                      <p className="text-2xl font-bold">{categorySolutions.length}</p>
                      <p className="text-xs text-muted-foreground">
                        {categorySolutions.length === 1 ? "service" : "services"}
                      </p>
                    </div>
                  );
                })}
              </div>

              {solutions?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No solutions configured
                </div>
              ) : (
                <div className="space-y-2">
                  {solutions?.map((solution) => {
                    const category = solutionCategories.find(c => c.value === (solution as any).category);
                    const Icon = category?.icon || Package;
                    return (
                      <div key={solution.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{solution.solution_name}</p>
                            <div className="flex items-center gap-2">
                              {category && (
                                <Badge variant="outline" className="text-xs">
                                  {category.label}
                                </Badge>
                              )}
                              {solution.service_name && (
                                <span className="text-sm text-muted-foreground">{solution.service_name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge variant={solution.is_active ? "default" : "secondary"}>
                          {solution.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support-types">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Support Types</CardTitle>
                <CardDescription>
                  Define support plans and service levels
                </CardDescription>
              </div>
              <Dialog open={isAddingSupportType} onOpenChange={(open) => {
                setIsAddingSupportType(open);
                if (!open) setEditingSupportType(null);
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Support Type
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingSupportType ? "Edit" : "Add"} Support Type</DialogTitle>
                    <DialogDescription>
                      Configure a support plan with service level details
                    </DialogDescription>
                  </DialogHeader>
                  <SupportTypeForm
                    organizationId={organizationId}
                    initialData={editingSupportType}
                    onSuccess={() => {
                      setIsAddingSupportType(false);
                      setEditingSupportType(null);
                      queryClient.invalidateQueries({ queryKey: ["org-support-types", organizationId] });
                    }}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {/* Support Type Categories */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* One-time Support */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">One-time Support</h3>
                  </div>
                  <div className="space-y-2">
                    {supportTypes?.filter(t => t.type === "one_time").length === 0 ? (
                      <p className="text-sm text-muted-foreground p-3 border rounded-lg border-dashed">
                        No one-time support types defined
                      </p>
                    ) : (
                      supportTypes?.filter(t => t.type === "one_time").map((type) => (
                        <SupportTypeCard
                          key={type.id}
                          supportType={type}
                          onEdit={() => {
                            setEditingSupportType(type);
                            setIsAddingSupportType(true);
                          }}
                          onDelete={() => handleDeleteSupportType(type.id)}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Yearly Service */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Yearly Service</h3>
                  </div>
                  <div className="space-y-2">
                    {/* Tier badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {["bronze", "silver", "gold", "diamond"].map((tier) => {
                        const count = supportTypes?.filter(t => t.type === "yearly" && t.tier === tier).length || 0;
                        return (
                          <Badge
                            key={tier}
                            variant={count > 0 ? "default" : "outline"}
                            className={`capitalize ${
                              tier === "bronze" ? "bg-amber-700" :
                              tier === "silver" ? "bg-slate-400" :
                              tier === "gold" ? "bg-yellow-500" :
                              tier === "diamond" ? "bg-cyan-400" : ""
                            } ${count > 0 ? "text-white" : ""}`}
                          >
                            {tier} ({count})
                          </Badge>
                        );
                      })}
                    </div>
                    {supportTypes?.filter(t => t.type === "yearly").length === 0 ? (
                      <p className="text-sm text-muted-foreground p-3 border rounded-lg border-dashed">
                        No yearly support types defined
                      </p>
                    ) : (
                      supportTypes?.filter(t => t.type === "yearly").map((type) => (
                        <SupportTypeCard
                          key={type.id}
                          supportType={type}
                          onEdit={() => {
                            setEditingSupportType(type);
                            setIsAddingSupportType(true);
                          }}
                          onDelete={() => handleDeleteSupportType(type.id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access">
          <Card>
            <CardHeader>
              <CardTitle>Customer Portal Access</CardTitle>
              <CardDescription>
                Users who can access the support portal for this organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customerAccess?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No customers have access yet
                </div>
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
                        <TableCell>
                          {access.is_primary_contact && (
                            <Badge variant="secondary">Primary</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(access.created_at), "MMM d, yyyy")}
                        </TableCell>
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

function SupportTypeCard({ 
  supportType, 
  onEdit, 
  onDelete 
}: { 
  supportType: any; 
  onEdit: () => void; 
  onDelete: () => void; 
}) {
  const tierColors: Record<string, string> = {
    bronze: "border-amber-700 bg-amber-700/10",
    silver: "border-slate-400 bg-slate-400/10",
    gold: "border-yellow-500 bg-yellow-500/10",
    diamond: "border-cyan-400 bg-cyan-400/10",
    custom: "border-primary bg-primary/10",
  };

  return (
    <div className={`p-3 border-2 rounded-lg ${tierColors[supportType.tier] || "border-border"}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{supportType.name}</p>
            {supportType.tier && (
              <Badge variant="outline" className="capitalize text-xs">
                {supportType.tier}
              </Badge>
            )}
          </div>
          {supportType.description && (
            <p className="text-sm text-muted-foreground mt-1">{supportType.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            {supportType.response_hours && (
              <span>Response: {supportType.response_hours}h</span>
            )}
            {supportType.resolution_hours && (
              <span>Resolution: {supportType.resolution_hours}h</span>
            )}
            {supportType.price && (
              <span className="font-medium text-foreground">₹{supportType.price}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
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
          <Input
            type="date"
            value={supportStartDate}
            onChange={(e) => setSupportStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Support End Date</Label>
          <Input
            type="date"
            value={supportEndDate}
            onChange={(e) => setSupportEndDate(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Support Level</Label>
        <Select value={supportLevel} onValueChange={setSupportLevel}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        onClick={() => onSave({
          support_start_date: supportStartDate || null,
          support_end_date: supportEndDate || null,
          support_level: supportLevel,
        })}
      >
        Save Configuration
      </Button>
    </div>
  );
}

function EscalationForm({ organizationId, onSuccess }: { organizationId: string; onSuccess: () => void }) {
  const [solutionName, setSolutionName] = useState("");
  const [level1Email, setLevel1Email] = useState("");
  const [level2Email, setLevel2Email] = useState("");
  const [level3Email, setLevel3Email] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!solutionName) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("support_escalation_matrix")
        .insert({
          organization_id: organizationId,
          solution_name: solutionName,
          level_1_email: level1Email || null,
          level_2_email: level2Email || null,
          level_3_email: level3Email || null,
        });
      if (error) throw error;
      toast.success("Escalation path added");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Solution Name</Label>
        <Input value={solutionName} onChange={(e) => setSolutionName(e.target.value)} placeholder="e.g., CRM Platform" />
      </div>
      <div className="space-y-2">
        <Label>Level 1 Email</Label>
        <Input value={level1Email} onChange={(e) => setLevel1Email(e.target.value)} placeholder="support@example.com" />
      </div>
      <div className="space-y-2">
        <Label>Level 2 Email</Label>
        <Input value={level2Email} onChange={(e) => setLevel2Email(e.target.value)} placeholder="senior-support@example.com" />
      </div>
      <div className="space-y-2">
        <Label>Level 3 Email</Label>
        <Input value={level3Email} onChange={(e) => setLevel3Email(e.target.value)} placeholder="manager@example.com" />
      </div>
      <Button onClick={handleSubmit} disabled={isLoading || !solutionName} className="w-full">
        {isLoading ? "Adding..." : "Add Escalation Path"}
      </Button>
    </div>
  );
}

function SolutionForm({ 
  organizationId, 
  getOfferingsForCategory,
  onSuccess 
}: { 
  organizationId: string; 
  getOfferingsForCategory: (category: SolutionCategory) => any[];
  onSuccess: () => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<SolutionCategory | "">("");
  const [selectedOffering, setSelectedOffering] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const offerings = selectedCategory ? getOfferingsForCategory(selectedCategory) : [];

  const handleSubmit = async () => {
    if (!selectedCategory || !selectedOffering) return;
    setIsLoading(true);
    try {
      const offering = offerings.find(o => o.id === selectedOffering);
      const { error } = await supabase
        .from("organization_support_solutions")
        .insert({
          organization_id: organizationId,
          solution_name: offering?.name || selectedOffering,
          service_name: serviceName || null,
          category: selectedCategory,
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
    <div className="space-y-4">
      {/* Category Selection with highlighted cards */}
      <div className="space-y-2">
        <Label>Solution Category</Label>
        <div className="grid grid-cols-2 gap-2">
          {solutionCategories.map((category) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.value;
            return (
              <button
                key={category.value}
                type="button"
                onClick={() => {
                  setSelectedCategory(category.value);
                  setSelectedOffering("");
                }}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-medium">{category.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Offering Dropdown */}
      {selectedCategory && (
        <div className="space-y-2">
          <Label>Select {solutionCategories.find(c => c.value === selectedCategory)?.label}</Label>
          <Select value={selectedOffering} onValueChange={setSelectedOffering}>
            <SelectTrigger>
              <SelectValue placeholder="Select an offering..." />
            </SelectTrigger>
            <SelectContent>
              {offerings.length === 0 ? (
                <SelectItem value="none" disabled>No offerings available</SelectItem>
              ) : (
                offerings.map((offering) => (
                  <SelectItem key={offering.id} value={offering.id}>
                    {offering.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Service Name (Optional)</Label>
        <Input 
          value={serviceName} 
          onChange={(e) => setServiceName(e.target.value)} 
          placeholder="e.g., Premium Support" 
        />
      </div>

      <Button 
        onClick={handleSubmit} 
        disabled={isLoading || !selectedCategory || !selectedOffering} 
        className="w-full"
      >
        {isLoading ? "Adding..." : "Add Solution"}
      </Button>
    </div>
  );
}

function SupportTypeForm({ 
  organizationId, 
  initialData,
  onSuccess 
}: { 
  organizationId: string; 
  initialData?: any;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(initialData?.name || "");
  const [type, setType] = useState<"one_time" | "yearly">(initialData?.type || "one_time");
  const [tier, setTier] = useState(initialData?.tier || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [responseHours, setResponseHours] = useState(initialData?.response_hours?.toString() || "");
  const [resolutionHours, setResolutionHours] = useState(initialData?.resolution_hours?.toString() || "");
  const [price, setPrice] = useState(initialData?.price?.toString() || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !type) return;
    setIsLoading(true);
    try {
      const data = {
        organization_id: organizationId,
        name,
        type,
        tier: type === "yearly" ? tier || null : null,
        description: description || null,
        response_hours: responseHours ? parseInt(responseHours) : null,
        resolution_hours: resolutionHours ? parseInt(resolutionHours) : null,
        price: price ? parseFloat(price) : null,
      };

      if (initialData?.id) {
        const { error } = await supabase
          .from("organization_support_types")
          .update(data)
          .eq("id", initialData.id);
        if (error) throw error;
        toast.success("Support type updated");
      } else {
        const { error } = await supabase
          .from("organization_support_types")
          .insert(data);
        if (error) throw error;
        toast.success("Support type added");
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Name *</Label>
        <Input 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="e.g., Standard Support" 
        />
      </div>

      <div className="space-y-2">
        <Label>Support Type *</Label>
        <Select value={type} onValueChange={(v: "one_time" | "yearly") => setType(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="one_time">One-time</SelectItem>
            <SelectItem value="yearly">Yearly Service</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {type === "yearly" && (
        <div className="space-y-2">
          <Label>Service Tier</Label>
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger>
              <SelectValue placeholder="Select tier..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bronze">Bronze</SelectItem>
              <SelectItem value="silver">Silver</SelectItem>
              <SelectItem value="gold">Gold</SelectItem>
              <SelectItem value="diamond">Diamond</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          placeholder="Describe the support plan..." 
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Response Hours</Label>
          <Input 
            type="number"
            value={responseHours} 
            onChange={(e) => setResponseHours(e.target.value)} 
            placeholder="e.g., 4" 
          />
        </div>
        <div className="space-y-2">
          <Label>Resolution Hours</Label>
          <Input 
            type="number"
            value={resolutionHours} 
            onChange={(e) => setResolutionHours(e.target.value)} 
            placeholder="e.g., 24" 
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Price</Label>
        <Input 
          type="number"
          value={price} 
          onChange={(e) => setPrice(e.target.value)} 
          placeholder="e.g., 50000" 
        />
      </div>

      <Button 
        onClick={handleSubmit} 
        disabled={isLoading || !name || !type} 
        className="w-full"
      >
        {isLoading ? "Saving..." : initialData ? "Update Support Type" : "Add Support Type"}
      </Button>
    </div>
  );
}
