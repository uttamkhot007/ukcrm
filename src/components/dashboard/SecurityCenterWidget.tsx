import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  AlertTriangle, 
  ExternalLink, 
  RefreshCw, 
  Newspaper,
  Lock,
  Bug,
  Server,
  Globe,
  ChevronDown,
  ChevronRight,
  Zap,
  TrendingUp,
  AlertCircle,
  Activity,
  Target,
  Skull,
  Database,
  Wifi,
  Flame
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Types for security data
interface AttackItem {
  id: string;
  name: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  count: number;
  trend: "up" | "down" | "stable";
  description: string;
}

interface TrendItem {
  id: string;
  title: string;
  category: string;
  impact: "high" | "medium" | "low";
  description: string;
  date: string;
}

interface BreachNotification {
  id: string;
  organization: string;
  date: string;
  recordsAffected: string;
  dataTypes: string[];
  severity: "critical" | "high" | "medium";
  status: "ongoing" | "contained" | "resolved";
  summary: string;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  fullContent?: string;
  category: "vulnerability" | "threat" | "update" | "advisory" | "knowledge";
  severity?: "critical" | "high" | "medium" | "low" | "info";
  date: string;
  source?: string;
  isForTechnicalTeam?: boolean;
  recommendations?: string[];
  affectedSystems?: string[];
}

// Sample data
const topAttacks: AttackItem[] = [
  { id: "1", name: "Ransomware-as-a-Service", type: "Malware", severity: "critical", count: 2847, trend: "up", description: "RaaS operations increased 45% targeting enterprise environments" },
  { id: "2", name: "Business Email Compromise", type: "Social Engineering", severity: "high", count: 1923, trend: "up", description: "Executive impersonation attacks targeting finance departments" },
  { id: "3", name: "Zero-Day Exploits", type: "Exploitation", severity: "critical", count: 847, trend: "stable", description: "Novel vulnerabilities in enterprise software being actively exploited" },
  { id: "4", name: "Supply Chain Attacks", type: "Advanced Threat", severity: "high", count: 523, trend: "up", description: "Third-party software compromise affecting downstream customers" },
  { id: "5", name: "Credential Stuffing", type: "Account Takeover", severity: "medium", count: 4521, trend: "down", description: "Automated login attempts using leaked credential databases" },
  { id: "6", name: "API Abuse", type: "Web Attack", severity: "high", count: 1245, trend: "up", description: "Exploitation of poorly secured API endpoints" },
];

const securityTrends: TrendItem[] = [
  { id: "1", title: "AI-Powered Phishing Campaigns", category: "Emerging Threat", impact: "high", description: "Attackers using generative AI to create highly convincing phishing content at scale", date: new Date().toISOString() },
  { id: "2", title: "Cloud Misconfiguration Exploits", category: "Infrastructure", impact: "high", description: "Exposed cloud storage and databases leading to data breaches", date: new Date(Date.now() - 86400000).toISOString() },
  { id: "3", title: "IoT Botnet Evolution", category: "Network Security", impact: "medium", description: "New botnet variants targeting smart devices and edge infrastructure", date: new Date(Date.now() - 172800000).toISOString() },
  { id: "4", title: "Deepfake Social Engineering", category: "Social Engineering", impact: "high", description: "Audio and video deepfakes used for executive impersonation", date: new Date(Date.now() - 259200000).toISOString() },
  { id: "5", title: "Quantum-Ready Encryption Adoption", category: "Defense", impact: "medium", description: "Organizations beginning post-quantum cryptography transitions", date: new Date(Date.now() - 345600000).toISOString() },
];

