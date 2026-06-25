import { useState } from "react";
import { useListAuditLogs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, UserCircle, MessageSquare, Settings, Wallet } from "lucide-react";

const ACTION_ICONS: Record<string, React.ReactNode> = {
  login: <UserCircle className="h-3.5 w-3.5" />,
  logout: <UserCircle className="h-3.5 w-3.5" />,
  campaign_created: <MessageSquare className="h-3.5 w-3.5" />,
  campaign_executed: <MessageSquare className="h-3.5 w-3.5" />,
  contact_imported: <UserCircle className="h-3.5 w-3.5" />,
  template_created: <Settings className="h-3.5 w-3.5" />,
  wallet_topup: <Wallet className="h-3.5 w-3.5" />,
};

function actionLabel(action: string) {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SuperAuditLogs() {
  const [page, setPage] = useState(1);
  const [tenantFilter] = useState<number | undefined>();

  const { data: logsPage, isLoading } = useListAuditLogs({
    page,
    limit: 25,
    tenantId: tenantFilter,
  });

  const totalPages = logsPage ? Math.ceil(logsPage.total / logsPage.limit) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Audit Logs</h1>
          <p className="text-muted-foreground">Complete activity trail across all tenants and users.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="__all">
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All tenants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All tenants</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Activity Log
          </CardTitle>
          <CardDescription>{isLoading ? "Loading…" : `${logsPage?.total ?? 0} events`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                ) : logsPage?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No audit logs found.</TableCell>
                  </TableRow>
                ) : (
                  logsPage?.data.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline" className="gap-1 text-xs font-normal">
                          {ACTION_ICONS[log.action] ?? <Shield className="h-3 w-3" />}
                          {actionLabel(log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.userName ?? <span className="text-muted-foreground italic">System</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{log.tenantName ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {log.details ? (typeof log.details === "string" ? log.details : JSON.stringify(log.details)) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleDateString()}{" "}
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>Next</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
