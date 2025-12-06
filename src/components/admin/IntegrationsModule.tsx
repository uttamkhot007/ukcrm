import { useState } from "react";
import { 
  Puzzle, 
  Mail, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  Settings2, 
  RefreshCw,
  FileSpreadsheet,
  Users,
  Building2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { IntegrationConfigDialog } from "./IntegrationConfigDialog";
import { ManualUploadDialog } from "./ManualUploadDialog";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  status: "connected" | "disconnected" | "pending";
  category: "email" | "crm" | "manual";
}

const integrations: Integration[] = [
  {
    id: "office365",
    name: "Office 365",
    description: "Sync emails, contacts, and calendar from Microsoft Office 365",
    icon: <Mail className="w-6 h-6" />,
    color: "text-[hsl(217,91%,60%)]",
    status: "disconnected",
    category: "email",
  },
  {
    id: "zoho",
    name: "Zoho Mail",
    description: "Connect Zoho Mail for email synchronization and contact management",
    icon: <Mail className="w-6 h-6" />,
    color: "text-[hsl(25,95%,53%)]",
    status: "disconnected",
    category: "email",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Import contacts, deals, and activities from HubSpot CRM",
    icon: <Users className="w-6 h-6" />,
    color: "text-[hsl(16,100%,50%)]",
    status: "disconnected",
    category: "crm",
  },
  {
    id: "manual",
    name: "Manual Data Upload",
    description: "Upload data manually from CSV or Excel files exported from Office 365, Zoho, or HubSpot",
    icon: <Upload className="w-6 h-6" />,
    color: "text-primary",
    status: "disconnected",
    category: "manual",
  },
];

export function IntegrationsModule() {
  const [integrationStatuses, setIntegrationStatuses] = useState<Record<string, "connected" | "disconnected" | "pending">>({
    office365: "disconnected",
    zoho: "disconnected",
    hubspot: "disconnected",
    manual: "disconnected",
  });
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  const handleConnect = (integration: Integration) => {
    if (integration.category === "manual") {
      setUploadDialogOpen(true);
      return;
    }
    
    setSelectedIntegration(integration);
    setConfigDialogOpen(true);
  };

  const handleDisconnect = (integrationId: string) => {
    setIntegrationStatuses(prev => ({
      ...prev,
      [integrationId]: "disconnected"
    }));
    toast({
      title: "Integration Disconnected",
      description: "The integration has been disconnected successfully.",
    });
  };

  const handleSaveConfig = (integrationId: string, config: Record<string, string>) => {
    setIntegrationStatuses(prev => ({
      ...prev,
      [integrationId]: "pending"
    }));
    
    // Simulate connection attempt
    setTimeout(() => {
      setIntegrationStatuses(prev => ({
        ...prev,
        [integrationId]: "connected"
      }));
      toast({
        title: "Integration Connected",
        description: "The integration has been connected successfully.",
      });
    }, 2000);
    
    setConfigDialogOpen(false);
  };

  const handleUploadComplete = () => {
    setIntegrationStatuses(prev => ({
      ...prev,
      manual: "connected"
    }));
    setUploadDialogOpen(false);
  };

  const getStatusBadge = (status: "connected" | "disconnected" | "pending") => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-primary/20 text-primary border-primary/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-support/20 text-support border-support/30">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Connecting...
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <XCircle className="w-3 h-3 mr-1" />
            Not Connected
          </Badge>
        );
    }
  };

  const emailIntegrations = integrations.filter(i => i.category === "email");
  const crmIntegrations = integrations.filter(i => i.category === "crm");
  const manualIntegrations = integrations.filter(i => i.category === "manual");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Puzzle className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Integrations</h2>
          <p className="text-sm text-muted-foreground">Connect external services to sync your data</p>
        </div>
      </div>

      {/* Email Integrations */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Mail className="w-5 h-5 text-muted-foreground" />
          Email Services
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {emailIntegrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              status={integrationStatuses[integration.id]}
              onConnect={() => handleConnect(integration)}
              onDisconnect={() => handleDisconnect(integration.id)}
              getStatusBadge={getStatusBadge}
            />
          ))}
        </div>
      </div>

      {/* CRM Integrations */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Building2 className="w-5 h-5 text-muted-foreground" />
          CRM Platforms
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {crmIntegrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              status={integrationStatuses[integration.id]}
              onConnect={() => handleConnect(integration)}
              onDisconnect={() => handleDisconnect(integration.id)}
              getStatusBadge={getStatusBadge}
            />
          ))}
        </div>
      </div>

      {/* Manual Upload */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
          Manual Data Import
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {manualIntegrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              status={integrationStatuses[integration.id]}
              onConnect={() => handleConnect(integration)}
              onDisconnect={() => handleDisconnect(integration.id)}
              getStatusBadge={getStatusBadge}
            />
          ))}
        </div>
      </div>

      {selectedIntegration && (
        <IntegrationConfigDialog
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          integration={selectedIntegration}
          onSave={(config) => handleSaveConfig(selectedIntegration.id, config)}
        />
      )}

      <ManualUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onComplete={handleUploadComplete}
      />
    </div>
  );
}

interface IntegrationCardProps {
  integration: Integration;
  status: "connected" | "disconnected" | "pending";
  onConnect: () => void;
  onDisconnect: () => void;
  getStatusBadge: (status: "connected" | "disconnected" | "pending") => React.ReactNode;
}

function IntegrationCard({ integration, status, onConnect, onDisconnect, getStatusBadge }: IntegrationCardProps) {
  return (
    <Card className="glass border-border hover:border-primary/30 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("w-12 h-12 rounded-xl bg-card flex items-center justify-center border border-border", integration.color)}>
              {integration.icon}
            </div>
            <div>
              <CardTitle className="text-base">{integration.name}</CardTitle>
              {getStatusBadge(status)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription>{integration.description}</CardDescription>
        <div className="flex gap-2">
          {status === "connected" ? (
            <>
              <Button variant="outline" size="sm" className="flex-1">
                <Settings2 className="w-4 h-4 mr-2" />
                Configure
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-destructive hover:text-destructive"
                onClick={onDisconnect}
              >
                Disconnect
              </Button>
            </>
          ) : status === "pending" ? (
            <Button variant="outline" size="sm" className="flex-1" disabled>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Connecting...
            </Button>
          ) : (
            <Button 
              size="sm" 
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={onConnect}
            >
              {integration.category === "manual" ? (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Data
                </>
              ) : (
                "Connect"
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