const breachNotifications: BreachNotification[] = [
  { id: "1", organization: "Major Healthcare Provider", date: new Date().toISOString(), recordsAffected: "5.2M", dataTypes: ["PHI", "SSN", "Financial"], severity: "critical", status: "ongoing", summary: "Ransomware attack compromised patient records across multiple facilities" },
  { id: "2", organization: "Financial Services Firm", date: new Date(Date.now() - 172800000).toISOString(), recordsAffected: "2.8M", dataTypes: ["Account Details", "Transaction History"], severity: "high", status: "contained", summary: "Unauthorized access via compromised vendor credentials" },
  { id: "3", organization: "E-commerce Platform", date: new Date(Date.now() - 432000000).toISOString(), recordsAffected: "8.5M", dataTypes: ["Email", "Hashed Passwords", "Purchase History"], severity: "high", status: "resolved", summary: "SQL injection vulnerability exploited in legacy system" },
  { id: "4", organization: "Government Agency", date: new Date(Date.now() - 604800000).toISOString(), recordsAffected: "1.2M", dataTypes: ["PII", "Employment Records"], severity: "medium", status: "resolved", summary: "Insider threat exfiltrated employee database" },
];

const cyberSecurityNews: NewsItem[] = [
  { id: "1", title: "Critical Zero-Day in Popular Enterprise Software", summary: "A critical zero-day vulnerability has been discovered affecting major enterprise applications.", fullContent: "Security researchers have identified a critical zero-day vulnerability (CVE-2024-XXXX) affecting multiple enterprise software solutions. The vulnerability allows remote code execution without authentication.", category: "vulnerability", severity: "critical", date: new Date().toISOString(), source: "Security Advisory", isForTechnicalTeam: true, recommendations: ["Apply vendor patches immediately", "Enable enhanced monitoring on affected systems"], affectedSystems: ["Enterprise CRM", "ERP Systems"] },
  { id: "2", title: "New Ransomware Variant Targeting Healthcare", summary: "Security researchers have identified a new ransomware strain specifically targeting healthcare organizations.", category: "threat", severity: "high", date: new Date(Date.now() - 86400000).toISOString(), source: "Threat Intelligence", recommendations: ["Ensure offline backups are current", "Review email filtering rules"] },
  { id: "3", title: "Microsoft Releases Emergency Security Patches", summary: "Microsoft has released out-of-band security updates addressing multiple critical vulnerabilities.", category: "update", severity: "high", date: new Date(Date.now() - 172800000).toISOString(), source: "Vendor Update", recommendations: ["Deploy patches within 24-48 hours", "Test in staging environment first"], affectedSystems: ["Windows Server 2019/2022", "Windows 11"] },
];

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical": return "bg-destructive text-destructive-foreground";
    case "high": return "bg-orange-500 text-white";
    case "medium": return "bg-yellow-500 text-black";
    case "low": return "bg-blue-500 text-white";
    default: return "bg-muted text-muted-foreground";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "ongoing": return "bg-destructive/10 text-destructive border-destructive/20";
    case "contained": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "resolved": return "bg-green-500/10 text-green-600 border-green-500/20";
    default: return "bg-muted text-muted-foreground";
  }
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case "up": return <TrendingUp className="h-3 w-3 text-destructive" />;
    case "down": return <TrendingUp className="h-3 w-3 text-green-500 rotate-180" />;
    default: return <Activity className="h-3 w-3 text-muted-foreground" />;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
};

