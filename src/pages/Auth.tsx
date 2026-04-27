import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Mail, Lock, User, ArrowRight, Loader2, Shield, Zap, BarChart3, Users } from "lucide-react";
import { z } from "zod";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { AuthDiagnosticsPanel } from "@/components/auth/AuthDiagnosticsPanel";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const stats = [
  { label: "Active Users", value: "10K+", icon: Users },
  { label: "Modules", value: "8+", icon: BarChart3 },
  { label: "AI-Powered", value: "Yes", icon: Zap },
  { label: "Uptime", value: "99.9%", icon: Shield },
];

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});
  
  const { signIn, signUp, user, isLoading, getRedirectPath, profile, role } = useAuth();
  const navigate = useNavigate();

  // Post-login redirect health check: once the user + profile + role are loaded,
  // route them to the correct landing page (super-admin → /admin/platform,
  // tenant admin → /admin, customer → /customer, else → /).
  useEffect(() => {
    if (!user || isLoading) return;
    // Wait until profile + role have resolved so getRedirectPath() is accurate.
    if (!profile || !role) return;
    const target = getRedirectPath();
    navigate(target, { replace: true });
  }, [user, isLoading, profile, role, getRedirectPath, navigate]);

  const validate = () => {
    const newErrors: { email?: string; password?: string; fullName?: string } = {};
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }
    
    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }
    
    if (!isLogin && !fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Login Failed",
              description: "Invalid email or password. Please try again.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Welcome back!",
            description: "You have successfully logged in.",
          });
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes("User already registered")) {
            toast({
              title: "Account Exists",
              description: "An account with this email already exists. Please log in instead.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Account Created!",
            description: "Your account has been created successfully. You are now logged in.",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <Sparkles className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* Left Side - Premium Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative p-12 flex-col justify-between">
        {/* Animated gradient background */}
        <AnimatedBackground />
        <FloatingParticles count={15} />
        
        {/* Content overlay */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-primary to-emerald-400 flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="font-display text-3xl font-bold tracking-tight">NexusCRM</span>
          </div>
        </div>
        
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-display font-bold leading-tight tracking-tight">
              Manage your entire
              <span className="block mt-2">
                <span className="text-gradient bg-gradient-to-r from-primary via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  business ecosystem
                </span>
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-md leading-relaxed">
              AI-powered enterprise platform with intelligent automation, 
              real-time analytics, and seamless collaboration.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, index) => (
              <div 
                key={stat.label} 
                className="group glass rounded-2xl p-5 border border-primary/10 hover:border-primary/30 transition-all duration-300 hover:scale-105"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <stat.icon className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <p className="text-3xl font-display font-bold text-primary">
                  <AnimatedCounter value={stat.value} />
                </p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
        
        <p className="relative z-10 text-sm text-muted-foreground/60">
          © 2024 NexusCRM. Enterprise-grade security.
        </p>
      </div>

      {/* Right Side - Premium Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        
        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="text-center lg:text-left animate-fade-in">
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-primary to-emerald-400 flex items-center justify-center shadow-lg shadow-primary/30">
                <Sparkles className="w-7 h-7 text-primary-foreground" />
              </div>
              <span className="font-display text-3xl font-bold tracking-tight">NexusCRM</span>
            </div>
            
            <h2 className="text-3xl font-display font-bold tracking-tight">
              {isLogin ? "Welcome back" : "Get started"}
            </h2>
            <p className="text-muted-foreground mt-2 text-lg">
              {isLogin
                ? "Sign in to continue to your dashboard"
                : "Create your account in seconds"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2 animate-fade-in" style={{ animationDelay: "50ms" }}>
                <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-11 h-12 text-base border-2 focus:border-primary transition-colors"
                  />
                </div>
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName}</p>
                )}
              </div>
            )}

            <div className="space-y-2 animate-fade-in" style={{ animationDelay: "100ms" }}>
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12 text-base border-2 focus:border-primary transition-colors"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2 animate-fade-in" style={{ animationDelay: "150ms" }}>
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 h-12 text-base border-2 focus:border-primary transition-colors"
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold animate-fade-in group"
              style={{ animationDelay: "200ms" }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          <div className="text-center animate-fade-in" style={{ animationDelay: "250ms" }}>
            <p className="text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }}
                className="ml-2 text-primary hover:underline font-semibold"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>

          <div className="text-center text-xs text-muted-foreground/70 animate-fade-in" style={{ animationDelay: "300ms" }}>
            <p>New users are assigned the <span className="text-primary font-semibold">Employee</span> role by default.</p>
            <p className="mt-1">Contact an admin for role upgrades.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
