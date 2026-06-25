import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  MapPin, 
  CreditCard, 
  FileText, 
  Settings,
  LogOut,
  Building,
  ShieldCheck,
  Server,
  Activity,
  Menu,
  PhoneForwarded,
  FileCode2,
  UsersRound
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, isSuperAdmin, clearSession } = useAuthStore();
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    clearSession();
    setLocation("/login");
  };

  const tenantNavItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Contacts", href: "/contacts", icon: Users },
    { label: "Groups", href: "/groups", icon: UsersRound },
    { label: "Campaigns", href: "/campaigns", icon: MessageSquare },
    { label: "Templates", href: "/templates", icon: FileCode2 },
    { label: "Villages", href: "/geography/villages", icon: MapPin },
    { label: "Polling Stations", href: "/geography/polling-stations", icon: MapPin },
    { label: "Sender IDs", href: "/sender-ids", icon: PhoneForwarded },
    { label: "Wallet", href: "/wallet", icon: CreditCard },
    { label: "Reports", href: "/reports", icon: FileText },
    { label: "Users", href: "/users", icon: ShieldCheck },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const superAdminNavItems = [
    { label: "Dashboard", href: "/super/dashboard", icon: LayoutDashboard },
    { label: "Tenants", href: "/super/tenants", icon: Building },
    { label: "Sender IDs", href: "/super/sender-ids", icon: PhoneForwarded },
    { label: "Wallets", href: "/super/wallet-management", icon: CreditCard },
    { label: "SMS Gateways", href: "/super/sms-gateways", icon: Server },
    { label: "Audit Logs", href: "/super/audit-logs", icon: Activity },
  ];

  const navItems = isSuperAdmin ? superAdminNavItems : tenantNavItems;

  const NavLinks = () => (
    <>
      {navItems.map((item) => {
        const isActive = location.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href}>
            <div
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm font-medium ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </div>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2 font-bold text-lg text-primary tracking-tight">
          <MessageSquare className="h-5 w-5" />
          MtaaReach
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="p-4 border-b">
              <div className="flex items-center gap-2 font-bold text-xl text-primary tracking-tight">
                <MessageSquare className="h-6 w-6" />
                MtaaReach
              </div>
            </div>
            <div className="p-4 flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-80px)]">
              <NavLinks />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border min-h-screen sticky top-0">
        <div className="p-6 border-b border-sidebar-border flex items-center gap-3">
          <div className="bg-primary p-1.5 rounded-md text-primary-foreground">
            <MessageSquare className="h-5 w-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-sidebar-foreground">MtaaReach</span>
        </div>
        <div className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
          <NavLinks />
        </div>
        <div className="p-4 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 h-12 px-2 hover:bg-sidebar-accent">
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-sm overflow-hidden">
                  <span className="font-medium truncate w-full text-left">{user?.firstName} {user?.lastName}</span>
                  <span className="text-xs text-muted-foreground truncate w-full text-left capitalize">
                    {user?.role.replace('_', ' ')}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="mx-auto max-w-6xl w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
