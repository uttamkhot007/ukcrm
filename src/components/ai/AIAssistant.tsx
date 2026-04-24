import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, User, Brain, TrendingUp, Shield, Building2, Ticket, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

const QUICK_ACTIONS = [
  { label: "Cyber Trends", query: "What are the latest ransomware trends?", icon: TrendingUp },
  { label: "Objection Help", query: "Help me handle a price objection", icon: Shield },
  { label: "Account Insights", query: "Give me insights about accounts", icon: Building2 },
  { label: "Tickets Summary", query: "Summarize open tickets", icon: Ticket },
  { label: "Technical Issues", query: "What are common technical issues?", icon: Wrench },
];

const initialMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    content:
      "Hello! I'm your Intelligent CRM Assistant. I can help you with:\n\n• **Cyber Security Trends** - Latest threats and protection strategies\n• **Objection Handling** - Sales objection strategies\n• **Account Intelligence** - Deep insights about accounts\n• **Ticket Analysis** - Summaries and patterns\n• **Technical Support** - Issue resolution guidance\n\nHow can I assist you today?",
  },
];

export function AIAssistant({ isOpen, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: messages.length + 1,
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("intelligent-assistant", {
        body: {
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          userId: user?.id,
          tenantId: currentTenant?.id,
        },
      });

      if (error) {
        if (error.message?.includes("429")) {
          toast.error("Rate limit reached. Please try again in a moment.");
        } else if (error.message?.includes("402")) {
          toast.error("AI credits exhausted. Please contact administrator.");
        } else {
          throw error;
        }
        setIsLoading(false);
        return;
      }

      const assistantMessage: Message = {
        id: messages.length + 2,
        role: "assistant",
        content: data.message || "I apologize, I couldn't process that request.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to get response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-screen w-96 bg-card border-l border-border z-50 flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">AI Assistant</h3>
            <p className="text-xs text-muted-foreground">Cyber • Sales • Support</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3 animate-fade-in",
                message.role === "user" && "flex-row-reverse"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  message.role === "assistant"
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {message.role === "assistant" ? (
                  <Bot className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <div
                className={cn(
                  "rounded-xl p-3 max-w-[85%]",
                  message.role === "assistant"
                    ? "bg-muted text-foreground"
                    : "bg-primary text-primary-foreground"
                )}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-muted rounded-xl p-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <span
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <span
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      <div className="px-4 pb-2">
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => setInput(action.query)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
            >
              <action.icon className="w-3 h-3" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about trends, accounts, tickets..."
            className="flex-1 bg-muted/50"
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
