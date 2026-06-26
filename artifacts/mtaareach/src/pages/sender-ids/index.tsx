import { useState } from "react";
import { useListSenderIds, useRequestSenderId } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Clock, CheckCircle2, XCircle } from "lucide-react";

type SenderIdStatus = "pending" | "approved" | "rejected" | string;

function StatusBadge({ status }: { status: SenderIdStatus }) {
  if (status === "approved") return <Badge variant="secondary" className="gap-1 text-green-700 bg-green-100"><CheckCircle2 className="h-3 w-3" />Approved</Badge>;
  if (status === "rejected") return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
  return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
}

export default function SenderIds() {
  const queryClient = useQueryClient();
  const { data: senderIds, isLoading } = useListSenderIds();
  const requestMutation = useRequestSenderId({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/sender-ids"] });
        setOpen(false);
        setForm({ name: "" });
      }
    }
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "" });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Sender IDs</h1>
          <p className="text-muted-foreground">Manage approved SMS sender names for your campaigns.</p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Request Sender ID
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your Sender IDs</CardTitle>
          <CardDescription>Approved IDs can be used in campaigns. Pending IDs await Super Admin review.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rejection Reason</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Requested</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : senderIds?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No sender IDs yet. Request one to start sending campaigns.
                    </TableCell>
                  </TableRow>
                ) : (
                  senderIds?.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono font-semibold">{s.name}</TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{s.rejectionReason ?? "—"}</TableCell>
                      <TableCell>
                        {s.isDefault ? <Badge variant="secondary" className="text-xs">Default</Badge> : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Sender ID</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Sender ID Name</Label>
              <Input
                placeholder="e.g. OUTREACH or KISIIMBI"
                maxLength={11}
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value.toUpperCase() }))}
              />
              <p className="text-xs text-muted-foreground">Max 11 characters. This is what recipients see as the "From" name.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.name.trim() || requestMutation.isPending}
              onClick={() => requestMutation.mutate({ data: { name: form.name } })}
            >
              {requestMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</> : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
