import { useListSenderIds, useApproveSenderId, useRejectSenderId } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SenderIdStatus } from "@workspace/api-client-react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

function StatusBadge({ status }: { status: SenderIdStatus }) {
  if (status === "approved") return <Badge variant="secondary" className="gap-1 text-green-700 bg-green-100"><CheckCircle2 className="h-3 w-3" />Approved</Badge>;
  if (status === "rejected") return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
  return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
}

export default function SuperSenderIds() {
  const queryClient = useQueryClient();
  const { data: senderIds, isLoading } = useListSenderIds();
  const approveMutation = useApproveSenderId({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/sender-ids"] }) } });
  const rejectMutation = useRejectSenderId({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/sender-ids"] }) } });

  const pending = senderIds?.filter((s) => s.status === "pending") ?? [];
  const others = senderIds?.filter((s) => s.status !== "pending") ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Sender ID Approvals</h1>
        <p className="text-muted-foreground">Review and approve sender ID requests from tenants.</p>
      </div>

      {pending.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              Pending Review
              <Badge variant="secondary" className="text-amber-700 bg-amber-100">{pending.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sender ID</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Rejection Reason</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono font-semibold">{s.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.tenantName ?? `Tenant #${s.tenantId}`}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.rejectionReason ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => rejectMutation.mutate({ senderIdId: s.id, data: { reason: "Does not meet requirements" } })}>
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </Button>
                          <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700"
                            onClick={() => approveMutation.mutate({ senderIdId: s.id })}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Sender IDs</CardTitle>
          <CardDescription>{isLoading ? "Loading…" : `${senderIds?.length ?? 0} sender IDs across all tenants`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sender ID</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rejection Reason</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                ) : others.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No processed sender IDs yet.</TableCell>
                  </TableRow>
                ) : (
                  others.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono font-semibold">{s.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.tenantName ?? `Tenant #${s.tenantId}`}</TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.rejectionReason ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
