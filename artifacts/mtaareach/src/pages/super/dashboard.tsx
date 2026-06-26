import { useGetSuperAdminDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, MessageSquare, Wallet, TrendingUp, Radio } from "lucide-react";

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${accent ?? "bg-primary/10 text-primary"}`}>{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
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

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {isLoading ? Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}><CardContent className="p-5"><Skeleton className="h-12 w-full" /></CardContent></Card>
        )) : (
          <>
            <StatCard icon={<Building2 className="h-5 w-5" />} label="Total Tenants" value={data?.totalTenants ?? 0} />
            <StatCard icon={<Building2 className="h-5 w-5 text-green-700" />} label="Active Tenants" value={data?.activeTenants ?? 0} accent="bg-green-100 text-green-700" />
            <StatCard icon={<Users className="h-5 w-5 text-purple-700" />} label="Total Contacts" value={(data?.totalContacts ?? 0).toLocaleString()} accent="bg-purple-100 text-purple-700" />
            <StatCard icon={<MessageSquare className="h-5 w-5 text-amber-700" />} label="SMS Today" value={(data?.totalSmsSentToday ?? 0).toLocaleString()} accent="bg-amber-100 text-amber-700" />
            <StatCard icon={<MessageSquare className="h-5 w-5 text-blue-700" />} label="SMS This Month" value={(data?.totalSmsThisMonth ?? 0).toLocaleString()} accent="bg-blue-100 text-blue-700" />
          </>
        )}
      </div>

      {/* Top Tenants */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Top Tenants by Activity</CardTitle>
          <CardDescription>Most active organisations on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : (
            <div className="divide-y rounded-md border">
              {data?.topTenants?.length ? data.topTenants.map((t) => (
                <div key={t.tenantId} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{t.tenantName}</p>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-primary" />{t.contactCount.toLocaleString()} contacts</span>
                    <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{t.smsSent.toLocaleString()} SMS</span>
                    {t.walletBalance != null && (
                      <span className="flex items-center gap-1"><Wallet className="h-3.5 w-3.5" />KES {t.walletBalance.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              )) : <p className="text-sm text-muted-foreground p-4">No tenant activity data yet.</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gateway Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Radio className="h-4 w-4 text-primary" />Gateway Status</CardTitle>
          <CardDescription>Active SMS gateway health.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-20 w-full" /> : (
            <div className="space-y-2">
              {data?.gatewayStatus?.length ? data.gatewayStatus.map((g) => (
                <div key={g.gatewayId} className="flex items-center justify-between text-sm p-3 rounded-md border">
                  <span className="font-medium">{g.gatewayName}</span>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{g.sentToday.toLocaleString()} sent today</span>
                    {g.deliveryRate != null && <span>{Math.round(g.deliveryRate * 100)}% delivery</span>}
                    <Badge variant={g.status === "active" ? "secondary" : "outline"} className={g.status === "active" ? "text-green-700 bg-green-100" : ""}>
                      {g.status}
                    </Badge>
                  </div>
                </div>
              )) : <p className="text-sm text-muted-foreground">No gateway data available.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
