import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Search, 
  FileCode, 
  Scale,
  AlertCircle,
  Download,
  Filter
} from "lucide-react";

interface SoftwareDependency {
  id: string;
  name: string;
  version: string;
  language: string;
  licenseType: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  status: "approved" | "review" | "rejected";
  usedIn: string;
  notes: string;
  addedAt: string;
}

const LICENSE_RISK: Record<string, { level: "low" | "medium" | "high" | "critical"; description: string }> = {
  "MIT": { level: "low", description: "Permissive, minimal restrictions" },
  "Apache-2.0": { level: "low", description: "Permissive with patent grant" },
  "BSD-3-Clause": { level: "low", description: "Permissive, requires attribution" },
  "BSD-2-Clause": { level: "low", description: "Simplified BSD" },
  "ISC": { level: "low", description: "Permissive, similar to MIT" },
  "MPL-2.0": { level: "medium", description: "Weak copyleft, file-level" },
  "LGPL-3.0": { level: "medium", description: "Weak copyleft for libraries" },
  "LGPL-2.1": { level: "medium", description: "Weak copyleft for libraries" },
  "EPL-2.0": { level: "medium", description: "Eclipse Public License" },
  "GPL-3.0": { level: "high", description: "Strong copyleft, viral" },
  "GPL-2.0": { level: "high", description: "Strong copyleft, viral" },
  "AGPL-3.0": { level: "critical", description: "Network copyleft, very restrictive" },
  "Proprietary": { level: "critical", description: "Commercial license required" },
  "Unknown": { level: "critical", description: "License not identified" },
};


