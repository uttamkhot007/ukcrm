import { useState } from 'react';
import { Check, ChevronsUpDown, Building2, Plus, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTenant, Tenant } from '@/contexts/TenantContext';
import { useNavigate } from 'react-router-dom';

interface TenantSwitcherProps {
  collapsed?: boolean;
}

export function TenantSwitcher({ collapsed = false }: TenantSwitcherProps) {
  const [open, setOpen] = useState(false);
  const { currentTenant, tenantMemberships, switchTenant, isAdmin, isSuperAdmin } = useTenant();
  const navigate = useNavigate();

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

  if (!currentTenant) {
    return null;
  }

  if (collapsed) {
    return (
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            aria-label="Switch workspace"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={currentTenant.logo_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {getInitials(currentTenant.name)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0 z-[60]" align="start" side="right">
          <Command>
            <CommandInput placeholder="Search workspaces..." />
            <CommandList>
              <CommandEmpty>No workspace found.</CommandEmpty>
              <CommandGroup heading="Workspaces">
                {tenantMemberships.map((membership) => (
                  <CommandItem
                    key={membership.tenant_id}
                    onSelect={() => handleSelectTenant(membership.tenant)}
                    className="cursor-pointer"
                  >
                    <Avatar className="mr-2 h-6 w-6">
                      <AvatarImage src={membership.tenant.logo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(membership.tenant.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">{membership.tenant.name}</span>
                    {currentTenant.id === membership.tenant_id && (
                      <Check className="ml-2 h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a workspace"
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2 truncate">
            <Avatar className="h-6 w-6">
              <AvatarImage src={currentTenant.logo_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {getInitials(currentTenant.name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{currentTenant.name}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 z-[60]" align="start">
        <Command>
          <CommandInput placeholder="Search workspaces..." />
          <CommandList>
            <CommandEmpty>No workspace found.</CommandEmpty>
            <CommandGroup heading="Workspaces">
              {tenantMemberships.map((membership) => (
                <CommandItem
                  key={membership.tenant_id}
                  onSelect={() => handleSelectTenant(membership.tenant)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={membership.tenant.logo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(membership.tenant.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-sm">{membership.tenant.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {membership.role}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={getTierBadgeVariant(membership.tenant.tier)} className="text-xs">
                      {membership.tenant.tier}
                    </Badge>
                    {currentTenant.id === membership.tenant_id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  navigate('/workspace/new');
                }}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Workspace
              </CommandItem>
              {isAdmin && (
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    navigate('/workspace/settings');
                  }}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Workspace Settings
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
