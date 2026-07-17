import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useListCampaigns } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, MessageSquare, Clock, Loader2, Users, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function useApproveCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: number) => {
      const res = await fetch(`/api/campaigns/${campaignId}/approve`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to approve campaign");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
  });
}

function useRejectCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ campaignId, reason }: { campaignId: number; reason: string }) => {
      const res = await fetch(`/api/campaigns/${campaignId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to reject campaign");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
  });
}

export default function CampaignApprovals() {
  const { toast } = useToast();
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; campaignId: number | null; campaignName: string }>({
    open: false, campaignId: null, campaignName: "",
  });
  const [rejectReason, setRejectReason] = useState("");

  const { data: pending, isLoading } = useListCampaigns(
    { page: 1, limit: 50, status: "pending_approval" as any },
    { query: { queryKey: ["/api/campaigns", "pending_approval"], refetchInterval: 15000 } }
  );

  const approveMutation = useApproveCampaign();
  const rejectMutation = useRejectCampaign();

  function handleApprove(id: number, name: string) {
    approveMutation.mutate(id, {
      onSuccess: () => toast({ title: "Campaign approved", description: `"${name}" is now sending.` }),
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  function openReject(id: number, name: string) {
    setRejectDialog({ open: true, campaignId: id, campaignName: name });
    setRejectReason("");
  }

  function handleReject() {
    if (!rejectDialog.campaignId || !rejectReason.trim()) return;
    rejectMutation.mutate({ campaignId: rejectDialog.campaignId, reason: rejectReason.trim() }, {
      onSuccess: () => {
        toast({ title: "Campaign rejected", description: `"${rejectDialog.campaignName}" has been rejected.` });
        setRejectDialog({ open: false, campaignId: null, campaignName: "" });
      },
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  const count = pending?.total ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Campaign Approvals</h1>
        <p className="text-muted-foreground">Review and approve SMS campaigns before they are sent to contacts.</p>
      </div>

      {!isLoading && count === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <CheckCircle2 className="h-10 w-10 opacity-30" />
            <p className="font-medium">No campaigns awaiting approval</p>
            <p className="text-sm">New submissions will appear here automatically.</p>
          </CardContent>
        </Card>
      )}

      {(isLoading || count > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Pending Approval
              </CardTitle>
              <CardDescription>
                {isLoading ? "Loading…" : `${count} campaign${count !== 1 ? "s" : ""} awaiting review`}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Sender</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    pending?.data.map((c) => {
                      const af = c.audienceFilter as Record<string, unknown> ?? {};
                      const filters = [
                        (af.groupIds as number[] | undefined)?.length && `${(af.groupIds as number[]).length} group(s)`,
                        (af.wardIds as number[] | undefined)?.length && `${(af.wardIds as number[]).length} ward(s)`,
                        (af.countyIds as number[] | undefined)?.length && `${(af.countyIds as number[]).length} county`,
                      ].filter(Boolean);

                      return (
                        <TableRow key={c.id}>
                          <TableCell>
                            <div className="font-medium">{c.name}</div>
                            <div className="text-xs text-muted-foreground">Tenant #{c.tenantId}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{c.senderId}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[260px]">
                            <p className="text-sm line-clamp-2 text-muted-foreground">{c.body}</p>
                            <p className="text-xs mt-0.5">
                              {c.body.length} chars · {Math.ceil(c.body.length / 160)} SMS part{Math.ceil(c.body.length / 160) !== 1 ? "s" : ""}
                            </p>
                          </TableCell>
                          <TableCell>
                            {filters.length > 0 ? (
                              <div className="flex gap-1 flex-wrap">
                                {filters.map((f, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{f as string}</Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" /> All opted-in contacts
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs text-destructive border-destructive/40 hover:bg-destructive/5"
                                onClick={() => openReject(c.id, c.name)}
                                disabled={rejectMutation.isPending || approveMutation.isPending}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                className="gap-1.5 text-xs"
                                onClick={() => handleApprove(c.id, c.name)}
                                disabled={approveMutation.isPending && approveMutation.variables === c.id}
                              >
                                {approveMutation.isPending && approveMutation.variables === c.id
                                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Approving…</>
                                  : <><Send className="h-3.5 w-3.5" />Approve & Send</>}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
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
              Reject Campaign
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              You are rejecting <strong>"{rejectDialog.campaignName}"</strong>. The tenant will see this reason and can
              resubmit after making changes.
            </p>
            <div className="space-y-1.5">
              <Label>Reason for rejection <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="e.g. Message contains prohibited content. Please revise and resubmit."
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
              {rejectMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Rejecting…</> : "Reject Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
