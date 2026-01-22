import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FolderTree, BookOpen, Search, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, ChevronDown } from "lucide-react";

interface AccountGroup {
  id: string;
  name: string;
  nature: string;
  parent_group_id: string | null;
  is_primary: boolean;
  children?: AccountGroup[];
}

interface LedgerAccount {
  id: string;
  account_code: string;
  name: string;
  group_id: string;
  opening_balance: number;
  current_balance: number;
  balance_type: string;
  is_bank_account: boolean;
  is_active: boolean;
  group?: { name: string };
}

export function ChartOfAccounts() {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isLedgerDialogOpen, setIsLedgerDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNature, setSelectedNature] = useState<string>("all");

  // Fetch account groups
  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ["account-groups", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await (supabase
        .from("account_groups") as any)
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch ledger accounts
  const { data: ledgers = [], isLoading: loadingLedgers } = useQuery({
    queryKey: ["ledger-accounts", currentTenant?.id, selectedNature, searchTerm],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      let query = (supabase.from("ledger_accounts") as any)
        .select("*, group:account_groups(name, nature)")
        .eq("tenant_id", currentTenant.id)
        .order("name");
      
      if (searchTerm) {
        query = query.ilike("name", `%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      if (selectedNature !== "all") {
        return (data || []).filter((l: any) => l.group?.nature === selectedNature);
      }
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (groupData: any) => {
      const { data, error } = await (supabase
        .from("account_groups") as any)
        .insert({ ...groupData, tenant_id: currentTenant?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-groups"] });
      toast.success("Account group created");
      setIsGroupDialogOpen(false);
    },
    onError: () => toast.error("Failed to create group"),
  });

  // Create ledger mutation
  const createLedgerMutation = useMutation({
    mutationFn: async (ledgerData: any) => {
      const { data, error } = await (supabase
        .from("ledger_accounts") as any)
        .insert({ ...ledgerData, tenant_id: currentTenant?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ledger-accounts"] });
      toast.success("Ledger account created");
      setIsLedgerDialogOpen(false);
    },
    onError: () => toast.error("Failed to create ledger"),
  });

  // Build group tree
  const buildGroupTree = (groups: AccountGroup[]): AccountGroup[] => {
    const groupMap = new Map<string, AccountGroup>();
    const roots: AccountGroup[] = [];

    groups.forEach(g => groupMap.set(g.id, { ...g, children: [] }));
    groups.forEach(g => {
      const group = groupMap.get(g.id)!;
      if (g.parent_group_id && groupMap.has(g.parent_group_id)) {
        groupMap.get(g.parent_group_id)!.children!.push(group);
      } else {
        roots.push(group);
      }
    });

    return roots;
  };

  const groupTree = buildGroupTree(groups);

  const natureColors: Record<string, string> = {
    assets: "bg-blue-100 text-blue-800",
    liabilities: "bg-red-100 text-red-800",
    income: "bg-green-100 text-green-800",
    expenses: "bg-orange-100 text-orange-800",
    capital: "bg-purple-100 text-purple-800",
  };

  const GroupTreeItem = ({ group, level = 0 }: { group: AccountGroup; level?: number }) => {
    const [isOpen, setIsOpen] = useState(level === 0);
    const hasChildren = group.children && group.children.length > 0;

    return (
      <div>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div 
            className="flex items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded-md cursor-pointer"
            style={{ paddingLeft: `${level * 24 + 12}px` }}
          >
            {hasChildren ? (
              <CollapsibleTrigger className="p-0">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
            ) : (
              <span className="w-4" />
            )}
            <FolderTree className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1">{group.name}</span>
            <Badge className={natureColors[group.nature]} variant="secondary">
              {group.nature}
            </Badge>
          </div>
          {hasChildren && (
            <CollapsibleContent>
              {group.children!.map(child => (
                <GroupTreeItem key={child.id} group={child} level={level + 1} />
              ))}
            </CollapsibleContent>
          )}
        </Collapsible>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="ledgers" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="ledgers" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Ledger Accounts
            </TabsTrigger>
            <TabsTrigger value="groups" className="gap-2">
              <FolderTree className="h-4 w-4" />
              Account Groups
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Account Group</DialogTitle>
                </DialogHeader>
                <CreateGroupForm 
                  groups={groups}
                  onSubmit={(data) => createGroupMutation.mutate(data)}
                  isLoading={createGroupMutation.isPending}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={isLedgerDialogOpen} onOpenChange={setIsLedgerDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Ledger
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Ledger Account</DialogTitle>
                </DialogHeader>
                <CreateLedgerForm 
                  groups={groups}
                  onSubmit={(data) => createLedgerMutation.mutate(data)}
                  isLoading={createLedgerMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="ledgers" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search ledgers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={selectedNature} onValueChange={setSelectedNature}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by nature" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="assets">Assets</SelectItem>
                    <SelectItem value="liabilities">Liabilities</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expenses">Expenses</SelectItem>
                    <SelectItem value="capital">Capital</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Nature</TableHead>
                    <TableHead className="text-right">Opening Balance</TableHead>
                    <TableHead className="text-right">Current Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingLedgers ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : ledgers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No ledger accounts found. Create your first ledger to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ledgers.map((ledger: LedgerAccount) => (
                      <TableRow key={ledger.id}>
                        <TableCell className="font-mono text-sm">{ledger.account_code || "-"}</TableCell>
                        <TableCell className="font-medium">{ledger.name}</TableCell>
                        <TableCell>{(ledger as any).group?.name || "-"}</TableCell>
                        <TableCell>
                          <Badge className={natureColors[(ledger as any).group?.nature] || ""} variant="secondary">
                            {(ledger as any).group?.nature || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {ledger.opening_balance?.toLocaleString("en-IN", { style: "currency", currency: "INR" }) || "₹0.00"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={ledger.current_balance >= 0 ? "text-green-600" : "text-red-600"}>
                            {ledger.current_balance?.toLocaleString("en-IN", { style: "currency", currency: "INR" }) || "₹0.00"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={ledger.is_active ? "default" : "secondary"}>
                            {ledger.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups">
          <Card>
            <CardHeader>
              <CardTitle>Account Group Hierarchy</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingGroups ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : groupTree.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No account groups found. Create primary groups to organize your chart of accounts.
                </p>
              ) : (
                <div className="space-y-1">
                  {groupTree.map(group => (
                    <GroupTreeItem key={group.id} group={group} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateGroupForm({ groups, onSubmit, isLoading }: { groups: AccountGroup[]; onSubmit: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    name: "",
    nature: "assets",
    parent_group_id: "",
    is_primary: false,
    description: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      parent_group_id: formData.parent_group_id || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Group Name</Label>
        <Input 
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Current Assets"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Nature</Label>
        <Select value={formData.nature} onValueChange={(v) => setFormData(prev => ({ ...prev, nature: v }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="assets">Assets</SelectItem>
            <SelectItem value="liabilities">Liabilities</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expenses">Expenses</SelectItem>
            <SelectItem value="capital">Capital</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Parent Group (Optional)</Label>
        <Select value={formData.parent_group_id} onValueChange={(v) => setFormData(prev => ({ ...prev, parent_group_id: v }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select parent group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No Parent (Primary Group)</SelectItem>
            {groups.map(g => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Creating..." : "Create Group"}
        </Button>
      </div>
    </form>
  );
}

function CreateLedgerForm({ groups, onSubmit, isLoading }: { groups: AccountGroup[]; onSubmit: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    account_code: "",
    name: "",
    group_id: "",
    opening_balance: 0,
    opening_balance_type: "debit",
    is_bank_account: false,
    bank_name: "",
    bank_account_number: "",
    ifsc_code: "",
    gstin: "",
    pan_number: "",
    credit_days: 0,
    credit_limit: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      group_id: formData.group_id || null,
      current_balance: formData.opening_balance,
      balance_type: formData.opening_balance_type,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Account Code</Label>
          <Input 
            value={formData.account_code}
            onChange={(e) => setFormData(prev => ({ ...prev, account_code: e.target.value }))}
            placeholder="e.g., 1001"
          />
        </div>

        <div className="space-y-2">
          <Label>Ledger Name</Label>
          <Input 
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Cash in Hand"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Account Group</Label>
        <Select value={formData.group_id} onValueChange={(v) => setFormData(prev => ({ ...prev, group_id: v }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select group" />
          </SelectTrigger>
          <SelectContent>
            {groups.map(g => (
              <SelectItem key={g.id} value={g.id}>{g.name} ({g.nature})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Opening Balance</Label>
          <Input 
            type="number"
            value={formData.opening_balance}
            onChange={(e) => setFormData(prev => ({ ...prev, opening_balance: parseFloat(e.target.value) || 0 }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Balance Type</Label>
          <Select value={formData.opening_balance_type} onValueChange={(v) => setFormData(prev => ({ ...prev, opening_balance_type: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="debit">Debit</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_bank"
          checked={formData.is_bank_account}
          onChange={(e) => setFormData(prev => ({ ...prev, is_bank_account: e.target.checked }))}
        />
        <Label htmlFor="is_bank">This is a Bank Account</Label>
      </div>

      {formData.is_bank_account && (
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label>Bank Name</Label>
            <Input 
              value={formData.bank_name}
              onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Account Number</Label>
            <Input 
              value={formData.bank_account_number}
              onChange={(e) => setFormData(prev => ({ ...prev, bank_account_number: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>IFSC Code</Label>
            <Input 
              value={formData.ifsc_code}
              onChange={(e) => setFormData(prev => ({ ...prev, ifsc_code: e.target.value }))}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>GSTIN</Label>
          <Input 
            value={formData.gstin}
            onChange={(e) => setFormData(prev => ({ ...prev, gstin: e.target.value }))}
            placeholder="22AAAAA0000A1Z5"
          />
        </div>
        <div className="space-y-2">
          <Label>PAN Number</Label>
          <Input 
            value={formData.pan_number}
            onChange={(e) => setFormData(prev => ({ ...prev, pan_number: e.target.value }))}
            placeholder="AAAAA0000A"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Creating..." : "Create Ledger"}
        </Button>
      </div>
    </form>
  );
}
