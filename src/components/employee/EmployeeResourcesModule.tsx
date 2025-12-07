import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  GraduationCap, 
  FileText, 
  BookOpen, 
  FileUser, 
  Download,
  Search,
  ExternalLink,
  Calendar,
  Clock,
  CheckCircle2,
  Upload,
  Award
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function EmployeeResourcesModule() {
  const [activeTab, setActiveTab] = useState("trainings");
  const [searchQuery, setSearchQuery] = useState("");
  const { profile } = useAuth();

  // Mock data - in production, fetch from database
  const trainings = [
    { 
      id: 1, 
      title: "Leadership Excellence Program", 
      type: "mandatory", 
      duration: "8 hours",
      dueDate: "2024-12-31",
      status: "in-progress",
      progress: 60,
      provider: "LinkedIn Learning"
    },
    { 
      id: 2, 
      title: "Cybersecurity Awareness", 
      type: "mandatory", 
      duration: "2 hours",
      dueDate: "2024-11-30",
      status: "completed",
      progress: 100,
      provider: "Internal"
    },
    { 
      id: 3, 
      title: "Advanced Excel & Data Analysis", 
      type: "optional", 
      duration: "6 hours",
      dueDate: null,
      status: "not-started",
      progress: 0,
      provider: "Coursera"
    },
    { 
      id: 4, 
      title: "Communication Skills Masterclass", 
      type: "recommended", 
      duration: "4 hours",
      dueDate: null,
      status: "not-started",
      progress: 0,
      provider: "Udemy"
    },
  ];

  const documents = [
    { id: 1, name: "Offer Letter", category: "employment", uploadDate: "2023-06-15", fileType: "pdf" },
    { id: 2, name: "Salary Revision Letter - 2024", category: "employment", uploadDate: "2024-04-01", fileType: "pdf" },
    { id: 3, name: "Tax Declaration Form", category: "tax", uploadDate: "2024-01-15", fileType: "pdf" },
    { id: 4, name: "Form 16 - FY 2023-24", category: "tax", uploadDate: "2024-06-30", fileType: "pdf" },
    { id: 5, name: "ID Card Copy", category: "personal", uploadDate: "2023-06-20", fileType: "pdf" },
  ];

  const policies = [
    { id: 1, title: "Employee Handbook 2024", category: "general", lastUpdated: "2024-01-01", version: "5.0" },
    { id: 2, title: "Leave Policy", category: "hr", lastUpdated: "2024-03-15", version: "3.2" },
    { id: 3, title: "Work From Home Policy", category: "hr", lastUpdated: "2024-02-01", version: "2.1" },
    { id: 4, title: "Code of Conduct", category: "compliance", lastUpdated: "2024-01-01", version: "4.0" },
    { id: 5, title: "IT Security Policy", category: "it", lastUpdated: "2024-06-01", version: "3.0" },
    { id: 6, title: "Travel & Expense Policy", category: "finance", lastUpdated: "2024-04-01", version: "2.5" },
    { id: 7, title: "Anti-Harassment Policy", category: "compliance", lastUpdated: "2024-01-01", version: "2.0" },
  ];

  const certifications = [
    { id: 1, name: "AWS Solutions Architect", issuer: "Amazon Web Services", issueDate: "2023-08-15", expiryDate: "2026-08-15", status: "active" },
    { id: 2, name: "PMP Certification", issuer: "PMI", issueDate: "2022-05-20", expiryDate: "2025-05-20", status: "active" },
    { id: 3, name: "Google Analytics", issuer: "Google", issueDate: "2024-01-10", expiryDate: null, status: "active" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "active":
        return "bg-green-500/10 text-green-500";
      case "in-progress":
        return "bg-blue-500/10 text-blue-500";
      case "expired":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "hr":
        return "bg-purple-500/10 text-purple-500";
      case "it":
        return "bg-blue-500/10 text-blue-500";
      case "finance":
        return "bg-green-500/10 text-green-500";
      case "compliance":
        return "bg-orange-500/10 text-orange-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Resources & Documents</h1>
          <p className="text-muted-foreground">
            Access trainings, documents, policies, and certifications
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="trainings" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Trainings
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Policies
          </TabsTrigger>
          <TabsTrigger value="certifications" className="flex items-center gap-2">
            <FileUser className="h-4 w-4" />
            CV & Certs
          </TabsTrigger>
        </TabsList>

        {/* Trainings Tab */}
        <TabsContent value="trainings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trainings.map((training) => (
              <Card key={training.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{training.title}</CardTitle>
                      <CardDescription>{training.provider}</CardDescription>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={training.type === "mandatory" ? "border-destructive text-destructive" : ""}
                    >
                      {training.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {training.duration}
                    </span>
                    {training.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due: {new Date(training.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{training.progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${training.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <Badge className={getStatusColor(training.status)}>
                      {training.status.replace("-", " ")}
                    </Badge>
                    <Button size="sm" variant="outline">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      {training.status === "completed" ? "Review" : "Continue"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>My Documents</CardTitle>
                  <CardDescription>Employment and tax related documents</CardDescription>
                </div>
                <Button size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{doc.category}</Badge>
                      <Button size="icon" variant="ghost">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Policies</CardTitle>
              <CardDescription>Important policies and guidelines to follow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {policies.map((policy) => (
                  <div key={policy.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{policy.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Version {policy.version} • Updated: {new Date(policy.lastUpdated).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getCategoryColor(policy.category)}>
                        {policy.category}
                      </Badge>
                      <Button size="icon" variant="ghost">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CV & Certifications Tab */}
        <TabsContent value="certifications" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>My Certifications</CardTitle>
                    <CardDescription>Professional certifications and credentials</CardDescription>
                  </div>
                  <Button size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Add Certificate
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {certifications.map((cert) => (
                    <div key={cert.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-amber-500/10 rounded">
                            <Award className="h-5 w-5 text-amber-500" />
                          </div>
                          <div>
                            <p className="font-medium">{cert.name}</p>
                            <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span>Issued: {new Date(cert.issueDate).toLocaleDateString()}</span>
                              {cert.expiryDate && (
                                <span>Expires: {new Date(cert.expiryDate).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge className={getStatusColor(cert.status)}>{cert.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>My Resume / CV</CardTitle>
                    <CardDescription>Keep your profile updated</CardDescription>
                  </div>
                  <Button size="sm" variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Update CV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <FileUser className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload your latest resume to keep your profile updated
                  </p>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Resume
                  </Button>
                </div>
                <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Current CV: Resume_2024.pdf</span>
                  </div>
                  <Button size="sm" variant="ghost">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}