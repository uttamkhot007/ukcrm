import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { mergeSensitiveDetails, splitSensitiveFields } from "@/lib/employee-sensitive";
import { 
  User, MapPin, Phone, Heart, FileText, Upload, 
  Trash2, Check, X, Shield, Loader2, Building2, Landmark, Wallet, Award
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
  // Bank details
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc_code?: string;
  bank_branch?: string;
  // ESI details
  esi_number?: string;
  esi_dispensary?: string;
  // PF details
  pf_number?: string;
  uan_number?: string;
  // Gratuity details
  gratuity_nomination_name?: string;
  gratuity_nomination_relation?: string;
  gratuity_nomination_percentage?: number;
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

      const { data: sensitive } = await supabase
        .from('employee_sensitive_details')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      return mergeSensitiveDetails(
        data as unknown as Record<string, unknown>,
        sensitive as Record<string, unknown> | null,
      );
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
      const { profile: profileUpdates, sensitive } = splitSensitiveFields(
        updates as Record<string, unknown>,
      );

      if (Object.keys(profileUpdates).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', user.id);
        if (error) throw error;
      }

      if (Object.keys(sensitive).length > 0) {
        const { error: sensitiveError } = await supabase
          .from('employee_sensitive_details')
          .upsert(
            { user_id: user.id, ...sensitive },
            { onConflict: 'user_id' },
          );
        if (sensitiveError) throw sensitiveError;
      }
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
      bio: profile?.bio || '',
      bank_name: profile?.bank_name || '',
      bank_account_number: profile?.bank_account_number || '',
      bank_ifsc_code: profile?.bank_ifsc_code || '',
      bank_branch: profile?.bank_branch || '',
      esi_number: profile?.esi_number || '',
      esi_dispensary: profile?.esi_dispensary || '',
      pf_number: profile?.pf_number || '',
      uan_number: profile?.uan_number || '',
      gratuity_nomination_name: profile?.gratuity_nomination_name || '',
      gratuity_nomination_relation: profile?.gratuity_nomination_relation || '',
      gratuity_nomination_percentage: profile?.gratuity_nomination_percentage || 100
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
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Address
          </TabsTrigger>
          <TabsTrigger value="emergency" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Emergency
          </TabsTrigger>
          <TabsTrigger value="bank" className="flex items-center gap-2">
            <Landmark className="w-4 h-4" />
            Bank
          </TabsTrigger>
          <TabsTrigger value="statutory" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            ESI & PF
          </TabsTrigger>
          <TabsTrigger value="gratuity" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Gratuity
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Documents
          </TabsTrigger>
        </TabsList>

        {/* Address Tab */}
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

        {/* Emergency Contact Tab */}
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

        {/* Bank Details Tab */}
        <TabsContent value="bank" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="w-5 h-5" />
                Bank Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Bank Name</Label>
                      <Input 
                        value={editForm.bank_name || ''} 
                        onChange={(e) => setEditForm(prev => ({...prev, bank_name: e.target.value}))}
                        placeholder="e.g., HDFC Bank, ICICI Bank"
                      />
                    </div>
                    <div>
                      <Label>Branch</Label>
                      <Input 
                        value={editForm.bank_branch || ''} 
                        onChange={(e) => setEditForm(prev => ({...prev, bank_branch: e.target.value}))}
                        placeholder="Branch name"
                      />
                    </div>
                    <div>
                      <Label>Account Number</Label>
                      <Input 
                        value={editForm.bank_account_number || ''} 
                        onChange={(e) => setEditForm(prev => ({...prev, bank_account_number: e.target.value}))}
                        placeholder="Account number"
                      />
                    </div>
                    <div>
                      <Label>IFSC Code</Label>
                      <Input 
                        value={editForm.bank_ifsc_code || ''} 
                        onChange={(e) => setEditForm(prev => ({...prev, bank_ifsc_code: e.target.value.toUpperCase()}))}
                        placeholder="e.g., HDFC0001234"
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Bank Name</p>
                    <p className="font-medium">{profile?.bank_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Branch</p>
                    <p className="font-medium">{profile?.bank_branch || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Account Number</p>
                    <p className="font-medium">
                      {profile?.bank_account_number 
                        ? `****${profile.bank_account_number.slice(-4)}` 
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">IFSC Code</p>
                    <p className="font-medium">{profile?.bank_ifsc_code || '-'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ESI & PF Tab */}
        <TabsContent value="statutory" className="space-y-4 mt-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  ESI Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>ESI Number</Label>
                        <Input 
                          value={editForm.esi_number || ''} 
                          onChange={(e) => setEditForm(prev => ({...prev, esi_number: e.target.value}))}
                          placeholder="ESI Insurance Number"
                        />
                      </div>
                      <div>
                        <Label>ESI Dispensary</Label>
                        <Input 
                          value={editForm.esi_dispensary || ''} 
                          onChange={(e) => setEditForm(prev => ({...prev, esi_dispensary: e.target.value}))}
                          placeholder="Dispensary name/location"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">ESI Number</p>
                      <p className="font-medium">{profile?.esi_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ESI Dispensary</p>
                      <p className="font-medium">{profile?.esi_dispensary || '-'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Provident Fund Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>PF Number</Label>
                        <Input 
                          value={editForm.pf_number || ''} 
                          onChange={(e) => setEditForm(prev => ({...prev, pf_number: e.target.value}))}
                          placeholder="PF Account Number"
                        />
                      </div>
                      <div>
                        <Label>UAN Number</Label>
                        <Input 
                          value={editForm.uan_number || ''} 
                          onChange={(e) => setEditForm(prev => ({...prev, uan_number: e.target.value}))}
                          placeholder="Universal Account Number"
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">PF Number</p>
                      <p className="font-medium">{profile?.pf_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">UAN Number</p>
                      <p className="font-medium">{profile?.uan_number || '-'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Gratuity Tab */}
        <TabsContent value="gratuity" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Gratuity Nomination Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Nominee Name</Label>
                      <Input 
                        value={editForm.gratuity_nomination_name || ''} 
                        onChange={(e) => setEditForm(prev => ({...prev, gratuity_nomination_name: e.target.value}))}
                        placeholder="Full name of nominee"
                      />
                    </div>
                    <div>
                      <Label>Relationship</Label>
                      <Input 
                        value={editForm.gratuity_nomination_relation || ''} 
                        onChange={(e) => setEditForm(prev => ({...prev, gratuity_nomination_relation: e.target.value}))}
                        placeholder="e.g., Spouse, Son, Daughter"
                      />
                    </div>
                    <div>
                      <Label>Percentage (%)</Label>
                      <Input 
                        type="number"
                        min="0"
                        max="100"
                        value={editForm.gratuity_nomination_percentage || 100} 
                        onChange={(e) => setEditForm(prev => ({...prev, gratuity_nomination_percentage: Number(e.target.value)}))}
                        placeholder="100"
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
                    <p className="text-sm text-muted-foreground">Nominee Name</p>
                    <p className="font-medium">{profile?.gratuity_nomination_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Relationship</p>
                    <p className="font-medium">{profile?.gratuity_nomination_relation || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Percentage</p>
                    <p className="font-medium">{profile?.gratuity_nomination_percentage || 100}%</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
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
