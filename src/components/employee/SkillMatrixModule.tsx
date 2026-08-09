import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Search,
  Download,
  Plus,
  Users,
  Award,
  TrendingUp,
  Filter,
  FileSpreadsheet,
  Star,
  Target,
  Zap,
  Trash2,
  Database,
  AlertTriangle,
} from "lucide-react";
import { exportToCSV } from "@/lib/csv-export";

interface Skill {
  id: string;
  name: string;
  category: string;
  level: number; // 1-5
  lastAssessed: string;
  certifications?: string[];
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: string;
  skills: Skill[];
  overallScore: number;
  isDemoData?: boolean;
}


const skillCategories = [
  "Frontend",
  "Backend",
  "DevOps",
  "Security",
  "Cloud",
  "Languages",
  "Database",
  "IaC",
  "Other",
];

const getLevelLabel = (level: number) => {
  switch (level) {
    case 1: return "Beginner";
    case 2: return "Elementary";
    case 3: return "Intermediate";
    case 4: return "Advanced";
    case 5: return "Expert";
    default: return "Unknown";
  }
};

const getLevelColor = (level: number) => {
  switch (level) {
    case 1: return "bg-red-500";
    case 2: return "bg-orange-500";
    case 3: return "bg-yellow-500";
    case 4: return "bg-blue-500";
    case 5: return "bg-green-500";
    default: return "bg-muted";
  }
};

interface SkillMatrixModuleProps {
  viewMode?: "employee" | "hr";
}

type SkillMatrixRow = {
  id: string;
  name: string;
  role: string | null;
  department: string | null;
  skills: unknown;
  overall_score: number | null;
};

function rowToMember(row: SkillMatrixRow): TeamMember {
  const skills = Array.isArray(row.skills) ? (row.skills as Skill[]) : [];
  return {
    id: row.id,
    name: row.name,
    role: row.role ?? "",
    department: row.department ?? "",
    skills,
    overallScore: Number(row.overall_score ?? 0),
  };
}

function computeOverallScore(skills: Skill[]): number {
  if (!skills.length) return 0;
  const avg = skills.reduce((sum, s) => sum + (Number(s.level) || 0), 0) / skills.length;
  return Math.round(avg * 20);
}

