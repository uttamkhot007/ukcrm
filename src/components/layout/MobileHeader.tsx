import { useState } from 'react';
import { Menu, X, Bell, Building2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/hooks/useAuth';
import { TenantSwitcher } from '@/components/tenant/TenantSwitcher';

interface MobileHeaderProps {
  onMenuClick?: () => void;
  showMenu?: boolean;
}

export function MobileHeader({ onMenuClick, showMenu = true }: MobileHeaderProps) {
  const { currentTenant, isSuperAdmin, tenantMemberships } = useTenant();
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const showTenantSwitcher = isSuperAdmin || tenantMemberships.length > 1;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Left: Menu button */}
        <div className="flex items-center gap-2">
          {showMenu && (
            <Button variant="ghost" size="icon" onClick={onMenuClick} aria-label="Open navigation menu">
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>

          )}
          
          {/* Workspace indicator */}
          {currentTenant && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium truncate max-w-[120px]">
                {currentTenant.name}
              </span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Button variant="ghost" size="icon" aria-label="View notifications">
            <Bell className="h-5 w-5" aria-hidden="true" />
          </Button>

          {/* User menu / Tenant switcher */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open account menu">

                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {profile?.full_name?.slice(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[350px]">
              <div className="flex flex-col gap-6 pt-6">
                {/* User info */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {profile?.full_name?.slice(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{profile?.full_name || 'User'}</p>
                    <p className="text-sm text-muted-foreground">{profile?.email}</p>
                  </div>
                </div>

                {/* Tenant switcher */}
                {showTenantSwitcher && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Switch Workspace
                    </label>
                    <TenantSwitcher collapsed={false} />
                  </div>
                )}

                {/* Current workspace info */}
                {currentTenant && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Current Workspace</p>
                    <p className="font-medium">{currentTenant.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {currentTenant.tier}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ID: {currentTenant.slug}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
