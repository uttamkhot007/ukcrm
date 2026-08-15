import { lazy, Suspense, useState } from "react";

/** MEDDIC lives inside Deals — one module, two views. */
const MEDDICWorkflow = lazy(() =>
  import("./MEDDICWorkflow").then((m) => ({ default: m.MEDDICWorkflow })),
);
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { DealsKanban } from "./DealsKanban";
import { DealFiltersComponent, initialDealFilters, type DealFilters } from "./DealFilters";
import { AddActivityDialog } from "./AddActivityDialog";
import { Plus, Search, TrendingUp, DollarSign, Calendar, Loader2, MoreHorizontal, Pencil, Trash2, LayoutList, Kanban, User, Download, MessageSquarePlus, RefreshCw } from "lucide-react";
import { DealWizard } from "./DealWizard";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import { exportToCSV } from "@/lib/csv-export";
import { workflows } from "@/lib/workflows";
import { ClosedWonWorkflowInitiator } from "@/components/accounts/ClosedWonWorkflowInitiator";

type Deal = Database["public"]["Tables"]["deals"]["Row"];
type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type DealStage = Database["public"]["Enums"]["deal_stage"];

type DealWithContact = Deal & { contacts: Pick<Contact, "id" | "name" | "company"> | null };

const stageColors: Record<DealStage, string> = {
  pipeline: "bg-muted text-muted-foreground",
  qualified: "bg-cyan-500/20 text-cyan-400",
  proposal: "bg-indigo-500/20 text-indigo-400",
  negotiation: "bg-pink-500/20 text-pink-400",
  upside: "bg-blue-500/20 text-blue-400",
  strong_upside: "bg-amber-500/20 text-amber-400",
  commit: "bg-purple-500/20 text-purple-400",
  closed_won: "bg-emerald-500/20 text-emerald-400",
  closed_lost: "bg-red-500/20 text-red-400",
};

