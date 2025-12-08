import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  ChevronRight
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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

// Sample cybersecurity news and knowledge base
const cyberSecurityNews: NewsItem[] = [
  {
    id: "1",
    title: "Critical Zero-Day in Popular Enterprise Software",
    summary: "A critical zero-day vulnerability has been discovered affecting major enterprise applications. Immediate patching recommended.",
    fullContent: "Security researchers have identified a critical zero-day vulnerability (CVE-2024-XXXX) affecting multiple enterprise software solutions. The vulnerability allows remote code execution without authentication. Organizations are advised to apply vendor patches immediately and monitor for indicators of compromise.",
    category: "vulnerability",
    severity: "critical",
    date: new Date().toISOString(),
    source: "Security Advisory",
    isForTechnicalTeam: true,
    recommendations: [
      "Apply vendor patches immediately",
      "Enable enhanced monitoring on affected systems",
      "Review access logs for suspicious activity",
      "Implement network segmentation as temporary mitigation"
    ],
    affectedSystems: ["Enterprise CRM", "ERP Systems", "Document Management"]
  },
  {
    id: "2",
    title: "New Ransomware Variant Targeting Healthcare Sector",
    summary: "Security researchers have identified a new ransomware strain specifically targeting healthcare organizations.",
    fullContent: "A sophisticated ransomware operation dubbed 'MedLock' has been observed targeting healthcare providers across multiple regions. The malware uses advanced evasion techniques and double extortion tactics.",
    category: "threat",
    severity: "high",
    date: new Date(Date.now() - 86400000).toISOString(),
    source: "Threat Intelligence",
    recommendations: [
      "Ensure offline backups are current",
      "Review email filtering rules",
      "Conduct phishing awareness training",
      "Test incident response procedures"
    ]
  },
  {
    id: "3",
    title: "Microsoft Releases Emergency Security Patches",
    summary: "Microsoft has released out-of-band security updates addressing multiple critical vulnerabilities in Windows and Office.",
    fullContent: "Microsoft has issued emergency patches for 5 critical vulnerabilities affecting Windows Server, Windows 11, and Microsoft Office. These include two actively exploited zero-days. IT teams should prioritize deployment.",
    category: "update",
    severity: "high",
    date: new Date(Date.now() - 172800000).toISOString(),
    source: "Vendor Update",
    recommendations: [
      "Deploy patches within 24-48 hours",
      "Test in staging environment first",
      "Monitor KB articles for known issues"
    ],
    affectedSystems: ["Windows Server 2019/2022", "Windows 11", "Microsoft Office 365"]
  },
  {
    id: "4",
    title: "NIST Updates Cybersecurity Framework",
    summary: "The National Institute of Standards and Technology has released version 2.0 of its Cybersecurity Framework.",
    fullContent: "NIST CSF 2.0 introduces a new 'Govern' function and expands guidance for supply chain risk management. Organizations should review their current security posture against the updated framework.",
    category: "advisory",
    severity: "info",
    date: new Date(Date.now() - 259200000).toISOString(),
    source: "Regulatory",
    recommendations: [
      "Review NIST CSF 2.0 documentation",
      "Conduct gap analysis against new requirements",
      "Update security policies as needed"
    ]
  },
  {
    id: "5",
    title: "Understanding Zero Trust Architecture",
    summary: "Deep dive into implementing Zero Trust security model in enterprise environments. Key principles and best practices.",
    fullContent: "Zero Trust Architecture (ZTA) is a security model based on the principle of 'never trust, always verify'. This guide covers identity verification, microsegmentation, least privilege access, and continuous monitoring implementation strategies.",
    category: "knowledge",
    severity: "info",
    date: new Date(Date.now() - 345600000).toISOString(),
    source: "Knowledge Base",
    isForTechnicalTeam: true,
    recommendations: [
      "Start with identity and access management",
      "Implement network microsegmentation",
      "Deploy continuous verification mechanisms",
      "Monitor all access attempts and anomalies"
    ]
  },
  {
    id: "6",
    title: "Cloud Security Best Practices for 2024",
    summary: "Essential security configurations and monitoring strategies for AWS, Azure, and GCP environments.",
    fullContent: "Comprehensive guide covering cloud security posture management (CSPM), identity federation, encryption standards, logging best practices, and multi-cloud security considerations for enterprise deployments.",
    category: "knowledge",
    severity: "info",
    date: new Date(Date.now() - 432000000).toISOString(),
    source: "Knowledge Base",
    isForTechnicalTeam: true,
    recommendations: [
      "Enable cloud-native security services",
      "Implement infrastructure as code security scanning",
      "Configure centralized logging and SIEM integration",
      "Regular access reviews and credential rotation"
    ]
  },
  {
    id: "7",
    title: "API Security: Common Vulnerabilities and Mitigations",
    summary: "Comprehensive guide to identifying and preventing OWASP API Top 10 vulnerabilities in your applications.",
    fullContent: "This guide covers broken object level authorization, authentication flaws, excessive data exposure, rate limiting, injection attacks, and other critical API security concerns with practical remediation strategies.",
    category: "knowledge",
    severity: "info",
    date: new Date(Date.now() - 518400000).toISOString(),
    source: "Knowledge Base",
    isForTechnicalTeam: true,
    recommendations: [
      "Implement proper authentication and authorization",
      "Apply rate limiting and throttling",
      "Validate and sanitize all inputs",
      "Use API gateways with security policies"
    ]
  },
  {
    id: "8",
    title: "Incident Response Playbook Updates",
    summary: "Updated procedures for handling security incidents including ransomware, data breaches, and insider threats.",
    fullContent: "Updated incident response procedures aligned with industry best practices. Includes decision trees for incident classification, communication templates, and post-incident review processes.",
    category: "advisory",
    severity: "medium",
    date: new Date(Date.now() - 604800000).toISOString(),
    source: "Internal",
    isForTechnicalTeam: true,
    recommendations: [
      "Review and familiarize with updated playbooks",
      "Conduct tabletop exercises quarterly",
      "Ensure contact lists are current",
      "Test communication channels"
    ]
  },
];

