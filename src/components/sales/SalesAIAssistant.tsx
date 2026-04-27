import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Loader2, Handshake, Users, Building2, CheckCircle, XCircle, Package, Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAIChat } from "@/hooks/useAIChat";
import { AIChatErrorBanner } from "@/components/ai/AIChatErrorBanner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolResults?: { success: boolean; message: string }[];
}

const QUICK_ACTIONS = [
  { label: "Create a Deal", query: "I want to create a new deal", icon: Handshake },
  { label: "Add Contact", query: "Help me add a new contact", icon: Users },
  { label: "Add Organization", query: "I need to create a new organization", icon: Building2 },
  { label: "Add Product", query: "I want to add a new product", icon: Package },
  { label: "Add OEM", query: "Help me create a new OEM/vendor", icon: Factory },
];

const EXAMPLE_PROMPTS = [
  "Create a deal for ABC Corp worth $50,000",
  "Add a contact named John Smith from Tech Solutions, email john@techsolutions.com",
  "Create an organization called Global Industries in manufacturing sector",
  "Add a product called CloudSecure Firewall from Palo Alto Networks",
  "Create OEM Cisco with gold partnership, headquarters in San Jose",
];

export function SalesAIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your Sales AI Assistant. I can help you quickly create deals, contacts, organizations, products, and OEMs. Just tell me what you need!\n\nFor example:\n• \"Create a deal for ABC Corp worth $50,000\"\n• \"Add a contact John Smith from Tech Solutions\"\n• \"Create an organization called Global Industries\"\n• \"Add product CloudSecure from Palo Alto Networks\"\n• \"Create OEM Cisco with gold partnership\"",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [lastUserText, setLastUserText] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const { send, isLoading, error, attemptCount, reset } = useAIChat();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading || !user || !currentTenant) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Calls the self-hosted Fastify backend (`backend/src/routes/ai.ts`).
      // The endpoint returns `{ response, provider, model, usage }` — no
      // streaming, no Supabase Edge Functions.
      const data = await restRequest<{
        response: string;
        toolResults?: { success: boolean; message: string }[];
      }>("/api/ai/chat", {
        method: "POST",
        body: {
          context: "sales",
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          userId: user.id,
          tenantId: currentTenant.id,
        },
      });

      // Invalidate queries if any tool was executed successfully
      if (data.toolResults) {
        const successfulTools = data.toolResults.filter((r) => r.success);
        if (successfulTools.length > 0) {
          queryClient.invalidateQueries({ queryKey: ["deals"] });
          queryClient.invalidateQueries({ queryKey: ["contacts"] });
          queryClient.invalidateQueries({ queryKey: ["alliance-organizations"] });
          queryClient.invalidateQueries({ queryKey: ["offerings-products"] });
          queryClient.invalidateQueries({ queryKey: ["offerings-oems"] });

          successfulTools.forEach((result) => {
            toast.success(result.message);
          });
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        toolResults: data.toolResults,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      if (error instanceof ApiError) {
        if (error.status === 429) toast.error("Rate limit exceeded. Please try again later.");
        else if (error.status === 402) toast.error("AI credits exhausted. Please add funds.");
        else toast.error(error.message || "Failed to get response");
      }
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "I apologize, but I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sales to-sales/60 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            Sales AI Assistant
          </h1>
          <p className="text-muted-foreground mt-1">
            Create deals, contacts, organizations, products, and OEMs using natural language
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chat Area */}
        <Card className="lg:col-span-3 flex flex-col h-[600px]">
          <CardHeader className="border-b border-border py-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="w-5 h-5 text-sales" />
              Chat with Sales AI
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id}>
                    <div
                      className={cn(
                        "flex gap-3 animate-fade-in",
                        message.role === "user" && "flex-row-reverse"
                      )}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                          message.role === "assistant"
                            ? "bg-sales/20 text-sales"
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
                          "rounded-xl p-3 max-w-[80%]",
                          message.role === "assistant"
                            ? "bg-muted text-foreground"
                            : "bg-sales text-primary-foreground"
                        )}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                    </div>
                    
                    {/* Show tool results */}
                    {message.toolResults && message.toolResults.length > 0 && (
                      <div className="ml-11 mt-2 space-y-1">
                        {message.toolResults.map((result, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "flex items-center gap-2 text-xs px-3 py-1.5 rounded-md",
                              result.success
                                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                : "bg-red-500/10 text-red-600 dark:text-red-400"
                            )}
                          >
                            {result.success ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {result.message}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 animate-fade-in">
                    <div className="w-8 h-8 rounded-lg bg-sales/20 text-sales flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-muted rounded-xl p-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Tell me what you want to create..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button onClick={() => handleSend()} disabled={!input.trim() || isLoading}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.label}
                    variant="outline"
                    className="w-full justify-start text-sm gap-2"
                    onClick={() => handleSend(action.query)}
                    disabled={isLoading}
                  >
                    <Icon className="w-4 h-4" />
                    {action.label}
                  </Button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Example Prompts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {EXAMPLE_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  className="w-full text-left text-xs p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                  onClick={() => setInput(prompt)}
                  disabled={isLoading}
                >
                  "{prompt}"
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">What I Can Do</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <div className="flex items-center gap-2">
                <Handshake className="w-4 h-4 text-sales" />
                <span>Create new deals</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sales" />
                <span>Add contacts</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sales" />
                <span>Create organizations</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-sales" />
                <span>Add products</span>
              </div>
              <div className="flex items-center gap-2">
                <Factory className="w-4 h-4 text-sales" />
                <span>Create OEMs/vendors</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
