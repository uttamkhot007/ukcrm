import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Building2, 
  UserPlus, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft,
  Check,
  Sparkles,
  Package,
  Shield,
  Briefcase,
  Users,
  Clock,
  FileText,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";

type DealType = "new" | "cross_sale";

interface DealFormData {
  alliance_organization_id: string;
  organization_name: string;
  title: string;
  deal_type: DealType;
  requirement_category: string;
  problem_requirement: string;
  problem_area_ids: string[]; // Multi-select for problem areas
  solution_id: string;
  contact_id: string;
  quantity: string;
  buying_timeline: string;
  is_budgeted: boolean;
  tentative_budget: string;
  value: string;
  probability: string;
  expected_close_date: string;
  next_steps: string;
  description: string;
  stage: "pipeline" | "upside" | "strong_upside" | "commit" | "closed_won" | "closed_lost";
  existing_solution: string;
}

interface DealWizardProps {
  initialData?: Partial<DealFormData>;
  onSubmit: (data: DealFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  isEditing?: boolean;
}

const WIZARD_STEPS = [
  { id: 1, title: "Prospect", icon: Building2, description: "Select organization" },
  { id: 2, title: "Deal Type", icon: Target, description: "New or Cross Sale" },
  { id: 3, title: "Requirement", icon: FileText, description: "Problem statement" },
  { id: 4, title: "Solution", icon: Package, description: "Product or service" },
  { id: 5, title: "Timeline", icon: Clock, description: "Buying timeline" },
  { id: 6, title: "Next Steps", icon: ChevronRight, description: "Action items" },
  { id: 7, title: "Finish", icon: Check, description: "Review & submit" },
];

const buyingTimelineOptions = [
  { value: "immediate", label: "Immediate", description: "< 1 month" },
  { value: "short_term", label: "Short Term", description: "1-3 months" },
  { value: "medium_term", label: "Medium Term", description: "3-6 months" },
  { value: "long_term", label: "Long Term", description: "6+ months" },
];

// Dynamic requirement categories based on offerings tables
const DEFAULT_REQUIREMENT_CATEGORIES = [
  { value: "products", label: "Products", icon: Package, description: "Hardware & Software Products" },
  { value: "offensive_services", label: "Offensive Services", icon: Shield, description: "Penetration Testing, Red Team" },
  { value: "managed_security_services", label: "Managed Security Services", icon: Users, description: "SOC, Monitoring, MDR" },
  { value: "professional_services", label: "Professional Services", icon: Briefcase, description: "Implementation, Consulting" },
  { value: "consulting", label: "Consulting", icon: Users, description: "Advisory, Strategy" },
];

const initialFormData: DealFormData = {
  alliance_organization_id: "",
  organization_name: "",
  title: "",
  deal_type: "new",
  requirement_category: "products",
  problem_requirement: "",
  problem_area_ids: [],
  solution_id: "",
  contact_id: "",
  quantity: "1",
  buying_timeline: "",
  is_budgeted: false,
  tentative_budget: "",
  value: "",
  probability: "10",
  expected_close_date: "",
  next_steps: "",
  description: "",
  stage: "pipeline",
  existing_solution: "",
};

export function DealWizard({ initialData, onSubmit, onCancel, isSubmitting, isEditing }: DealWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<DealFormData>({ ...initialFormData, ...initialData });
  const { getCurrencySymbol } = useOrganizationSettings();

  // Fetch Alliance Organizations (excluding resellers - those are competitors, not prospects)
  const { data: allianceOrganizations } = useQuery({
    queryKey: ["alliance-organizations-prospects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alliance_organizations")
        .select("id, name, organization_type, status")
        .eq("status", "active")
        .not("organization_type", "ilike", "reseller")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch Alliance Users (contacts from Alliance)
  const { data: allianceUsers } = useQuery({
    queryKey: ["alliance-users", formData.alliance_organization_id],
    queryFn: async () => {
      let query = supabase
        .from("alliance_users")
        .select("id, name, email, designation, organization_id")
        .order("name", { ascending: true });
      
      if (formData.alliance_organization_id) {
        query = query.eq("organization_id", formData.alliance_organization_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: true,
  });

  // Fetch Products/Offerings
  const { data: products } = useQuery<{ id: string; name: string; category: string | null }[]>({
    queryKey: ["offerings-products"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase as any)
        .from("offerings_products")
        .select("id, name, category")
        .eq("status", "active")
        .order("name", { ascending: true });
      if (result.error) throw result.error;
      return result.data || [];
    },
  });

  // Fetch Problem Areas from offerings_problem_areas
  const { data: problemAreas } = useQuery<{ id: string; name: string; description: string | null; area_type: string | null }[]>({
    queryKey: ["offerings-problem-areas"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase as any)
        .from("offerings_problem_areas")
        .select("id, name, description, area_type")
        .eq("status", "active")
        .order("name", { ascending: true });
      if (result.error) throw result.error;
      return result.data || [];
    },
  });

  // Fetch services for requirement categories
  const { data: managedSecurityServices } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["offerings-managed-security"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase as any)
        .from("offerings_managed_security")
        .select("id, name")
        .eq("status", "active");
      if (result.error) throw result.error;
      return result.data || [];
    },
  });

  const { data: offensiveServices } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["offerings-offensive-security"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase as any)
        .from("offerings_offensive_security")
        .select("id, name")
        .eq("status", "active");
      if (result.error) throw result.error;
      return result.data || [];
    },
  });

  const { data: professionalServices } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["offerings-professional-services"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase as any)
        .from("offerings_professional_services")
        .select("id, name")
        .eq("status", "active");
      if (result.error) throw result.error;
      return result.data || [];
    },
  });

  // Build dynamic requirement categories based on available offerings
  const requirementCategories = [
    { 
      value: "products", 
      label: "Products", 
      icon: Package, 
      description: "Hardware & Software Products",
      hasData: (products?.length || 0) > 0
    },
    { 
      value: "offensive_services", 
      label: "Offensive Services", 
      icon: Shield, 
      description: "Penetration Testing, Red Team",
      hasData: (offensiveServices?.length || 0) > 0
    },
    { 
      value: "managed_security_services", 
      label: "Managed Security Services", 
      icon: Users, 
      description: "SOC, Monitoring, MDR",
      hasData: (managedSecurityServices?.length || 0) > 0
    },
    { 
      value: "professional_services", 
      label: "Professional Services", 
      icon: Briefcase, 
      description: "Implementation, Consulting",
      hasData: (professionalServices?.length || 0) > 0
    },
    { 
      value: "consulting", 
      label: "Consulting", 
      icon: Users, 
      description: "Advisory, Strategy",
      hasData: true // Always show consulting
    },
  ];

  // Filter products based on requirement category
  const filteredProducts = products?.filter(p => {
    if (!formData.requirement_category) return true;
    if (formData.requirement_category === "products") {
      return !p.category || p.category?.toLowerCase().includes("product");
    }
    return p.category?.toLowerCase().includes(formData.requirement_category.replace("_", " "));
  }) || products;

  // AI Suggested products (simple match based on problem statement)
  const suggestedProducts = products?.filter(p => {
    if (!formData.problem_requirement) return false;
    const problem = formData.problem_requirement.toLowerCase();
    const name = p.name.toLowerCase();
    return problem.split(" ").some(word => word.length > 3 && name.includes(word));
  }).slice(0, 3);

  // Toggle problem area selection
  const toggleProblemArea = (areaId: string) => {
    const current = formData.problem_area_ids || [];
    const updated = current.includes(areaId)
      ? current.filter(id => id !== areaId)
      : [...current, areaId];
    updateFormData({ problem_area_ids: updated });
  };

  const updateFormData = (updates: Partial<DealFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.alliance_organization_id && formData.title;
      case 2:
        return formData.deal_type;
      case 3:
        return formData.requirement_category && (formData.problem_area_ids?.length > 0 || formData.problem_requirement);
      case 4:
        return true; // Solution is optional
      case 5:
        return formData.buying_timeline && formData.value;
      case 6:
        return true; // Next steps optional
      case 7:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const progress = (currentStep / WIZARD_STEPS.length) * 100;

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Progress Header */}
      <div className="border-b border-border pb-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Step {currentStep} of {WIZARD_STEPS.length}</span>
          <span className="text-sm font-medium">{WIZARD_STEPS[currentStep - 1].title}</span>
        </div>
        <Progress value={progress} className="h-2" />
        
        {/* Step Indicators */}
        <div className="flex justify-between mt-4">
          {WIZARD_STEPS.map((step) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div 
                key={step.id}
                className={cn(
                  "flex flex-col items-center gap-1 cursor-pointer transition-all",
                  isActive && "scale-110",
                  !isActive && !isCompleted && "opacity-50"
                )}
                onClick={() => isCompleted && setCurrentStep(step.id)}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                  isCompleted && "bg-primary text-primary-foreground",
                  isActive && "bg-primary/20 text-primary border-2 border-primary",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground"
                )}>
                  {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                </div>
                <span className="text-[10px] text-muted-foreground hidden sm:block">{step.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto px-1">
        {/* Step 1: Prospect Selection */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Select Prospect Organization</h3>
              <p className="text-sm text-muted-foreground">Choose an existing organization or add a new one</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Organization *</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.alliance_organization_id || "none"}
                    onValueChange={(value) => {
                      const org = allianceOrganizations?.find(o => o.id === value);
                      updateFormData({ 
                        alliance_organization_id: value === "none" ? "" : value,
                        organization_name: org?.name || "",
                        contact_id: ""
                      });
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select organization..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select organization...</SelectItem>
                      {allianceOrganizations?.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3 h-3" />
                            {org.name}
                            <Badge variant="outline" className="text-[10px] ml-1">
                              {org.organization_type}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => window.open('/admin/alliance', '_blank')}
                    title="Add New Organization"
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Deal Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => updateFormData({ title: e.target.value })}
                  placeholder="Enter a title for this deal"
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label>Primary Contact</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.contact_id || "none"}
                    onValueChange={(value) => updateFormData({ contact_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a contact" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No contact selected</SelectItem>
                      {allianceUsers?.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name} {contact.designation && `(${contact.designation})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => window.open('/admin/alliance', '_blank')}
                    title="Add New Contact"
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Deal Type */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">What type of deal is this?</h3>
              <p className="text-sm text-muted-foreground">Select if this is a new opportunity or cross-sale</p>
            </div>

            <RadioGroup
              value={formData.deal_type}
              onValueChange={(value) => updateFormData({ deal_type: value as DealType })}
              className="grid grid-cols-2 gap-4"
            >
              <Label 
                htmlFor="new" 
                className={cn(
                  "flex flex-col items-center gap-3 p-6 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50",
                  formData.deal_type === "new" ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <RadioGroupItem value="new" id="new" className="sr-only" />
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  formData.deal_type === "new" ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <Target className="w-6 h-6" />
                </div>
                <span className="font-medium">New Business</span>
                <span className="text-xs text-muted-foreground text-center">First-time purchase from this customer</span>
              </Label>

              <Label 
                htmlFor="cross_sale" 
                className={cn(
                  "flex flex-col items-center gap-3 p-6 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50",
                  formData.deal_type === "cross_sale" ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <RadioGroupItem value="cross_sale" id="cross_sale" className="sr-only" />
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  formData.deal_type === "cross_sale" ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <Sparkles className="w-6 h-6" />
                </div>
                <span className="font-medium">Cross Sale</span>
                <span className="text-xs text-muted-foreground text-center">Additional product/service for existing customer</span>
              </Label>
            </RadioGroup>

            {formData.deal_type === "cross_sale" && (
              <div className="space-y-2 mt-4">
                <Label>Existing Solution (What they currently have)</Label>
                <Input
                  value={formData.existing_solution}
                  onChange={(e) => updateFormData({ existing_solution: e.target.value })}
                  placeholder="E.g., CrowdStrike, Splunk, etc."
                />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Requirement */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">What is the requirement?</h3>
              <p className="text-sm text-muted-foreground">Select category and problem areas</p>
            </div>

            <div className="space-y-4">
              <Label>Requirement Category *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {requirementCategories.map((cat) => {
                  const CatIcon = cat.icon;
                  const isSelected = formData.requirement_category === cat.value;
                  return (
                    <div
                      key={cat.value}
                      onClick={() => updateFormData({ requirement_category: cat.value })}
                      className={cn(
                        "p-3 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50",
                        isSelected ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <CatIcon className={cn("w-4 h-4", isSelected && "text-primary")} />
                        <span className="text-sm font-medium">{cat.label}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{cat.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Multi-select Problem Areas */}
            <div className="space-y-3">
              <Label>Problem / Requirement Areas * <span className="text-xs text-muted-foreground">(Select one or more)</span></Label>
              {problemAreas && problemAreas.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                  {problemAreas.map((area) => {
                    const isSelected = formData.problem_area_ids?.includes(area.id);
                    return (
                      <div
                        key={area.id}
                        onClick={() => toggleProblemArea(area.id)}
                        className={cn(
                          "p-2 rounded-lg border cursor-pointer transition-all hover:border-primary/50 flex items-start gap-2",
                          isSelected ? "border-primary bg-primary/5" : "border-border"
                        )}
                      >
                        <Checkbox 
                          checked={isSelected} 
                          className="mt-0.5 pointer-events-none"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium block truncate">{area.name}</span>
                          {area.description && (
                            <span className="text-[10px] text-muted-foreground line-clamp-2">{area.description}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No problem areas configured. Go to Offerings → Problem Areas to add them.
                  </AlertDescription>
                </Alert>
              )}
              {formData.problem_area_ids && formData.problem_area_ids.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {formData.problem_area_ids.map(id => {
                    const area = problemAreas?.find(a => a.id === id);
                    return area ? (
                      <Badge key={id} variant="secondary" className="text-xs">
                        {area.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={formData.problem_requirement}
                onChange={(e) => updateFormData({ problem_requirement: e.target.value })}
                placeholder="Describe the customer's problem or requirement in more detail (optional)..."
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Step 4: Solution */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Recommended Solutions</h3>
              <p className="text-sm text-muted-foreground">AI-suggested solutions based on the requirement</p>
            </div>

            {suggestedProducts && suggestedProducts.length > 0 && (
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-medium">AI Suggestions</span>
                </div>
                <div className="grid gap-2">
                  {suggestedProducts.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => updateFormData({ solution_id: product.id })}
                      className={cn(
                        "p-3 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50 flex items-center justify-between",
                        formData.solution_id === product.id ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.category && (
                            <p className="text-xs text-muted-foreground">{product.category}</p>
                          )}
                        </div>
                      </div>
                      {formData.solution_id === product.id && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>All Solutions/Products</Label>
              {filteredProducts?.length ? (
                <Select
                  value={formData.solution_id || "none"}
                  onValueChange={(value) => updateFormData({ solution_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a solution" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No solution selected</SelectItem>
                    {filteredProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} {product.category && `(${product.category})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No products available. Contact Administrator to add offerings.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => updateFormData({ quantity: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Step 5: Timeline */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Buying Timeline & Budget</h3>
              <p className="text-sm text-muted-foreground">When is the customer planning to purchase?</p>
            </div>

            <div className="space-y-4">
              <Label>Buying Timeline *</Label>
              <div className="grid grid-cols-2 gap-3">
                {buyingTimelineOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => updateFormData({ buying_timeline: option.value })}
                    className={cn(
                      "p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50 text-center",
                      formData.buying_timeline === option.value ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <p className="font-medium">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Deal Value ({getCurrencySymbol()}) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.value}
                  onChange={(e) => updateFormData({ value: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Tentative Budget ({getCurrencySymbol()})</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.tentative_budget}
                  onChange={(e) => updateFormData({ tentative_budget: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_budgeted"
                checked={formData.is_budgeted}
                onCheckedChange={(checked) => updateFormData({ is_budgeted: !!checked })}
              />
              <Label htmlFor="is_budgeted" className="cursor-pointer">Customer has budget allocated</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expected Close Date</Label>
                <Input
                  type="date"
                  value={formData.expected_close_date}
                  onChange={(e) => updateFormData({ expected_close_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Probability (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) => updateFormData({ probability: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Next Steps */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Next Steps & Notes</h3>
              <p className="text-sm text-muted-foreground">Define action items and additional details</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Next Steps</Label>
                <Textarea
                  value={formData.next_steps}
                  onChange={(e) => updateFormData({ next_steps: e.target.value })}
                  placeholder="What are the next actions to move this deal forward?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                  placeholder="Any additional notes or context..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Review & Finish */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Review Deal Details</h3>
              <p className="text-sm text-muted-foreground">Confirm all details before creating the deal</p>
            </div>

            <div className="space-y-4 bg-muted/50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Organization</p>
                  <p className="font-medium">{formData.organization_name || "Not selected"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Deal Title</p>
                  <p className="font-medium">{formData.title || "Not set"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Deal Type</p>
                  <p className="font-medium capitalize">{formData.deal_type.replace("_", " ")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium capitalize">{formData.requirement_category.replace(/_/g, " ")}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Problem/Requirement</p>
                  <p className="font-medium">{formData.problem_requirement || "Not set"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Deal Value</p>
                  <p className="font-medium">{getCurrencySymbol()}{formData.value || "0"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Timeline</p>
                  <p className="font-medium capitalize">{formData.buying_timeline?.replace(/_/g, " ") || "Not set"}</p>
                </div>
                {formData.next_steps && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Next Steps</p>
                    <p className="font-medium">{formData.next_steps}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="border-t border-border pt-4 mt-4 flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={currentStep === 1 ? onCancel : handleBack}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {currentStep === 1 ? "Cancel" : "Back"}
        </Button>

        {currentStep < WIZARD_STEPS.length ? (
          <Button 
            type="button" 
            onClick={handleNext}
            disabled={!canProceed()}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button 
            type="button" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : isEditing ? "Update Deal" : "Create Deal"}
            <Check className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
