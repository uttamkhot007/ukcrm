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
  Truck,
  Loader2,
  Plus,
  Search,
  Edit2,
  Save,
  Trash2,
  MapPin,
  Mail,
  Phone,
  Globe,
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

interface Distributor {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  region: string | null;
  territory: string | null;
  discount_percentage: number | null;
  credit_limit: number | null;
  payment_terms: string | null;
  gst_number: string | null;
  pan_number: string | null;
  notes: string | null;
  status: string | null;
  oem_brand_name: string | null;
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
  region: "",
  territory: "",
  discount_percentage: "",
  credit_limit: "",
  payment_terms: "",
  gst_number: "",
  pan_number: "",
  notes: "",
  status: "active",
  oem_brand_name: "",
};

export function DistributorsManagement() {
  const { user } = useAuth();
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDistributor, setEditingDistributor] = useState<Distributor | null>(null);
  const [form, setForm] = useState(initialFormState);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchDistributors = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("distributors")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to fetch distributors", variant: "destructive" });
    } else {
      setDistributors(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDistributors();
  }, []);

  const openNewDialog = () => {
    setEditingDistributor(null);
    setForm(initialFormState);
    setDialogOpen(true);
  };

  const openEditDialog = (distributor: Distributor) => {
    setEditingDistributor(distributor);
    setForm({
      company_name: distributor.company_name,
      contact_name: distributor.contact_name || "",
      email: distributor.email || "",
      phone: distributor.phone || "",
      address: distributor.address || "",
      city: distributor.city || "",
      country: distributor.country || "",
      region: distributor.region || "",
      territory: distributor.territory || "",
      discount_percentage: distributor.discount_percentage?.toString() || "",
      credit_limit: distributor.credit_limit?.toString() || "",
      payment_terms: distributor.payment_terms || "",
      gst_number: distributor.gst_number || "",
      pan_number: distributor.pan_number || "",
      notes: distributor.notes || "",
      status: distributor.status || "active",
      oem_brand_name: distributor.oem_brand_name || "",
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
      region: form.region || null,
      territory: form.territory || null,
      discount_percentage: form.discount_percentage ? parseFloat(form.discount_percentage) : null,
      credit_limit: form.credit_limit ? parseFloat(form.credit_limit) : null,
      payment_terms: form.payment_terms || null,
      gst_number: form.gst_number || null,
      pan_number: form.pan_number || null,
      notes: form.notes || null,
      status: form.status || "active",
      oem_brand_name: form.oem_brand_name || null,
    };

    if (editingDistributor) {
      const { error } = await supabase
        .from("distributors")
        .update(payload)
        .eq("id", editingDistributor.id);

      if (error) {
        toast({ title: "Error", description: "Failed to update distributor", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Distributor updated" });
        setDialogOpen(false);
        fetchDistributors();
      }
    } else {
      const { error } = await supabase.from("distributors").insert({
        ...payload,
        created_by: user?.id,
      });

      if (error) {
        toast({ title: "Error", description: "Failed to create distributor", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Distributor created" });
        setDialogOpen(false);
        fetchDistributors();
      }
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase.from("distributors").delete().eq("id", deleteId);

    if (error) {
      toast({ title: "Error", description: "Failed to delete distributor", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Distributor deleted" });
      fetchDistributors();
    }
    setDeleteId(null);
  };

  const filteredDistributors = distributors.filter((d) => {
    const query = searchQuery.toLowerCase();
    return (
      d.company_name.toLowerCase().includes(query) ||
      d.contact_name?.toLowerCase().includes(query) ||
      d.email?.toLowerCase().includes(query) ||
      d.region?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search distributors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Distributor
        </Button>
      </div>

      <div className="glass rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredDistributors.map((distributor) => (
              <div key={distributor.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-500/60 flex items-center justify-center text-white font-semibold">
                      {distributor.company_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{distributor.company_name}</p>
                        {distributor.region && (
                          <Badge variant="secondary" className="text-xs">
                            {distributor.region}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            distributor.status === "active"
                              ? "bg-green-500/20 text-green-600"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {distributor.status}
                        </Badge>
                        {distributor.oem_brand_name && (
                          <Badge variant="secondary" className="text-xs">
                            OEM: {distributor.oem_brand_name}
                          </Badge>
                        )}
                      </div>
                      {distributor.contact_name && (
                        <p className="text-sm text-muted-foreground">{distributor.contact_name}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        {distributor.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {distributor.email}
                          </span>
                        )}
                        {distributor.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {distributor.city}, {distributor.country}
                          </span>
                        )}
                        {distributor.territory && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            Territory: {distributor.territory}
                          </span>
                        )}
                      </div>
                      {(distributor.discount_percentage || distributor.credit_limit) && (
                        <div className="flex items-center gap-4 mt-1 text-xs">
                          {distributor.discount_percentage && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600">
                              {distributor.discount_percentage}% Discount
                            </Badge>
                          )}
                          {distributor.credit_limit && (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600">
                              Credit: ₹{distributor.credit_limit.toLocaleString()}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(distributor)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteId(distributor.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {filteredDistributors.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">No distributors found</div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDistributor ? "Edit Distributor" : "Add Distributor"}
            </DialogTitle>
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
              <Label>Region</Label>
              <Input
                value={form.region}
                onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value }))}
                placeholder="e.g., North, South, East, West"
              />
            </div>
            <div className="space-y-2">
              <Label>Territory</Label>
              <Input
                value={form.territory}
                onChange={(e) => setForm((prev) => ({ ...prev, territory: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Discount Percentage</Label>
              <Input
                type="number"
                value={form.discount_percentage}
                onChange={(e) => setForm((prev) => ({ ...prev, discount_percentage: e.target.value }))}
                placeholder="0-100"
              />
            </div>
            <div className="space-y-2">
              <Label>Credit Limit</Label>
              <Input
                type="number"
                value={form.credit_limit}
                onChange={(e) => setForm((prev) => ({ ...prev, credit_limit: e.target.value }))}
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
              <Label>OEM Brand Name</Label>
              <Input
                value={form.oem_brand_name}
                onChange={(e) => setForm((prev) => ({ ...prev, oem_brand_name: e.target.value }))}
                placeholder="e.g., Cisco, Microsoft"
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
                  <SelectItem value="suspended">Suspended</SelectItem>
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
                {editingDistributor ? "Update Distributor" : "Create Distributor"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Distributor?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the distributor.
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
