import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { ShoppingCart, Wrench, AlertTriangle, Clock } from "lucide-react";

interface SupportNewTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizations: any[];
}

const SALES_CATEGORIES = [
  { value: "license_issue", label: "License Issue" },
  { value: "new_solution_required", label: "New Solution Required" },
  { value: "additional_licenses_required", label: "Additional Licenses Required" },
];

const ISSUE_TYPES = [
  "Installation Issue",
  "Configuration Problem",
  "Performance Issue",
  "Error/Bug",
  "Integration Issue",
  "Feature Request",
  "Other",
];

const IMPACT_LEVELS = [
  { value: "critical", label: "Critical - System down, business stopped" },
  { value: "high", label: "High - Major feature not working" },
  { value: "medium", label: "Medium - Feature partially working" },
  { value: "low", label: "Low - Minor issue, workaround available" },
];

export default function SupportNewTicketDialog({
  open,
  onOpenChange,
  organizations,
}: SupportNewTicketDialogProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [ticketType, setTicketType] = useState<"sales_query" | "technical_issue" | "">("");
  
  // Common fields
  const [organizationId, setOrganizationId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");

  // Sales query fields
  const [salesCategory, setSalesCategory] = useState("");
  const [expectedResponseHours, setExpectedResponseHours] = useState("24");

  // Technical issue fields
  const [solutionService, setSolutionService] = useState("");
  const [issueType, setIssueType] = useState("");
  const [impact, setImpact] = useState("");

  const resetForm = () => {
    setStep(1);
    setTicketType("");
    setOrganizationId("");
    setTitle("");
    setDescription("");
    setSeverity("medium");
    setSalesCategory("");
    setExpectedResponseHours("24");
    setSolutionService("");
    setIssueType("");
    setImpact("");
  };

  const handleSubmit = async () => {
    if (!organizationId || !title || !ticketType) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ticketData: any = {
        organization_id: organizationId,
        submitted_by: user.id,
        ticket_type: ticketType,
        title,
        description,
        severity,
      };

      if (ticketType === "sales_query") {
        ticketData.sales_category = salesCategory;
        ticketData.expected_response_hours = parseInt(expectedResponseHours);
        ticketData.assigned_team = "Sales";
      } else {
        ticketData.solution_service = solutionService;
        ticketData.issue_type = issueType;
        ticketData.impact = impact;
        ticketData.assigned_team = "Technical";
      }

      const { error } = await supabase
        .from("customer_support_tickets")
        .insert(ticketData);

      if (error) throw error;

      toast.success("Ticket created successfully!");
      queryClient.invalidateQueries({ queryKey: ["customer-support-tickets"] });
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to create ticket");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
          <DialogDescription>
            {step === 1 && "What type of issue are you experiencing?"}
            {step === 2 && "Please provide details about your issue"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => { setTicketType("sales_query"); setStep(2); }}
                className={`p-6 border rounded-lg text-left hover:border-primary transition-colors ${
                  ticketType === "sales_query" ? "border-primary bg-primary/5" : ""
                }`}
              >
                <ShoppingCart className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-medium mb-1">Sales Query</h3>
                <p className="text-sm text-muted-foreground">
                  License issues, new solutions, additional licenses
                </p>
              </button>
              <button
                type="button"
                onClick={() => { setTicketType("technical_issue"); setStep(2); }}
                className={`p-6 border rounded-lg text-left hover:border-primary transition-colors ${
                  ticketType === "technical_issue" ? "border-primary bg-primary/5" : ""
                }`}
              >
                <Wrench className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-medium mb-1">Technical Issue</h3>
                <p className="text-sm text-muted-foreground">
                  Product issues, bugs, configuration problems
                </p>
              </button>
            </div>
          </div>
        )}

        {step === 2 && ticketType === "sales_query" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Organization</Label>
              <Select value={organizationId} onValueChange={setOrganizationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={salesCategory} onValueChange={setSalesCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {SALES_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Brief description of your request"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Provide more details about your request..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Severity</Label>
              <RadioGroup value={severity} onValueChange={setSeverity} className="grid grid-cols-2 gap-2">
                {IMPACT_LEVELS.map((level) => (
                  <div key={level.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={level.value} id={level.value} />
                    <Label htmlFor={level.value} className="text-sm cursor-pointer">
                      {level.value.charAt(0).toUpperCase() + level.value.slice(1)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Expected Response
              </Label>
              <Select value={expectedResponseHours} onValueChange={setExpectedResponseHours}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">Within 4 hours</SelectItem>
                  <SelectItem value="8">Within 8 hours</SelectItem>
                  <SelectItem value="24">Within 24 hours</SelectItem>
                  <SelectItem value="48">Within 48 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">
                {isLoading ? "Creating..." : "Submit Ticket"}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && ticketType === "technical_issue" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Organization</Label>
              <Select value={organizationId} onValueChange={setOrganizationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Solution / Service</Label>
              <Input
                placeholder="Enter the product or service name"
                value={solutionService}
                onChange={(e) => setSolutionService(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Issue Type</Label>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Brief description of the issue"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the issue in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Impact
              </Label>
              <RadioGroup value={impact} onValueChange={(val) => { setImpact(val); setSeverity(val); }}>
                {IMPACT_LEVELS.map((level) => (
                  <div key={level.value} className="flex items-center space-x-2 p-2 border rounded-lg">
                    <RadioGroupItem value={level.value} id={`impact-${level.value}`} />
                    <Label htmlFor={`impact-${level.value}`} className="text-sm cursor-pointer flex-1">
                      {level.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">
                {isLoading ? "Creating..." : "Submit Ticket"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