export function SkillMatrixModule({ viewMode = "employee" }: SkillMatrixModuleProps) {
  const { currentTenant } = useTenant();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<TeamMember[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Skill matrix now lives in the database (employee_skill_matrix), scoped to
  // the active tenant. localStorage is no longer used as a data store.
  const loadMembers = useCallback(async () => {
    if (!currentTenant?.id) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from("employee_skill_matrix")
      .select("id,name,role,department,skills,overall_score")
      .eq("tenant_id", currentTenant.id)
      .order("name", { ascending: true });
    if (error) {
      console.error("[skill-matrix] load failed", error);
      toast.error("Failed to load skill matrix");
    } else {
      setTeamMembers((data ?? []).map((r) => rowToMember(r as SkillMatrixRow)));
    }
    setIsLoading(false);
  }, [currentTenant?.id]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const hasDemoData = false;
  const demoDataCount = 0;


  // New skill form state
  const [newSkill, setNewSkill] = useState({
    name: "",
    category: "Security",
    level: 3,
  });

  const departments = useMemo(() => 
    [...new Set(teamMembers.map(m => m.department))],
    [teamMembers]
  );

  const allSkills = useMemo(() => {
    const skills = new Map<string, { count: number; avgLevel: number; totalLevel: number }>();
    teamMembers.forEach(member => {
      member.skills.forEach(skill => {
        const existing = skills.get(skill.name);
        if (existing) {
          existing.count++;
          existing.totalLevel += skill.level;
          existing.avgLevel = existing.totalLevel / existing.count;
        } else {
          skills.set(skill.name, { count: 1, avgLevel: skill.level, totalLevel: skill.level });
        }
      });
    });
    return skills;
  }, [teamMembers]);

  const filteredMembers = useMemo(() => {
    return teamMembers.filter(member => {
      const matchesSearch = 
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.skills.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesDepartment = departmentFilter === "all" || member.department === departmentFilter;
      
      const matchesCategory = categoryFilter === "all" || 
        member.skills.some(s => s.category === categoryFilter);
      
      return matchesSearch && matchesDepartment && matchesCategory;
    });
  }, [teamMembers, searchQuery, departmentFilter, categoryFilter]);

  const stats = useMemo(() => ({
    totalMembers: teamMembers.length,
    avgScore: Math.round(teamMembers.reduce((acc, m) => acc + m.overallScore, 0) / teamMembers.length),
    totalSkills: allSkills.size,
    expertsCount: teamMembers.filter(m => m.skills.some(s => s.level === 5)).length,
  }), [teamMembers, allSkills]);

  const handleExport = () => {
    const exportData = filteredMembers.flatMap(member => 
      member.skills.map(skill => ({
        employeeName: member.name,
        role: member.role,
        department: member.department,
        skillName: skill.name,
        category: skill.category,
        proficiencyLevel: getLevelLabel(skill.level),
        levelNumber: skill.level,
        lastAssessed: skill.lastAssessed,
        certifications: skill.certifications?.join(", ") || "",
        overallScore: member.overallScore,
      }))
    );

    const columns = [
      { key: "employeeName" as const, label: "Employee Name" },
      { key: "role" as const, label: "Role" },
      { key: "department" as const, label: "Department" },
      { key: "skillName" as const, label: "Skill Name" },
      { key: "category" as const, label: "Category" },
      { key: "proficiencyLevel" as const, label: "Proficiency Level" },
      { key: "levelNumber" as const, label: "Level (1-5)" },
      { key: "lastAssessed" as const, label: "Last Assessed" },
      { key: "certifications" as const, label: "Certifications" },
      { key: "overallScore" as const, label: "Overall Score" },
    ];

    exportToCSV(exportData, `skill-matrix`, columns);
    toast.success("Skill matrix exported successfully");
  };

  const handleAddSkill = async () => {
    if (!selectedMember || !newSkill.name) return;

    const skills: Skill[] = [
      ...selectedMember.skills,
      {
        id: `s${Date.now()}`,
        name: newSkill.name,
        category: newSkill.category,
        level: newSkill.level,
        lastAssessed: new Date().toISOString().split("T")[0],
      },
    ];

    const { error } = await supabase
      .from("employee_skill_matrix")
      .update({ skills: skills as unknown as never, overall_score: computeOverallScore(skills) })
      .eq("id", selectedMember.id);

    if (error) {
      console.error("[skill-matrix] add skill failed", error);
      toast.error("Failed to save skill");
      return;
    }

    setNewSkill({ name: "", category: "Security", level: 3 });
    setIsAddDialogOpen(false);
    toast.success("Skill added successfully");
    void loadMembers();
  };

  // Removes every skill-matrix row for the active tenant from the database.
  const handleClearDemoData = async () => {
    if (!currentTenant?.id) return;
    const { error } = await supabase
      .from("employee_skill_matrix")
      .delete()
      .eq("tenant_id", currentTenant.id);
    if (error) {
      console.error("[skill-matrix] clear failed", error);
      toast.error("Failed to clear entries");
      return;
    }
    setIsClearDialogOpen(false);
    toast.success("Entries cleared");
    void loadMembers();
  };


  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }
    
    setImportFile(file);
    
    // Parse CSV file
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        // Expected headers: name, role, department, skill_name, category, level
        const nameIdx = headers.findIndex(h => h.includes('name') && !h.includes('skill'));
        const roleIdx = headers.findIndex(h => h.includes('role'));
        const deptIdx = headers.findIndex(h => h.includes('department') || h.includes('dept'));
        const skillNameIdx = headers.findIndex(h => h.includes('skill'));
        const categoryIdx = headers.findIndex(h => h.includes('category'));
        const levelIdx = headers.findIndex(h => h.includes('level'));
        
        if (nameIdx === -1) {
          toast.error("CSV must contain a 'name' column");
          setImportFile(null);
          return;
        }
        
        const membersMap = new Map<string, TeamMember>();
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const name = values[nameIdx];
          if (!name) continue;
          
          const role = roleIdx >= 0 ? values[roleIdx] || "Team Member" : "Team Member";
          const department = deptIdx >= 0 ? values[deptIdx] || "General" : "General";
          const skillName = skillNameIdx >= 0 ? values[skillNameIdx] : "";
          const category = categoryIdx >= 0 ? values[categoryIdx] || "Other" : "Other";
          const level = levelIdx >= 0 ? Math.min(5, Math.max(1, parseInt(values[levelIdx]) || 3)) : 3;
          
          if (!membersMap.has(name)) {
            membersMap.set(name, {
              id: `import-${Date.now()}-${i}`,
              name,
              role,
              department,
              skills: [],
              overallScore: 0,
              isDemoData: false,
            });
          }
          
          const member = membersMap.get(name)!;
          if (skillName) {
            member.skills.push({
              id: `skill-${Date.now()}-${i}`,
              name: skillName,
              category,
              level,
              lastAssessed: new Date().toISOString().split('T')[0],
            });
          }
        }
        
        // Calculate overall scores
        const previewMembers = Array.from(membersMap.values()).map(member => ({
          ...member,
          overallScore: member.skills.length > 0
            ? Math.round((member.skills.reduce((sum, s) => sum + s.level, 0) / (member.skills.length * 5)) * 100)
            : 50,
        }));
        
        setImportPreview(previewMembers);
        toast.success(`Found ${previewMembers.length} employees to import`);
      } catch (error) {
        toast.error("Failed to parse CSV file");
        setImportFile(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImportConfirm = async () => {
    if (importPreview.length === 0) {
      toast.error("No data to import");
      return;
    }
    if (!currentTenant?.id) {
      toast.error("No active workspace");
      return;
    }

    setIsImporting(true);
    const { error } = await supabase.from("employee_skill_matrix").insert(
      importPreview.map((m) => ({
        tenant_id: currentTenant.id,
        name: m.name,
        role: m.role,
        department: m.department,
        skills: m.skills as unknown as never,
        overall_score: computeOverallScore(m.skills),
      })),
    );
    setIsImporting(false);

    if (error) {
      console.error("[skill-matrix] import failed", error);
      toast.error("Failed to import employees");
      return;
    }

    setIsImportDialogOpen(false);
    setImportFile(null);
    setImportPreview([]);
    toast.success(`Successfully imported ${importPreview.length} employees`);
    void loadMembers();
  };


  const handleImportCancel = () => {
    setIsImportDialogOpen(false);
    setImportFile(null);
    setImportPreview([]);
  };

  const downloadImportTemplate = () => {
    const template = `Name,Role,Department,Skill Name,Category,Level
John Doe,Security Engineer,Technical,SIEM Administration,Security,4
John Doe,Security Engineer,Technical,Python,Languages,3
Jane Smith,SOC Analyst,Technical,Log Analysis,Security,5
Jane Smith,SOC Analyst,Technical,Threat Intelligence,Security,4`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'skill-matrix-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Skill Matrix</h2>
          <p className="text-muted-foreground">
            {viewMode === "hr" ? "Manage and track team skills across departments" : "View your team's skill profiles"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasDemoData && (
            <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Demo Data
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Clear Demo Data
                  </DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-muted-foreground">
                    This will remove all {demoDataCount} demo employee entries and their skills. 
                    Real data entries will be preserved. This action cannot be undone.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsClearDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleClearDemoData}>
                    Clear Demo Data
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          {viewMode === "hr" && (
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Import Skill Matrix Data</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={downloadImportTemplate}>
                      <Download className="w-4 h-4 mr-2" />
                      Download Template
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Use this template to format your data
                    </span>
                  </div>
                  
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleImportFileChange}
                      className="hidden"
                      id="skill-import-file"
                    />
                    <label htmlFor="skill-import-file" className="cursor-pointer">
                      <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                      <p className="font-medium">
                        {importFile ? importFile.name : "Click to upload CSV file"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        CSV format with columns: Name, Role, Department, Skill Name, Category, Level
                      </p>
                    </label>
                  </div>
                  
                  {importPreview.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Preview ({importPreview.length} employees)</h4>
                      <div className="max-h-48 overflow-auto border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Department</TableHead>
                              <TableHead>Skills</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {importPreview.slice(0, 5).map((member) => (
                              <TableRow key={member.id}>
                                <TableCell className="font-medium">{member.name}</TableCell>
                                <TableCell>{member.role}</TableCell>
                                <TableCell>{member.department}</TableCell>
                                <TableCell>{member.skills.length} skills</TableCell>
                              </TableRow>
                            ))}
                            {importPreview.length > 5 && (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">
                                  ...and {importPreview.length - 5} more
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleImportCancel}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleImportConfirm} 
                    disabled={importPreview.length === 0 || isImporting}
                  >
                    {isImporting ? "Importing..." : `Import ${importPreview.length} Employees`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Demo Data Notice */}
      {hasDemoData && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <Database className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-600">Demo Data Active</AlertTitle>
          <AlertDescription className="text-amber-600/80">
            This module contains {demoDataCount} sample employees for demonstration purposes. 
            Click "Clear Demo Data" when you're ready to add real employee skills.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalMembers}</p>
                <p className="text-sm text-muted-foreground">Team Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgScore}%</p>
                <p className="text-sm text-muted-foreground">Avg Skill Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalSkills}</p>
                <p className="text-sm text-muted-foreground">Unique Skills</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Award className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expertsCount}</p>
                <p className="text-sm text-muted-foreground">Expert Level</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by name, role, or skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <Target className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {skillCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Skill Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Team Skills Overview</span>
            {hasDemoData && (
              <Badge variant="outline" className="text-amber-600 border-amber-500">
                Contains Demo Data
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead>Score</TableHead>
                {viewMode === "hr" && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id} className={member.isDemoData ? "bg-amber-500/5" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {member.name}
                      {member.isDemoData && (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
                          Demo
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{member.role}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{member.department}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {member.skills.slice(0, 4).map((skill) => (
                        <Badge
                          key={skill.id}
                          variant="secondary"
                          className="text-xs"
                        >
                          <span
                            className={`w-2 h-2 rounded-full mr-1 ${getLevelColor(skill.level)}`}
                          />
                          {skill.name}
                        </Badge>
                      ))}
                      {member.skills.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{member.skills.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={member.overallScore} className="w-16 h-2" />
                      <span className="text-sm font-medium">{member.overallScore}%</span>
                    </div>
                  </TableCell>
                  {viewMode === "hr" && (
                    <TableCell>
                      <Dialog open={isAddDialogOpen && selectedMember?.id === member.id} onOpenChange={(open) => {
                        setIsAddDialogOpen(open);
                        if (open) setSelectedMember(member);
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Skill for {member.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                              <Label>Skill Name</Label>
                              <Input
                                value={newSkill.name}
                                onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                                placeholder="e.g., React, Python, AWS"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Category</Label>
                              <Select
                                value={newSkill.category}
                                onValueChange={(value) => setNewSkill({ ...newSkill, category: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {skillCategories.map((cat) => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Proficiency Level: {getLevelLabel(newSkill.level)}</Label>
                              <div className="flex items-center gap-4">
                                <Slider
                                  value={[newSkill.level]}
                                  onValueChange={(value) => setNewSkill({ ...newSkill, level: value[0] })}
                                  min={1}
                                  max={5}
                                  step={1}
                                  className="flex-1"
                                />
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((level) => (
                                    <Star
                                      key={level}
                                      className={`w-4 h-4 ${level <= newSkill.level ? "text-yellow-500 fill-yellow-500" : "text-muted"}`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <Button onClick={handleAddSkill} className="w-full">
                              Add Skill
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Skill Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Skill Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from(allSkills.entries()).slice(0, 9).map(([skillName, data]) => (
              <div key={skillName} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">{skillName}</p>
                  <p className="text-sm text-muted-foreground">{data.count} team member(s)</p>
                </div>
                <div className="text-right">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <Star
                        key={level}
                        className={`w-3 h-3 ${level <= Math.round(data.avgLevel) ? "text-yellow-500 fill-yellow-500" : "text-muted"}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Avg: {data.avgLevel.toFixed(1)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Level Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 justify-center">
            {[1, 2, 3, 4, 5].map((level) => (
              <div key={level} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${getLevelColor(level)}`} />
                <span className="text-sm">{getLevelLabel(level)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
