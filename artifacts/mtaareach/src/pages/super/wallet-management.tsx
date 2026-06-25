import { useState } from "react";
import { useListAllWallets, useTopUpWallet } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, Plus, Loader2 } from "lucide-react";

export default function SuperWallets() {
  const queryClient = useQueryClient();
  const { data: wallets, isLoading } = useListAllWallets();
  const topUpMutation = useTopUpWallet({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
        setOpen(false);
        setForm({ tenantId: 0, amount: "", description: "" });
      }
    }
  });

  const [open, setOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<{ id: number; name: string } | null>(null);
  const [form, setForm] = useState({ tenantId: 0, amount: "", description: "" });

  function openTopUp(tenantId: number, tenantName: string) {
    setSelectedTenant({ id: tenantId, name: tenantName });
    setForm({ tenantId, amount: "", description: "" });
    setOpen(true);
  }

  const totalBalance = wallets?.reduce((s, w) => s + w.balance, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Wallet Management</h1>
        <p className="text-muted-foreground">View balances and top up tenant wallets.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-xl"><Wallet className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Platform Balance</p>
              {isLoading ? <Skeleton className="h-7 w-32 mt-1" /> : <p className="text-2xl font-bold text-primary">KES {totalBalance.toLocaleString()}</p>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-xl"><Wallet className="h-5 w-5 text-blue-700" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Active Wallets</p>
              {isLoading ? <Skeleton className="h-7 w-16 mt-1" /> : <p className="text-2xl font-bold">{wallets?.length ?? 0}</p>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="bg-amber-100 p-3 rounded-xl"><Wallet className="h-5 w-5 text-amber-700" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Low Balance ({`<`} KES 1,000)</p>
              {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-2xl font-bold">{wallets?.filter(w => w.balance < 1000).length ?? 0}</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallets table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tenant Wallets</CardTitle>
          <CardDescription>{isLoading ? "Loading…" : `${wallets?.length ?? 0} wallets`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead className="text-right">Balance (KES)</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 4 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                ) : wallets?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">No wallets found.</TableCell>
                  </TableRow>
                ) : (
                  wallets?.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{(w as any).tenantName ?? `Tenant #${w.tenantId}`}</p>
                          <p className="text-xs text-muted-foreground">{(w as any).tenantSlug}</p>
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-mono font-bold ${w.balance < 1000 ? "text-amber-600" : "text-foreground"}`}>
                        {w.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(w.updatedAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => openTopUp(w.tenantId, (w as any).tenantName ?? `Tenant #${w.tenantId}`)}>
                          <Plus className="h-3.5 w-3.5" /> Top Up
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
            <DialogTitle>Top Up Wallet — {selectedTenant?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Amount (KES)</Label>
              <Input
                type="number"
                min="1"
                step="100"
                placeholder="e.g. 5000"
                value={form.amount}
                onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                placeholder="e.g. Monthly allocation"
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.amount || Number(form.amount) <= 0 || topUpMutation.isPending}
              onClick={() => topUpMutation.mutate({ tenantId: form.tenantId, amount: Number(form.amount), description: form.description || undefined })}
            >
              {topUpMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing…</> : "Confirm Top Up"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
