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

type GatewayForm = { name: string; provider: string; apiEndpoint: string; apiKey: string; isActive: boolean; isPrimary: boolean };

const defaultForm: GatewayForm = { name: "", provider: "", apiEndpoint: "", apiKey: "", isActive: true, isPrimary: false };

export default function SuperGateways() {
  const queryClient = useQueryClient();
  const { data: gateways, isLoading } = useListSmsGateways();
  const createMutation = useCreateSmsGateway({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/sms-gateways"] });
        setOpen(false);
        setForm(defaultForm);
      }
    }
  });
  const updateMutation = useUpdateSmsGateway({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/sms-gateways"] }) }
  });

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<GatewayForm>(defaultForm);

  function openEdit(g: { id: number; name: string; apiEndpoint?: string | null; isActive: boolean; isPrimary: boolean; provider: string }) {
    setEditId(g.id);
    setForm({ name: g.name, provider: g.provider, apiEndpoint: g.apiEndpoint ?? "", apiKey: "", isActive: g.isActive, isPrimary: g.isPrimary });
    setOpen(true);
  }

  function handleSubmit() {
    if (editId !== null) {
      updateMutation.mutate({
        gatewayId: editId,
        data: {
          name: form.name || undefined,
          apiEndpoint: form.apiEndpoint || null,
          apiKey: form.apiKey || null,
          isActive: form.isActive,
          isPrimary: form.isPrimary,
        }
      });
    } else {
      createMutation.mutate({
        data: {
          name: form.name,
          provider: form.provider,
          apiEndpoint: form.apiEndpoint || undefined,
          apiKey: form.apiKey || undefined,
          isPrimary: form.isPrimary,
        }
      });
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
        <Button className="gap-2" onClick={() => { setEditId(null); setForm(defaultForm); setOpen(true); }}>
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
                  <TableHead>Provider</TableHead>
                  <TableHead>API Endpoint</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                ) : gateways?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
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
                      <TableCell className="text-sm text-muted-foreground">{g.provider}</TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground truncate max-w-[160px]">{g.apiEndpoint ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {g.isActive
                            ? <Badge variant="secondary" className="text-green-700 bg-green-100">Active</Badge>
                            : <Badge variant="outline">Inactive</Badge>}
                          {g.isPrimary && <Badge variant="secondary" className="text-blue-700 bg-blue-100">Primary</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{g.totalSent?.toLocaleString() ?? "—"}</TableCell>
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
            <DialogTitle>{editId !== null ? "Edit Gateway" : "Add SMS Gateway"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Gateway Name</Label>
              <Input placeholder="e.g. Africa's Talking" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            {editId === null && (
              <div className="space-y-2">
                <Label>Provider Slug</Label>
                <Input placeholder="e.g. africastalking, twilio" value={form.provider} onChange={(e) => setForm(f => ({ ...f, provider: e.target.value.toLowerCase() }))} />
              </div>
            )}
            <div className="space-y-2">
              <Label>API Endpoint</Label>
              <Input placeholder="https://api.gateway.example.com/sms" value={form.apiEndpoint} onChange={(e) => setForm(f => ({ ...f, apiEndpoint: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>API Key {editId !== null && <span className="text-muted-foreground font-normal">(leave blank to keep existing)</span>}</Label>
              <Input type="password" placeholder="••••••••••••" value={form.apiKey} onChange={(e) => setForm(f => ({ ...f, apiKey: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm(f => ({ ...f, isActive: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Set as Primary</Label>
              <Switch checked={form.isPrimary} onCheckedChange={(v) => setForm(f => ({ ...f, isPrimary: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.name.trim() || (editId === null && !form.provider.trim()) || isPending} onClick={handleSubmit}>
              {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : editId !== null ? "Update Gateway" : "Add Gateway"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
