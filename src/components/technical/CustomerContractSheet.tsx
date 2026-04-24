import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Building2,
  Calendar,
  Shield,
  Users,
  Phone,
  Mail,
  UserCircle,
  Plus,
  Trash2,
  Key,
  Package,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

interface CustomerContractSheetProps {
  contractId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EscalationContact {
  level: number;
  name: string;
  role: string;
  email: string;
  phone: string;
}

interface SupportContact {
  name: string;
  role: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

interface LicenseDetail {
  product: string;
  quantity: number;
  licenseKey?: string;
  expiryDate?: string;
}

export function CustomerContractSheet({
  contractId,
  open,
  onOpenChange,
}: CustomerContractSheetProps) {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Form states for adding new items
  const [newContact, setNewContact] = useState<SupportContact>({
    name: "",
    role: "",
    email: "",
    phone: "",
    isPrimary: false,
  });
  const [newEscalation, setNewEscalation] = useState<EscalationContact>({
    level: 1,
    name: "",
    role: "",
    email: "",
    phone: "",
  });
  const [newLicense, setNewLicense] = useState<LicenseDetail>({
    product: "",
    quantity: 1,
    licenseKey: "",
    expiryDate: "",
  });
  const [newSolution, setNewSolution] = useState("");

  // Fetch contract details
  const { data: contract, isLoading } = useQuery({
    queryKey: ["customer-contract-detail", contractId],
    enabled: !!contractId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_support_contracts")
        .select(`
          *,
          organization:alliance_organizations(
            id, name, organization_type, solutions, services, 
            address, website, industry
          )
        `)
        .eq("id", contractId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch customer contacts from alliance_users
  const { data: customerContacts = [] } = useQuery({
    queryKey: ["customer-contacts", contract?.organization_id],
    enabled: !!contract?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alliance_users")
        .select("*")
        .eq("organization_id", contract!.organization_id)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const updateContractMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from("customer_support_contracts")
        .update(updates)
        .eq("id", contractId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-contract-detail", contractId] });
      queryClient.invalidateQueries({ queryKey: ["customer-support-contracts"] });
      toast.success("Contract updated");
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  const addSupportContact = () => {
    if (!newContact.name || !newContact.email) return;
    const currentContacts = (contract?.support_contacts as unknown as SupportContact[]) || [];
    updateContractMutation.mutate({
      support_contacts: [...currentContacts, newContact],
    });
    setNewContact({ name: "", role: "", email: "", phone: "", isPrimary: false });
  };

  const removeSupportContact = (index: number) => {
    const currentContacts = (contract?.support_contacts as unknown as SupportContact[]) || [];
    updateContractMutation.mutate({
      support_contacts: currentContacts.filter((_, i) => i !== index),
    });
  };

  const addEscalation = () => {
    if (!newEscalation.name) return;
    const currentMatrix = (contract?.escalation_matrix as unknown as EscalationContact[]) || [];
    updateContractMutation.mutate({
      escalation_matrix: [...currentMatrix, newEscalation],
    });
    setNewEscalation({ level: currentMatrix.length + 2, name: "", role: "", email: "", phone: "" });
  };

  const removeEscalation = (index: number) => {
    const currentMatrix = (contract?.escalation_matrix as unknown as EscalationContact[]) || [];
    updateContractMutation.mutate({
      escalation_matrix: currentMatrix.filter((_, i) => i !== index),
    });
  };

  const addLicense = () => {
    if (!newLicense.product) return;
    const currentLicenses = (contract?.license_details as { licenses?: LicenseDetail[] })?.licenses || [];
    updateContractMutation.mutate({
      license_details: { licenses: [...currentLicenses, newLicense] },
    });
    setNewLicense({ product: "", quantity: 1, licenseKey: "", expiryDate: "" });
  };

  const removeLicense = (index: number) => {
    const currentLicenses = (contract?.license_details as { licenses?: LicenseDetail[] })?.licenses || [];
    updateContractMutation.mutate({
      license_details: { licenses: currentLicenses.filter((_, i) => i !== index) },
    });
  };

  const addSolution = () => {
    if (!newSolution) return;
    const currentSolutions = (contract?.solution_details as string[]) || [];
    updateContractMutation.mutate({
      solution_details: [...currentSolutions, newSolution],
    });
    setNewSolution("");
  };

  const removeSolution = (index: number) => {
    const currentSolutions = (contract?.solution_details as string[]) || [];
    updateContractMutation.mutate({
      solution_details: currentSolutions.filter((_, i) => i !== index),
    });
  };

  if (!open) return null;

  const daysRemaining = contract ? differenceInDays(parseISO(contract.end_date), new Date()) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[800px] sm:max-w-[800px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {isLoading ? "Loading..." : contract?.contract_name}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : contract ? (
          <div className="mt-6">
            {/* Header Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-semibold">{contract.organization?.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {contract.contract_type.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Contract Period</p>
                      <p className="font-semibold">
                        {format(parseISO(contract.start_date), "MMM d, yyyy")} -{" "}
                        {format(parseISO(contract.end_date), "MMM d, yyyy")}
                      </p>
                    </div>
                    {daysRemaining > 0 ? (
                      <Badge className={daysRemaining <= 30 ? "bg-orange-500" : "bg-green-500"}>
                        {daysRemaining} days left
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Expired</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="solutions">Solutions</TabsTrigger>
                <TabsTrigger value="licenses">Licenses</TabsTrigger>
                <TabsTrigger value="contacts">Contacts</TabsTrigger>
                <TabsTrigger value="escalation">Escalation</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      SLA Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span>Response Time</span>
                      <Badge variant="outline">{contract.sla_response_hours} hours</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span>Resolution Time</span>
                      <Badge variant="outline">{contract.sla_resolution_hours} hours</Badge>
                    </div>
                  </CardContent>
                </Card>

                {contract.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{contract.notes}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Customer Contacts from Alliance Users */}
                {customerContacts.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Customer Team ({customerContacts.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {customerContacts.map((contact) => (
                          <div
                            key={contact.id}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <UserCircle className="w-8 h-8 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{contact.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {contact.designation || contact.role}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              {contact.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {contact.email}
                                </span>
                              )}
                              {contact.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {contact.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="solutions" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Solutions & Services
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Existing solutions from organization */}
                    {contract.organization?.solutions && contract.organization.solutions.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Organization Solutions</p>
                        <div className="flex flex-wrap gap-2">
                          {contract.organization.solutions.map((solution, i) => (
                            <Badge key={i} variant="secondary">
                              {solution}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Contract-specific solutions */}
                    <div>
                      <p className="text-sm font-medium mb-2">Contract Solutions</p>
                      <div className="space-y-2">
                        {((contract.solution_details as string[]) || []).map((solution, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                          >
                            <span>{solution}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeSolution(i)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Input
                          placeholder="Add solution..."
                          value={newSolution}
                          onChange={(e) => setNewSolution(e.target.value)}
                        />
                        <Button onClick={addSolution} disabled={!newSolution}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="licenses" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Key className="w-5 h-5" />
                      License Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {((contract.license_details as { licenses?: LicenseDetail[] })?.licenses || []).map(
                      (license, i) => (
                        <div
                          key={i}
                          className="p-3 bg-muted/50 rounded-lg flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium">{license.product}</p>
                            <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                              <span>Qty: {license.quantity}</span>
                              {license.expiryDate && (
                                <span>Expires: {format(parseISO(license.expiryDate), "MMM d, yyyy")}</span>
                              )}
                            </div>
                            {license.licenseKey && (
                              <p className="text-xs font-mono mt-1 text-muted-foreground">
                                Key: {license.licenseKey.substring(0, 10)}...
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeLicense(i)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )
                    )}

                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-3">Add License</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Product name"
                          value={newLicense.product}
                          onChange={(e) => setNewLicense({ ...newLicense, product: e.target.value })}
                        />
                        <Input
                          type="number"
                          placeholder="Quantity"
                          value={newLicense.quantity}
                          onChange={(e) =>
                            setNewLicense({ ...newLicense, quantity: parseInt(e.target.value) || 1 })
                          }
                        />
                        <Input
                          placeholder="License key (optional)"
                          value={newLicense.licenseKey}
                          onChange={(e) => setNewLicense({ ...newLicense, licenseKey: e.target.value })}
                        />
                        <Input
                          type="date"
                          placeholder="Expiry date"
                          value={newLicense.expiryDate}
                          onChange={(e) => setNewLicense({ ...newLicense, expiryDate: e.target.value })}
                        />
                      </div>
                      <Button
                        className="mt-2"
                        onClick={addLicense}
                        disabled={!newLicense.product}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add License
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contacts" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Support Contacts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {((contract.support_contacts as unknown as SupportContact[]) || []).map((contact, i) => (
                      <div
                        key={i}
                        className="p-3 bg-muted/50 rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <UserCircle className="w-8 h-8 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{contact.name}</p>
                              {contact.isPrimary && (
                                <Badge variant="default" className="text-xs">
                                  Primary
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{contact.role}</p>
                            <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {contact.email}
                              </span>
                              {contact.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {contact.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeSupportContact(i)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-3">Add Support Contact</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Name"
                          value={newContact.name}
                          onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                        />
                        <Input
                          placeholder="Role"
                          value={newContact.role}
                          onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                        />
                        <Input
                          placeholder="Email"
                          value={newContact.email}
                          onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                        />
                        <Input
                          placeholder="Phone"
                          value={newContact.phone}
                          onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                        />
                      </div>
                      <Button
                        className="mt-2"
                        onClick={addSupportContact}
                        disabled={!newContact.name || !newContact.email}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Contact
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="escalation" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Escalation Matrix
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {((contract.escalation_matrix as unknown as EscalationContact[]) || [])
                      .sort((a, b) => a.level - b.level)
                      .map((contact, i) => (
                        <div
                          key={i}
                          className="p-3 bg-muted/50 rounded-lg flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                              L{contact.level}
                            </div>
                            <div>
                              <p className="font-medium">{contact.name}</p>
                              <p className="text-sm text-muted-foreground">{contact.role}</p>
                              <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {contact.email}
                                </span>
                                {contact.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {contact.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeEscalation(i)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}

                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-3">Add Escalation Contact</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Level"
                          value={newEscalation.level}
                          onChange={(e) =>
                            setNewEscalation({ ...newEscalation, level: parseInt(e.target.value) || 1 })
                          }
                        />
                        <Input
                          placeholder="Name"
                          value={newEscalation.name}
                          onChange={(e) => setNewEscalation({ ...newEscalation, name: e.target.value })}
                        />
                        <Input
                          placeholder="Role"
                          value={newEscalation.role}
                          onChange={(e) => setNewEscalation({ ...newEscalation, role: e.target.value })}
                        />
                        <Input
                          placeholder="Email"
                          value={newEscalation.email}
                          onChange={(e) => setNewEscalation({ ...newEscalation, email: e.target.value })}
                        />
                        <Input
                          placeholder="Phone"
                          className="col-span-2"
                          value={newEscalation.phone}
                          onChange={(e) => setNewEscalation({ ...newEscalation, phone: e.target.value })}
                        />
                      </div>
                      <Button
                        className="mt-2"
                        onClick={addEscalation}
                        disabled={!newEscalation.name}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Escalation
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
