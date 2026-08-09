import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Headphones, Shield, Mail, Lock } from "lucide-react";
import { PageSeo } from "@/components/seo/PageSeo";

export default function SupportPortal() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if user is a customer
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_category")
          .eq("user_id", session.user.id)
          .single();
        
        if (profile?.user_category === "customer") {
          navigate("/support/dashboard");
        }
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user is a customer
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_category")
        .eq("user_id", data.user.id)
        .single();

      if (profile?.user_category !== "customer") {
        await supabase.auth.signOut();
        toast.error("Access denied. This portal is for customers only.");
        return;
      }

      toast.success("Welcome to Support Center!");
      navigate("/support/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/support/dashboard`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      // Update profile to mark as customer
      if (data.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ user_category: "customer", full_name: fullName })
          .eq("user_id", data.user.id);

        if (profileError) {
          toast.warning(
            "Account created, but we couldn't finish setting up your profile. Please contact support if you see missing details.",
          );
          return;
        }
      }

      toast.success("Account created! Please check your email to verify.");

    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-dvh bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <PageSeo
        title="Customer Support Center — NexusCRM"
        description="Sign in or create an account to raise support tickets and track your requests with the NexusCRM support team."
        path="/support"
      />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Headphones className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Support Center</h1>
          <p className="text-muted-foreground mt-2">
            Get help with your products and services
          </p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardHeader>
                  <CardTitle className="text-xl">Welcome back</CardTitle>
                  <CardDescription>
                    Sign in to access your support dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </CardContent>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp}>
                <CardHeader>
                  <CardTitle className="text-xl">Create account</CardTitle>
                  <CardDescription>
                    Register to access customer support
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signupEmail">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signupEmail"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signupPassword">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signupPassword"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </CardContent>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Secure Portal</span>
          </div>
          <div className="flex items-center gap-2">
            <Headphones className="h-4 w-4" />
            <span>24/7 Support</span>
          </div>
        </div>
      </div>
    </div>
  );
}
