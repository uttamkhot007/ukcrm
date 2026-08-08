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
  Building,
  Loader2,
  Plus,
  Search,
  Edit2,
  Save,
  Trash2,
  MapPin,
  Mail,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
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

interface Vendor {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  category: string | null;
  payment_terms: string | null;
  gst_number: string | null;
  pan_number: string | null;
  notes: string | null;
  status: string | null;
  created_at: string;
}

const initialFormState = {
  company_name: "",
  contact_name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  country: "",
  category: "",
  payment_terms: "",
  gst_number: "",
  pan_number: "",
  notes: "",
  status: "active",
};

export function VendorsManagement() {
  const { user } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [form, setForm] = useState(initialFormState);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchVendors = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to fetch vendors", variant: "destructive" });
    } else {
      setVendors(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const openNewDialog = () => {
    setEditingVendor(null);
    setForm(initialFormState);
    setDialogOpen(true);
  };

  const openEditDialog = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setForm({
      company_name: vendor.company_name,
      contact_name: vendor.contact_name || "",
      email: vendor.email || "",
      phone: vendor.phone || "",
      address: vendor.address || "",
      city: vendor.city || "",
      country: vendor.country || "",
      category: vendor.category || "",
      payment_terms: vendor.payment_terms || "",
      gst_number: vendor.gst_number || "",
      pan_number: vendor.pan_number || "",
      notes: vendor.notes || "",
      status: vendor.status || "active",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.company_name.trim()) {
      toast({ title: "Error", description: "Company name is required", variant: "destructive" });
      return;
    }

    setSaving(true);

    const payload = {
      company_name: form.company_name,
      contact_name: form.contact_name || null,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      city: form.city || null,
      country: form.country || null,
      category: form.category || null,
      payment_terms: form.payment_terms || null,
      gst_number: form.gst_number || null,
      pan_number: form.pan_number || null,
      notes: form.notes || null,
      status: form.status || "active",
    };

    if (editingVendor) {
      const { error } = await supabase
        .from("vendors")
        .update(payload)
        .eq("id", editingVendor.id);

      if (error) {
        toast({ title: "Error", description: "Failed to update vendor", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Vendor updated" });
        setDialogOpen(false);
        fetchVendors();
      }
    } else {
      const { error } = await supabase.from("vendors").insert({
        ...payload,
        created_by: user?.id,
      });

      if (error) {
        toast({ title: "Error", description: "Failed to create vendor", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Vendor created" });
        setDialogOpen(false);
        fetchVendors();
      }
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase.from("vendors").delete().eq("id", deleteId);

    if (error) {
      toast({ title: "Error", description: "Failed to delete vendor", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Vendor deleted" });
      fetchVendors();
    }
    setDeleteId(null);
  };

  const filteredVendors = vendors.filter((v) => {
    const query = searchQuery.toLowerCase();
    return (
      v.company_name.toLowerCase().includes(query) ||
      v.contact_name?.toLowerCase().includes(query) ||
      v.email?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      <div className="glass rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredVendors.map((vendor) => (
              <div key={vendor.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-500/60 flex items-center justify-center text-white font-semibold">
                      {vendor.company_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{vendor.company_name}</p>
                        {vendor.category && (
                          <Badge variant="secondary" className="text-xs">
                            {vendor.category}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            vendor.status === "active"
                              ? "bg-green-500/20 text-green-600"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {vendor.status}
                        </Badge>
                      </div>
                      {vendor.contact_name && (
                        <p className="text-sm text-muted-foreground">{vendor.contact_name}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        {vendor.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {vendor.email}
                          </span>
                        )}
                        {vendor.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {vendor.phone}
                          </span>
                        )}
                        {vendor.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {vendor.city}, {vendor.country}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(vendor)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteId(vendor.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {filteredVendors.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">No vendors found</div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVendor ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input
                value={form.company_name}
                onChange={(e) => setForm((prev) => ({ ...prev, company_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Name</Label>
              <Input
                value={form.contact_name}
                onChange={(e) => setForm((prev) => ({ ...prev, contact_name: e.target.value }))}
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
            <div className="space-y-2 col-span-2">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input
                value={form.country}
                onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., Software, Hardware, Services"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Input
                value={form.payment_terms}
                onChange={(e) => setForm((prev) => ({ ...prev, payment_terms: e.target.value }))}
                placeholder="e.g., Net 30"
              />
            </div>
            <div className="space-y-2">
              <Label>GST Number</Label>
              <Input
                value={form.gst_number}
                onChange={(e) => setForm((prev) => ({ ...prev, gst_number: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>PAN Number</Label>
              <Input
                value={form.pan_number}
                onChange={(e) => setForm((prev) => ({ ...prev, pan_number: e.target.value }))}
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
                  <SelectItem value="blacklisted">Blacklisted</SelectItem>
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
                {editingVendor ? "Update Vendor" : "Create Vendor"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the vendor.
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
