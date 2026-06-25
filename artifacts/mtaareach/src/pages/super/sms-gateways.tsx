import { useState } from "react";
import { useListSmsGateways, useCreateSmsGateway, useUpdateSmsGateway } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2, Radio, Pencil } from "lucide-react";

export default function SuperGateways() {
  const queryClient = useQueryClient();
  const { data: gateways, isLoading } = useListSmsGateways();
  const createMutation = useCreateSmsGateway({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/sms-gateways"] });
        setOpen(false);
        setForm({ name: "", apiUrl: "", apiKey: "", isActive: true });
      }
    }
  });
  const updateMutation = useUpdateSmsGateway({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/sms-gateways"] }) }
  });

  const [open, setOpen] = useState(false);
  const [editGateway, setEditGateway] = useState<{ id: number } | null>(null);
  const [form, setForm] = useState({ name: "", apiUrl: "", apiKey: "", isActive: true });

  function openEdit(g: any) {
    setEditGateway({ id: g.id });
    setForm({ name: g.name, apiUrl: g.apiUrl ?? "", apiKey: "", isActive: g.isActive });
    setOpen(true);
  }

  function handleSubmit() {
    if (editGateway) {
      updateMutation.mutate({ gatewayId: editGateway.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">SMS Gateways</h1>
          <p className="text-muted-foreground">Configure SMS provider integrations for sending campaigns.</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditGateway(null); setForm({ name: "", apiUrl: "", apiKey: "", isActive: true }); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Add Gateway
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configured Gateways</CardTitle>
          <CardDescription>{isLoading ? "Loading…" : `${gateways?.length ?? 0} gateways`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gateway Name</TableHead>
                  <TableHead>API URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                ) : gateways?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Radio className="h-8 w-8 opacity-40" />
                        <p>No gateways configured yet.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  gateways?.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{g.name}</TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">{(g as any).apiUrl ?? "—"}</TableCell>
                      <TableCell>
                        {g.isActive
                          ? <Badge variant="secondary" className="text-green-700 bg-green-100">Active</Badge>
                          : <Badge variant="outline">Inactive</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(g.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(g)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
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
            <DialogTitle>{editGateway ? "Edit Gateway" : "Add SMS Gateway"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Gateway Name</Label>
              <Input placeholder="e.g. Africa's Talking" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>API URL</Label>
              <Input placeholder="https://api.gateway.example.com/sms" value={form.apiUrl} onChange={(e) => setForm(f => ({ ...f, apiUrl: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>API Key {editGateway && <span className="text-muted-foreground font-normal">(leave blank to keep existing)</span>}</Label>
              <Input type="password" placeholder="••••••••••••" value={form.apiKey} onChange={(e) => setForm(f => ({ ...f, apiKey: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm(f => ({ ...f, isActive: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.name.trim() || isPending} onClick={handleSubmit}>
              {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : editGateway ? "Update Gateway" : "Add Gateway"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
