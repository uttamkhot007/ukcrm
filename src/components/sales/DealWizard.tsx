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
  Target,
  Mail,
  Globe,
  Database,
  Monitor,
  Cloud,
  Network,
  Scale,
  Star,
  MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";

type DealType = "new" | "cross_sale";
type ProblemCategory = "security" | "compliance" | "both";
type AttackVector = "email" | "web_application" | "database" | "endpoint" | "cloud" | "network";
type PreferredSolution = "product" | "managed_service";

interface EmailSecurityDetails {
  attackTypes: string[];
  platform: "cloud" | "onprem" | "hybrid";
  cloudProvider?: string;
  otherCloudProvider?: string;
  hybridCloudProvider?: string;
  hybridOnpremPlatform?: string;
  mailboxCount: string;
  preferredSolution: PreferredSolution;
}

interface WebAppSecurityDetails {
  protectionTypes: string[];
  webAppCount: string;
  bandwidth: string;
  transactions: string;
  preferredSolution: PreferredSolution;
}

interface DealFormData {
  alliance_organization_id: string;
  organization_name: string;
  prospect_id: string;
  prospect_name: string;
  title: string;
  deal_type: DealType;
  requirement_category: string;
  problem_requirement: string;
  problem_area_ids: string[];
  problem_category: ProblemCategory;
  attack_vector: AttackVector;
  email_security: EmailSecurityDetails;
  web_app_security: WebAppSecurityDetails;
  compliance_frameworks: string[];
  solution_id: string;
  contact_id: string;
  quantity: string;
  buying_timeline: string;
  is_budgeted: boolean;
  tentative_budget: string;
  value: string;
  probability: string;
  expected_close_date: string;
  next_steps_actions: string[];
  critical_factors: string[];
  next_steps: string;
  description: string;
  motivational_message: string;
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
  { id: 1, title: "Customer", icon: Building2, description: "Select organization" },
  { id: 2, title: "Prospect", icon: Users, description: "Select prospect" },
  { id: 3, title: "Deal Type", icon: Target, description: "New or Cross Sale" },
  { id: 4, title: "Problem Area", icon: Shield, description: "Security needs" },
  { id: 5, title: "Solution", icon: Package, description: "Product or service" },
  { id: 6, title: "Timeline", icon: Clock, description: "Buying timeline" },
  { id: 7, title: "Next Steps", icon: ChevronRight, description: "Action items" },
  { id: 8, title: "Critical Factors", icon: Star, description: "Key considerations" },
  { id: 9, title: "Finish", icon: Check, description: "Review & submit" },
];

const buyingTimelineOptions = [
  { value: "immediate", label: "Immediate", description: "< 1 month" },
  { value: "short_term", label: "Short Term", description: "1-3 months" },
  { value: "medium_term", label: "Medium Term", description: "3-6 months" },
  { value: "long_term", label: "Long Term", description: "6+ months" },
];

const emailAttackTypes = [
  { value: "phishing", label: "Phishing" },
  { value: "quishing", label: "Quishing (QR Code Phishing)" },
  { value: "bec", label: "BEC (Business Email Compromise)" },
  { value: "advanced_malware", label: "Advanced Malware" },
  { value: "all", label: "All of the Above" },
];

const webAppProtectionTypes = [
  { value: "owasp_top10", label: "OWASP Top 10 Protection" },
  { value: "app_ddos", label: "Application DDoS" },
  { value: "api_discovery", label: "API Discovery" },
  { value: "bot_protection", label: "BOT Protection" },
];

const complianceFrameworks = [
  { value: "iso27001", label: "ISO 27001" },
  { value: "soc2", label: "SOC 2" },
  { value: "sebi_guidelines", label: "SEBI Guidelines" },
  { value: "rbi_guidelines", label: "RBI Guidelines" },
  { value: "gdpr", label: "GDPR" },
  { value: "hipaa", label: "HIPAA" },
  { value: "pci_dss", label: "PCI DSS" },
  { value: "nist", label: "NIST Framework" },
  { value: "other", label: "Other" },
];

