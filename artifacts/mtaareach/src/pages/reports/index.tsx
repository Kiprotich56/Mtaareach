import { useGetContactReport, useGetCampaignReport, useGetGeographicSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import { Users, MessageSquare, MapPin, TrendingUp } from "lucide-react";

const COLORS = ["#2d6a4f", "#40916c", "#52b788", "#74c69d", "#95d5b2", "#b7e4c7"];

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="bg-primary/10 p-3 rounded-xl text-primary">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const { data: contactReport, isLoading: crLoading } = useGetContactReport();
  const { data: campaignReport, isLoading: camLoading } = useGetCampaignReport();
  const { data: geoSummary, isLoading: geoLoading } = useGetGeographicSummary();

  const genderData = contactReport?.byGender?.map((b) => ({ name: b.label, value: b.count })) ?? [];
  const ageData = contactReport?.byAgeGroup?.map((b) => ({ name: b.label, value: b.count })) ?? [];
  const countyData = geoSummary?.byCounty?.map((b) => ({ name: b.label, contacts: b.count })) ?? [];
  const monthlyData = campaignReport?.byMonth?.map((b) => ({ name: b.label, count: b.count })) ?? [];

  const deliveryPct = Math.round((campaignReport?.deliveryRate ?? 0) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Reports</h1>
        <p className="text-muted-foreground">Analytics across contacts, campaigns, and geography.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {crLoading || camLoading ? Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-5"><Skeleton className="h-12 w-full" /></CardContent></Card>
        )) : (
          <>
            <StatCard icon={<Users className="h-5 w-5" />} label="Total Contacts" value={(contactReport?.totalContacts ?? 0).toLocaleString()} />
            <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Opted In" value={(contactReport?.withConsent ?? 0).toLocaleString()}
              sub={`${Math.round(((contactReport?.withConsent ?? 0) / (contactReport?.totalContacts || 1)) * 100)}% of total`} />
            <StatCard icon={<MessageSquare className="h-5 w-5" />} label="Total SMS Sent" value={(campaignReport?.totalSmsSent ?? 0).toLocaleString()} />
            <StatCard icon={<MapPin className="h-5 w-5" />} label="Delivery Rate" value={`${deliveryPct}%`}
              sub={`${(campaignReport?.totalDelivered ?? 0).toLocaleString()} delivered`} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Contacts by County</CardTitle>
            <CardDescription>Geographic distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {geoLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={countyData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="contacts" fill="#2d6a4f" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Contacts by Gender</CardTitle>
            <CardDescription>Gender breakdown</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {crLoading ? <Skeleton className="h-48 w-48 rounded-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                    label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={false}>
                    {genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Contacts by Age Group</CardTitle>
            <CardDescription>Demographic breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {crLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ageData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#52b788" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">SMS Activity by Month</CardTitle>
            <CardDescription>Campaign message volumes</CardDescription>
          </CardHeader>
          <CardContent>
            {camLoading ? <Skeleton className="h-48 w-full" /> : monthlyData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No monthly data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#40916c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {genderData.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Constituency Breakdown</CardTitle>
              <CardDescription>Contacts per constituency</CardDescription>
            </CardHeader>
            <CardContent>
              {crLoading ? <Skeleton className="h-48 w-full" /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={contactReport?.byConstituency?.map(b => ({ name: b.label, value: b.count })) ?? []}
                    margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#74c69d" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
