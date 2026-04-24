import { useState, useEffect } from "react";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  UserCog,
  Loader2,
  Plus,
  Search,
  Edit2,
  Save,
  Trash2,
  MapPin,
  Building2,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Contractor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  designation: string | null;
  location: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  rate: number | null;
  rate_type: string | null;
  department: string | null;
  notes: string | null;
  status: string | null;
  created_at: string;
}

const initialFormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  designation: "",
  location: "",
  contract_start_date: "",
  contract_end_date: "",
  rate: "",
  rate_type: "hourly",
  department: "",
  notes: "",
  status: "active",
};

export function ContractorsManagement() {
  const { user } = useAuth();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [form, setForm] = useState(initialFormState);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchContractors = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("contractors")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to fetch contractors", variant: "destructive" });
    } else {
      setContractors(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchContractors();
  }, []);

  const openNewDialog = () => {
    setEditingContractor(null);
    setForm(initialFormState);
    setDialogOpen(true);
  };

  const openEditDialog = (contractor: Contractor) => {
    setEditingContractor(contractor);
    setForm({
      name: contractor.name,
      email: contractor.email || "",
      phone: contractor.phone || "",
      company: contractor.company || "",
      designation: contractor.designation || "",
      location: contractor.location || "",
      contract_start_date: contractor.contract_start_date || "",
      contract_end_date: contractor.contract_end_date || "",
      rate: contractor.rate?.toString() || "",
      rate_type: contractor.rate_type || "hourly",
      department: contractor.department || "",
      notes: contractor.notes || "",
      status: contractor.status || "active",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      company: form.company || null,
      designation: form.designation || null,
      location: form.location || null,
      contract_start_date: form.contract_start_date || null,
      contract_end_date: form.contract_end_date || null,
      rate: form.rate ? parseFloat(form.rate) : null,
      rate_type: form.rate_type || "hourly",
      department: form.department || null,
      notes: form.notes || null,
      status: form.status || "active",
    };

    if (editingContractor) {
      const { error } = await supabase
        .from("contractors")
        .update(payload)
        .eq("id", editingContractor.id);

      if (error) {
        toast({ title: "Error", description: "Failed to update contractor", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Contractor updated" });
        setDialogOpen(false);
        fetchContractors();
      }
    } else {
      const { error } = await supabase.from("contractors").insert({
        ...payload,
        created_by: user?.id,
      });

      if (error) {
        toast({ title: "Error", description: "Failed to create contractor", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Contractor created" });
        setDialogOpen(false);
        fetchContractors();
      }
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase.from("contractors").delete().eq("id", deleteId);

    if (error) {
      toast({ title: "Error", description: "Failed to delete contractor", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Contractor deleted" });
      fetchContractors();
    }
    setDeleteId(null);
  };

  const filteredContractors = contractors.filter((c) => {
    const query = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.company?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contractors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Contractor
        </Button>
      </div>

      <div className="glass rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredContractors.map((contractor) => (
              <div key={contractor.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-500/60 flex items-center justify-center text-white font-semibold">
                      {contractor.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{contractor.name}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            contractor.status === "active"
                              ? "bg-green-500/20 text-green-600"
                              : "bg-gray-500/20 text-gray-600"
                          )}
                        >
                          {contractor.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{contractor.email}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        {contractor.company && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {contractor.company}
                          </span>
                        )}
                        {contractor.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {contractor.location}
                          </span>
                        )}
                        {contractor.contract_end_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Ends: {format(parseISO(contractor.contract_end_date), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(contractor)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteId(contractor.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {filteredContractors.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">No contractors found</div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContractor ? "Edit Contractor" : "Add Contractor"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input
                value={form.company}
                onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input
                value={form.designation}
                onChange={(e) => setForm((prev) => ({ ...prev, designation: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Contract Start Date</Label>
              <Input
                type="date"
                value={form.contract_start_date}
                onChange={(e) => setForm((prev) => ({ ...prev, contract_start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Contract End Date</Label>
              <Input
                type="date"
                value={form.contract_end_date}
                onChange={(e) => setForm((prev) => ({ ...prev, contract_end_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Rate</Label>
              <Input
                type="number"
                value={form.rate}
                onChange={(e) => setForm((prev) => ({ ...prev, rate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Rate Type</Label>
              <Select
                value={form.rate_type}
                onValueChange={(value) => setForm((prev) => ({ ...prev, rate_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input
                value={form.department}
                onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {editingContractor ? "Update Contractor" : "Create Contractor"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contractor?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the contractor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
