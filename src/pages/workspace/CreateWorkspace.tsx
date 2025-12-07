import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function CreateWorkspace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refetchTenants } = useTenant();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData({
      name,
      slug: generateSlug(name),
    });
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      slug: generateSlug(e.target.value),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to create a workspace');
      return;
    }

    if (!formData.name.trim() || !formData.slug.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      // Create the tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          tier: 'starter',
          owner_id: user.id,
        })
        .select()
        .single();

      if (tenantError) {
        if (tenantError.code === '23505') {
          throw new Error('A workspace with this URL already exists. Please choose a different name.');
        }
        throw tenantError;
      }

      // Add the user as an owner member
      const { error: memberError } = await supabase
        .from('tenant_members')
        .insert({
          tenant_id: tenant.id,
          user_id: user.id,
          role: 'owner',
          status: 'active',
        });

      if (memberError) throw memberError;

      toast.success('Workspace created successfully!');
      
      // Refresh tenant list and switch to new tenant
      await refetchTenants();
      navigate('/');
    } catch (error: any) {
      console.error('Error creating workspace:', error);
      toast.error(error.message || 'Failed to create workspace');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">Create a Workspace</CardTitle>
            <CardDescription>
              Set up a new workspace for your team to collaborate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Workspace Name</Label>
                <Input
                  id="name"
                  placeholder="Acme Corporation"
                  value={formData.name}
                  onChange={handleNameChange}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Workspace URL</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">app/</span>
                  <Input
                    id="slug"
                    placeholder="acme-corp"
                    value={formData.slug}
                    onChange={handleSlugChange}
                    disabled={isLoading}
                    required
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This will be your workspace's unique identifier
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Workspace'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
