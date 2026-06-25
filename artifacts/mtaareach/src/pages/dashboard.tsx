import { useGetDashboardStats, useGetRecentActivity, useGetGeographicSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, CreditCard, Activity, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: recentActivity, isLoading: activityLoading } = useGetRecentActivity();
  const { data: geoSummary, isLoading: geoLoading } = useGetGeographicSummary();

  const StatCard = ({ title, value, icon: Icon, description, isLoading }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {description}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your campaign and outreach activities.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Contacts"
          value={stats?.totalContacts?.toLocaleString()}
          icon={Users}
          description={`${stats?.newContactsThisWeek || 0} new this week`}
          isLoading={statsLoading}
        />
        <StatCard
          title="Active Campaigns"
          value={stats?.activeCampaigns?.toLocaleString()}
          icon={MessageSquare}
          description={`${stats?.campaignsThisMonth || 0} sent this month`}
          isLoading={statsLoading}
        />
        <StatCard
          title="SMS Sent"
          value={stats?.totalSmsSent?.toLocaleString()}
          icon={Activity}
          description={`${stats?.deliveryRate || 0}% delivery rate`}
          isLoading={statsLoading}
        />
        <StatCard
          title="Wallet Balance"
          value={`KES ${stats?.walletBalance?.toLocaleString() || 0}`}
          icon={CreditCard}
          description="Available for campaigns"
          isLoading={statsLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions across your tenant.</CardDescription>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-3 w-[150px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No recent activity found.</div>
            ) : (
              <div className="space-y-6">
                {recentActivity?.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div className="bg-primary/10 p-2 rounded-full text-primary mt-0.5">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.actorName} • {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {activity.type.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Geographic Distribution</CardTitle>
            <CardDescription>Contacts by county.</CardDescription>
          </CardHeader>
          <CardContent>
            {geoLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : geoSummary?.byCounty?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No geographic data available.</div>
            ) : (
              <div className="space-y-4">
                {geoSummary?.byCounty?.map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <span className="text-sm font-bold">{item.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