const nextStepActions = [
  { value: "technical_presentation", label: "Technical Presentation", icon: FileText },
  { value: "demo", label: "Demo", icon: Monitor },
  { value: "poc", label: "POC (Proof of Concept)", icon: Target },
];

const criticalFactors = [
  { value: "executive_connect", label: "Executive Connect", description: "Need C-level engagement" },
  { value: "technical_capabilities", label: "Technical Capabilities", description: "Technical fit is critical" },
  { value: "pricing", label: "Pricing", description: "Budget is a key factor" },
];

const attackVectorOptions = [
  { value: "email", label: "Email Security", icon: Mail, description: "Email-based threats" },
  { value: "web_application", label: "Web Application", icon: Globe, description: "Web app protection" },
  { value: "database", label: "Database", icon: Database, description: "Database security" },
  { value: "endpoint", label: "Endpoint", icon: Monitor, description: "Endpoint protection" },
  { value: "cloud", label: "Cloud", icon: Cloud, description: "Cloud security" },
  { value: "network", label: "Network", icon: Network, description: "Network security" },
];

const initialFormData: DealFormData = {
  alliance_organization_id: "",
  organization_name: "",
  prospect_id: "",
  prospect_name: "",
  title: "",
  deal_type: "new",
  requirement_category: "products",
  problem_requirement: "",
  problem_area_ids: [],
  problem_category: "security",
  attack_vector: "email",
  email_security: {
    attackTypes: [],
    platform: "cloud",
    cloudProvider: "",
    otherCloudProvider: "",
    hybridCloudProvider: "",
    hybridOnpremPlatform: "",
    mailboxCount: "",
    preferredSolution: "product",
  },
  web_app_security: {
    protectionTypes: [],
    webAppCount: "",
    bandwidth: "",
    transactions: "",
    preferredSolution: "product",
  },
  compliance_frameworks: [],
  solution_id: "",
  contact_id: "",
  quantity: "1",
  buying_timeline: "",
  is_budgeted: false,
  tentative_budget: "",
  value: "",
  probability: "10",
  expected_close_date: "",
  next_steps_actions: [],
  critical_factors: [],
  next_steps: "",
  description: "",
  motivational_message: "",
  stage: "pipeline",
  existing_solution: "",
};

