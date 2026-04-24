import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type RequestType = "leave" | "work_from_home" | "advance_salary" | "new_hardware" | "hardware_problem" | "other";

const REQUEST_TYPES = [
  { value: "leave", label: "Leave Request", sla: "24 hours" },
  { value: "work_from_home", label: "Work from Home", sla: "8 hours" },
  { value: "advance_salary", label: "Advance Salary", sla: "48 hours" },
  { value: "new_hardware", label: "New Hardware", sla: "72 hours" },
  { value: "hardware_problem", label: "Hardware Problem", sla: "4 hours" },
  { value: "other", label: "Other", sla: "24 hours" },
];

const LEAVE_TYPES = [
  "Casual Leave",
  "Sick Leave",
  "Earned Leave",
  "Maternity Leave",
  "Paternity Leave",
  "Bereavement Leave",
];

const HARDWARE_TYPES = [
  "Laptop",
  "Monitor",
  "Keyboard",
  "Mouse",
  "Headset",
  "Webcam",
  "Docking Station",
  "Other",
];

export function NewRequestDialog({ open, onOpenChange }: NewRequestDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    type: "" as RequestType | "",
    title: "",
    description: "",
    priority: "medium",
    // Leave fields
    leaveStartDate: undefined as Date | undefined,
    leaveEndDate: undefined as Date | undefined,
    leaveType: "",
    // WFH fields
    wfhDate: undefined as Date | undefined,
    wfhReason: "",
    // Salary advance fields
    advanceAmount: "",
    advanceReason: "",
    // Hardware fields
    hardwareType: "",
    hardwareDescription: "",
  });

  const resetForm = () => {
    setFormData({
      type: "",
      title: "",
      description: "",
      priority: "medium",
      leaveStartDate: undefined,
      leaveEndDate: undefined,
      leaveType: "",
      wfhDate: undefined,
      wfhReason: "",
      advanceAmount: "",
      advanceReason: "",
      hardwareType: "",
      hardwareDescription: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !formData.type) return;

    setIsSubmitting(true);
    try {
      const insertData: Record<string, unknown> = {
        user_id: user.id,
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        priority: formData.priority,
      };

      // Add type-specific fields
      if (formData.type === "leave") {
        insertData.leave_start_date = formData.leaveStartDate ? format(formData.leaveStartDate, "yyyy-MM-dd") : null;
        insertData.leave_end_date = formData.leaveEndDate ? format(formData.leaveEndDate, "yyyy-MM-dd") : null;
        insertData.leave_type = formData.leaveType || null;
      } else if (formData.type === "work_from_home") {
        insertData.wfh_date = formData.wfhDate ? format(formData.wfhDate, "yyyy-MM-dd") : null;
        insertData.wfh_reason = formData.wfhReason.trim() || null;
      } else if (formData.type === "advance_salary") {
        insertData.advance_amount = formData.advanceAmount ? parseFloat(formData.advanceAmount) : null;
        insertData.advance_reason = formData.advanceReason.trim() || null;
      } else if (formData.type === "new_hardware" || formData.type === "hardware_problem") {
        insertData.hardware_type = formData.hardwareType || null;
        insertData.hardware_description = formData.hardwareDescription.trim() || null;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase
        .from("employee_requests")
        .insert(insertData as any);

      if (error) throw error;

      toast.success("Request submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["employee-requests"] });
      resetForm();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Error submitting request:", error);
      toast.error("Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = REQUEST_TYPES.find(t => t.value === formData.type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Request</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Request Type */}
          <div className="space-y-2">
            <Label>Request Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: RequestType) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select request type" />
              </SelectTrigger>
              <SelectContent>
                {REQUEST_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center justify-between gap-4">
                      <span>{type.label}</span>
                      <span className="text-xs text-muted-foreground">SLA: {type.sla}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedType && (
              <p className="text-xs text-muted-foreground">
                Expected response time: {selectedType.sla}
              </p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief title for your request"
              maxLength={100}
              required
            />
          </div>

          {/* Priority */}
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
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type-specific fields */}
          {formData.type === "leave" && (
            <>
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select
                  value={formData.leaveType}
                  onValueChange={(value) => setFormData({ ...formData, leaveType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAVE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !formData.leaveStartDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.leaveStartDate ? format(formData.leaveStartDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.leaveStartDate}
                        onSelect={(date) => setFormData({ ...formData, leaveStartDate: date })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !formData.leaveEndDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.leaveEndDate ? format(formData.leaveEndDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.leaveEndDate}
                        onSelect={(date) => setFormData({ ...formData, leaveEndDate: date })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </>
          )}

          {formData.type === "work_from_home" && (
            <>
              <div className="space-y-2">
                <Label>WFH Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !formData.wfhDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.wfhDate ? format(formData.wfhDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.wfhDate}
                      onSelect={(date) => setFormData({ ...formData, wfhDate: date })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  value={formData.wfhReason}
                  onChange={(e) => setFormData({ ...formData, wfhReason: e.target.value })}
                  placeholder="Reason for work from home"
                  rows={2}
                />
              </div>
            </>
          )}

          {formData.type === "advance_salary" && (
            <>
              <div className="space-y-2">
                <Label>Amount Required</Label>
                <Input
                  type="number"
                  value={formData.advanceAmount}
                  onChange={(e) => setFormData({ ...formData, advanceAmount: e.target.value })}
                  placeholder="Enter amount"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  value={formData.advanceReason}
                  onChange={(e) => setFormData({ ...formData, advanceReason: e.target.value })}
                  placeholder="Reason for advance salary"
                  rows={2}
                />
              </div>
            </>
          )}

          {(formData.type === "new_hardware" || formData.type === "hardware_problem") && (
            <>
              <div className="space-y-2">
                <Label>Hardware Type</Label>
                <Select
                  value={formData.hardwareType}
                  onValueChange={(value) => setFormData({ ...formData, hardwareType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select hardware type" />
                  </SelectTrigger>
                  <SelectContent>
                    {HARDWARE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{formData.type === "hardware_problem" ? "Problem Description" : "Requirements"}</Label>
                <Textarea
                  value={formData.hardwareDescription}
                  onChange={(e) => setFormData({ ...formData, hardwareDescription: e.target.value })}
                  placeholder={formData.type === "hardware_problem" ? "Describe the issue" : "Specify requirements"}
                  rows={2}
                />
              </div>
            </>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label>Additional Details</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Any additional information"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.type || !formData.title}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
