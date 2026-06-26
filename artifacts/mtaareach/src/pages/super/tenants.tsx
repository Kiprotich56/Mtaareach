import { useState } from "react";
import {
  useListTenants, useCreateTenant, useActivateTenant, useDeactivateTenant
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Loader2, MoreHorizontal, Building2, UserCheck, UserX } from "lucide-react";
import type { TenantStatus } from "@workspace/api-client-react";

function statusBadge(status: TenantStatus) {
  if (status === "active") return <Badge variant="secondary" className="text-green-700 bg-green-100">Active</Badge>;
  if (status === "suspended") return <Badge variant="destructive">Suspended</Badge>;
  return <Badge variant="outline">Inactive</Badge>;
}

export default function SuperTenants() {
  const queryClient = useQueryClient();
  const { data: tenants, isLoading } = useListTenants();
  const createMutation = useCreateTenant({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
        setOpen(false);
        setForm({ name: "", slug: "", timezone: "Africa/Nairobi", smsRatePerMessage: 1.5 });
      }
    }
  });
  const activateMutation = useActivateTenant({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tenants"] }) } });
  const deactivateMutation = useDeactivateTenant({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tenants"] }) } });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", timezone: "Africa/Nairobi", smsRatePerMessage: 1.5 });

  function toSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Tenants</h1>
          <p className="text-muted-foreground">Manage all registered organisations on the platform.</p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Create Tenant
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Tenants</CardTitle>
          <CardDescription>{isLoading ? "Loading…" : `${tenants?.length ?? 0} tenants`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Wallet Balance</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-10" />
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
                ) : tenants?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Building2 className="h-8 w-8 opacity-40" />
                        <p>No tenants yet.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  tenants?.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{t.slug}</TableCell>
                      <TableCell>{statusBadge(t.status)}</TableCell>
                      <TableCell className="text-sm font-mono">
                        {t.walletBalance != null ? `KES ${t.walletBalance.toLocaleString()}` : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {t.status !== "active" ? (
                              <DropdownMenuItem className="gap-2" onClick={() => activateMutation.mutate({ tenantId: t.id })}>
                                <UserCheck className="h-3.5 w-3.5" /> Activate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem className="text-destructive gap-2" onClick={() => deactivateMutation.mutate({ tenantId: t.id })}>
                                <UserX className="h-3.5 w-3.5" /> Deactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
          <DialogHeader><DialogTitle>Create Tenant</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Organisation Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value, slug: toSlug(e.target.value) }))}
                placeholder="e.g. Nandi Outreach"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: toSlug(e.target.value) }))} placeholder="nandi-outreach" />
              <p className="text-xs text-muted-foreground">Unique URL-safe identifier.</p>
            </div>
            <div className="space-y-2">
              <Label>SMS Rate per Message (KES)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.smsRatePerMessage}
                onChange={(e) => setForm(f => ({ ...f, smsRatePerMessage: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.name || !form.slug || createMutation.isPending}
              onClick={() => createMutation.mutate({ data: { name: form.name, slug: form.slug, timezone: form.timezone, smsRatePerMessage: form.smsRatePerMessage } })}
            >
              {createMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating…</> : "Create Tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
