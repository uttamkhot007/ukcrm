/**
 * HRStageRulesDialog
 * ------------------
 * Admin/HR-manager UI for configuring per-stage rules in the HR workflows
 * (onboarding, offboarding, retention). Rules are stored in the existing
 * `workflow_settings` table under the `hr_stage_rules` key as a JSONB
 * document keyed by workflow type.
 *
 * For each stage the admin can configure:
 *   - Stage name + order
 *   - Trigger event (entered / completed / overdue)
 *   - Recipient roles (employee, manager, hr, it, admin)
 *   - In-app notification title + body (with {{token}} placeholders)
 *   - Email subject + body (with {{token}} placeholders)
 *   - Whether email channel is enabled
 *
 * The "Preview" panel renders both the in-app card and a desktop email
 * mockup using sample data so admins can see exactly what will go out
 * before saving.
 *
 * Tokens supported in templates:
 *   {{employee_name}}, {{employee_email}}, {{stage}}, {{workflow_title}},
 *   {{manager_name}}, {{company}}, {{due_date}}
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GitBranch,
  Plus,
  Trash2,
  Save,
  Bell,
  Mail,
  Eye,
  Users,
  ChevronUp,
  ChevronDown,
  AlertCircle,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

type WorkflowType = "onboarding" | "offboarding" | "retention";
type RecipientRole = "employee" | "manager" | "hr" | "it" | "admin";
type TriggerEvent = "entered" | "completed" | "overdue";

interface StageRule {
  id: string;
  name: string;
  order: number;
  trigger: TriggerEvent;
  recipients: RecipientRole[];
  emailEnabled: boolean;
  inAppTitle: string;
  inAppBody: string;
  emailSubject: string;
  emailBody: string;
}

type RulesByType = Record<WorkflowType, StageRule[]>;

const SETTING_KEY = "hr_stage_rules";

const DEFAULT_RULES: RulesByType = {
  onboarding: [
    {
      id: "ob-1",
      name: "Offer Accepted",
      order: 0,
      trigger: "entered",
      recipients: ["employee", "hr", "manager"],
      emailEnabled: true,
      inAppTitle: "Welcome aboard, {{employee_name}}!",
      inAppBody:
        "Your onboarding has started. We'll guide you through each step over the next few days.",
      emailSubject: "Welcome to {{company}}, {{employee_name}}!",
      emailBody:
        "Hi {{employee_name}},\n\nWe're thrilled to have you join {{company}}. Your onboarding journey is now live and your manager {{manager_name}} will reach out shortly.\n\nNext steps will appear in your employee portal.\n\nWelcome aboard!",
    },
    {
      id: "ob-2",
      name: "Documentation",
      order: 1,
      trigger: "entered",
      recipients: ["employee", "hr"],
      emailEnabled: true,
      inAppTitle: "Action needed: submit your documents",
      inAppBody:
        "Please upload your ID proofs, address proof, and previous employment certificates by {{due_date}}.",
      emailSubject: "Documents required for your onboarding",
      emailBody:
        "Hi {{employee_name}},\n\nTo complete your onboarding at {{company}}, please upload the required documents in your employee portal by {{due_date}}.\n\nIf you have any questions, reach out to HR.",
    },
    {
      id: "ob-3",
      name: "IT Provisioning",
      order: 2,
      trigger: "entered",
      recipients: ["it", "manager"],
      emailEnabled: true,
      inAppTitle: "Provision IT access for {{employee_name}}",
      inAppBody:
        "Create accounts, assign laptop, and grant required system access for {{employee_name}}.",
      emailSubject: "IT provisioning request — {{employee_name}}",
      emailBody:
        "Hi IT team,\n\nPlease provision the following for {{employee_name}} ({{employee_email}}):\n• Email account\n• Laptop & accessories\n• Role-based system access\n\nDeadline: {{due_date}}",
    },
    {
      id: "ob-4",
      name: "Orientation",
      order: 3,
      trigger: "entered",
      recipients: ["employee", "manager", "hr"],
      emailEnabled: true,
      inAppTitle: "Orientation scheduled",
      inAppBody:
        "Your orientation session has been scheduled for {{due_date}}. Manager: {{manager_name}}.",
      emailSubject: "Your orientation at {{company}}",
      emailBody:
        "Hi {{employee_name}},\n\nYour orientation is scheduled for {{due_date}}. Your manager {{manager_name}} and HR will walk you through team introductions, tools, and policies.\n\nSee you there!",
    },
    {
      id: "ob-5",
      name: "Completed",
      order: 4,
      trigger: "completed",
      recipients: ["employee", "manager", "hr"],
      emailEnabled: true,
      inAppTitle: "Onboarding complete 🎉",
      inAppBody:
        "Congrats {{employee_name}} — your onboarding is now complete. You're all set!",
      emailSubject: "You're all set at {{company}}!",
      emailBody:
        "Hi {{employee_name}},\n\nCongratulations on completing your onboarding at {{company}}. Your full access is active and your manager {{manager_name}} will check in regularly.\n\nWe wish you a great journey ahead!",
    },
  ],
  offboarding: [
    {
      id: "off-1",
      name: "Resignation Received",
      order: 0,
      trigger: "entered",
      recipients: ["hr", "manager", "admin"],
      emailEnabled: true,
      inAppTitle: "Resignation received from {{employee_name}}",
      inAppBody:
        "{{employee_name}} has submitted their resignation. Please review and start the offboarding workflow.",
      emailSubject: "Resignation received — {{employee_name}}",
      emailBody:
        "Hi team,\n\n{{employee_name}} has submitted their resignation. The offboarding workflow has been initiated. Last working day: {{due_date}}.",
    },
    {
      id: "off-2",
      name: "Knowledge Transfer",
      order: 1,
      trigger: "entered",
      recipients: ["employee", "manager"],
      emailEnabled: true,
      inAppTitle: "Plan knowledge transfer with your manager",
      inAppBody:
        "Coordinate with {{manager_name}} to document handovers and key responsibilities.",
      emailSubject: "Knowledge transfer plan — {{employee_name}}",
      emailBody:
        "Hi {{employee_name}},\n\nPlease work with {{manager_name}} on a knowledge transfer plan. Document active projects, credentials handover, and any pending tasks.",
    },
    {
      id: "off-3",
      name: "Asset Return",
      order: 2,
      trigger: "entered",
      recipients: ["employee", "it", "admin"],
      emailEnabled: true,
      inAppTitle: "Return company assets",
      inAppBody:
        "Please return your laptop, access cards, and any other company assets by {{due_date}}.",
      emailSubject: "Asset return checklist",
      emailBody:
        "Hi {{employee_name}},\n\nPlease return all company-issued assets (laptop, access card, peripherals) to the IT/Admin desk by {{due_date}}.",
    },
    {
      id: "off-4",
      name: "Access Revocation",
      order: 3,
      trigger: "entered",
      recipients: ["it", "admin"],
      emailEnabled: true,
      inAppTitle: "Revoke access for {{employee_name}}",
      inAppBody:
        "Disable email, SSO, VPN, and all system access for {{employee_name}} after their last working day.",
      emailSubject: "Access revocation — {{employee_name}}",
      emailBody:
        "Hi IT team,\n\nPlease revoke all access for {{employee_name}} ({{employee_email}}) effective {{due_date}}. Confirm completion in the workflow.",
    },
    {
      id: "off-5",
      name: "Final Settlement",
      order: 4,
      trigger: "completed",
      recipients: ["employee", "hr"],
      emailEnabled: true,
      inAppTitle: "Final settlement processed",
      inAppBody:
        "Your full and final settlement has been processed. Experience letter will be issued within 7 working days.",
      emailSubject: "Final settlement — {{employee_name}}",
      emailBody:
        "Hi {{employee_name}},\n\nYour full and final settlement has been processed. We wish you the very best in your future endeavours. Thank you for being part of {{company}}.",
    },
  ],
  retention: [
    {
      id: "ret-1",
      name: "Risk Identified",
      order: 0,
      trigger: "entered",
      recipients: ["manager", "hr"],
      emailEnabled: true,
      inAppTitle: "Retention risk: {{employee_name}}",
      inAppBody:
        "{{employee_name}} has been flagged as a retention risk. Schedule a 1:1 within {{due_date}}.",
      emailSubject: "Retention risk flagged — {{employee_name}}",
      emailBody:
        "Hi {{manager_name}},\n\n{{employee_name}} has been flagged as a retention risk based on recent signals. Please schedule a 1:1 conversation by {{due_date}} and update the workflow with notes.",
    },
    {
      id: "ret-2",
      name: "Action Plan",
      order: 1,
      trigger: "entered",
      recipients: ["manager", "hr"],
      emailEnabled: false,
      inAppTitle: "Document a retention action plan",
      inAppBody:
        "Capture the agreed action plan from your 1:1 with {{employee_name}}.",
      emailSubject: "Retention action plan — {{employee_name}}",
      emailBody: "",
    },
  ],
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const SAMPLE_DATA: Record<string, string> = {
  employee_name: "Priya Sharma",
  employee_email: "priya.sharma@example.com",
  stage: "Documentation",
  workflow_title: "Onboarding — Priya Sharma",
  manager_name: "Rahul Verma",
  company: "Vinca Cyber Security",
  due_date: "30 Apr 2026",
};

function renderTemplate(input: string, data: Record<string, string> = SAMPLE_DATA): string {
  return input.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, key) => data[key] ?? `{{${key}}}`);
}

const RECIPIENT_LABELS: Record<RecipientRole, string> = {
  employee: "Employee",
  manager: "Manager",
  hr: "HR",
  it: "IT",
  admin: "Admin",
};

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

interface HRStageRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HRStageRulesDialog({ open, onOpenChange }: HRStageRulesDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeType, setActiveType] = useState<WorkflowType>("onboarding");
  const [rules, setRules] = useState<RulesByType>(DEFAULT_RULES);
  const [selectedStageId, setSelectedStageId] = useState<string>(DEFAULT_RULES.onboarding[0].id);

  const { data: settings } = useQuery({
    queryKey: ["workflow-settings", SETTING_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_settings")
        .select("*")
        .eq("setting_key", SETTING_KEY)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  useEffect(() => {
    if (!settings?.setting_value) {
      setRules(DEFAULT_RULES);
      return;
    }
    const stored = settings.setting_value as Partial<RulesByType>;
    setRules({
      onboarding: stored.onboarding?.length ? stored.onboarding : DEFAULT_RULES.onboarding,
      offboarding: stored.offboarding?.length ? stored.offboarding : DEFAULT_RULES.offboarding,
      retention: stored.retention?.length ? stored.retention : DEFAULT_RULES.retention,
    });
  }, [settings]);

  useEffect(() => {
    const list = rules[activeType];
    if (!list.find((s) => s.id === selectedStageId)) {
      setSelectedStageId(list[0]?.id ?? "");
    }
  }, [activeType, rules]);

  const stages = rules[activeType];
  const selectedStage = useMemo(
    () => stages.find((s) => s.id === selectedStageId) ?? null,
    [stages, selectedStageId],
  );

  function patchStage(patch: Partial<StageRule>) {
    if (!selectedStage) return;
    setRules((prev) => ({
      ...prev,
      [activeType]: prev[activeType].map((s) =>
        s.id === selectedStage.id ? { ...s, ...patch } : s,
      ),
    }));
  }

  function addStage() {
    const next: StageRule = {
      id: uid(),
      name: "New stage",
      order: stages.length,
      trigger: "entered",
      recipients: ["employee"],
      emailEnabled: true,
      inAppTitle: "Stage update for {{employee_name}}",
      inAppBody: "Stage entered: {{stage}}",
      emailSubject: "Update on your workflow at {{company}}",
      emailBody: "Hi {{employee_name}},\n\nYour workflow has moved to stage: {{stage}}.",
    };
    setRules((prev) => ({ ...prev, [activeType]: [...prev[activeType], next] }));
    setSelectedStageId(next.id);
  }

  function deleteStage(id: string) {
    setRules((prev) => {
      const filtered = prev[activeType].filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i }));
      return { ...prev, [activeType]: filtered };
    });
  }

  function moveStage(id: string, dir: -1 | 1) {
    setRules((prev) => {
      const list = [...prev[activeType]];
      const idx = list.findIndex((s) => s.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= list.length) return prev;
      [list[idx], list[target]] = [list[target], list[idx]];
      return { ...prev, [activeType]: list.map((s, i) => ({ ...s, order: i })) };
    });
  }

  function toggleRecipient(role: RecipientRole) {
    if (!selectedStage) return;
    const has = selectedStage.recipients.includes(role);
    patchStage({
      recipients: has
        ? selectedStage.recipients.filter((r) => r !== role)
        : [...selectedStage.recipients, role],
    });
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const valuePayload = JSON.parse(JSON.stringify(rules));
      const { data: existing } = await supabase
        .from("workflow_settings")
        .select("id")
        .eq("setting_key", SETTING_KEY)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("workflow_settings")
          .update({ setting_value: valuePayload })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from("workflow_settings")
          .insert({ setting_key: SETTING_KEY, setting_value: valuePayload } as any) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Stage rules saved",
        description: "Notification and email rules will apply to new workflow events.",
      });
      queryClient.invalidateQueries({ queryKey: ["workflow-settings", SETTING_KEY] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({
        title: "Save failed",
        description: err?.message ?? "Could not persist stage rules.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            HR Workflow Stage Rules
          </DialogTitle>
          <DialogDescription>
            Configure who gets notified and what they see at each onboarding, offboarding, and
            retention stage. Use {{token}} placeholders in messages.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeType}
          onValueChange={(v) => setActiveType(v as WorkflowType)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6 pt-3">
            <TabsList>
              <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
              <TabsTrigger value="offboarding">Offboarding</TabsTrigger>
              <TabsTrigger value="retention">Retention</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeType} className="flex-1 overflow-hidden mt-0 px-6 pb-2">
            <div className="grid grid-cols-12 gap-4 h-full">
              <aside className="col-span-3 border rounded-lg flex flex-col overflow-hidden">
                <div className="px-3 py-2 border-b flex items-center justify-between bg-muted/40">
                  <span className="text-sm font-medium">Stages</span>
                  <Button size="sm" variant="ghost" onClick={addStage}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {stages.map((s, idx) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedStageId(s.id)}
                        className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors border ${
                          selectedStageId === s.id
                            ? "bg-primary/10 border-primary/40"
                            : "border-transparent hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">
                            {idx + 1}. {s.name}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              className="p-0.5 hover:bg-background rounded"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveStage(s.id, -1);
                              }}
                              aria-label="Move up"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              className="p-0.5 hover:bg-background rounded"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveStage(s.id, 1);
                              }}
                              aria-label="Move down"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              className="p-0.5 hover:bg-destructive/10 rounded text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteStage(s.id);
                              }}
                              aria-label="Delete stage"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="outline" className="text-xs h-4 px-1">
                            {s.trigger}
                          </Badge>
                          {s.emailEnabled && (
                            <Badge variant="secondary" className="text-xs h-4 px-1 gap-0.5">
                              <Mail className="w-2.5 h-2.5" /> email
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs h-4 px-1 gap-0.5">
                            <Users className="w-2.5 h-2.5" /> {s.recipients.length}
                          </Badge>
                        </div>
                      </button>
                    ))}
                    {stages.length === 0 && (
                      <p className="text-xs text-muted-foreground p-3">
                        No stages yet — click + to add one.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </aside>

              <section className="col-span-5 border rounded-lg flex flex-col overflow-hidden">
                <div className="px-3 py-2 border-b bg-muted/40 flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  <span className="text-sm font-medium">Stage configuration</span>
                </div>
                {!selectedStage ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                    Select a stage to configure
                  </div>
                ) : (
                  <ScrollArea className="flex-1">
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="stage-name">Stage name</Label>
                          <Input
                            id="stage-name"
                            value={selectedStage.name}
                            onChange={(e) => patchStage({ name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Trigger</Label>
                          <Select
                            value={selectedStage.trigger}
                            onValueChange={(v) => patchStage({ trigger: v as TriggerEvent })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="entered">When stage is entered</SelectItem>
                              <SelectItem value="completed">When stage is completed</SelectItem>
                              <SelectItem value="overdue">When stage is overdue</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Recipients</Label>
                        <div className="flex flex-wrap gap-2">
                          {(Object.keys(RECIPIENT_LABELS) as RecipientRole[]).map((role) => {
                            const active = selectedStage.recipients.includes(role);
                            return (
                              <button
                                key={role}
                                type="button"
                                onClick={() => toggleRecipient(role)}
                                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                                  active
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background hover:bg-muted border-input"
                                }`}
                              >
                                {RECIPIENT_LABELS[role]}
                              </button>
                            );
                          })}
                        </div>
                        {selectedStage.recipients.length === 0 && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Select at least one recipient.
                          </p>
                        )}
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-muted-foreground" />
                          <Label className="font-semibold">In-app notification</Label>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="in-app-title" className="text-xs">
                            Title
                          </Label>
                          <Input
                            id="in-app-title"
                            value={selectedStage.inAppTitle}
                            onChange={(e) => patchStage({ inAppTitle: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="in-app-body" className="text-xs">
                            Body
                          </Label>
                          <Textarea
                            id="in-app-body"
                            rows={3}
                            value={selectedStage.inAppBody}
                            onChange={(e) => patchStage({ inAppBody: e.target.value })}
                          />
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <Label className="font-semibold">Email</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor="email-toggle" className="text-xs text-muted-foreground">
                              Send email
                            </Label>
                            <Switch
                              id="email-toggle"
                              checked={selectedStage.emailEnabled}
                              onCheckedChange={(v) => patchStage({ emailEnabled: v })}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="email-subject" className="text-xs">
                            Subject
                          </Label>
                          <Input
                            id="email-subject"
                            disabled={!selectedStage.emailEnabled}
                            value={selectedStage.emailSubject}
                            onChange={(e) => patchStage({ emailSubject: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="email-body" className="text-xs">
                            Body
                          </Label>
                          <Textarea
                            id="email-body"
                            rows={6}
                            disabled={!selectedStage.emailEnabled}
                            value={selectedStage.emailBody}
                            onChange={(e) => patchStage({ emailBody: e.target.value })}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Tokens: {{employee_name}}, {{employee_email}}, {{stage}},{" "}
                          {{workflow_title}}, {{manager_name}}, {{company}},{" "}
                          {{due_date}}
                        </p>
                      </div>
                    </div>
                  </ScrollArea>
                )}
              </section>

              <section className="col-span-4 border rounded-lg flex flex-col overflow-hidden">
                <div className="px-3 py-2 border-b bg-muted/40 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm font-medium">Live preview</span>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {!selectedStage ? (
                      <p className="text-sm text-muted-foreground">Select a stage to preview.</p>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">
                            Recipients
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {selectedStage.recipients.length === 0 ? (
                              <Badge variant="outline">No one</Badge>
                            ) : (
                              selectedStage.recipients.map((r) => (
                                <Badge key={r} variant="secondary" className="text-xs">
                                  {RECIPIENT_LABELS[r]}
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">
                            In-app notification
                          </span>
                          <Card className="border-l-4 border-l-primary">
                            <CardContent className="p-3 space-y-1">
                              <div className="flex items-start gap-2">
                                <Bell className="w-4 h-4 mt-0.5 text-primary" />
                                <div className="flex-1">
                                  <p className="text-sm font-semibold leading-tight">
                                    {renderTemplate(selectedStage.inAppTitle)}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                                    {renderTemplate(selectedStage.inAppBody)}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs uppercase tracking-wide text-muted-foreground">
                              Email
                            </span>
                            {!selectedStage.emailEnabled && (
                              <Badge variant="outline" className="text-xs">
                                Disabled
                              </Badge>
                            )}
                          </div>
                          <Card className={selectedStage.emailEnabled ? "" : "opacity-50"}>
                            <CardContent className="p-0">
                              <div className="px-4 py-2 border-b bg-muted/40 text-xs space-y-0.5">
                                <div>
                                  <span className="text-muted-foreground">From: </span>
                                  noreply@{(SAMPLE_DATA.company || "company")
                                    .toLowerCase()
                                    .replace(/\s+/g, "")}
                                  .com
                                </div>
                                <div>
                                  <span className="text-muted-foreground">To: </span>
                                  {SAMPLE_DATA.employee_email}
                                </div>
                                <div className="font-medium">
                                  <span className="text-muted-foreground">Subject: </span>
                                  {renderTemplate(selectedStage.emailSubject)}
                                </div>
                              </div>
                              <div className="p-4 bg-background">
                                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                  {renderTemplate(selectedStage.emailBody) || (
                                    <span className="text-muted-foreground italic">
                                      (No email body)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        <p className="text-[11px] text-muted-foreground italic">
                          Preview uses sample data — actual sends will substitute live employee
                          info.
                        </p>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </section>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Saving..." : "Save rules"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
