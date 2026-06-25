import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Shield } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { setSession } = useAuthStore();
  const [email, setEmail] = useState("admin@mtaareach.com");
  const [password, setPassword] = useState("password");
  const [role, setRole] = useState<"tenant_admin" | "super_admin">("tenant_admin");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login
    setSession({
      user: {
        id: role === "super_admin" ? 999 : 1,
        email,
        firstName: role === "super_admin" ? "System" : "Tenant",
        lastName: "Admin",
        role: role,
        isActive: true,
        createdAt: new Date().toISOString()
      },
      token: "mock-jwt-token"
    });
    
    if (role === "super_admin") {
      setLocation("/super/dashboard");
    } else {
      setLocation("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="bg-primary p-3 rounded-xl text-primary-foreground mb-4">
            <MessageSquare className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">MtaaReach CRM</h1>
          <p className="text-muted-foreground">Grassroots operational nerve center</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
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
                />
              </div>
              
              <div className="pt-2 flex items-center gap-2">
                <div className="flex-1 bg-muted p-1 rounded-md flex">
                  <button
                    type="button"
                    onClick={() => setRole("tenant_admin")}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-sm transition-colors ${role === "tenant_admin" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Tenant
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("super_admin")}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-sm font-medium rounded-sm transition-colors ${role === "super_admin" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Super
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full mt-4">
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
