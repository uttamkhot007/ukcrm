import { useState } from 'react';
import { Check, ChevronsUpDown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTenant, Tenant } from '@/contexts/TenantContext';

export function SuperAdminTenantSwitcher() {
  const [open, setOpen] = useState(false);
  const { currentTenant, tenantMemberships, switchTenant, isSuperAdmin } = useTenant();

  if (!isSuperAdmin) {
    return null;
  }

  const handleSelectTenant = async (tenant: Tenant) => {
    try {
      await switchTenant(tenant.id);
      setOpen(false);
    } catch (error) {
      console.error('Failed to switch workspace:', error);
    }
  };

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return 'default';
      case 'professional':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a workspace"
          className="min-w-[200px] justify-between gap-2 bg-background border-border"
        >
          {currentTenant ? (
            <div className="flex items-center gap-2 truncate">
              <Avatar className="h-5 w-5">
                <AvatarImage src={currentTenant.logo_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                  {getInitials(currentTenant.branding?.display_name || currentTenant.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm">
                {currentTenant.branding?.display_name || currentTenant.name}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span className="text-sm">Select Workspace</span>
            </div>
          )}
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 bg-popover border-border z-[60]" align="end">
        <Command className="bg-popover">
          <CommandInput placeholder="Search all workspaces..." className="border-0" />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No workspace found.</CommandEmpty>
            <CommandGroup heading="All Workspaces">
              {tenantMemberships.map((membership) => (
                <CommandItem
                  key={membership.tenant_id}
                  onSelect={() => handleSelectTenant(membership.tenant)}
                  className="cursor-pointer py-2"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={membership.tenant.logo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(membership.tenant.branding?.display_name || membership.tenant.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-sm font-medium">
                        {membership.tenant.branding?.display_name || membership.tenant.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {membership.tenant.slug}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={getTierBadgeVariant(membership.tenant.tier)} className="text-xs capitalize">
                      {membership.tenant.tier}
                    </Badge>
                    {currentTenant?.id === membership.tenant_id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
