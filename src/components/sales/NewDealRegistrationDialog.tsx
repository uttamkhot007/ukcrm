import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface NewDealRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId?: string;
}

const vendorPrograms = [
  { vendor: "Microsoft", programs: ["Partner Center", "CSP", "Azure Partner"] },
  { vendor: "Cisco", programs: ["Partner Deal Registration", "Cisco Black Belt"] },
  { vendor: "Palo Alto Networks", programs: ["NextWave Partner Portal", "Deal Registration"] },
  { vendor: "CrowdStrike", programs: ["Partner Portal", "Deal Reg"] },
  { vendor: "Fortinet", programs: ["Partner Portal", "FortiPartner"] },
  { vendor: "SentinelOne", programs: ["Partner Portal", "Deal Registration"] },
  { vendor: "Trend Micro", programs: ["Partner Portal", "Vision One"] },
  { vendor: "Other", programs: ["Custom"] },
];

export function NewDealRegistrationDialog({ open, onOpenChange, dealId }: NewDealRegistrationDialogProps) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    vendor_name: "",
    vendor_program: "",
    customer_name: "",
    customer_organization_id: "",
    opportunity_value: "",
    expected_close_date: "",
    description: "",
    requirements: "",
    competitor_info: "",
    priority: "medium",
  });

  // Fetch organizations for dropdown
  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alliance_organizations')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const selectedVendor = vendorPrograms.find(v => v.vendor === formData.vendor_name);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      
      const insertData = {
        vendor_name: formData.vendor_name,
        vendor_program: formData.vendor_program || null,
        customer_name: formData.customer_name,
        customer_organization_id: formData.customer_organization_id || null,
        opportunity_value: parseFloat(formData.opportunity_value) || 0,
        expected_close_date: formData.expected_close_date || null,
        description: formData.description || null,
        requirements: formData.requirements || null,
        competitor_info: formData.competitor_info || null,
        priority: formData.priority,
        deal_id: dealId || null,
        requester_id: user.id,
        tenant_id: currentTenant?.id || null,
      };

      const { data, error } = await supabase
        .from('deal_registrations')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deal-registrations'] });
      toast.success(`Deal Registration ${data.dr_number} created successfully`);
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to create deal registration: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      vendor_name: "",
      vendor_program: "",
      customer_name: "",
      customer_organization_id: "",
      opportunity_value: "",
      expected_close_date: "",
      description: "",
      requirements: "",
      competitor_info: "",
      priority: "medium",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendor_name || !formData.customer_name) {
      toast.error("Vendor name and customer name are required");
      return;
    }
    createMutation.mutate();
  };

  const handleOrganizationChange = (orgId: string) => {
    setFormData(prev => ({ ...prev, customer_organization_id: orgId }));
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      setFormData(prev => ({ ...prev, customer_name: org.name }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Deal Registration Request</DialogTitle>
          <DialogDescription>
            Submit a deal registration request to the vendor. The Deal Registration team will process and submit to the vendor portal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Vendor Selection */}
            <div className="space-y-2">
              <Label>Vendor *</Label>
              <Select 
                value={formData.vendor_name} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, vendor_name: value, vendor_program: "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendorPrograms.map((v) => (
                    <SelectItem key={v.vendor} value={v.vendor}>{v.vendor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vendor Program */}
            <div className="space-y-2">
              <Label>Vendor Program</Label>
              <Select 
                value={formData.vendor_program} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, vendor_program: value }))}
                disabled={!selectedVendor}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {selectedVendor?.programs.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Customer Organization */}
            <div className="space-y-2">
              <Label>Customer Organization</Label>
              <Select 
                value={formData.customer_organization_id} 
                onValueChange={handleOrganizationChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Customer Name */}
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input
                value={formData.customer_name}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                placeholder="Enter customer name"
                required
              />
            </div>

            {/* Opportunity Value */}
            <div className="space-y-2">
              <Label>Opportunity Value ($)</Label>
              <Input
                type="number"
                value={formData.opportunity_value}
                onChange={(e) => setFormData(prev => ({ ...prev, opportunity_value: e.target.value }))}
                placeholder="Enter opportunity value"
              />
            </div>

            {/* Expected Close Date */}
            <div className="space-y-2">
              <Label>Expected Close Date</Label>
              <Input
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expected_close_date: e.target.value }))}
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
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

          {/* Description */}
          <div className="space-y-2">
            <Label>Description / Opportunity Details</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the opportunity and why deal registration is needed..."
              rows={3}
            />
          </div>

          {/* Requirements */}
          <div className="space-y-2">
            <Label>Specific Requirements</Label>
            <Textarea
              value={formData.requirements}
              onChange={(e) => setFormData(prev => ({ ...prev, requirements: e.target.value }))}
              placeholder="Any specific requirements or products needed..."
              rows={2}
            />
          </div>

          {/* Competitor Info */}
          <div className="space-y-2">
            <Label>Competitor Information</Label>
            <Textarea
              value={formData.competitor_info}
              onChange={(e) => setFormData(prev => ({ ...prev, competitor_info: e.target.value }))}
              placeholder="Known competitors in this deal..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
