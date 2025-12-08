import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Upload,
  Trash2,
  Edit
} from "lucide-react";

interface OrganizationSupportConfigProps {
  organizationId: string;
  organizationName: string;
}

export default function OrganizationSupportConfig({
  organizationId,
  organizationName,
}: OrganizationSupportConfigProps) {
  const queryClient = useQueryClient();
  const [isAddingEscalation, setIsAddingEscalation] = useState(false);
  const [isAddingSolution, setIsAddingSolution] = useState(false);

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

  // Fetch customer access
  const { data: customerAccess } = useQuery({
    queryKey: ["org-customer-access", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_organization_access")
        .select(`
          *,
          profile:profiles!customer_organization_access_user_id_fkey(full_name, email)
        `)
        .eq("organization_id", organizationId);
      
      if (error) throw error;
      return data;
    },
  });

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
        <TabsList>
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
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Solution</DialogTitle>
                    <DialogDescription>
                      Add a product or service for support
                    </DialogDescription>
                  </DialogHeader>
                  <SolutionForm
                    organizationId={organizationId}
                    onSuccess={() => {
                      setIsAddingSolution(false);
                      queryClient.invalidateQueries({ queryKey: ["org-support-solutions", organizationId] });
                    }}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {solutions?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No solutions configured
                </div>
              ) : (
                <div className="space-y-2">
                  {solutions?.map((solution) => (
                    <div key={solution.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{solution.solution_name}</p>
                        {solution.service_name && (
                          <p className="text-sm text-muted-foreground">{solution.service_name}</p>
                        )}
                      </div>
                      <Badge variant={solution.is_active ? "default" : "secondary"}>
                        {solution.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
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

function SolutionForm({ organizationId, onSuccess }: { organizationId: string; onSuccess: () => void }) {
  const [solutionName, setSolutionName] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!solutionName) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("organization_support_solutions")
        .insert({
          organization_id: organizationId,
          solution_name: solutionName,
          service_name: serviceName || null,
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
      <div className="space-y-2">
        <Label>Solution Name</Label>
        <Input value={solutionName} onChange={(e) => setSolutionName(e.target.value)} placeholder="e.g., CRM Platform" />
      </div>
      <div className="space-y-2">
        <Label>Service Name (Optional)</Label>
        <Input value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="e.g., Premium Support" />
      </div>
      <Button onClick={handleSubmit} disabled={isLoading || !solutionName} className="w-full">
        {isLoading ? "Adding..." : "Add Solution"}
      </Button>
    </div>
  );
}
