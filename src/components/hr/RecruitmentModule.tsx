import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Briefcase, Users, UserCheck, Clock, Search, Edit, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface JobPosting {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  experience_level: string | null;
  description: string;
  status: string;
  applications_count: number;
  created_at: string;
}

interface Applicant {
  id: string;
  applicant_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  current_stage: string;
  rating: number | null;
  source: string | null;
  created_at: string;
  job_id: string;
  job_postings?: { title: string };
}

const stageColors: Record<string, string> = {
  applied: "bg-blue-500",
  screening: "bg-yellow-500",
  interview: "bg-purple-500",
  offer: "bg-green-500",
  hired: "bg-emerald-600",
  rejected: "bg-red-500",
};

export function RecruitmentModule() {
  const [activeTab, setActiveTab] = useState("jobs");
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [jobFormData, setJobFormData] = useState({
    title: "",
    department: "",
    location: "",
    employment_type: "full-time",
    experience_level: "mid",
    description: "",
    requirements: "",
    benefits: "",
    salary_min: "",
    salary_max: "",
  });

  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["job-postings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_postings").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as JobPosting[];
    },
  });

  const { data: applicants = [], isLoading: applicantsLoading } = useQuery({
    queryKey: ["job-applicants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applicants")
        .select("*, job_postings(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Applicant[];
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (data: typeof jobFormData) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("job_postings").insert({
        title: data.title,
        department: data.department || null,
        location: data.location || null,
        employment_type: data.employment_type,
        experience_level: data.experience_level,
        description: data.description,
        requirements: data.requirements || null,
        benefits: data.benefits || null,
        salary_min: data.salary_min ? parseFloat(data.salary_min) : null,
        salary_max: data.salary_max ? parseFloat(data.salary_max) : null,
        created_by: user.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-postings"] });
      setIsJobDialogOpen(false);
      resetJobForm();
      toast.success("Job posting created successfully");
    },
    onError: () => toast.error("Failed to create job posting"),
  });

  const updateApplicantStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase
        .from("job_applicants")
        .update({ current_stage: stage, stage_updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-applicants"] });
      toast.success("Applicant stage updated");
    },
    onError: () => toast.error("Failed to update stage"),
  });

  const resetJobForm = () => {
    setJobFormData({
      title: "", department: "", location: "", employment_type: "full-time", experience_level: "mid",
      description: "", requirements: "", benefits: "", salary_min: "", salary_max: "",
    });
  };

  const openJobs = jobs.filter((j) => j.status === "open").length;
  const totalApplicants = applicants.length;
  const inInterview = applicants.filter((a) => a.current_stage === "interview").length;
  const hired = applicants.filter((a) => a.current_stage === "hired").length;

  const filteredApplicants = applicants.filter(
    (a) =>
      a.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isLoading = jobsLoading || applicantsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Recruitment</h2>
          <p className="text-muted-foreground">Manage job postings and applicants</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{openJobs}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applicants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalApplicants}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Interview</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{inInterview}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hired</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{hired}</div></CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="jobs">Job Postings</TabsTrigger>
            <TabsTrigger value="applicants">Applicants</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          </TabsList>
          {activeTab === "jobs" && (
            <Dialog open={isJobDialogOpen} onOpenChange={setIsJobDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />New Job</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Job Posting</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createJobMutation.mutate(jobFormData); }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Job Title *</Label>
                      <Input value={jobFormData.title} onChange={(e) => setJobFormData({ ...jobFormData, title: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Input value={jobFormData.department} onChange={(e) => setJobFormData({ ...jobFormData, department: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input value={jobFormData.location} onChange={(e) => setJobFormData({ ...jobFormData, location: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Employment Type</Label>
                      <Select value={jobFormData.employment_type} onValueChange={(v) => setJobFormData({ ...jobFormData, employment_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full-time">Full-time</SelectItem>
                          <SelectItem value="part-time">Part-time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="internship">Internship</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Experience Level</Label>
                      <Select value={jobFormData.experience_level} onValueChange={(v) => setJobFormData({ ...jobFormData, experience_level: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entry">Entry Level</SelectItem>
                          <SelectItem value="mid">Mid Level</SelectItem>
                          <SelectItem value="senior">Senior</SelectItem>
                          <SelectItem value="executive">Executive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description *</Label>
                    <Textarea value={jobFormData.description} onChange={(e) => setJobFormData({ ...jobFormData, description: e.target.value })} rows={4} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Requirements</Label>
                    <Textarea value={jobFormData.requirements} onChange={(e) => setJobFormData({ ...jobFormData, requirements: e.target.value })} rows={3} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsJobDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={createJobMutation.isPending}>Create</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <TabsContent value="jobs" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Position</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Applicants</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.title}</TableCell>
                      <TableCell>{job.department || "-"}</TableCell>
                      <TableCell>{job.location || "Remote"}</TableCell>
                      <TableCell><Badge variant="outline">{job.employment_type}</Badge></TableCell>
                      <TableCell>{job.applications_count}</TableCell>
                      <TableCell><Badge variant={job.status === "open" ? "default" : "secondary"}>{job.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applicants" className="mt-4">
          <Card>
            <CardHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search applicants..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplicants.map((applicant) => (
                    <TableRow key={applicant.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{applicant.first_name} {applicant.last_name}</p>
                          <p className="text-sm text-muted-foreground">{applicant.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{applicant.job_postings?.title || "-"}</TableCell>
                      <TableCell>
                        <Select
                          value={applicant.current_stage}
                          onValueChange={(stage) => updateApplicantStageMutation.mutate({ id: applicant.id, stage })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="applied">Applied</SelectItem>
                            <SelectItem value="screening">Screening</SelectItem>
                            <SelectItem value="interview">Interview</SelectItem>
                            <SelectItem value="offer">Offer</SelectItem>
                            <SelectItem value="hired">Hired</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Badge variant="outline">{applicant.source || "Direct"}</Badge></TableCell>
                      <TableCell>{format(new Date(applicant.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline" className="mt-4">
          <div className="grid grid-cols-6 gap-4">
            {["applied", "screening", "interview", "offer", "hired", "rejected"].map((stage) => {
              const stageApplicants = applicants.filter((a) => a.current_stage === stage);
              return (
                <Card key={stage}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${stageColors[stage]}`} />
                      {stage.charAt(0).toUpperCase() + stage.slice(1)}
                      <Badge variant="secondary" className="ml-auto">{stageApplicants.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {stageApplicants.slice(0, 5).map((applicant) => (
                      <div key={applicant.id} className="p-2 bg-muted rounded-md">
                        <p className="text-sm font-medium">{applicant.first_name} {applicant.last_name}</p>
                        <p className="text-xs text-muted-foreground">{applicant.job_postings?.title}</p>
                      </div>
                    ))}
                    {stageApplicants.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center">+{stageApplicants.length - 5} more</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
