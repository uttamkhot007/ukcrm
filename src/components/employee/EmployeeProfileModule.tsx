import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  User, MapPin, Phone, Heart, FileText, Upload, 
  Trash2, Check, X, Shield, Loader2 
} from "lucide-react";

interface ProfileData {
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  hobbies?: string[];
  bio?: string;
}

interface EmployeeDocument {
  id: string;
  document_type: string;
  title: string;
  description?: string;
  file_name?: string;
  file_url?: string;
  is_verified: boolean;
  created_at: string;
}

export function EmployeeProfileModule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("personal");
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editForm, setEditForm] = useState<ProfileData>({});
  const [newHobby, setNewHobby] = useState("");

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['employee-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ['employee-documents', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as EmployeeDocument[];
    },
    enabled: !!user?.id
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: ProfileData) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-profile'] });
      toast.success("Profile updated successfully");
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error("Failed to update profile: " + error.message);
    }
  });

  const uploadDocument = async (file: File, documentType: string, title: string) => {
    if (!user?.id) return;
    setUploading(true);

    try {
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('employee-documents')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('employee_documents')
        .insert({
          user_id: user.id,
          document_type: documentType,
          title: title,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          uploaded_by: user.id
        });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ['employee-documents'] });
      toast.success("Document uploaded successfully");
    } catch (error: any) {
      toast.error("Failed to upload document: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase
        .from('employee_documents')
        .delete()
        .eq('id', docId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents'] });
      toast.success("Document deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete document: " + error.message);
    }
  });

  const handleEditStart = () => {
    setEditForm({
      address: profile?.address || '',
      city: profile?.city || '',
      state: profile?.state || '',
      postal_code: profile?.postal_code || '',
      country: profile?.country || '',
      emergency_contact_name: profile?.emergency_contact_name || '',
      emergency_contact_phone: profile?.emergency_contact_phone || '',
      emergency_contact_relation: profile?.emergency_contact_relation || '',
      hobbies: profile?.hobbies || [],
      bio: profile?.bio || ''
    });
    setIsEditing(true);
  };

  const handleAddHobby = () => {
    if (newHobby.trim()) {
      setEditForm(prev => ({
        ...prev,
        hobbies: [...(prev.hobbies || []), newHobby.trim()]
      }));
      setNewHobby("");
    }
  };

  const handleRemoveHobby = (index: number) => {
    setEditForm(prev => ({
      ...prev,
      hobbies: prev.hobbies?.filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const title = docType === 'cv' ? 'Resume/CV' : 
                   docType === 'certificate' ? 'Certificate' : 
                   docType === 'id_proof' ? 'ID Proof' : 'Document';
      uploadDocument(file, docType, title);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">My Profile</h2>
            <p className="text-muted-foreground text-sm">
              Manage your personal information and documents
            </p>
          </div>
        </div>
        {!isEditing && (
          <Button onClick={handleEditStart}>Edit Profile</Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Address
          </TabsTrigger>
          <TabsTrigger value="emergency" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Emergency
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label>Street Address</Label>
                      <Input 
                        value={editForm.address || ''} 
                        onChange={(e) => setEditForm(prev => ({...prev, address: e.target.value}))}
                        placeholder="Enter street address"
                      />
                    </div>
                    <div>
                      <Label>City</Label>
                      <Input 
                        value={editForm.city || ''} 
                        onChange={(e) => setEditForm(prev => ({...prev, city: e.target.value}))}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <Label>State/Province</Label>
                      <Input 
                        value={editForm.state || ''} 
                        onChange={(e) => setEditForm(prev => ({...prev, state: e.target.value}))}
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <Label>Postal Code</Label>
                      <Input 
                        value={editForm.postal_code || ''} 
                        onChange={(e) => setEditForm(prev => ({...prev, postal_code: e.target.value}))}
                        placeholder="Postal code"
                      />
                    </div>
                    <div>
                      <Label>Country</Label>
                      <Input 
                        value={editForm.country || ''} 
                        onChange={(e) => setEditForm(prev => ({...prev, country: e.target.value}))}
                        placeholder="Country"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Bio</Label>
                    <Textarea 
                      value={editForm.bio || ''} 
                      onChange={(e) => setEditForm(prev => ({...prev, bio: e.target.value}))}
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      Hobbies & Interests
                    </Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {editForm.hobbies?.map((hobby, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {hobby}
                          <X 
                            className="w-3 h-3 cursor-pointer" 
                            onClick={() => handleRemoveHobby(index)}
                          />
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Input 
                        value={newHobby}
                        onChange={(e) => setNewHobby(e.target.value)}
                        placeholder="Add a hobby..."
                        onKeyPress={(e) => e.key === 'Enter' && handleAddHobby()}
                      />
                      <Button type="button" variant="outline" onClick={handleAddHobby}>
                        Add
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => updateProfile.mutate(editForm)}>
                      Save Changes
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Street Address</p>
                      <p className="font-medium">{profile?.address || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">City</p>
                      <p className="font-medium">{profile?.city || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">State/Province</p>
                      <p className="font-medium">{profile?.state || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Postal Code</p>
                      <p className="font-medium">{profile?.postal_code || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Country</p>
                      <p className="font-medium">{profile?.country || '-'}</p>
                    </div>
                  </div>
                  {profile?.bio && (
                    <div>
                      <p className="text-sm text-muted-foreground">Bio</p>
                      <p className="font-medium">{profile.bio}</p>
                    </div>
                  )}
                  {profile?.hobbies && profile.hobbies.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Hobbies & Interests</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.hobbies.map((hobby: string, index: number) => (
                          <Badge key={index} variant="secondary">{hobby}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emergency" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label>Contact Name</Label>
                      <Input 
                        value={editForm.emergency_contact_name || ''} 
                        onChange={(e) => setEditForm(prev => ({...prev, emergency_contact_name: e.target.value}))}
                        placeholder="Emergency contact name"
                      />
                    </div>
                    <div>
                      <Label>Phone Number</Label>
                      <Input 
                        value={editForm.emergency_contact_phone || ''} 
                        onChange={(e) => setEditForm(prev => ({...prev, emergency_contact_phone: e.target.value}))}
                        placeholder="Phone number"
                      />
                    </div>
                    <div>
                      <Label>Relationship</Label>
                      <Input 
                        value={editForm.emergency_contact_relation || ''} 
                        onChange={(e) => setEditForm(prev => ({...prev, emergency_contact_relation: e.target.value}))}
                        placeholder="e.g., Spouse, Parent, Sibling"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => updateProfile.mutate(editForm)}>
                      Save Changes
                    </Button>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Contact Name</p>
                    <p className="font-medium">{profile?.emergency_contact_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone Number</p>
                    <p className="font-medium">{profile?.emergency_contact_phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Relationship</p>
                    <p className="font-medium">{profile?.emergency_contact_relation || '-'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                  <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium mb-2">Resume/CV</p>
                  <label className="cursor-pointer">
                    <Input 
                      type="file" 
                      className="hidden" 
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => handleFileUpload(e, 'cv')}
                      disabled={uploading}
                    />
                    <Button variant="outline" size="sm" asChild>
                      <span>{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload'}</span>
                    </Button>
                  </label>
                </div>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                  <Shield className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium mb-2">Certificates</p>
                  <label className="cursor-pointer">
                    <Input 
                      type="file" 
                      className="hidden" 
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, 'certificate')}
                      disabled={uploading}
                    />
                    <Button variant="outline" size="sm" asChild>
                      <span>{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload'}</span>
                    </Button>
                  </label>
                </div>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                  <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium mb-2">ID Proof</p>
                  <label className="cursor-pointer">
                    <Input 
                      type="file" 
                      className="hidden" 
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, 'id_proof')}
                      disabled={uploading}
                    />
                    <Button variant="outline" size="sm" asChild>
                      <span>{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload'}</span>
                    </Button>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                My Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {docsLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : documents && documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          <p className="text-sm text-muted-foreground">{doc.file_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.is_verified ? (
                          <Badge variant="default" className="bg-green-500">
                            <Check className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                        {doc.file_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              View
                            </a>
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteDocument.mutate(doc.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No documents uploaded yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}