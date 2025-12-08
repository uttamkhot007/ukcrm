import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
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
import { 
  Clock, 
  Users, 
  Plus, 
  Trash2,
  Edit,
  Award,
  AlertTriangle,
  Shield,
  Zap
} from "lucide-react";

export function SupportManagementModule() {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const [isAddingSLA, setIsAddingSLA] = useState(false);
  const [editingSLA, setEditingSLA] = useState<any>(null);
  const [isAddingEscalation, setIsAddingEscalation] = useState(false);
  const [editingEscalation, setEditingEscalation] = useState<any>(null);
  const [isAddingSupportType, setIsAddingSupportType] = useState(false);
  const [editingSupportType, setEditingSupportType] = useState<any>(null);

  // Fetch SLAs
  const { data: slas } = useQuery({
    queryKey: ["support-slas", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await supabase
        .from("support_slas")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .order("priority", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch Escalation Templates
  const { data: escalationTemplates } = useQuery({
    queryKey: ["escalation-templates", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await supabase
        .from("escalation_matrix_templates")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch Support Type Templates
  const { data: supportTypeTemplates } = useQuery({
    queryKey: ["support-type-templates", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await supabase
        .from("support_type_templates")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .order("type", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  const handleDeleteSLA = async (id: string) => {
    try {
      const { error } = await supabase.from("support_slas").delete().eq("id", id);
      if (error) throw error;
      toast.success("SLA deleted");
      queryClient.invalidateQueries({ queryKey: ["support-slas"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteEscalation = async (id: string) => {
    try {
      const { error } = await supabase.from("escalation_matrix_templates").delete().eq("id", id);
      if (error) throw error;
      toast.success("Escalation template deleted");
      queryClient.invalidateQueries({ queryKey: ["escalation-templates"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteSupportType = async (id: string) => {
    try {
      const { error } = await supabase.from("support_type_templates").delete().eq("id", id);
      if (error) throw error;
      toast.success("Support type deleted");
      queryClient.invalidateQueries({ queryKey: ["support-type-templates"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const priorityColors: Record<string, string> = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-yellow-500",
    low: "bg-green-500",
  };

  const tierColors: Record<string, string> = {
    bronze: "bg-amber-700",
    silver: "bg-slate-400",
    gold: "bg-yellow-500",
    diamond: "bg-cyan-400",
    custom: "bg-primary",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Support Management</h1>
        <p className="text-muted-foreground">
          Configure SLAs, escalation matrices, and support types
        </p>
      </div>

      <Tabs defaultValue="slas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="slas" className="gap-2">
            <Clock className="h-4 w-4" />
            SLAs
          </TabsTrigger>
          <TabsTrigger value="escalation" className="gap-2">
            <Users className="h-4 w-4" />
            Escalation Matrix
          </TabsTrigger>
          <TabsTrigger value="support-types" className="gap-2">
            <Award className="h-4 w-4" />
            Support Types
          </TabsTrigger>
        </TabsList>

        {/* SLAs Tab */}
        <TabsContent value="slas">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Service Level Agreements</CardTitle>
                <CardDescription>
                  Define response and resolution times for different priorities
                </CardDescription>
              </div>
              <Dialog open={isAddingSLA} onOpenChange={(open) => {
                setIsAddingSLA(open);
                if (!open) setEditingSLA(null);
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add SLA
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingSLA ? "Edit" : "Add"} SLA</DialogTitle>
                    <DialogDescription>
                      Configure service level agreement details
                    </DialogDescription>
                  </DialogHeader>
                  <SLAForm
                    tenantId={currentTenant?.id || ""}
                    userId={user?.id || ""}
                    initialData={editingSLA}
                    onSuccess={() => {
                      setIsAddingSLA(false);
                      setEditingSLA(null);
                      queryClient.invalidateQueries({ queryKey: ["support-slas"] });
                    }}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {slas?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No SLAs configured</p>
                  <p className="text-sm">Add SLAs to define response times</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Response</TableHead>
                      <TableHead>Resolution</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slas?.map((sla: any) => (
                      <TableRow key={sla.id}>
                        <TableCell className="font-medium">{sla.name}</TableCell>
                        <TableCell>
                          <Badge className={`${priorityColors[sla.priority]} text-white capitalize`}>
                            {sla.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>{sla.response_hours}h</TableCell>
                        <TableCell>{sla.resolution_hours}h</TableCell>
                        <TableCell>
                          <Badge variant={sla.is_active ? "default" : "secondary"}>
                            {sla.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingSLA(sla);
                                setIsAddingSLA(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteSLA(sla.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

        {/* Escalation Matrix Tab */}
        <TabsContent value="escalation">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Escalation Matrix Templates</CardTitle>
                <CardDescription>
                  Define reusable escalation paths for support
                </CardDescription>
              </div>
              <Dialog open={isAddingEscalation} onOpenChange={(open) => {
                setIsAddingEscalation(open);
                if (!open) setEditingEscalation(null);
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingEscalation ? "Edit" : "Add"} Escalation Template</DialogTitle>
                    <DialogDescription>
                      Configure escalation levels and contacts
                    </DialogDescription>
                  </DialogHeader>
                  <EscalationTemplateForm
                    tenantId={currentTenant?.id || ""}
                    userId={user?.id || ""}
                    initialData={editingEscalation}
                    onSuccess={() => {
                      setIsAddingEscalation(false);
                      setEditingEscalation(null);
                      queryClient.invalidateQueries({ queryKey: ["escalation-templates"] });
                    }}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {escalationTemplates?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No escalation templates configured</p>
                  <p className="text-sm">Create templates to use in organization support</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {escalationTemplates?.map((template: any) => (
                    <Card key={template.id} className="border-2">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{template.name}</CardTitle>
                            {template.description && (
                              <CardDescription className="text-xs mt-1">
                                {template.description}
                              </CardDescription>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingEscalation(template);
                                setIsAddingEscalation(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteEscalation(template.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="bg-green-500/10 text-green-600">L1</Badge>
                          <span className="text-muted-foreground">{template.level_1_email || "-"}</span>
                          <span className="text-xs text-muted-foreground">({template.level_1_response_hours}h)</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">L2</Badge>
                          <span className="text-muted-foreground">{template.level_2_email || "-"}</span>
                          <span className="text-xs text-muted-foreground">({template.level_2_response_hours}h)</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="bg-red-500/10 text-red-600">L3</Badge>
                          <span className="text-muted-foreground">{template.level_3_email || "-"}</span>
                          <span className="text-xs text-muted-foreground">({template.level_3_response_hours}h)</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Support Types Tab */}
        <TabsContent value="support-types">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Support Type Templates</CardTitle>
                <CardDescription>
                  Define reusable support plans (One-time & Yearly)
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
                      Configure support plan details
                    </DialogDescription>
                  </DialogHeader>
                  <SupportTypeTemplateForm
                    tenantId={currentTenant?.id || ""}
                    userId={user?.id || ""}
                    initialData={editingSupportType}
                    onSuccess={() => {
                      setIsAddingSupportType(false);
                      setEditingSupportType(null);
                      queryClient.invalidateQueries({ queryKey: ["support-type-templates"] });
                    }}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* One-time Support */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">One-time Support</h3>
                  </div>
                  <div className="space-y-2">
                    {supportTypeTemplates?.filter((t: any) => t.type === "one_time").length === 0 ? (
                      <p className="text-sm text-muted-foreground p-3 border rounded-lg border-dashed">
                        No one-time support types defined
                      </p>
                    ) : (
                      supportTypeTemplates?.filter((t: any) => t.type === "one_time").map((type: any) => (
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
                  <div className="flex flex-wrap gap-2 mb-3">
                    {["bronze", "silver", "gold", "diamond"].map((tier) => {
                      const count = supportTypeTemplates?.filter((t: any) => t.type === "yearly" && t.tier === tier).length || 0;
                      return (
                        <Badge
                          key={tier}
                          variant={count > 0 ? "default" : "outline"}
                          className={`capitalize ${count > 0 ? `${tierColors[tier]} text-white` : ""}`}
                        >
                          {tier} ({count})
                        </Badge>
                      );
                    })}
                  </div>
                  <div className="space-y-2">
                    {supportTypeTemplates?.filter((t: any) => t.type === "yearly").length === 0 ? (
                      <p className="text-sm text-muted-foreground p-3 border rounded-lg border-dashed">
                        No yearly support types defined
                      </p>
                    ) : (
                      supportTypeTemplates?.filter((t: any) => t.type === "yearly").map((type: any) => (
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
      </Tabs>
    </div>
  );
}

// SLA Form Component
function SLAForm({ 
  tenantId, 
  userId, 
  initialData, 
  onSuccess 
}: { 
  tenantId: string; 
  userId: string;
  initialData?: any; 
  onSuccess: () => void;
}) {
  const [name, setName] = useState(initialData?.name || "");
  const [priority, setPriority] = useState(initialData?.priority || "medium");
  const [description, setDescription] = useState(initialData?.description || "");
  const [responseHours, setResponseHours] = useState(initialData?.response_hours?.toString() || "");
  const [resolutionHours, setResolutionHours] = useState(initialData?.resolution_hours?.toString() || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !responseHours || !resolutionHours) return;
    setIsLoading(true);
    try {
      const data = {
        tenant_id: tenantId,
        name,
        priority,
        description: description || null,
        response_hours: parseInt(responseHours),
        resolution_hours: parseInt(resolutionHours),
        created_by: userId,
      };

      if (initialData?.id) {
        const { error } = await supabase.from("support_slas").update(data).eq("id", initialData.id);
        if (error) throw error;
        toast.success("SLA updated");
      } else {
        const { error } = await supabase.from("support_slas").insert(data);
        if (error) throw error;
        toast.success("SLA created");
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
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Critical Response" />
      </div>
      <div className="space-y-2">
        <Label>Priority *</Label>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="SLA description..." rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Response Hours *</Label>
          <Input type="number" value={responseHours} onChange={(e) => setResponseHours(e.target.value)} placeholder="e.g., 2" />
        </div>
        <div className="space-y-2">
          <Label>Resolution Hours *</Label>
          <Input type="number" value={resolutionHours} onChange={(e) => setResolutionHours(e.target.value)} placeholder="e.g., 8" />
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={isLoading || !name || !responseHours || !resolutionHours} className="w-full">
        {isLoading ? "Saving..." : initialData ? "Update SLA" : "Create SLA"}
      </Button>
    </div>
  );
}

// Escalation Template Form
function EscalationTemplateForm({ 
  tenantId, 
  userId,
  initialData, 
  onSuccess 
}: { 
  tenantId: string; 
  userId: string;
  initialData?: any;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [level1Email, setLevel1Email] = useState(initialData?.level_1_email || "");
  const [level1Hours, setLevel1Hours] = useState(initialData?.level_1_response_hours?.toString() || "4");
  const [level2Email, setLevel2Email] = useState(initialData?.level_2_email || "");
  const [level2Hours, setLevel2Hours] = useState(initialData?.level_2_response_hours?.toString() || "8");
  const [level3Email, setLevel3Email] = useState(initialData?.level_3_email || "");
  const [level3Hours, setLevel3Hours] = useState(initialData?.level_3_response_hours?.toString() || "24");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name) return;
    setIsLoading(true);
    try {
      const data = {
        tenant_id: tenantId,
        name,
        description: description || null,
        level_1_email: level1Email || null,
        level_1_response_hours: parseInt(level1Hours) || 4,
        level_2_email: level2Email || null,
        level_2_response_hours: parseInt(level2Hours) || 8,
        level_3_email: level3Email || null,
        level_3_response_hours: parseInt(level3Hours) || 24,
        created_by: userId,
      };

      if (initialData?.id) {
        const { error } = await supabase.from("escalation_matrix_templates").update(data).eq("id", initialData.id);
        if (error) throw error;
        toast.success("Template updated");
      } else {
        const { error } = await supabase.from("escalation_matrix_templates").insert(data);
        if (error) throw error;
        toast.success("Template created");
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
        <Label>Template Name *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Managed Security Escalation" />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." />
      </div>
      <div className="space-y-3 p-3 border rounded-lg">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <Badge variant="outline" className="bg-green-500/10">L1</Badge>
          Level 1 - First Response
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <Input value={level1Email} onChange={(e) => setLevel1Email(e.target.value)} placeholder="Email address" />
          <div className="flex items-center gap-2">
            <Input type="number" value={level1Hours} onChange={(e) => setLevel1Hours(e.target.value)} placeholder="Hours" className="w-20" />
            <span className="text-sm text-muted-foreground">hours</span>
          </div>
        </div>
      </div>
      <div className="space-y-3 p-3 border rounded-lg">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <Badge variant="outline" className="bg-yellow-500/10">L2</Badge>
          Level 2 - Escalation
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <Input value={level2Email} onChange={(e) => setLevel2Email(e.target.value)} placeholder="Email address" />
          <div className="flex items-center gap-2">
            <Input type="number" value={level2Hours} onChange={(e) => setLevel2Hours(e.target.value)} placeholder="Hours" className="w-20" />
            <span className="text-sm text-muted-foreground">hours</span>
          </div>
        </div>
      </div>
      <div className="space-y-3 p-3 border rounded-lg">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <Badge variant="outline" className="bg-red-500/10">L3</Badge>
          Level 3 - Management
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <Input value={level3Email} onChange={(e) => setLevel3Email(e.target.value)} placeholder="Email address" />
          <div className="flex items-center gap-2">
            <Input type="number" value={level3Hours} onChange={(e) => setLevel3Hours(e.target.value)} placeholder="Hours" className="w-20" />
            <span className="text-sm text-muted-foreground">hours</span>
          </div>
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={isLoading || !name} className="w-full">
        {isLoading ? "Saving..." : initialData ? "Update Template" : "Create Template"}
      </Button>
    </div>
  );
}

// Support Type Template Form
function SupportTypeTemplateForm({ 
  tenantId, 
  userId,
  initialData, 
  onSuccess 
}: { 
  tenantId: string;
  userId: string;
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
        tenant_id: tenantId,
        name,
        type,
        tier: type === "yearly" ? tier || null : null,
        description: description || null,
        response_hours: responseHours ? parseInt(responseHours) : null,
        resolution_hours: resolutionHours ? parseInt(resolutionHours) : null,
        price: price ? parseFloat(price) : null,
        created_by: userId,
      };

      if (initialData?.id) {
        const { error } = await supabase.from("support_type_templates").update(data).eq("id", initialData.id);
        if (error) throw error;
        toast.success("Support type updated");
      } else {
        const { error } = await supabase.from("support_type_templates").insert(data);
        if (error) throw error;
        toast.success("Support type created");
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
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Premium Support" />
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
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the support plan..." rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Response Hours</Label>
          <Input type="number" value={responseHours} onChange={(e) => setResponseHours(e.target.value)} placeholder="e.g., 4" />
        </div>
        <div className="space-y-2">
          <Label>Resolution Hours</Label>
          <Input type="number" value={resolutionHours} onChange={(e) => setResolutionHours(e.target.value)} placeholder="e.g., 24" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Price</Label>
        <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g., 50000" />
      </div>
      <Button onClick={handleSubmit} disabled={isLoading || !name || !type} className="w-full">
        {isLoading ? "Saving..." : initialData ? "Update Support Type" : "Create Support Type"}
      </Button>
    </div>
  );
}

// Support Type Card Component
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
            {supportType.response_hours && <span>Response: {supportType.response_hours}h</span>}
            {supportType.resolution_hours && <span>Resolution: {supportType.resolution_hours}h</span>}
            {supportType.price && <span className="font-medium text-foreground">₹{supportType.price}</span>}
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