const stageLabels: Record<DealStage, string> = {
  pipeline: "Pipeline",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  upside: "Upside",
  strong_upside: "Strong Upside",
  commit: "Commit",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

/** Deals is the single home for the pipeline AND its MEDDIC qualification view. */
export function DealsView({ initialView = "pipeline" }: { initialView?: "pipeline" | "meddic" } = {}) {
  const [dealsView, setDealsView] = useState<"pipeline" | "meddic">(initialView);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<DealWithContact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DealWithContact | null>(null);
  const [closedWonDeal, setClosedWonDeal] = useState<DealWithContact | null>(null);
  const [filters, setFilters] = useState<DealFilters>(initialDealFilters);
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { formatCurrency, currency: orgCurrency } = useOrganizationSettings();
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

  // Define form data type for mutations
  type DealFormInput = {
    title: string;
    value: string;
    stage: DealStage;
    description: string;
    expected_close_date: string;
    probability: string;
    contact_id: string;
    organization_name: string;
    problem_requirement: string;
    deal_type: "new" | "replacement";
    existing_solution: string;
    quantity: string;
    buying_timeline: string;
    is_budgeted: boolean;
    tentative_budget: string;
    next_steps: string;
    solution_id: string;
    alliance_organization_id: string;
    requirement_category: string;
  };

  const createDeal = useMutation({
    mutationFn: async (data: DealFormInput) => {
      const nowIso = new Date().toISOString();

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
        alliance_organization_id: data.alliance_organization_id || null,
        requirement_category: data.requirement_category || null,
        last_stage_change_at: nowIso,
        ...(data.stage === "closed_won" ? { actual_close_date: nowIso } : {}),
      };

      const { data: created, error } = await supabase
        .from("deals")
        .insert(insertData as any)
        .select("*, contacts:contact_id(id, name, company)")
        .single();

      if (error) throw error;
      return created as DealWithContact;
    },
    onSuccess: async (createdDeal) => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      closeDialog();
      toast({ title: "Deal created successfully" });

      if (createdDeal.stage === "closed_won") {
        // Trigger "deal won" notifications + celebration for everyone
        await workflows.dealStageChanged(createdDeal.id, "pipeline", "closed_won");
        setClosedWonDeal(createdDeal);
      }
    },
    onError: (error) => {
      toast({ title: "Error creating deal", description: error.message, variant: "destructive" });
    },
  });

  const updateDeal = useMutation({
    mutationFn: async ({
      id,
      data,
      prevStage,
      dealSnapshot,
    }: {
      id: string;
      data: DealFormInput;
      prevStage: DealStage;
      dealSnapshot: DealWithContact;
    }) => {
      const nowIso = new Date().toISOString();
      const stageChanged = data.stage !== prevStage;

      const { error } = await supabase
        .from("deals")
        .update(
          {
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
            alliance_organization_id: data.alliance_organization_id || null,
            requirement_category: data.requirement_category || null,
            ...(stageChanged ? { last_stage_change_at: nowIso } : {}),
            ...(stageChanged && data.stage === "closed_won" ? { actual_close_date: nowIso } : {}),
          } as any
        )
        .eq("id", id);
      if (error) throw error;

      return { id, prevStage, newStage: data.stage, dealSnapshot, formData: data };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      closeDialog();
      toast({ title: "Deal updated successfully" });

      // If moved to Closed Won, trigger "deal won" notifications + post-sale workflow starter
      if (result.newStage === "closed_won" && result.prevStage !== "closed_won") {
        await workflows.dealStageChanged(result.id, result.prevStage, result.newStage);

        const valueNum = parseFloat(result.formData.value) || 0;
        setClosedWonDeal({
          ...result.dealSnapshot,
          title: result.formData.title.trim(),
          value: valueNum as any,
          stage: "closed_won" as any,
          organization_name: result.formData.organization_name.trim(),
          contact_id: result.formData.contact_id || null,
          probability: parseInt(result.formData.probability) || 10,
          expected_close_date: result.formData.expected_close_date || null,
          description: result.formData.description.trim() || null,
        });
      }
    },
    onError: (error) => {
      toast({ title: "Error updating deal", description: error.message, variant: "destructive" });
    },
  });

  const deleteDeal = useMutation({
    mutationFn: async (id: string) => {
      // Delete related records first to avoid FK constraint violations
      const relatedTables = [
        "deal_activities", "deal_products", "deal_stage_progression_log",
        "quotations", "invoices", "estimates", "renewals",
        "inside_sales_prospects", "order_processing_requests",
        "accounts_workflows", "poc_requests", "demo_schedules",
        "technical_assessments", "rfp_responses", "customer_deliveries",
        "post_sale_workflows", "deal_registrations", "presales_opportunities",
        "email_sequence_enrollments", "customer_support_contracts"
      ];
      
      for (const table of relatedTables) {
        await supabase.from(table as any).delete().eq("deal_id", id);
      }
      
      // Nullify optional FK references
      await supabase.from("calendar_events").update({ related_deal_id: null }).eq("related_deal_id", id);
      await supabase.from("travel_requests").update({ deal_id: null }).eq("deal_id", id);
      await supabase.from("daily_activities").update({ related_deal_id: null }).eq("related_deal_id", id);
      await supabase.from("projects").update({ deal_id: null }).eq("deal_id", id);
      await supabase.from("tenders").update({ deal_id: null }).eq("deal_id", id);
      
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
  };

  const openEditDialog = (deal: DealWithContact) => {
    setEditingDeal(deal);
    setIsDialogOpen(true);
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

      <ToggleGroup
        type="single"
        value={dealsView}
        onValueChange={(v) => v && setDealsView(v as "pipeline" | "meddic")}
        className="justify-start"
        aria-label="Deals view"
      >
        <ToggleGroupItem value="pipeline">Pipeline</ToggleGroupItem>
        <ToggleGroupItem value="meddic">MEDDIC Qualification</ToggleGroupItem>
      </ToggleGroup>

      {dealsView === "meddic" ? (
        <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
          <MEDDICWorkflow />
        </Suspense>
      ) : (
      <>
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
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{editingDeal ? "Edit Deal" : "Create New Deal"}</DialogTitle>
            </DialogHeader>
            <DealWizard
              initialData={editingDeal ? {
                alliance_organization_id: (editingDeal as any).alliance_organization_id || "",
                organization_name: (editingDeal as any).organization_name || "",
                title: editingDeal.title,
                deal_type: ((editingDeal as any).deal_type === "replacement" ? "cross_sale" : "new") as "new" | "cross_sale",
                requirement_category: (editingDeal as any).requirement_category || "products",
                problem_requirement: (editingDeal as any).problem_requirement || "",
                solution_id: (editingDeal as any).solution_id || "",
                contact_id: editingDeal.contact_id || "",
                quantity: String((editingDeal as any).quantity || 1),
                buying_timeline: (editingDeal as any).buying_timeline || "",
                is_budgeted: (editingDeal as any).is_budgeted || false,
                tentative_budget: String((editingDeal as any).tentative_budget || ""),
                value: String(editingDeal.value),
                probability: String(editingDeal.probability || 10),
                expected_close_date: editingDeal.expected_close_date || "",
                next_steps: (editingDeal as any).next_steps || "",
                description: editingDeal.description || "",
                stage: editingDeal.stage,
                existing_solution: (editingDeal as any).existing_solution || "",
              } : undefined}
              onSubmit={(data) => {
                const submitData = {
                  title: data.title,
                  value: data.value,
                  stage: data.stage,
                  description: data.description,
                  expected_close_date: data.expected_close_date,
                  probability: data.probability,
                  contact_id: data.contact_id,
                  organization_name: data.organization_name,
                  problem_requirement: data.problem_requirement,
                  deal_type: data.deal_type === "cross_sale" ? "replacement" : ("new" as "new" | "replacement"),
                  existing_solution: data.existing_solution,
                  quantity: data.quantity,
                  buying_timeline: data.buying_timeline,
                  is_budgeted: data.is_budgeted,
                  tentative_budget: data.tentative_budget,
                  next_steps: data.next_steps,
                  solution_id: data.solution_id,
                  alliance_organization_id: data.alliance_organization_id,
                  requirement_category: data.requirement_category,
                };

                if (editingDeal) {
                  updateDeal.mutate({
                    id: editingDeal.id,
                    data: submitData,
                    prevStage: editingDeal.stage,
                    dealSnapshot: editingDeal,
                  });
                } else {
                  createDeal.mutate(submitData);
                }
              }}
              onCancel={closeDialog}
              isSubmitting={isPending}
              isEditing={!!editingDeal}
            />
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

      {/* Closed Won Workflow Initiator */}
      {closedWonDeal && (
        <ClosedWonWorkflowInitiator
          deal={{
            id: closedWonDeal.id,
            title: closedWonDeal.title,
            value: Number(closedWonDeal.value),
            organization_name: (closedWonDeal as any).organization_name,
            order_type: (closedWonDeal as any).order_type,
            includes_support: (closedWonDeal as any).includes_support || false,
            includes_managed_service: (closedWonDeal as any).includes_managed_service || false,
            includes_renewal: (closedWonDeal as any).includes_renewal || false,
            meddic_identify_pain: (closedWonDeal as any).meddic_identify_pain || "",
            meddic_decision_criteria: (closedWonDeal as any).meddic_decision_criteria || "",
            contacts: (closedWonDeal as any).contacts,
          }}
          open={!!closedWonDeal}
          onOpenChange={(open) => !open && setClosedWonDeal(null)}
          onWorkflowCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["deals"] });
            queryClient.invalidateQueries({ queryKey: ["post-sale-workflows"] });
          }}
        />
      )}
      </>
      )}
    </div>

  );
}
