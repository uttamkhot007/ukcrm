import { useState, useMemo } from "react";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
}

// Sample data - in production this would come from Supabase
const sampleTeamMembers: TeamMember[] = [
  {
    id: "1",
    name: "John Smith",
    role: "Senior Developer",
    department: "Engineering",
    overallScore: 85,
    skills: [
      { id: "s1", name: "React", category: "Frontend", level: 5, lastAssessed: "2024-01-15", certifications: ["Meta React Certificate"] },
      { id: "s2", name: "TypeScript", category: "Languages", level: 4, lastAssessed: "2024-01-15" },
      { id: "s3", name: "Node.js", category: "Backend", level: 4, lastAssessed: "2024-01-10" },
      { id: "s4", name: "AWS", category: "Cloud", level: 3, lastAssessed: "2024-01-05" },
    ],
  },
  {
    id: "2",
    name: "Sarah Johnson",
    role: "DevOps Engineer",
    department: "Infrastructure",
    overallScore: 78,
    skills: [
      { id: "s5", name: "Kubernetes", category: "DevOps", level: 5, lastAssessed: "2024-01-12", certifications: ["CKA"] },
      { id: "s6", name: "Docker", category: "DevOps", level: 5, lastAssessed: "2024-01-12" },
      { id: "s7", name: "Terraform", category: "IaC", level: 4, lastAssessed: "2024-01-08" },
      { id: "s8", name: "Python", category: "Languages", level: 3, lastAssessed: "2024-01-05" },
    ],
  },
  {
    id: "3",
    name: "Mike Chen",
    role: "Security Analyst",
    department: "Security",
    overallScore: 82,
    skills: [
      { id: "s9", name: "Penetration Testing", category: "Security", level: 4, lastAssessed: "2024-01-14", certifications: ["CEH", "OSCP"] },
      { id: "s10", name: "SIEM", category: "Security", level: 4, lastAssessed: "2024-01-14" },
      { id: "s11", name: "Incident Response", category: "Security", level: 5, lastAssessed: "2024-01-10" },
      { id: "s12", name: "Python", category: "Languages", level: 3, lastAssessed: "2024-01-05" },
    ],
  },
];

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

export function SkillMatrixModule({ viewMode = "employee" }: SkillMatrixModuleProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(sampleTeamMembers);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // New skill form state
  const [newSkill, setNewSkill] = useState({
    name: "",
    category: "Frontend",
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

  const handleAddSkill = () => {
    if (!selectedMember || !newSkill.name) return;

    const updatedMembers = teamMembers.map(member => {
      if (member.id === selectedMember.id) {
        return {
          ...member,
          skills: [
            ...member.skills,
            {
              id: `s${Date.now()}`,
              name: newSkill.name,
              category: newSkill.category,
              level: newSkill.level,
              lastAssessed: new Date().toISOString().split('T')[0],
            },
          ],
        };
      }
      return member;
    });

    setTeamMembers(updatedMembers);
    setNewSkill({ name: "", category: "Frontend", level: 3 });
    setIsAddDialogOpen(false);
    toast.success("Skill added successfully");
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          {viewMode === "hr" && (
            <Button variant="outline">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Import
            </Button>
          )}
        </div>
      </div>

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
          <CardTitle>Team Skills Overview</CardTitle>
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
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
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
