import { ReactNode, Fragment } from "react";
import { Link, useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { motion, AnimatePresence, type Variants } from "framer-motion";
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
  UsersRound,
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

const sidebarVariants: Variants = {
  hidden: { x: -20, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" as const } },
};

const navListVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const navItemVariants: Variants = {
  hidden: { x: -12, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.25, ease: "easeOut" as const } },
};

const pageVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" as const } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15, ease: "easeIn" as const } },
};

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
    { label: "All Users", href: "/users", icon: Users, sectionTitle: "Monitor" },
    { label: "All Contacts", href: "/contacts", icon: ShieldCheck },
    { label: "All Campaigns", href: "/campaigns", icon: MessageSquare },
    { label: "Reports", href: "/reports", icon: FileText },
  ];

  const navItems = isSuperAdmin ? superAdminNavItems : tenantNavItems;

  const NavLinks = ({ animated = false }: { animated?: boolean }) => (
    <motion.nav
      variants={animated ? navListVariants : undefined}
      initial={animated ? "hidden" : undefined}
      animate={animated ? "visible" : undefined}
      className="flex flex-col gap-0.5"
    >
      {navItems.map((item) => {
        const isActive = location.startsWith(item.href);
        return (
          <Fragment key={item.href}>
            {"sectionTitle" in item && item.sectionTitle && (
              <div className="pt-3 pb-1 px-3 flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  {item.sectionTitle}
                </span>
                <div className="flex-1 border-t border-sidebar-border/60" />
              </div>
            )}
            <motion.div variants={animated ? navItemVariants : undefined}>
              <Link href={item.href}>
                <div className="relative flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-sm font-medium group transition-colors">
                  {/* Animated active pill */}
                  <AnimatePresence initial={false}>
                    {isActive && (
                      <motion.div
                        layoutId="activeNavBg"
                        className="absolute inset-0 rounded-md bg-primary"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" as const }}
                      />
                    )}
                  </AnimatePresence>
                  {/* Hover background */}
                  {!isActive && (
                    <div className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 bg-sidebar-accent transition-opacity duration-150" />
                  )}
                  <item.icon
                    className={`relative h-4 w-4 transition-colors duration-150 ${
                      isActive
                        ? "text-primary-foreground"
                        : "text-sidebar-foreground group-hover:text-foreground"
                    }`}
                  />
                  <span
                    className={`relative transition-colors duration-150 ${
                      isActive
                        ? "text-primary-foreground"
                        : "text-sidebar-foreground group-hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              </Link>
            </motion.div>
          </Fragment>
        );
      })}
    </motion.nav>
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
              <NavLinks animated={false} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <motion.div
        variants={sidebarVariants}
        initial="hidden"
        animate="visible"
        className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border min-h-screen sticky top-0"
      >
        <div className="p-6 border-b border-sidebar-border flex items-center gap-3">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.3, type: "spring" as const, stiffness: 260, damping: 20 }}
            className="bg-primary p-1.5 rounded-md text-primary-foreground"
          >
            <MessageSquare className="h-5 w-5" />
          </motion.div>
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.25, ease: "easeOut" as const }}
            className="font-bold text-xl tracking-tight text-sidebar-foreground"
          >
            MtaaReach
          </motion.span>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <NavLinks animated={true} />
        </div>
        <div className="p-4 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 px-2 hover:bg-sidebar-accent"
              >
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-sm overflow-hidden">
                  <span className="font-medium truncate w-full text-left">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground truncate w-full text-left capitalize">
                    {user?.role.replace("_", " ")}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {/* Main Content with page transitions */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="mx-auto max-w-6xl w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={location}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