const getCategoryIcon = (category: NewsItem["category"]) => {
  switch (category) {
    case "vulnerability":
      return Bug;
    case "threat":
      return AlertTriangle;
    case "update":
      return Server;
    case "advisory":
      return Shield;
    case "knowledge":
      return Globe;
    default:
      return Newspaper;
  }
};

const getSeverityColor = (severity?: NewsItem["severity"]) => {
  switch (severity) {
    case "critical":
      return "bg-destructive text-destructive-foreground";
    case "high":
      return "bg-orange-500 text-white";
    case "medium":
      return "bg-yellow-500 text-black";
    case "low":
      return "bg-blue-500 text-white";
    case "info":
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getCategoryColor = (category: NewsItem["category"]) => {
  switch (category) {
    case "vulnerability":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "threat":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    case "update":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "advisory":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    case "knowledge":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    default:
      return "bg-muted text-muted-foreground";
  }
};

interface CyberSecurityNewsBarProps {
  showKnowledgeBase?: boolean;
}

export function CyberSecurityNewsBar({ showKnowledgeBase = false }: CyberSecurityNewsBarProps) {
  const { teams } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Check if user is in technical or presales team
  const isTechnicalOrPresales = teams.some(team => 
    team === "technical" || 
    team === "presales" ||
    team === "managed_services"
  );

  useEffect(() => {
    // Filter news based on user's team
    let filteredNews = cyberSecurityNews;
    
    if (!isTechnicalOrPresales && !showKnowledgeBase) {
      // Non-technical users see only general news (not technical knowledge)
      filteredNews = cyberSecurityNews.filter(item => !item.isForTechnicalTeam);
    }
    
    setNews(filteredNews);
  }, [isTechnicalOrPresales, showKnowledgeBase]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
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

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base font-semibold">
              Cybersecurity Updates
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
        {isTechnicalOrPresales && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Extended knowledge base access enabled
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[280px] pr-4">
          <div className="space-y-3">
            {news.map((item) => {
              const CategoryIcon = getCategoryIcon(item.category);
              const isExpanded = expandedItems.has(item.id);
              
              return (
                <Collapsible
                  key={item.id}
                  open={isExpanded}
                  onOpenChange={() => toggleExpanded(item.id)}
                >
                  <div className="rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <button className="w-full p-3 text-left cursor-pointer group">
                        <div className="flex items-start gap-3">
                          <div className={`p-1.5 rounded-md ${getCategoryColor(item.category)} shrink-0`}>
                            <CategoryIcon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                                {item.title}
                              </h4>
                              {item.severity && item.severity !== "info" && (
                                <Badge className={`text-[10px] px-1.5 py-0 ${getSeverityColor(item.severity)}`}>
                                  {item.severity.toUpperCase()}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {item.summary}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {item.category}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDate(item.date)}
                              </span>
                              {item.source && (
                                <span className="text-[10px] text-muted-foreground">
                                  • {item.source}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-1">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="px-3 pb-3 pt-0 border-t border-border/50">
                        {item.fullContent && (
                          <div className="mt-3">
                            <p className="text-xs text-foreground leading-relaxed">
                              {item.fullContent}
                            </p>
                          </div>
                        )}
                        
                        {item.affectedSystems && item.affectedSystems.length > 0 && (
                          <div className="mt-3">
                            <h5 className="text-xs font-medium text-foreground mb-1.5">Affected Systems:</h5>
                            <div className="flex flex-wrap gap-1">
                              {item.affectedSystems.map((system, idx) => (
                                <Badge key={idx} variant="secondary" className="text-[10px]">
                                  {system}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {item.recommendations && item.recommendations.length > 0 && (
                          <div className="mt-3">
                            <h5 className="text-xs font-medium text-foreground mb-1.5">Recommendations:</h5>
                            <ul className="space-y-1">
                              {item.recommendations.map((rec, idx) => (
                                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                                  <span className="text-primary mt-0.5">•</span>
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="mt-3 flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Read More
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}