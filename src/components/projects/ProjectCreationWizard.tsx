import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Building2, 
  Package, 
  Briefcase, 
  Users, 
  FileText, 
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Plus,
  X,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Stakeholder {
  id: string;
  type: "internal" | "customer";
  name: string;
  email: string;
  role: string;
  designation: string;
  isPrimary: boolean;
}

interface ProductSelection {
  id: string;
  productId?: string;
  type: "product" | "service";
  name: string;
  description: string;
  quantity: number;
}

interface ScopeItem {
  id: string;
  description: string;
}

interface Deliverable {
  id: string;
  name: string;
  description: string;
  phaseNumber: number;
}

const WIZARD_STEPS = [
  { id: 1, title: "Customer", icon: Building2 },
  { id: 2, title: "Project Type", icon: Package },
  { id: 3, title: "Products/Services", icon: Briefcase },
  { id: 4, title: "Scope", icon: FileText },
  { id: 5, title: "Team", icon: Users },
  { id: 6, title: "Deliverables", icon: CheckCircle },
];

export function ProjectCreationWizard({ open, onOpenChange }: ProjectCreationWizardProps) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    organizationId: "",
    projectCategory: "service" as "product" | "service" | "hybrid",
    priority: "medium",
    startDate: "",
    endDate: "",
    durationWeeks: "",
    budget: "",
  });
  
  const [products, setProducts] = useState<ProductSelection[]>([]);
  const [scopeInclusions, setScopeInclusions] = useState<ScopeItem[]>([]);
  const [scopeExclusions, setScopeExclusions] = useState<ScopeItem[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);

  // Fetch organizations
  const { data: organizations } = useQuery({
    queryKey: ["organizations-for-project"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alliance_organizations")
        .select("id, name, organization_type")
        .eq("organization_type", "customer")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch product catalog
  const { data: productCatalog } = useQuery({
    queryKey: ["product-catalog-for-project"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_catalog")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch profiles for internal team
  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-project"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, email, designation")
        .order("display_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch contacts for customer stakeholders
  const { data: contacts } = useQuery({
    queryKey: ["contacts-for-project", formData.organizationId],
    queryFn: async () => {
      if (!formData.organizationId) return [];
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, email, designation")
        .eq("alliance_organization_id", formData.organizationId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!formData.organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // Create project
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert([{
          project_number: "",
          name: formData.name,
          description: formData.description || null,
          organization_id: formData.organizationId || null,
          project_category: formData.projectCategory,
          project_type: formData.projectCategory,
          priority: formData.priority,
          start_date: formData.startDate || null,
          end_date: formData.endDate || null,
          duration_weeks: formData.durationWeeks ? parseInt(formData.durationWeeks) : null,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          scope_inclusions: scopeInclusions.map(s => s.description),
          scope_exclusions: scopeExclusions.map(s => s.description),
          deliverables: deliverables.map(d => ({ name: d.name, description: d.description, phase: d.phaseNumber })),
          status: "planning",
          progress: 0,
          project_manager_id: user?.id,
          created_by: user?.id!,
          tenant_id: currentTenant?.id || null,
        }])
        .select()
        .single();
      
      if (projectError) throw projectError;

      // Create project products
      if (products.length > 0) {
        const { error: productsError } = await supabase
          .from("project_products")
          .insert(products.map(p => ({
            project_id: project.id,
            product_id: p.productId || null,
            product_type: p.type,
            name: p.name,
            description: p.description,
            quantity: p.quantity,
          })));
        if (productsError) throw productsError;
      }

      // Create stakeholders
      if (stakeholders.length > 0) {
        const { error: stakeholdersError } = await supabase
          .from("project_stakeholders")
          .insert(stakeholders.map(s => ({
            project_id: project.id,
            stakeholder_type: s.type,
            user_id: s.type === "internal" ? s.id : null,
            name: s.name,
            email: s.email,
            role: s.role,
            designation: s.designation,
            is_primary: s.isPrimary,
          })));
        if (stakeholdersError) throw stakeholdersError;
      }

      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects-stats"] });
      toast.success("Project created successfully!");
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to create project: " + error.message);
    },
  });

  const resetForm = () => {
    setCurrentStep(1);
    setFormData({
      name: "",
      description: "",
      organizationId: "",
      projectCategory: "service",
      priority: "medium",
      startDate: "",
      endDate: "",
      durationWeeks: "",
      budget: "",
    });
    setProducts([]);
    setScopeInclusions([]);
    setScopeExclusions([]);
    setStakeholders([]);
    setDeliverables([]);
  };

  const handleNext = () => {
    if (currentStep === 1 && !formData.organizationId) {
      toast.error("Please select a customer");
      return;
    }
    if (currentStep === 1 && !formData.name) {
      toast.error("Please enter a project name");
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 6));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    createMutation.mutate();
  };

  const addProduct = () => {
    setProducts([...products, {
      id: crypto.randomUUID(),
      type: "product",
      name: "",
      description: "",
      quantity: 1,
    }]);
  };

  const removeProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const updateProduct = (id: string, updates: Partial<ProductSelection>) => {
    setProducts(products.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const addScopeItem = (type: "inclusion" | "exclusion") => {
    const item = { id: crypto.randomUUID(), description: "" };
    if (type === "inclusion") {
      setScopeInclusions([...scopeInclusions, item]);
    } else {
      setScopeExclusions([...scopeExclusions, item]);
    }
  };

  const removeScopeItem = (id: string, type: "inclusion" | "exclusion") => {
    if (type === "inclusion") {
      setScopeInclusions(scopeInclusions.filter(s => s.id !== id));
    } else {
      setScopeExclusions(scopeExclusions.filter(s => s.id !== id));
    }
  };

  const addStakeholder = (type: "internal" | "customer") => {
    setStakeholders([...stakeholders, {
      id: crypto.randomUUID(),
      type,
      name: "",
      email: "",
      role: "",
      designation: "",
      isPrimary: false,
    }]);
  };

  const removeStakeholder = (id: string) => {
    setStakeholders(stakeholders.filter(s => s.id !== id));
  };

  const updateStakeholder = (id: string, updates: Partial<Stakeholder>) => {
    setStakeholders(stakeholders.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const addDeliverable = () => {
    setDeliverables([...deliverables, {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      phaseNumber: 1,
    }]);
  };

  const removeDeliverable = (id: string) => {
    setDeliverables(deliverables.filter(d => d.id !== id));
  };

  const updateDeliverable = (id: string, updates: Partial<Deliverable>) => {
    setDeliverables(deliverables.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const selectedOrg = organizations?.find(o => o.id === formData.organizationId);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Customer Organization *</Label>
              <Select
                value={formData.organizationId}
                onValueChange={(value) => setFormData({ ...formData, organizationId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {organizations?.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Project Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter project name"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter project description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (weeks)</Label>
                <Input
                  type="number"
                  value={formData.durationWeeks}
                  onChange={(e) => setFormData({ ...formData, durationWeeks: e.target.value })}
                  placeholder="12"
                />
              </div>
              <div className="space-y-2">
                <Label>Budget (₹)</Label>
                <Input
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <Label>Select Project Category</Label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: "product", label: "Product", desc: "Software licenses, hardware" },
                { value: "service", label: "Service", desc: "Consulting, implementation" },
                { value: "hybrid", label: "Hybrid", desc: "Products + Services" },
              ].map((option) => (
                <Card
                  key={option.value}
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary",
                    formData.projectCategory === option.value && "border-primary bg-primary/5"
                  )}
                  onClick={() => setFormData({ ...formData, projectCategory: option.value as any })}
                >
                  <CardContent className="p-4 text-center">
                    <Package className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h4 className="font-medium">{option.label}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{option.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Products & Services</Label>
              <Button type="button" variant="outline" size="sm" onClick={addProduct}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <Package className="h-8 w-8 mx-auto mb-2" />
                <p>No products/services added yet</p>
                <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={addProduct}>
                  Add your first item
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {products.map((product) => (
                  <Card key={product.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid grid-cols-4 gap-2">
                          <Select
                            value={product.type}
                            onValueChange={(value) => updateProduct(product.id, { type: value as "product" | "service" })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="product">Product</SelectItem>
                              <SelectItem value="service">Service</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Name"
                            value={product.name}
                            onChange={(e) => updateProduct(product.id, { name: e.target.value })}
                            className="col-span-2"
                          />
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={product.quantity}
                            onChange={(e) => updateProduct(product.id, { quantity: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeProduct(product.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Description"
                        value={product.description}
                        onChange={(e) => updateProduct(product.id, { description: e.target.value })}
                        className="mt-2"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-green-600">Scope Inclusions</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => addScopeItem("inclusion")}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              {scopeInclusions.map((item) => (
                <div key={item.id} className="flex gap-2">
                  <Input
                    placeholder="What's included in scope..."
                    value={item.description}
                    onChange={(e) => {
                      setScopeInclusions(scopeInclusions.map(s => 
                        s.id === item.id ? { ...s, description: e.target.value } : s
                      ));
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeScopeItem(item.id, "inclusion")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-red-600">Scope Exclusions</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => addScopeItem("exclusion")}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              {scopeExclusions.map((item) => (
                <div key={item.id} className="flex gap-2">
                  <Input
                    placeholder="What's excluded from scope..."
                    value={item.description}
                    onChange={(e) => {
                      setScopeExclusions(scopeExclusions.map(s => 
                        s.id === item.id ? { ...s, description: e.target.value } : s
                      ));
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeScopeItem(item.id, "exclusion")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Internal Team</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => addStakeholder("internal")}>
                  <Plus className="h-4 w-4 mr-1" /> Add Member
                </Button>
              </div>
              {stakeholders.filter(s => s.type === "internal").map((stakeholder) => (
                <Card key={stakeholder.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Input
                          placeholder="Name"
                          value={stakeholder.name}
                          onChange={(e) => updateStakeholder(stakeholder.id, { name: e.target.value })}
                        />
                        <Input
                          placeholder="Role (e.g., Project Manager)"
                          value={stakeholder.role}
                          onChange={(e) => updateStakeholder(stakeholder.id, { role: e.target.value })}
                        />
                        <Input
                          placeholder="Email"
                          value={stakeholder.email}
                          onChange={(e) => updateStakeholder(stakeholder.id, { email: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={stakeholder.isPrimary}
                          onCheckedChange={(checked) => updateStakeholder(stakeholder.id, { isPrimary: !!checked })}
                        />
                        <span className="text-xs">Primary</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStakeholder(stakeholder.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Customer Stakeholders</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => addStakeholder("customer")}>
                  <Plus className="h-4 w-4 mr-1" /> Add Stakeholder
                </Button>
              </div>
              {stakeholders.filter(s => s.type === "customer").map((stakeholder) => (
                <Card key={stakeholder.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Input
                          placeholder="Name"
                          value={stakeholder.name}
                          onChange={(e) => updateStakeholder(stakeholder.id, { name: e.target.value })}
                        />
                        <Input
                          placeholder="Role (e.g., Sponsor)"
                          value={stakeholder.role}
                          onChange={(e) => updateStakeholder(stakeholder.id, { role: e.target.value })}
                        />
                        <Input
                          placeholder="Email"
                          value={stakeholder.email}
                          onChange={(e) => updateStakeholder(stakeholder.id, { email: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={stakeholder.isPrimary}
                          onCheckedChange={(checked) => updateStakeholder(stakeholder.id, { isPrimary: !!checked })}
                        />
                        <span className="text-xs">Primary</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStakeholder(stakeholder.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Key Deliverables</Label>
              <Button type="button" variant="outline" size="sm" onClick={addDeliverable}>
                <Plus className="h-4 w-4 mr-1" /> Add Deliverable
              </Button>
            </div>

            {deliverables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <FileText className="h-8 w-8 mx-auto mb-2" />
                <p>No deliverables added yet</p>
                <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={addDeliverable}>
                  Add your first deliverable
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {deliverables.map((deliverable) => (
                  <Card key={deliverable.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Deliverable name"
                              value={deliverable.name}
                              onChange={(e) => updateDeliverable(deliverable.id, { name: e.target.value })}
                              className="flex-1"
                            />
                            <Input
                              type="number"
                              placeholder="Phase"
                              value={deliverable.phaseNumber}
                              onChange={(e) => updateDeliverable(deliverable.id, { phaseNumber: parseInt(e.target.value) || 1 })}
                              className="w-20"
                            />
                          </div>
                          <Input
                            placeholder="Description"
                            value={deliverable.description}
                            onChange={(e) => updateDeliverable(deliverable.id, { description: e.target.value })}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDeliverable(deliverable.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Summary */}
            <Card className="mt-6 bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Project Summary</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Customer:</span> {selectedOrg?.name || "-"}</p>
                <p><span className="text-muted-foreground">Project:</span> {formData.name || "-"}</p>
                <p><span className="text-muted-foreground">Type:</span> {formData.projectCategory}</p>
                <p><span className="text-muted-foreground">Products/Services:</span> {products.length}</p>
                <p><span className="text-muted-foreground">Team Members:</span> {stakeholders.length}</p>
                <p><span className="text-muted-foreground">Deliverables:</span> {deliverables.length}</p>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create New Project
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between border-b pb-4">
          {WIZARD_STEPS.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                currentStep === step.id && "text-primary",
                currentStep > step.id && "text-primary",
                currentStep < step.id && "text-muted-foreground"
              )}
              onClick={() => step.id < currentStep && setCurrentStep(step.id)}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  currentStep === step.id && "bg-primary text-primary-foreground",
                  currentStep > step.id && "bg-primary text-primary-foreground",
                  currentStep < step.id && "bg-muted"
                )}
              >
                {currentStep > step.id ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  step.id
                )}
              </div>
              <span className="hidden sm:inline text-sm">{step.title}</span>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          
          {currentStep < 6 ? (
            <Button type="button" onClick={handleNext}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button 
              type="button" 
              onClick={handleSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
