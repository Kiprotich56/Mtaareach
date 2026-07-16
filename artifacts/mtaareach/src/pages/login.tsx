import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { useLogin } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Shield, Loader2, AlertCircle } from "lucide-react";
import { motion, type Variants } from "framer-motion";

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const logoVariants: Variants = {
  hidden: { scale: 0.6, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 260, damping: 20, delay: 0.05 },
  },
};

export default function Login() {
  const [, setLocation] = useLocation();
  const { setSession } = useAuthStore();
  const [email, setEmail] = useState("admin@demo-outreach.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        setSession(data);
        if (data.user.role === "super_admin") {
          setLocation("/super/dashboard");
        } else {
          setLocation("/dashboard");
        }
      },
      onError: () => {
        setError("Invalid email or password. Please try again.");
      },
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    loginMutation.mutate({ data: { email, password } });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Branding */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center text-center space-y-2"
        >
          <motion.div
            variants={logoVariants}
            className="bg-primary p-3 rounded-xl text-primary-foreground mb-4 shadow-lg"
          >
            <MessageSquare className="h-8 w-8" />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight">MtaaReach CRM</h1>
          <p className="text-muted-foreground">Grassroots operational nerve center</p>
        </motion.div>

        {/* Card */}
        <motion.div variants={itemVariants}>
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle>Welcome back</CardTitle>
              <CardDescription>Enter your credentials to access your account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" as const }}
                    className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </motion.div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={loginMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loginMutation.isPending}
                  />
                </div>

                <Button type="submit" className="w-full mt-4" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in…
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>

                <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    <span className="font-medium">Demo credentials:</span>
                  </div>
                  <div>
                    Tenant Admin:{" "}
                    <button
                      type="button"
                      className="text-primary underline"
                      onClick={() => {
                        setEmail("admin@demo-outreach.com");
                        setPassword("admin123");
                      }}
                    >
                      admin@demo-outreach.com
                    </button>
                  </div>
                  <div>
                    Super Admin:{" "}
                    <button
                      type="button"
                      className="text-primary underline"
                      onClick={() => {
                        setEmail("superadmin@mtaareach.com");
                        setPassword("admin123");
                      }}
                    >
                      superadmin@mtaareach.com
                    </button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
