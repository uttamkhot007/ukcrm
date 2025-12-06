import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink } from "lucide-react";

interface IntegrationConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration: {
    id: string;
    name: string;
    description: string;
  };
  onSave: (config: Record<string, string>) => void;
}

const integrationConfigs: Record<string, { fields: { key: string; label: string; placeholder: string; type?: string }[]; helpUrl?: string }> = {
  office365: {
    fields: [
      { key: "clientId", label: "Client ID", placeholder: "Enter your Azure AD Client ID" },
      { key: "clientSecret", label: "Client Secret", placeholder: "Enter your Client Secret", type: "password" },
      { key: "tenantId", label: "Tenant ID", placeholder: "Enter your Azure AD Tenant ID" },
    ],
    helpUrl: "https://docs.microsoft.com/en-us/graph/auth-register-app-v2",
  },
  zoho: {
    fields: [
      { key: "clientId", label: "Client ID", placeholder: "Enter your Zoho Client ID" },
      { key: "clientSecret", label: "Client Secret", placeholder: "Enter your Client Secret", type: "password" },
      { key: "refreshToken", label: "Refresh Token", placeholder: "Enter your Refresh Token", type: "password" },
    ],
    helpUrl: "https://www.zoho.com/mail/help/api/using-oauth.html",
  },
  hubspot: {
    fields: [
      { key: "apiKey", label: "Private App Token", placeholder: "Enter your HubSpot Private App Token", type: "password" },
      { key: "portalId", label: "Portal ID", placeholder: "Enter your HubSpot Portal ID" },
    ],
    helpUrl: "https://developers.hubspot.com/docs/api/private-apps",
  },
};

export function IntegrationConfigDialog({ open, onOpenChange, integration, onSave }: IntegrationConfigDialogProps) {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const configFields = integrationConfigs[integration.id]?.fields || [];
  const helpUrl = integrationConfigs[integration.id]?.helpUrl;

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    onSave(config);
    setIsLoading(false);
    setConfig({});
  };

  const isFormValid = configFields.every(field => config[field.key]?.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Connect {integration.name}</DialogTitle>
          <DialogDescription>
            Enter your {integration.name} credentials to establish the connection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {configFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                type={field.type || "text"}
                placeholder={field.placeholder}
                value={config[field.key] || ""}
                onChange={(e) => setConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
              />
            </div>
          ))}

          {helpUrl && (
            <a
              href={helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              How to get these credentials
            </a>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isFormValid || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
