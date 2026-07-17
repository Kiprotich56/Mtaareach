import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListVillages, useApproveVillage, useRejectVillage } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function VillageApprovals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; villageId: number | null; villageName: string }>({
    open: false, villageId: null, villageName: "",
  });
  const [rejectReason, setRejectReason] = useState("");

  const { data: villages, isLoading } = useListVillages(
    { status: "pending" },
    { query: { queryKey: ["/api/geography/villages", "pending"], refetchInterval: 15000 } }
  );

  const approveMutation = useApproveVillage({
    mutation: {
      onSuccess: (_, { villageId }) => {
        queryClient.invalidateQueries({ queryKey: ["/api/geography/villages"] });
        toast({ title: "Village approved", description: "The village is now active and available for contacts." });
      },
      onError: (e) => toast({ title: "Error", description: (e as Error).message, variant: "destructive" }),
    },
  });

  const rejectMutation = useRejectVillage({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/geography/villages"] });
        toast({ title: "Village rejected", description: `"${rejectDialog.villageName}" has been rejected.` });
        setRejectDialog({ open: false, villageId: null, villageName: "" });
      },
      onError: (e) => toast({ title: "Error", description: (e as Error).message, variant: "destructive" }),
    },
  });

  function openReject(id: number, name: string) {
    setRejectDialog({ open: true, villageId: id, villageName: name });
    setRejectReason("");
  }

  function handleReject() {
    if (!rejectDialog.villageId || !rejectReason.trim()) return;
    rejectMutation.mutate({ villageId: rejectDialog.villageId, data: { reason: rejectReason.trim() } });
  }

  const count = villages?.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Village Approvals</h1>
        <p className="text-muted-foreground">Review village additions submitted by tenants before they become available.</p>
      </div>

      {!isLoading && count === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <CheckCircle2 className="h-10 w-10 opacity-30" />
            <p className="font-medium">No villages awaiting approval</p>
            <p className="text-sm">New village submissions will appear here automatically.</p>
          </CardContent>
        </Card>
      )}

      {(isLoading || count > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-500" />
                Pending Village Additions
              </CardTitle>
              <CardDescription>
                {isLoading ? "Loading…" : `${count} village${count !== 1 ? "s" : ""} awaiting review`}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Village</TableHead>
                    <TableHead>Ward</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>GPS Coordinates</TableHead>
                    <TableHead>Population</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    villages?.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <div className="font-medium flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            {v.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{v.wardName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">Tenant #{(v as any).tenantId}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">
                          {v.gpsCoordinates ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {v.population != null ? v.population.toLocaleString() : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(v.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-xs text-destructive border-destructive/40 hover:bg-destructive/5"
                              onClick={() => openReject(v.id, v.name)}
                              disabled={rejectMutation.isPending || approveMutation.isPending}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              className="gap-1.5 text-xs"
                              onClick={() => approveMutation.mutate({ villageId: v.id })}
                              disabled={approveMutation.isPending}
                            >
                              {approveMutation.isPending
                                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Approving…</>
                                : <><CheckCircle2 className="h-3.5 w-3.5" />Approve</>}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reject dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(o) => !o && setRejectDialog(d => ({ ...d, open: false }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Reject Village
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              You are rejecting <strong>"{rejectDialog.villageName}"</strong>. Please provide a reason so the tenant
              knows what to correct before resubmitting.
            </p>
            <div className="space-y-1.5">
              <Label>Reason for rejection <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="e.g. Village name already exists in this ward. Please check spelling or use a more specific name."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(d => ({ ...d, open: false }))}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Rejecting…</> : "Reject Village"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