export function DealWizard({ initialData, onSubmit, onCancel, isSubmitting, isEditing }: DealWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<DealFormData>({ ...initialFormData, ...initialData });
  const { getCurrencySymbol } = useOrganizationSettings();

  // Fetch Alliance Organizations
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

  // Fetch Alliance Users (contacts)
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

  // Fetch Products
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

  // Fetch Problem Areas
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

  const updateFormData = (updates: Partial<DealFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const updateEmailSecurity = (updates: Partial<EmailSecurityDetails>) => {
    setFormData(prev => ({
      ...prev,
      email_security: { ...prev.email_security, ...updates }
    }));
  };

  const updateWebAppSecurity = (updates: Partial<WebAppSecurityDetails>) => {
    setFormData(prev => ({
      ...prev,
      web_app_security: { ...prev.web_app_security, ...updates }
    }));
  };

  const toggleEmailAttackType = (type: string) => {
    const current = formData.email_security.attackTypes || [];
    if (type === "all") {
      const allTypes = emailAttackTypes.filter(t => t.value !== "all").map(t => t.value);
      updateEmailSecurity({ attackTypes: current.includes("all") ? [] : allTypes });
    } else {
      const updated = current.includes(type)
        ? current.filter(t => t !== type && t !== "all")
        : [...current.filter(t => t !== "all"), type];
      updateEmailSecurity({ attackTypes: updated });
    }
  };

  const toggleWebAppProtection = (type: string) => {
    const current = formData.web_app_security.protectionTypes || [];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    updateWebAppSecurity({ protectionTypes: updated });
  };

  const toggleComplianceFramework = (framework: string) => {
    const current = formData.compliance_frameworks || [];
    const updated = current.includes(framework)
      ? current.filter(f => f !== framework)
      : [...current, framework];
    updateFormData({ compliance_frameworks: updated });
  };

  const toggleNextStepAction = (action: string) => {
    const current = formData.next_steps_actions || [];
    const updated = current.includes(action)
      ? current.filter(a => a !== action)
      : [...current, action];
    updateFormData({ next_steps_actions: updated });
  };

  const toggleCriticalFactor = (factor: string) => {
    const current = formData.critical_factors || [];
    const updated = current.includes(factor)
      ? current.filter(f => f !== factor)
      : [...current, factor];
    updateFormData({ critical_factors: updated });
  };

  const toggleProblemArea = (areaId: string) => {
    const current = formData.problem_area_ids || [];
    const updated = current.includes(areaId)
      ? current.filter(id => id !== areaId)
      : [...current, areaId];
    updateFormData({ problem_area_ids: updated });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.alliance_organization_id;
      case 2:
        return formData.prospect_id && formData.title;
      case 3:
        return formData.deal_type;
      case 4:
        return formData.problem_category;
      case 5:
        return true;
      case 6:
        return formData.buying_timeline && formData.value;
      case 7:
        return true;
      case 8:
        return true;
      case 9:
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

  const renderEmailSecurityOptions = () => (
    <div className="space-y-4 border border-border rounded-lg p-4 mt-4">
      <h4 className="font-medium flex items-center gap-2">
        <Mail className="w-4 h-4" />
        Email Security Details
      </h4>

      {/* Attack Types */}
      <div className="space-y-2">
        <Label>Attack Types to Protect Against</Label>
        <div className="grid grid-cols-2 gap-2">
          {emailAttackTypes.map((type) => (
            <div
              key={type.value}
              onClick={() => toggleEmailAttackType(type.value)}
              className={cn(
                "p-2 rounded-lg border cursor-pointer transition-all hover:border-primary/50 flex items-center gap-2",
                formData.email_security.attackTypes?.includes(type.value) || 
                (type.value === "all" && formData.email_security.attackTypes?.length === emailAttackTypes.length - 1)
                  ? "border-primary bg-primary/10"
                  : "border-border"
              )}
            >
              <Checkbox 
                checked={
                  formData.email_security.attackTypes?.includes(type.value) ||
                  (type.value === "all" && formData.email_security.attackTypes?.length === emailAttackTypes.length - 1)
                }
                onCheckedChange={() => toggleEmailAttackType(type.value)}
              />
              <span className="text-sm">{type.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Email Platform */}
      <div className="space-y-2">
        <Label>Email Platform</Label>
        <RadioGroup
          value={formData.email_security.platform}
          onValueChange={(value) => updateEmailSecurity({ platform: value as "cloud" | "onprem" | "hybrid" })}
          className="grid grid-cols-3 gap-2"
        >
          {["cloud", "onprem", "hybrid"].map((platform) => (
            <Label
              key={platform}
              htmlFor={`platform-${platform}`}
              className={cn(
                "flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50",
                formData.email_security.platform === platform ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <RadioGroupItem value={platform} id={`platform-${platform}`} />
              <span className="capitalize">{platform}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* Cloud Provider Options */}
      {(formData.email_security.platform === "cloud" || formData.email_security.platform === "hybrid") && (
        <div className="space-y-2">
          <Label>Cloud Email Provider</Label>
          <Select
            value={formData.email_security.cloudProvider || "none"}
            onValueChange={(value) => updateEmailSecurity({ cloudProvider: value === "none" ? "" : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select provider...</SelectItem>
              <SelectItem value="o365">Microsoft 365</SelectItem>
              <SelectItem value="gsuite">Google Workspace (G-Suite)</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          {formData.email_security.cloudProvider === "other" && (
            <Input
              value={formData.email_security.otherCloudProvider || ""}
              onChange={(e) => updateEmailSecurity({ otherCloudProvider: e.target.value })}
              placeholder="Please specify cloud provider"
              className="mt-2"
            />
          )}
        </div>
      )}

      {/* Hybrid On-Prem Platform */}
      {formData.email_security.platform === "hybrid" && (
        <div className="space-y-2">
          <Label>On-Prem Email Platform</Label>
          <Input
            value={formData.email_security.hybridOnpremPlatform || ""}
            onChange={(e) => updateEmailSecurity({ hybridOnpremPlatform: e.target.value })}
            placeholder="E.g., Exchange Server"
          />
        </div>
      )}

      {/* Number of Mailboxes */}
      <div className="space-y-2">
        <Label>Number of Mailboxes</Label>
        <Input
          type="number"
          min="0"
          value={formData.email_security.mailboxCount}
          onChange={(e) => updateEmailSecurity({ mailboxCount: e.target.value })}
          placeholder="Enter total mailbox count"
        />
      </div>

      {/* Preferred Solution */}
      <div className="space-y-2">
        <Label>Preferred Solution</Label>
        <RadioGroup
          value={formData.email_security.preferredSolution}
          onValueChange={(value) => updateEmailSecurity({ preferredSolution: value as PreferredSolution })}
          className="grid grid-cols-2 gap-2"
        >
          <Label
            htmlFor="email-product"
            className={cn(
              "flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50",
              formData.email_security.preferredSolution === "product" ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            <RadioGroupItem value="product" id="email-product" />
            <Package className="w-4 h-4" />
            <span>Product</span>
          </Label>
          <Label
            htmlFor="email-managed"
            className={cn(
              "flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50",
              formData.email_security.preferredSolution === "managed_service" ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            <RadioGroupItem value="managed_service" id="email-managed" />
            <Users className="w-4 h-4" />
            <span>Managed Service</span>
          </Label>
        </RadioGroup>
      </div>
    </div>
  );

  const renderWebAppSecurityOptions = () => (
    <div className="space-y-4 border border-border rounded-lg p-4 mt-4">
      <h4 className="font-medium flex items-center gap-2">
        <Globe className="w-4 h-4" />
        Web Application Security Details
      </h4>

      {/* Protection Types */}
      <div className="space-y-2">
        <Label>Protection Requirements</Label>
        <div className="grid grid-cols-2 gap-2">
          {webAppProtectionTypes.map((type) => (
            <div
              key={type.value}
              onClick={() => toggleWebAppProtection(type.value)}
              className={cn(
                "p-2 rounded-lg border cursor-pointer transition-all hover:border-primary/50 flex items-center gap-2",
                formData.web_app_security.protectionTypes?.includes(type.value)
                  ? "border-primary bg-primary/10"
                  : "border-border"
              )}
            >
              <Checkbox 
                checked={formData.web_app_security.protectionTypes?.includes(type.value)}
                onCheckedChange={() => toggleWebAppProtection(type.value)}
              />
              <span className="text-sm">{type.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sizing */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Sizing Information</Label>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">No. of Web Apps</Label>
            <Input
              type="number"
              min="0"
              value={formData.web_app_security.webAppCount}
              onChange={(e) => updateWebAppSecurity({ webAppCount: e.target.value })}
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">App Bandwidth (Mbps)</Label>
            <Input
              type="number"
              min="0"
              value={formData.web_app_security.bandwidth}
              onChange={(e) => updateWebAppSecurity({ bandwidth: e.target.value })}
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Transactions/Month</Label>
            <Input
              type="text"
              value={formData.web_app_security.transactions}
              onChange={(e) => updateWebAppSecurity({ transactions: e.target.value })}
              placeholder="E.g., 1M"
            />
          </div>
        </div>
      </div>

      {/* Preferred Solution */}
      <div className="space-y-2">
        <Label>Preferred Solution</Label>
        <RadioGroup
          value={formData.web_app_security.preferredSolution}
          onValueChange={(value) => updateWebAppSecurity({ preferredSolution: value as PreferredSolution })}
          className="grid grid-cols-2 gap-2"
        >
          <Label
            htmlFor="webapp-product"
            className={cn(
              "flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50",
              formData.web_app_security.preferredSolution === "product" ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            <RadioGroupItem value="product" id="webapp-product" />
            <Package className="w-4 h-4" />
            <span>Product</span>
          </Label>
          <Label
            htmlFor="webapp-managed"
            className={cn(
              "flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50",
              formData.web_app_security.preferredSolution === "managed_service" ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            <RadioGroupItem value="managed_service" id="webapp-managed" />
            <Users className="w-4 h-4" />
            <span>Managed Service</span>
          </Label>
        </RadioGroup>
      </div>
    </div>
  );

  const renderComplianceOptions = () => (
    <div className="space-y-4 border border-border rounded-lg p-4 mt-4">
      <h4 className="font-medium flex items-center gap-2">
        <Scale className="w-4 h-4" />
        Compliance Frameworks
      </h4>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {complianceFrameworks.map((framework) => (
          <div
            key={framework.value}
            onClick={() => toggleComplianceFramework(framework.value)}
            className={cn(
              "p-2 rounded-lg border cursor-pointer transition-all hover:border-primary/50 flex items-center gap-2",
              formData.compliance_frameworks?.includes(framework.value)
                ? "border-primary bg-primary/10"
                : "border-border"
            )}
          >
            <Checkbox 
              checked={formData.compliance_frameworks?.includes(framework.value)}
              onCheckedChange={() => toggleComplianceFramework(framework.value)}
            />
            <span className="text-sm">{framework.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

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
        <div className="flex justify-between mt-4 overflow-x-auto">
          {WIZARD_STEPS.map((step) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div 
                key={step.id}
                className={cn(
                  "flex flex-col items-center gap-1 cursor-pointer transition-all min-w-[40px]",
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
        {/* Step 1: Customer Selection */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Select Customer</h3>
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
                        prospect_id: "",
                        prospect_name: "",
                        contact_id: ""
                      });
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select organization..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
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
            </div>
          </div>
        )}

        {/* Step 2: Prospect Selection */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Select Prospect</h3>
              <p className="text-sm text-muted-foreground">Choose the prospect contact and deal title</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Prospect Name *</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.prospect_id || "none"}
                    onValueChange={(value) => {
                      const prospect = allianceUsers?.find(u => u.id === value);
                      updateFormData({ 
                        prospect_id: value === "none" ? "" : value,
                        prospect_name: prospect?.name || "",
                        contact_id: value === "none" ? "" : value
                      });
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select prospect..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="none">Select prospect...</SelectItem>
                      {allianceUsers?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <Users className="w-3 h-3" />
                            {user.name}
                            {user.designation && (
                              <span className="text-xs text-muted-foreground">({user.designation})</span>
                            )}
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
                    title="Add New Prospect"
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
                <Label>Additional Contacts</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.contact_id || "none"}
                    onValueChange={(value) => updateFormData({ contact_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select additional contact" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="none">No additional contact</SelectItem>
                      {allianceUsers?.filter(u => u.id !== formData.prospect_id).map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name} {contact.designation && `(${contact.designation})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Deal Type */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Requirement Type</h3>
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

        {/* Step 4: Problem Area */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Select Problem Area</h3>
              <p className="text-sm text-muted-foreground">What is the customer's primary need?</p>
            </div>

            {/* Problem Category Selection */}
            <div className="space-y-4">
              <Label>Problem Category *</Label>
              <RadioGroup
                value={formData.problem_category}
                onValueChange={(value) => updateFormData({ problem_category: value as ProblemCategory })}
                className="grid grid-cols-3 gap-3"
              >
                <Label
                  htmlFor="cat-security"
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50",
                    formData.problem_category === "security" ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <RadioGroupItem value="security" id="cat-security" className="sr-only" />
                  <Shield className={cn("w-6 h-6", formData.problem_category === "security" && "text-primary")} />
                  <span className="font-medium text-sm">Security</span>
                </Label>
                <Label
                  htmlFor="cat-compliance"
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50",
                    formData.problem_category === "compliance" ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <RadioGroupItem value="compliance" id="cat-compliance" className="sr-only" />
                  <Scale className={cn("w-6 h-6", formData.problem_category === "compliance" && "text-primary")} />
                  <span className="font-medium text-sm">Compliance</span>
                </Label>
                <Label
                  htmlFor="cat-both"
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50",
                    formData.problem_category === "both" ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <RadioGroupItem value="both" id="cat-both" className="sr-only" />
                  <div className="flex gap-1">
                    <Shield className={cn("w-5 h-5", formData.problem_category === "both" && "text-primary")} />
                    <Scale className={cn("w-5 h-5", formData.problem_category === "both" && "text-primary")} />
                  </div>
                  <span className="font-medium text-sm">Both</span>
                </Label>
              </RadioGroup>
            </div>

            {/* Security Attack Vector Selection */}
            {(formData.problem_category === "security" || formData.problem_category === "both") && (
              <div className="space-y-4">
                <Label>Choose Attack Vector</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {attackVectorOptions.map((option) => {
                    const VectorIcon = option.icon;
                    const isSelected = formData.attack_vector === option.value;
                    return (
                      <div
                        key={option.value}
                        onClick={() => updateFormData({ attack_vector: option.value as AttackVector })}
                        className={cn(
                          "p-3 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50",
                          isSelected ? "border-primary bg-primary/5" : "border-border"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <VectorIcon className={cn("w-4 h-4", isSelected && "text-primary")} />
                          <span className="text-sm font-medium">{option.label}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{option.description}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Render detailed options based on attack vector */}
                {formData.attack_vector === "email" && renderEmailSecurityOptions()}
                {formData.attack_vector === "web_application" && renderWebAppSecurityOptions()}
              </div>
            )}

            {/* Compliance Frameworks */}
            {(formData.problem_category === "compliance" || formData.problem_category === "both") && 
              renderComplianceOptions()
            }

            {/* Additional Problem Areas from DB */}
            {problemAreas && problemAreas.length > 0 && (
              <div className="space-y-3">
                <Label>Related Problem Areas <span className="text-xs text-muted-foreground">(Optional)</span></Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                  {problemAreas.map((area) => {
                    const isSelected = formData.problem_area_ids?.includes(area.id);
                    return (
                      <div
                        key={area.id}
                        onClick={() => toggleProblemArea(area.id)}
                        className={cn(
                          "p-2 rounded-lg border cursor-pointer transition-all hover:border-primary/50 flex items-start gap-2",
                          isSelected ? "border-primary bg-primary/10" : "border-border"
                        )}
                      >
                        <Checkbox checked={isSelected} className="mt-0.5" />
                        <span className="text-xs font-medium truncate">{area.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={formData.problem_requirement}
                onChange={(e) => updateFormData({ problem_requirement: e.target.value })}
                placeholder="Describe the customer's problem or requirement in more detail..."
                rows={2}
              />
            </div>
          </div>
        )}

        {/* Step 5: Solution */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Recommended Solutions</h3>
              <p className="text-sm text-muted-foreground">Select product or service based on requirements</p>
            </div>

            <div className="space-y-2">
              <Label>Solution/Product</Label>
              {products?.length ? (
                <Select
                  value={formData.solution_id || "none"}
                  onValueChange={(value) => updateFormData({ solution_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a solution" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No solution selected</SelectItem>
                    {products.map((product) => (
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

        {/* Step 6: Timeline & Budget */}
        {currentStep === 6 && (
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

            <div className="flex items-center space-x-2 p-4 rounded-lg bg-muted/50">
              <Checkbox
                id="is_budgeted"
                checked={formData.is_budgeted}
                onCheckedChange={(checked) => updateFormData({ is_budgeted: !!checked })}
              />
              <Label htmlFor="is_budgeted" className="cursor-pointer font-medium">Is it Budgeted?</Label>
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
                  disabled={!isEditing}
                  className={!isEditing ? "bg-muted cursor-not-allowed" : ""}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Next Steps */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Define Next Steps</h3>
              <p className="text-sm text-muted-foreground">What actions are needed to move forward?</p>
            </div>

            <div className="space-y-4">
              <Label>Planned Actions</Label>
              <div className="grid grid-cols-3 gap-3">
                {nextStepActions.map((action) => {
                  const ActionIcon = action.icon;
                  const isSelected = formData.next_steps_actions?.includes(action.value);
                  return (
                    <div
                      key={action.value}
                      onClick={() => toggleNextStepAction(action.value)}
                      className={cn(
                        "p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50 flex flex-col items-center gap-2",
                        isSelected ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <Checkbox checked={isSelected} className="sr-only" />
                      <ActionIcon className={cn("w-6 h-6", isSelected && "text-primary")} />
                      <span className="text-sm font-medium text-center">{action.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={formData.next_steps}
                onChange={(e) => updateFormData({ next_steps: e.target.value })}
                placeholder="Any additional details about next steps..."
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Step 8: Critical Factors */}
        {currentStep === 8 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Critical Factors to Consider</h3>
              <p className="text-sm text-muted-foreground">What are the key success factors for this deal?</p>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3">
                {criticalFactors.map((factor) => {
                  const isSelected = formData.critical_factors?.includes(factor.value);
                  return (
                    <div
                      key={factor.value}
                      onClick={() => toggleCriticalFactor(factor.value)}
                      className={cn(
                        "p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50 flex items-center gap-3",
                        isSelected ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <Checkbox checked={isSelected} />
                      <div>
                        <p className="font-medium">{factor.label}</p>
                        <p className="text-xs text-muted-foreground">{factor.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => updateFormData({ description: e.target.value })}
                placeholder="Any additional context or notes..."
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Step 9: Review & Finish */}
        {currentStep === 9 && (
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
                  <p className="text-muted-foreground">Prospect</p>
                  <p className="font-medium">{formData.prospect_name || "Not selected"}</p>
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
                  <p className="text-muted-foreground">Problem Category</p>
                  <p className="font-medium capitalize">{formData.problem_category}</p>
                </div>
                {(formData.problem_category === "security" || formData.problem_category === "both") && (
                  <div>
                    <p className="text-muted-foreground">Attack Vector</p>
                    <p className="font-medium capitalize">{formData.attack_vector?.replace("_", " ")}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Buying Timeline</p>
                  <p className="font-medium capitalize">{formData.buying_timeline?.replace("_", " ") || "Not set"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Deal Value</p>
                  <p className="font-medium">{getCurrencySymbol()}{formData.value || "0"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Budgeted</p>
                  <p className="font-medium">{formData.is_budgeted ? "Yes" : "No"}</p>
                </div>
              </div>

              {formData.next_steps_actions && formData.next_steps_actions.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <p className="text-muted-foreground text-sm mb-2">Next Steps</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.next_steps_actions.map(action => (
                      <Badge key={action} variant="secondary" className="capitalize">
                        {action.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {formData.critical_factors && formData.critical_factors.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <p className="text-muted-foreground text-sm mb-2">Critical Factors</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.critical_factors.map(factor => (
                      <Badge key={factor} variant="outline" className="capitalize">
                        {factor.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Motivational Message */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                Add a Message
              </Label>
              <Textarea
                value={formData.motivational_message}
                onChange={(e) => updateFormData({ motivational_message: e.target.value })}
                placeholder="Good job. Let's do it! 🚀"
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4 border-t border-border mt-4">
        <div>
          {currentStep > 1 && (
            <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          {currentStep < WIZARD_STEPS.length ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : isEditing ? "Update Deal" : "Create Deal"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
