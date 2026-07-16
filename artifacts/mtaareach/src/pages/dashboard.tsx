import { useGetDashboardStats, useGetRecentActivity, useGetGeographicSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, CreditCard, Activity, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { motion, type Variants } from "framer-motion";

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const listItem: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: "easeOut" as const } },
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: recentActivity, isLoading: activityLoading } = useGetRecentActivity();
  const { data: geoSummary, isLoading: geoLoading } = useGetGeographicSummary();

  const StatCard = ({
    title,
    value,
    icon: Icon,
    description,
    isLoading,
    index,
  }: {
    title: string;
    value: string | undefined;
    icon: React.ElementType;
    description: string;
    isLoading: boolean;
    index: number;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35, ease: "easeOut" as const }}
    >
      <Card className="h-full hover:shadow-md transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className="bg-primary/10 p-1.5 rounded-md">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-7 w-20" />
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: index * 0.08 + 0.15,
                duration: 0.3,
                type: "spring" as const,
                stiffness: 200,
              }}
              className="text-2xl font-bold"
            >
              {value}
            </motion.div>
          )}
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" as const }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your campaign and outreach activities.</p>
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          index={0}
          title="Total Contacts"
          value={stats?.totalContacts?.toLocaleString()}
          icon={Users}
          description={`${stats?.newContactsThisWeek || 0} new this week`}
          isLoading={statsLoading}
        />
        <StatCard
          index={1}
          title="Active Campaigns"
          value={stats?.activeCampaigns?.toLocaleString()}
          icon={MessageSquare}
          description={`${stats?.campaignsThisMonth || 0} sent this month`}
          isLoading={statsLoading}
        />
        <StatCard
          index={2}
          title="SMS Sent"
          value={stats?.totalSmsSent?.toLocaleString()}
          icon={Activity}
          description={`${stats?.deliveryRate || 0}% delivery rate`}
          isLoading={statsLoading}
        />
        <StatCard
          index={3}
          title="Wallet Balance"
          value={`KES ${stats?.walletBalance?.toLocaleString() || 0}`}
          icon={CreditCard}
          description="Available for campaigns"
          isLoading={statsLoading}
        />
      </div>

      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-7"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.35, ease: "easeOut" as const }}
      >
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions across your tenant.</CardDescription>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
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
              <motion.div
                className="space-y-6"
                variants={stagger}
                initial="hidden"
                animate="visible"
              >
                {recentActivity?.map((activity) => (
                  <motion.div key={activity.id} variants={listItem} className="flex items-start gap-4">
                    <div className="bg-primary/10 p-2 rounded-full text-primary mt-0.5 shrink-0">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.actorName} • {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize shrink-0">
                      {activity.type.replace("_", " ")}
                    </Badge>
                  </motion.div>
                ))}
              </motion.div>
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
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : geoSummary?.byCounty?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No geographic data available.
              </div>
            ) : (
              <motion.div
                className="space-y-4"
                variants={stagger}
                initial="hidden"
                animate="visible"
              >
                {geoSummary?.byCounty?.map((item, i) => {
                  const maxCount = Math.max(...(geoSummary.byCounty?.map((c) => c.count) ?? [1]));
                  const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                  return (
                    <motion.div key={item.label} variants={listItem} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                        <span className="text-sm font-bold">{item.count.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{
                            delay: i * 0.08 + 0.4,
                            duration: 0.5,
                            ease: "easeOut" as const,
                          }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
