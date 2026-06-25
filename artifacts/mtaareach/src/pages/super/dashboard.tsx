import { useGetSuperAdminDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, MessageSquare, Wallet, TrendingUp, Activity } from "lucide-react";

function StatCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${accent ?? "bg-primary/10 text-primary"}`}>{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SuperDashboard() {
  const { data, isLoading } = useGetSuperAdminDashboard();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform-wide overview across all tenants.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {isLoading ? Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}><CardContent className="p-5"><Skeleton className="h-12 w-full" /></CardContent></Card>
        )) : (
          <>
            <StatCard icon={<Building2 className="h-5 w-5" />} label="Total Tenants" value={data?.totalTenants ?? 0} />
            <StatCard icon={<Activity className="h-5 w-5 text-green-700" />} label="Active Tenants" value={data?.activeTenants ?? 0} accent="bg-green-100 text-green-700" />
            <StatCard icon={<Users className="h-5 w-5 text-blue-700" />} label="Total Users" value={data?.totalUsers ?? 0} accent="bg-blue-100 text-blue-700" />
            <StatCard icon={<Users className="h-5 w-5 text-purple-700" />} label="Total Contacts" value={(data?.totalContacts ?? 0).toLocaleString()} accent="bg-purple-100 text-purple-700" />
            <StatCard icon={<MessageSquare className="h-5 w-5 text-amber-700" />} label="SMS Sent (Total)" value={(data?.totalSmsSent ?? 0).toLocaleString()} accent="bg-amber-100 text-amber-700" />
            <StatCard icon={<Wallet className="h-5 w-5 text-rose-700" />} label="Platform Revenue" value={`KES ${(data?.totalRevenue ?? 0).toLocaleString()}`} accent="bg-rose-100 text-rose-700" />
          </>
        )}
      </div>

      {/* Tenants table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tenant Overview</CardTitle>
          <CardDescription>All registered tenants on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <div className="divide-y rounded-md border">
              {data?.tenants?.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.slug} · {t.contactEmail}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{t.userCount ?? 0}</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-primary" />{t.contactCount ?? 0}</span>
                    <span className="flex items-center gap-1"><Wallet className="h-3.5 w-3.5" />KES {(t.walletBalance ?? 0).toLocaleString()}</span>
                    <Badge variant={t.isActive ? "secondary" : "outline"} className={t.isActive ? "text-green-700 bg-green-100" : ""}>
                      {t.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              )) ?? <p className="text-sm text-muted-foreground p-4">No tenants found.</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Platform Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Avg delivery rate", value: `${Math.round((data?.avgDeliveryRate ?? 0) * 100)}%` },
              { label: "Pending sender IDs", value: data?.pendingSenderIds ?? 0 },
              { label: "Total campaigns", value: data?.totalCampaigns ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" />Wallet Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Total wallet balance", value: `KES ${(data?.totalWalletBalance ?? 0).toLocaleString()}` },
              { label: "Total topped up", value: `KES ${(data?.totalTopUps ?? 0).toLocaleString()}` },
              { label: "Total spent on SMS", value: `KES ${(data?.totalRevenue ?? 0).toLocaleString()}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
