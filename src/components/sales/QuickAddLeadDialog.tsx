import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type LeadStatus = Database["public"]["Enums"]["lead_status"];

const STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "unqualified", label: "Unqualified" },
];

interface QuickAddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefills the notes field, e.g. with the product a lead is interested in. */
  defaultNotes?: string;
  defaultSource?: string;
  defaultTitle?: string;
  onCreated?: () => void;
}

const emptyForm = {
  title: "",
  status: "new" as LeadStatus,
  source: "",
  estimated_value: "",
  notes: "",
};

export function QuickAddLeadDialog({
  open,
  onOpenChange,
  defaultNotes = "",
  defaultSource = "",
  defaultTitle = "",
  onCreated,
}: QuickAddLeadDialogProps) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    ...emptyForm,
    title: defaultTitle,
    source: defaultSource,
    notes: defaultNotes,
  });

  const reset = () =>
    setForm({ ...emptyForm, title: defaultTitle, source: defaultSource, notes: defaultNotes });

  const createLead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("leads").insert({
        title: form.title.trim(),
        status: form.status,
        source: form.source.trim() || null,
        estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
        notes: form.notes.trim() || null,
        user_id: user!.id,
        tenant_id: currentTenant?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-with-scores"] });
      queryClient.invalidateQueries({ queryKey: ["lead-score-counts"] });
      toast.success("Lead created");
      reset();
      onOpenChange(false);
      onCreated?.();
    },
    onError: (error: any) => {
      toast.error("Failed to create lead: " + (error?.message ?? "unknown error"));
    },
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add lead</DialogTitle>
          <DialogDescription>Create a lead without leaving this page.</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.title.trim()) {
              toast.error("Lead title is required");
              return;
            }
            createLead.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="quick-lead-title">Title *</Label>
            <Input
              id="quick-lead-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Acme Corp — firewall refresh"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quick-lead-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as LeadStatus }))}
              >
                <SelectTrigger id="quick-lead-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-lead-source">Source</Label>
              <Input
                id="quick-lead-source"
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                placeholder="Referral, Website…"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-lead-value">Estimated value</Label>
            <Input
              id="quick-lead-value"
              type="number"
              min="0"
              step="0.01"
              value={form.estimated_value}
              onChange={(e) => setForm((f) => ({ ...f, estimated_value: e.target.value }))}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-lead-notes">Notes</Label>
            <Textarea
              id="quick-lead-notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createLead.isPending}>
              {createLead.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