export function SoftwareLicenseCompliance() {
  const { currentTenant } = useTenant();
  const [dependencies, setDependencies] = useState<SoftwareDependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRisk, setFilterRisk] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDep, setNewDep] = useState({
    name: "",
    version: "",
    language: "Java",
    licenseType: "MIT",
    usedIn: "",
    notes: "",
  });

  const loadDependencies = useCallback(async () => {
    if (!currentTenant?.id) {
      setDependencies([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("software_dependencies")
      .select("*")
      .eq("tenant_id", currentTenant.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load dependencies");
      setDependencies([]);
    } else {
      setDependencies(
        (data ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          version: row.version ?? "",
          language: row.language ?? "",
          licenseType: row.license_type ?? "Unknown",
          riskLevel: (row.risk_level ?? "critical") as SoftwareDependency["riskLevel"],
          status: (row.status ?? "review") as SoftwareDependency["status"],
          usedIn: row.used_in ?? "",
          notes: row.notes ?? "",
          addedAt: (row.created_at ?? "").split("T")[0],
        }))
      );
    }
    setLoading(false);
  }, [currentTenant?.id]);

  useEffect(() => {
    loadDependencies();
  }, [loadDependencies]);

  const filteredDeps = dependencies.filter((dep) => {
    const matchesSearch = dep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dep.language.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = filterRisk === "all" || dep.riskLevel === filterRisk;
    const matchesStatus = filterStatus === "all" || dep.status === filterStatus;
    return matchesSearch && matchesRisk && matchesStatus;
  });

  const stats = {
    total: dependencies.length,
    approved: dependencies.filter((d) => d.status === "approved").length,
    review: dependencies.filter((d) => d.status === "review").length,
    rejected: dependencies.filter((d) => d.status === "rejected").length,
    critical: dependencies.filter((d) => d.riskLevel === "critical").length,
    high: dependencies.filter((d) => d.riskLevel === "high").length,
  };

  const handleAddDependency = async () => {
    if (!currentTenant?.id) {
      toast.error("Select an organization first");
      return;
    }
    const riskInfo = LICENSE_RISK[newDep.licenseType] || LICENSE_RISK["Unknown"];
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("software_dependencies").insert({
      tenant_id: currentTenant.id,
      name: newDep.name,
      version: newDep.version,
      language: newDep.language,
      license_type: newDep.licenseType,
      used_in: newDep.usedIn,
      notes: newDep.notes,
      risk_level: riskInfo.level,
      status: riskInfo.level === "critical" || riskInfo.level === "high" ? "review" : "approved",
      created_by: userData.user?.id ?? null,
    });
    if (error) {
      toast.error("Failed to add dependency");
      return;
    }
    setIsAddDialogOpen(false);
    setNewDep({ name: "", version: "", language: "Java", licenseType: "MIT", usedIn: "", notes: "" });
    toast.success("Dependency added successfully");
    loadDependencies();
  };

  const updateStatus = async (id: string, status: "approved" | "review" | "rejected") => {
    const { error } = await supabase.from("software_dependencies").update({ status }).eq("id", id);
    if (error) {
      toast.error("Failed to update status");
      return;
    }
    setDependencies((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
    toast.success(`Status updated to ${status}`);
  };

  const getRiskBadge = (risk: string) => {
    const variants: Record<string, string> = {
      low: "bg-green-500/10 text-green-600 border-green-500/20",
      medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      critical: "bg-red-500/10 text-red-600 border-red-500/20",
    };
    return <Badge variant="outline" className={variants[risk]}>{risk.toUpperCase()}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { icon: React.ReactNode; class: string }> = {
      approved: { icon: <CheckCircle className="w-3 h-3" />, class: "bg-green-500/10 text-green-600" },
      review: { icon: <AlertCircle className="w-3 h-3" />, class: "bg-yellow-500/10 text-yellow-600" },
      rejected: { icon: <XCircle className="w-3 h-3" />, class: "bg-red-500/10 text-red-600" },
    };
    const { icon, class: className } = config[status];
    return (
      <Badge variant="outline" className={`${className} flex items-center gap-1`}>
        {icon} {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Scale className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Software License Compliance</h2>
            <p className="text-sm text-muted-foreground">Track and manage software dependency licenses</p>
          </div>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Dependency
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Software Dependency</DialogTitle>
              <DialogDescription>Track a new software library or package for license compliance</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Package Name</Label>
                  <Input
                    value={newDep.name}
                    onChange={(e) => setNewDep({ ...newDep, name: e.target.value })}
                    placeholder="e.g., spring-boot"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Version</Label>
                  <Input
                    value={newDep.version}
                    onChange={(e) => setNewDep({ ...newDep, version: e.target.value })}
                    placeholder="e.g., 3.2.0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Language/Platform</Label>
                  <Select value={newDep.language} onValueChange={(v) => setNewDep({ ...newDep, language: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Java">Java</SelectItem>
                      <SelectItem value="JavaScript">JavaScript</SelectItem>
                      <SelectItem value="Python">Python</SelectItem>
                      <SelectItem value="Go">Go</SelectItem>
                      <SelectItem value="Rust">Rust</SelectItem>
                      <SelectItem value="C#">C#</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>License Type</Label>
                  <Select value={newDep.licenseType} onValueChange={(v) => setNewDep({ ...newDep, licenseType: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LICENSE_RISK).map(([license, info]) => (
                        <SelectItem key={license} value={license}>
                          <span className="flex items-center gap-2">
                            {license}
                            <span className="text-xs text-muted-foreground">({info.level})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Used In (Project/Module)</Label>
                <Input
                  value={newDep.usedIn}
                  onChange={(e) => setNewDep({ ...newDep, usedIn: e.target.value })}
                  placeholder="e.g., Backend API"
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={newDep.notes}
                  onChange={(e) => setNewDep({ ...newDep, notes: e.target.value })}
                  placeholder="Any compliance notes or exceptions..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddDependency} disabled={!newDep.name || !newDep.version}>
                Add Dependency
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total Dependencies</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-2xl font-bold text-green-600">{stats.approved}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <span className="text-2xl font-bold text-yellow-600">{stats.review}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Under Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-2xl font-bold text-red-600">{stats.rejected}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Rejected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-2xl font-bold text-red-600">{stats.critical}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Critical Risk</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span className="text-2xl font-bold text-orange-600">{stats.high}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">High Risk</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search dependencies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterRisk} onValueChange={setFilterRisk}>
              <SelectTrigger className="w-[150px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risks</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="review">Under Review</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dependencies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Dependencies</CardTitle>
          <CardDescription>Software packages and their license compliance status</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Used In</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    Loading dependencies…
                  </TableCell>
                </TableRow>
              )}
              {!loading && filteredDeps.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    No dependencies tracked yet. Use “Add Dependency” to start your license register.
                  </TableCell>
                </TableRow>
              )}
              {filteredDeps.map((dep) => (

                <TableRow key={dep.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{dep.name}</p>
                      <p className="text-xs text-muted-foreground">v{dep.version}</p>
                    </div>
                  </TableCell>
                  <TableCell>{dep.language}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{dep.licenseType}</p>
                      <p className="text-xs text-muted-foreground">
                        {LICENSE_RISK[dep.licenseType]?.description || "Unknown"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{getRiskBadge(dep.riskLevel)}</TableCell>
                  <TableCell>{getStatusBadge(dep.status)}</TableCell>
                  <TableCell>{dep.usedIn}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {dep.status !== "approved" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(dep.id, "approved")}>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </Button>
                      )}
                      {dep.status !== "rejected" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(dep.id, "rejected")}>
                          <XCircle className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* License Risk Guide */}
      <Card>
        <CardHeader>
          <CardTitle>License Risk Guide</CardTitle>
          <CardDescription>Understanding open-source license types and their implications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
              <h4 className="font-medium text-green-600 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Low Risk (Permissive)
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                MIT, Apache-2.0, BSD - Can use freely in commercial software with minimal restrictions.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
              <h4 className="font-medium text-yellow-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Medium Risk (Weak Copyleft)
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                LGPL, MPL - Can link without copyleft, but modifications must be shared.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
              <h4 className="font-medium text-orange-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> High Risk (Strong Copyleft)
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                GPL - Requires derivative works to also be GPL. May require legal review.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
              <h4 className="font-medium text-red-600 flex items-center gap-2">
                <XCircle className="w-4 h-4" /> Critical Risk
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                AGPL, Proprietary, Unknown - Requires commercial license or cannot be used.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
