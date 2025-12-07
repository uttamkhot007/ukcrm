import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Zap, Plus, Play, Pause, Settings, AlertTriangle, 
  Clock, Users, Mail, ArrowRight, Trash2, Edit 
} from "lucide-react";

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  conditions: string[];
  actions: string[];
  isActive: boolean;
}

const defaultRules: AutomationRule[] = [
  {
    id: "1",
    name: "Auto-Assign IT Tickets",
    description: "Automatically assign IT support tickets to the IT team queue",
    trigger: "Ticket Created",
    conditions: ["Category = IT Support"],
    actions: ["Assign to IT Team", "Set Priority based on keywords"],
    isActive: true,
  },
  {
    id: "2",
    name: "SLA Breach Alert",
    description: "Send alerts when tickets are about to breach SLA",
    trigger: "SLA Warning (1 hour remaining)",
    conditions: ["Status not in (Resolved, Closed)"],
    actions: ["Send Email to Assigned Agent", "Add Internal Comment", "Escalate if Critical"],
    isActive: true,
  },
  {
    id: "3",
    name: "Auto-Close Resolved Tickets",
    description: "Automatically close tickets after 7 days of resolution with no response",
    trigger: "7 Days After Resolution",
    conditions: ["Status = Resolved", "No customer response"],
    actions: ["Change Status to Closed", "Send Closure Email"],
    isActive: true,
  },
  {
    id: "4",
    name: "Critical Ticket Escalation",
    description: "Escalate critical tickets if not responded within 30 minutes",
    trigger: "30 Minutes After Creation",
    conditions: ["Priority = Critical", "No First Response"],
    actions: ["Escalate to Manager", "Send SMS Alert", "Add to Dashboard"],
    isActive: false,
  },
  {
    id: "5",
    name: "Customer Satisfaction Survey",
    description: "Send satisfaction survey after ticket closure",
    trigger: "Ticket Closed",
    conditions: ["Ticket Type = Customer"],
    actions: ["Send CSAT Survey Email", "Schedule Follow-up"],
    isActive: true,
  },
];

export function TicketAutomation() {
  const [rules, setRules] = useState<AutomationRule[]>(defaultRules);
  const [showNewRule, setShowNewRule] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  const toggleRule = (ruleId: string) => {
    setRules(rules.map(rule => 
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    ));
    const rule = rules.find(r => r.id === ruleId);
    toast.success(`${rule?.name} ${rule?.isActive ? "disabled" : "enabled"}`);
  };

  const deleteRule = (ruleId: string) => {
    setRules(rules.filter(rule => rule.id !== ruleId));
    toast.success("Automation rule deleted");
  };

  const getTriggerIcon = (trigger: string) => {
    if (trigger.includes("Created")) return <Zap className="h-4 w-4 text-blue-500" />;
    if (trigger.includes("SLA")) return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    if (trigger.includes("Days") || trigger.includes("Minutes")) return <Clock className="h-4 w-4 text-purple-500" />;
    if (trigger.includes("Closed")) return <Mail className="h-4 w-4 text-green-500" />;
    return <Settings className="h-4 w-4 text-muted-foreground" />;
  };

  const activeRules = rules.filter(r => r.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Automation Rules
          </h2>
          <p className="text-sm text-muted-foreground">
            {activeRules} of {rules.length} rules active
          </p>
        </div>
        <Button onClick={() => setShowNewRule(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Rule
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-full">
                <Zap className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rules.length}</p>
                <p className="text-xs text-muted-foreground">Total Rules</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-full">
                <Play className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeRules}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-full">
                <Pause className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rules.length - activeRules}</p>
                <p className="text-xs text-muted-foreground">Paused</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-full">
                <Settings className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">1,247</p>
                <p className="text-xs text-muted-foreground">Executions (30d)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <Card key={rule.id} className={`transition-opacity ${!rule.isActive ? "opacity-60" : ""}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {getTriggerIcon(rule.trigger)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{rule.name}</h3>
                      {rule.isActive ? (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">Paused</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{rule.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="outline">{rule.trigger}</Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      {rule.conditions.map((condition, idx) => (
                        <Badge key={idx} variant="outline" className="bg-muted">{condition}</Badge>
                      ))}
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      {rule.actions.map((action, idx) => (
                        <Badge key={idx} variant="outline" className="bg-primary/10 text-primary">{action}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.isActive}
                    onCheckedChange={() => toggleRule(rule.id)}
                  />
                  <Button variant="ghost" size="icon" onClick={() => setEditingRule(rule)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteRule(rule.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* New Rule Dialog */}
      <Dialog open={showNewRule} onOpenChange={setShowNewRule}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Automation Rule</DialogTitle>
            <DialogDescription>
              Set up automatic actions based on ticket events and conditions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input placeholder="e.g., Auto-assign VIP tickets" />
            </div>
            <div className="space-y-2">
              <Label>Trigger</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ticket_created">Ticket Created</SelectItem>
                  <SelectItem value="status_changed">Status Changed</SelectItem>
                  <SelectItem value="priority_changed">Priority Changed</SelectItem>
                  <SelectItem value="sla_warning">SLA Warning</SelectItem>
                  <SelectItem value="sla_breached">SLA Breached</SelectItem>
                  <SelectItem value="no_response">No Response After X Hours</SelectItem>
                  <SelectItem value="ticket_resolved">Ticket Resolved</SelectItem>
                  <SelectItem value="ticket_closed">Ticket Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Add condition (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority_critical">Priority = Critical</SelectItem>
                  <SelectItem value="priority_high">Priority = High</SelectItem>
                  <SelectItem value="category_it">Category = IT Support</SelectItem>
                  <SelectItem value="type_customer">Ticket Type = Customer</SelectItem>
                  <SelectItem value="type_internal">Ticket Type = Internal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assign_team">Assign to Team</SelectItem>
                  <SelectItem value="assign_user">Assign to User</SelectItem>
                  <SelectItem value="change_priority">Change Priority</SelectItem>
                  <SelectItem value="escalate">Escalate</SelectItem>
                  <SelectItem value="send_email">Send Email</SelectItem>
                  <SelectItem value="add_comment">Add Internal Comment</SelectItem>
                  <SelectItem value="close_ticket">Close Ticket</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewRule(false)}>Cancel</Button>
            <Button onClick={() => {
              toast.success("Automation rule created");
              setShowNewRule(false);
            }}>Create Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
