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
  Upload,
  Award,
  Inbox,
  CheckCircle2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";

const EmptyState = ({ icon: Icon, title, description, action }: { icon: any; title: string; description: string; action?: React.ReactNode }) => (
  <Card>
    <CardContent className="p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">{description}</p>
      {action}
    </CardContent>
  </Card>
);

export function EmployeeResourcesModule() {
  const [activeTab, setActiveTab] = useState("trainings");
  const [searchQuery, setSearchQuery] = useState("");
  const { profile } = useAuth();
  const { currentTenant } = useTenant();

  // Fetch employee documents from storage
  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ["employee-documents", profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      const { data, error } = await supabase.storage
        .from("employee-documents")
        .list(profile.user_id, { limit: 50 });
      if (error) return [];
      return data || [];
    },
    enabled: !!profile?.user_id,
  });

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

        <TabsContent value="trainings" className="space-y-4">
          <EmptyState
            icon={GraduationCap}
            title="No trainings assigned"
            description="Mandatory and optional training courses will appear here when assigned by your manager or HR team."
          />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          {documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents uploaded"
              description="Your employment documents like offer letters, tax forms, and ID copies will appear here."
              action={
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              }
            />
          ) : (
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
                    <div key={doc.name} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded: {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <EmptyState
            icon={BookOpen}
            title="No policies published"
            description="Company policies and guidelines will be available here once published by the administration team."
          />
        </TabsContent>

        <TabsContent value="certifications" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EmptyState
              icon={Award}
              title="No certifications added"
              description="Add your professional certifications and credentials to keep your profile up to date."
              action={
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Add Certificate
                </Button>
              }
            />

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>My Resume / CV</CardTitle>
                    <CardDescription>Keep your profile updated</CardDescription>
                  </div>
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