export function SecurityCenterWidget() {
  const { teams } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("attacks");

  // Check if user is in allowed teams
  const hasSecurityAccess = teams.some(team => 
    team === "technical" || 
    team === "presales" ||
    team === "managed_services" ||
    team === "sales"
  );

  // If user doesn't have access, don't render
  if (!hasSecurityAccess) {
    return null;
  }

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base font-semibold">
              Security Center
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <Lock className="h-3 w-3" />
          Real-time threat intelligence & security updates
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 h-8">
            <TabsTrigger value="attacks" className="text-xs gap-1 px-1">
              <Target className="h-3 w-3" />
              <span className="hidden sm:inline">Attacks</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="text-xs gap-1 px-1">
              <TrendingUp className="h-3 w-3" />
              <span className="hidden sm:inline">Trends</span>
            </TabsTrigger>
            <TabsTrigger value="breaches" className="text-xs gap-1 px-1">
              <AlertCircle className="h-3 w-3" />
              <span className="hidden sm:inline">Breaches</span>
            </TabsTrigger>
            <TabsTrigger value="news" className="text-xs gap-1 px-1">
              <Newspaper className="h-3 w-3" />
              <span className="hidden sm:inline">News</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[320px] mt-3">
            {/* Top Attacks Tab */}
            <TabsContent value="attacks" className="mt-0 space-y-2">
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Flame className="h-3 w-3" />
                Top attack vectors this month
              </div>
              {topAttacks.map((attack, index) => (
                <div key={attack.id} className="p-2.5 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">{attack.name}</h4>
                        <p className="text-xs text-muted-foreground">{attack.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {getTrendIcon(attack.trend)}
                      <Badge className={`text-[10px] px-1.5 py-0 ${getSeverityColor(attack.severity)}`}>
                        {attack.severity.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 ml-7">{attack.description}</p>
                  <div className="flex items-center gap-2 mt-1.5 ml-7">
                    <span className="text-xs font-medium text-primary">{attack.count.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">incidents reported</span>
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends" className="mt-0 space-y-2">
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Emerging cybersecurity trends
              </div>
              {securityTrends.map((trend) => (
                <div key={trend.id} className="p-2.5 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium">{trend.title}</h4>
                    <Badge variant="outline" className={`text-[10px] ${
                      trend.impact === 'high' ? 'border-destructive/50 text-destructive' : 
                      trend.impact === 'medium' ? 'border-amber-500/50 text-amber-600' : 
                      'border-muted-foreground/50'
                    }`}>
                      {trend.impact} impact
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{trend.category}</Badge>
                    <span className="text-[10px] text-muted-foreground">{formatDate(trend.date)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">{trend.description}</p>
                </div>
              ))}
            </TabsContent>

            {/* Breaches Tab */}
            <TabsContent value="breaches" className="mt-0 space-y-2">
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Skull className="h-3 w-3" />
                Recent breach notifications
              </div>
              {breachNotifications.map((breach) => (
                <div key={breach.id} className="p-2.5 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-medium">{breach.organization}</h4>
                      <span className="text-[10px] text-muted-foreground">{formatDate(breach.date)}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={`text-[10px] px-1.5 py-0 ${getSeverityColor(breach.severity)}`}>
                        {breach.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusColor(breach.status)}`}>
                        {breach.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">{breach.summary}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      <Database className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium text-primary">{breach.recordsAffected}</span>
                      <span className="text-[10px] text-muted-foreground">records</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {breach.dataTypes.map((type, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0">{type}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* News Tab */}
            <TabsContent value="news" className="mt-0 space-y-2">
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Latest security news & advisories
              </div>
              {cyberSecurityNews.map((item) => (
                <Collapsible key={item.id}>
                  <div className="rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <button className="w-full p-2.5 text-left cursor-pointer group">
                        <div className="flex items-start gap-2">
                          <div className={`p-1 rounded-md ${
                            item.category === 'vulnerability' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                            item.category === 'threat' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                            item.category === 'update' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {item.category === 'vulnerability' && <Bug className="h-3 w-3" />}
                            {item.category === 'threat' && <AlertTriangle className="h-3 w-3" />}
                            {item.category === 'update' && <Server className="h-3 w-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-medium line-clamp-1">{item.title}</h4>
                              {item.severity && item.severity !== "info" && (
                                <Badge className={`text-[10px] px-1.5 py-0 ${getSeverityColor(item.severity)}`}>
                                  {item.severity.toUpperCase()}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.summary}</p>
                            <span className="text-[10px] text-muted-foreground">{formatDate(item.date)}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-2.5 pb-2.5 pt-0 border-t border-border/50">
                        {item.recommendations && (
                          <div className="mt-2">
                            <h5 className="text-xs font-medium mb-1">Recommendations:</h5>
                            <ul className="space-y-0.5">
                              {item.recommendations.map((rec, idx) => (
                                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                                  <span className="text-primary">•</span>{rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <Button variant="ghost" size="sm" className="h-6 text-xs mt-2">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Read More
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}
