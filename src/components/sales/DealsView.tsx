import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { DealsKanban } from "./DealsKanban";
import { DealFiltersComponent, initialDealFilters, type DealFilters } from "./DealFilters";
import { AddActivityDialog } from "./AddActivityDialog";
import { Plus, Search, TrendingUp, DollarSign, Calendar, Loader2, MoreHorizontal, Pencil, Trash2, LayoutList, Kanban, User, Download, MessageSquarePlus, RefreshCw, Building2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import { exportToCSV } from "@/lib/csv-export";

type Deal = Database["public"]["Tables"]["deals"]["Row"];
type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type DealStage = Database["public"]["Enums"]["deal_stage"];

type DealWithContact = Deal & { contacts: Pick<Contact, "id" | "name" | "company"> | null };

const stageColors: Record<DealStage, string> = {
  pipeline: "bg-muted text-muted-foreground",
  upside: "bg-blue-500/20 text-blue-400",
  strong_upside: "bg-amber-500/20 text-amber-400",
  commit: "bg-purple-500/20 text-purple-400",
  closed_won: "bg-emerald-500/20 text-emerald-400",
  closed_lost: "bg-red-500/20 text-red-400",
};

const stageLabels: Record<DealStage, string> = {
  pipeline: "Pipeline",
  upside: "Upside",
  strong_upside: "Strong Upside",
  commit: "Commit",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

const initialFormData = {
  title: "",
  value: "",
  stage: "pipeline" as DealStage,
  description: "",
  expected_close_date: "",
  probability: "10",
  contact_id: "",
  organization_name: "",
  problem_requirement: "",
  deal_type: "new" as "new" | "replacement",
  existing_solution: "",
  quantity: "1",
  buying_timeline: "",
  is_budgeted: false,
  tentative_budget: "",
  next_steps: "",
  solution_id: "",
};

const buyingTimelineOptions = [
  { value: "immediate", label: "Immediate (< 1 month)" },
  { value: "short_term", label: "Short Term (1-3 months)" },
  { value: "medium_term", label: "Medium Term (3-6 months)" },
  { value: "long_term", label: "Long Term (6+ months)" },
];

export function DealsView() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<DealWithContact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DealWithContact | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [filters, setFilters] = useState<DealFilters>(initialDealFilters);
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { formatCurrency, getCurrencySymbol, currency: orgCurrency } = useOrganizationSettings();
  const { formatConvertedAmount } = useExchangeRates();
  const queryClient = useQueryClient();

  const { data: deals, isLoading } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, contacts:contact_id(id, name, company)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DealWithContact[];
    },
  });

  const { data: contacts } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, company")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery<{ id: string; name: string; category: string | null }[]>({
    queryKey: ["offerings-products"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase as any)
        .from("offerings_products")
        .select("id, name, category")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (result.error) throw result.error;
      return result.data || [];
    },
  });

  const createDeal = useMutation({
    mutationFn: async (data: typeof formData) => {
      const insertData = {
        title: data.title.trim(),
        value: parseFloat(data.value) || 0,
        stage: data.stage,
        description: data.description.trim() || null,
        expected_close_date: data.expected_close_date || null,
        probability: parseInt(data.probability) || 10,
        contact_id: data.contact_id || null,
        user_id: user!.id,
        tenant_id: currentTenant?.id,
        organization_name: data.organization_name.trim(),
        problem_requirement: data.problem_requirement.trim(),
        deal_type: data.deal_type,
        existing_solution: data.deal_type === "replacement" ? data.existing_solution.trim() : null,
        quantity: parseInt(data.quantity) || 1,
        buying_timeline: data.buying_timeline,
        is_budgeted: data.is_budgeted,
        tentative_budget: parseFloat(data.tentative_budget) || 0,
        next_steps: data.next_steps.trim(),
        solution_id: data.solution_id || null,
      };
      const { error } = await supabase.from("deals").insert(insertData as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      closeDialog();
      toast({ title: "Deal created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating deal", description: error.message, variant: "destructive" });
    },
  });

  const updateDeal = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("deals")
        .update({
          title: data.title.trim(),
          value: parseFloat(data.value) || 0,
          stage: data.stage,
          description: data.description.trim() || null,
          expected_close_date: data.expected_close_date || null,
          probability: parseInt(data.probability) || 10,
          contact_id: data.contact_id || null,
          organization_name: data.organization_name.trim(),
          problem_requirement: data.problem_requirement.trim(),
          deal_type: data.deal_type,
          existing_solution: data.deal_type === "replacement" ? data.existing_solution.trim() : null,
          quantity: parseInt(data.quantity) || 1,
          buying_timeline: data.buying_timeline,
          is_budgeted: data.is_budgeted,
          tentative_budget: parseFloat(data.tentative_budget) || 0,
          next_steps: data.next_steps.trim(),
          solution_id: data.solution_id || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      closeDialog();
      toast({ title: "Deal updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating deal", description: error.message, variant: "destructive" });
    },
  });

  const deleteDeal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setDeleteTarget(null);
      toast({ title: "Deal deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting deal", description: error.message, variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingDeal(null);
    setFormData(initialFormData);
  };

  const openEditDialog = (deal: DealWithContact) => {
    setEditingDeal(deal);
    setFormData({
      title: deal.title,
      value: String(deal.value),
      stage: deal.stage,
      description: deal.description || "",
      expected_close_date: deal.expected_close_date || "",
      probability: String(deal.probability || 10),
      contact_id: deal.contact_id || "",
      organization_name: (deal as any).organization_name || "",
      problem_requirement: (deal as any).problem_requirement || "",
      deal_type: ((deal as any).deal_type || "new") as "new" | "replacement",
      existing_solution: (deal as any).existing_solution || "",
      quantity: String((deal as any).quantity || 1),
      buying_timeline: (deal as any).buying_timeline || "",
      is_budgeted: (deal as any).is_budgeted || false,
      tentative_budget: String((deal as any).tentative_budget || ""),
      next_steps: (deal as any).next_steps || "",
      solution_id: (deal as any).solution_id || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDeal) {
      updateDeal.mutate({ id: editingDeal.id, data: formData });
    } else {
      createDeal.mutate(formData);
    }
  };

  const filteredDeals = deals?.filter((deal) => {
    // Search filter
    const matchesSearch = deal.title.toLowerCase().includes(search.toLowerCase()) ||
      deal.contacts?.name?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    // Stage filter
    if (filters.stage !== "all" && deal.stage !== filters.stage) return false;

    // Value range filter
    const value = Number(deal.value);
    if (filters.minValue && value < parseFloat(filters.minValue)) return false;
    if (filters.maxValue && value > parseFloat(filters.maxValue)) return false;

    // Date range filter
    if (deal.expected_close_date) {
      const closeDate = new Date(deal.expected_close_date);
      if (filters.startDate && closeDate < new Date(filters.startDate)) return false;
      if (filters.endDate && closeDate > new Date(filters.endDate)) return false;
    } else {
      // If no close date and date filter is set, exclude
      if (filters.startDate || filters.endDate) return false;
    }

    return true;
  });

  const handleExport = () => {
    if (!filteredDeals?.length) return;
    exportToCSV(filteredDeals, "deals", [
      { key: "title", label: "Title" },
      { key: "contacts", label: "Contact", transform: (v) => (v as any)?.name || "" },
      { key: "value", label: "Value", transform: (v) => String(v) },
      { key: "stage", label: "Stage", transform: (v) => stageLabels[v as DealStage] || String(v) },
      { key: "probability", label: "Probability (%)", transform: (v) => String(v) },
      { key: "expected_close_date", label: "Expected Close", transform: (v) => v ? format(new Date(v as string), "yyyy-MM-dd") : "" },
      { key: "description", label: "Description", transform: (v) => String(v || "") },
      { key: "created_at", label: "Created", transform: (v) => format(new Date(v as string), "yyyy-MM-dd") },
    ]);
  };

  const totalValue = deals?.reduce((sum, deal) => sum + Number(deal.value), 0) || 0;
  const wonValue = deals?.filter((d) => d.stage === "closed_won").reduce((sum, deal) => sum + Number(deal.value), 0) || 0;
  const isPending = createDeal.isPending || updateDeal.isPending;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 glass border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Pipeline</p>
              <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              {(() => {
                const altCurrency = orgCurrency === "INR" ? "USD" : "INR";
                const converted = formatConvertedAmount(totalValue, orgCurrency, altCurrency, formatCurrency);
                return converted ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    ≈ {converted}
                  </p>
                ) : null;
              })()}
            </div>
          </div>
        </Card>
        <Card className="p-4 glass border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Won This Quarter</p>
              <p className="text-2xl font-bold">{formatCurrency(wonValue)}</p>
              {(() => {
                const altCurrency = orgCurrency === "INR" ? "USD" : "INR";
                const converted = formatConvertedAmount(wonValue, orgCurrency, altCurrency, formatCurrency);
                return converted ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    ≈ {converted}
                  </p>
                ) : null;
              })()}
            </div>
          </div>
        </Card>
        <Card className="p-4 glass border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Deals</p>
              <p className="text-2xl font-bold">{deals?.filter((d) => !d.stage.startsWith("closed")).length || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search deals..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as "list" | "kanban")}>
            <ToggleGroupItem value="list" aria-label="List view" className="px-3">
              <LayoutList className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="kanban" aria-label="Kanban view" className="px-3">
              <Kanban className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex items-center gap-2">
          <DealFiltersComponent filters={filters} onFiltersChange={setFilters} />
          <Button variant="outline" onClick={handleExport} disabled={!filteredDeals?.length}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Deal
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{editingDeal ? "Edit Deal" : "Create New Deal"}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Organization & Title */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="organization_name">Organization Name *</Label>
                    <Input
                      id="organization_name"
                      value={formData.organization_name}
                      onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
                      placeholder="Customer organization"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Deal Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      maxLength={200}
                      required
                    />
                  </div>
                </div>

                {/* Problem/Requirement */}
                <div className="space-y-2">
                  <Label htmlFor="problem_requirement">Problem / Requirement Statement *</Label>
                  <Textarea
                    id="problem_requirement"
                    value={formData.problem_requirement}
                    onChange={(e) => setFormData({ ...formData, problem_requirement: e.target.value })}
                    placeholder="Describe the customer's problem or requirement..."
                    rows={2}
                    required
                  />
                </div>

                {/* Deal Type */}
                <div className="space-y-3">
                  <Label>Deal Type *</Label>
                  <RadioGroup
                    value={formData.deal_type}
                    onValueChange={(value) => setFormData({ ...formData, deal_type: value as "new" | "replacement" })}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="new" id="deal_type_new" />
                      <Label htmlFor="deal_type_new" className="font-normal cursor-pointer">New Purchase</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="replacement" id="deal_type_replacement" />
                      <Label htmlFor="deal_type_replacement" className="font-normal cursor-pointer">Replacement</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Existing Solution (conditional) */}
                {formData.deal_type === "replacement" && (
                  <div className="space-y-2">
                    <Label htmlFor="existing_solution">Existing Solution *</Label>
                    <Input
                      id="existing_solution"
                      value={formData.existing_solution}
                      onChange={(e) => setFormData({ ...formData, existing_solution: e.target.value })}
                      placeholder="What solution are they replacing?"
                      required={formData.deal_type === "replacement"}
                    />
                  </div>
                )}

                {/* Solution & Contact */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="solution_id">Solution/Product</Label>
                    <Select
                      value={formData.solution_id || "none"}
                      onValueChange={(value) => setFormData({ ...formData, solution_id: value === "none" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a solution" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No solution selected</SelectItem>
                        {products?.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} {product.category && `(${product.category})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact">Contact</Label>
                    <Select
                      value={formData.contact_id || "none"}
                      onValueChange={(value) => setFormData({ ...formData, contact_id: value === "none" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a contact" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No contact</SelectItem>
                        {contacts?.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.name} {contact.company && `(${contact.company})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Quantity & Buying Timeline */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buying_timeline">Buying Timeline *</Label>
                    <Select
                      value={formData.buying_timeline}
                      onValueChange={(value) => setFormData({ ...formData, buying_timeline: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timeline" />
                      </SelectTrigger>
                      <SelectContent>
                        {buyingTimelineOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Budget Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id="is_budgeted"
                      checked={formData.is_budgeted}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_budgeted: !!checked })}
                    />
                    <Label htmlFor="is_budgeted" className="cursor-pointer">Is Budgeted?</Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tentative_budget">Tentative Budget ({getCurrencySymbol()}) *</Label>
                    <Input
                      id="tentative_budget"
                      type="number"
                      min="0"
                      value={formData.tentative_budget}
                      onChange={(e) => setFormData({ ...formData, tentative_budget: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Value & Probability */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="value">Deal Value ({getCurrencySymbol()}) *</Label>
                    <Input
                      id="value"
                      type="number"
                      min="0"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="probability">Probability (%)</Label>
                    <Input
                      id="probability"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.probability}
                      onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                    />
                  </div>
                </div>

                {/* Stage & Expected Close */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stage">Stage</Label>
                    <Select
                      value={formData.stage}
                      onValueChange={(value) => setFormData({ ...formData, stage: value as DealStage })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(stageLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expected_close_date">Expected Close</Label>
                    <Input
                      id="expected_close_date"
                      type="date"
                      value={formData.expected_close_date}
                      onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Next Steps */}
                <div className="space-y-2">
                  <Label htmlFor="next_steps">Next Steps *</Label>
                  <Textarea
                    id="next_steps"
                    value={formData.next_steps}
                    onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
                    placeholder="What are the next steps for this deal?"
                    rows={2}
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Additional Notes</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    maxLength={1000}
                    rows={2}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingDeal ? "Update Deal" : "Create Deal"}
                </Button>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : viewMode === "kanban" ? (
        <DealsKanban
          deals={filteredDeals || []}
          onEdit={openEditDialog}
          onDelete={setDeleteTarget}
        />
      ) : (
        <Card className="glass border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Probability</TableHead>
                <TableHead>Expected Close</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeals?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No deals found. Create your first deal to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDeals?.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell className="font-medium">{deal.title}</TableCell>
                    <TableCell>
                      {deal.contacts ? (
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span>{deal.contacts.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(Number(deal.value))}</TableCell>
                    <TableCell>
                      <Badge className={stageColors[deal.stage]}>{stageLabels[deal.stage]}</Badge>
                    </TableCell>
                    <TableCell>{deal.probability}%</TableCell>
                    <TableCell>
                      {deal.expected_close_date
                        ? format(new Date(deal.expected_close_date), "MMM d, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(deal)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <AddActivityDialog
                            dealId={deal.id}
                            dealTitle={deal.title}
                            trigger={
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <MessageSquarePlus className="w-4 h-4 mr-2" />
                                Log Activity
                              </DropdownMenuItem>
                            }
                          />
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(deal)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteDeal.mutate(deleteTarget.id)}
        title="Delete Deal"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        isDeleting={deleteDeal.isPending}
      />
    </div>
  );
}
