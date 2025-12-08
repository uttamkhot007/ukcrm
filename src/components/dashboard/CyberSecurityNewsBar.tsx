import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Shield, 
  AlertTriangle, 
  ExternalLink, 
  RefreshCw, 
  Newspaper,
  Lock,
  Bug,
  Server,
  Globe
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: "vulnerability" | "threat" | "update" | "advisory" | "knowledge";
  severity?: "critical" | "high" | "medium" | "low" | "info";
  date: string;
  source?: string;
  isForTechnicalTeam?: boolean;
}

// Sample cybersecurity news and knowledge base
const cyberSecurityNews: NewsItem[] = [
  {
    id: "1",
    title: "Critical Zero-Day in Popular Enterprise Software",
    summary: "A critical zero-day vulnerability has been discovered affecting major enterprise applications. Immediate patching recommended.",
    category: "vulnerability",
    severity: "critical",
    date: new Date().toISOString(),
    source: "Security Advisory",
    isForTechnicalTeam: true,
  },
  {
    id: "2",
    title: "New Ransomware Variant Targeting Healthcare Sector",
    summary: "Security researchers have identified a new ransomware strain specifically targeting healthcare organizations.",
    category: "threat",
    severity: "high",
    date: new Date(Date.now() - 86400000).toISOString(),
    source: "Threat Intelligence",
  },
  {
    id: "3",
    title: "Microsoft Releases Emergency Security Patches",
    summary: "Microsoft has released out-of-band security updates addressing multiple critical vulnerabilities in Windows and Office.",
    category: "update",
    severity: "high",
    date: new Date(Date.now() - 172800000).toISOString(),
    source: "Vendor Update",
  },
  {
    id: "4",
    title: "NIST Updates Cybersecurity Framework",
    summary: "The National Institute of Standards and Technology has released version 2.0 of its Cybersecurity Framework.",
    category: "advisory",
    severity: "info",
    date: new Date(Date.now() - 259200000).toISOString(),
    source: "Regulatory",
  },
  {
    id: "5",
    title: "Understanding Zero Trust Architecture",
    summary: "Deep dive into implementing Zero Trust security model in enterprise environments. Key principles and best practices.",
    category: "knowledge",
    severity: "info",
    date: new Date(Date.now() - 345600000).toISOString(),
    source: "Knowledge Base",
    isForTechnicalTeam: true,
  },
  {
    id: "6",
    title: "Cloud Security Best Practices for 2024",
    summary: "Essential security configurations and monitoring strategies for AWS, Azure, and GCP environments.",
    category: "knowledge",
    severity: "info",
    date: new Date(Date.now() - 432000000).toISOString(),
    source: "Knowledge Base",
    isForTechnicalTeam: true,
  },
  {
    id: "7",
    title: "API Security: Common Vulnerabilities and Mitigations",
    summary: "Comprehensive guide to identifying and preventing OWASP API Top 10 vulnerabilities in your applications.",
    category: "knowledge",
    severity: "info",
    date: new Date(Date.now() - 518400000).toISOString(),
    source: "Knowledge Base",
    isForTechnicalTeam: true,
  },
  {
    id: "8",
    title: "Incident Response Playbook Updates",
    summary: "Updated procedures for handling security incidents including ransomware, data breaches, and insider threats.",
    category: "advisory",
    severity: "medium",
    date: new Date(Date.now() - 604800000).toISOString(),
    source: "Internal",
    isForTechnicalTeam: true,
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
              return (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer group"
                >
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
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
