import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

interface NewTravelRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewTravelRequestDialog({ open, onOpenChange }: NewTravelRequestDialogProps) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: "",
    purpose: "",
    travel_type: "domestic",
    departure_date: format(addDays(new Date(), 7), "yyyy-MM-dd"),
    return_date: format(addDays(new Date(), 10), "yyyy-MM-dd"),
    departure_city: "",
    destination_city: "",
    estimated_cost: "",
    requires_flight: false,
    requires_hotel: false,
    requires_cab: false,
    flight_preference: "economy",
    additional_notes: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("travel_requests")
        .insert({
          user_id: user?.id,
          tenant_id: currentTenant?.id,
          title: formData.title,
          purpose: formData.purpose,
          travel_type: formData.travel_type,
          departure_date: formData.departure_date,
          return_date: formData.return_date,
          departure_city: formData.departure_city,
          destination_city: formData.destination_city,
          estimated_cost: parseFloat(formData.estimated_cost) || 0,
          requires_flight: formData.requires_flight,
          requires_hotel: formData.requires_hotel,
          requires_cab: formData.requires_cab,
          flight_preference: formData.flight_preference,
          additional_notes: formData.additional_notes || null,
          request_number: "", // Will be auto-generated
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travel-requests"] });
      queryClient.invalidateQueries({ queryKey: ["expense-stats"] });
      toast.success("Travel request created");
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error creating request:", error);
      toast.error("Failed to create travel request");
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      purpose: "",
      travel_type: "domestic",
      departure_date: format(addDays(new Date(), 7), "yyyy-MM-dd"),
      return_date: format(addDays(new Date(), 10), "yyyy-MM-dd"),
      departure_city: "",
      destination_city: "",
      estimated_cost: "",
      requires_flight: false,
      requires_hotel: false,
      requires_cab: false,
      flight_preference: "economy",
      additional_notes: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.purpose || !formData.departure_city || !formData.destination_city) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (new Date(formData.return_date) < new Date(formData.departure_date)) {
      toast.error("Return date must be after departure date");
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Travel Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Client Meeting - Mumbai"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="purpose">Purpose *</Label>
              <Textarea
                id="purpose"
                placeholder="Describe the purpose of travel..."
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Travel Type</Label>
              <Select
                value={formData.travel_type}
                onValueChange={(value) => setFormData({ ...formData, travel_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="domestic">Domestic</SelectItem>
                  <SelectItem value="international">International</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Estimated Cost (₹)</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.estimated_cost}
                onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
              />
            </div>

            <div>
              <Label>Departure City *</Label>
              <Input
                placeholder="e.g., Bangalore"
                value={formData.departure_city}
                onChange={(e) => setFormData({ ...formData, departure_city: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Destination City *</Label>
              <Input
                placeholder="e.g., Mumbai"
                value={formData.destination_city}
                onChange={(e) => setFormData({ ...formData, destination_city: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Departure Date *</Label>
              <Input
                type="date"
                value={formData.departure_date}
                onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Return Date *</Label>
              <Input
                type="date"
                value={formData.return_date}
                onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Requirements</Label>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="flight"
                  checked={formData.requires_flight}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, requires_flight: !!checked })
                  }
                />
                <label htmlFor="flight" className="text-sm">Flight</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hotel"
                  checked={formData.requires_hotel}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, requires_hotel: !!checked })
                  }
                />
                <label htmlFor="hotel" className="text-sm">Hotel</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cab"
                  checked={formData.requires_cab}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, requires_cab: !!checked })
                  }
                />
                <label htmlFor="cab" className="text-sm">Local Transport</label>
              </div>
            </div>
          </div>

          {formData.requires_flight && (
            <div>
              <Label>Flight Preference</Label>
              <Select
                value={formData.flight_preference}
                onValueChange={(value) => setFormData({ ...formData, flight_preference: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="economy">Economy</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Additional Notes</Label>
            <Textarea
              placeholder="Any special requirements or notes..."
              value={formData.additional_notes}
              onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
