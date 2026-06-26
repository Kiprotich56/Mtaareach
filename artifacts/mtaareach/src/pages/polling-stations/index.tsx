import { useState } from "react";
import {
  useListPollingStations, useListCounties, useListConstituencies, useListWards, useCreatePollingStation
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Vote } from "lucide-react";

export default function PollingStations() {
  const queryClient = useQueryClient();
  const [wardFilter, setWardFilter] = useState<number | undefined>();
  const [selectedCounty, setSelectedCounty] = useState<number | null>(null);
  const [selectedConstituency, setSelectedConstituency] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", wardId: 0, registeredVoters: "" });

  const { data: counties } = useListCounties();
  const { data: constituencies } = useListConstituencies(selectedCounty ? { countyId: selectedCounty } : undefined);
  const { data: wards } = useListWards(selectedConstituency ? { constituencyId: selectedConstituency } : undefined);
  const { data: stations, isLoading } = useListPollingStations(wardFilter ? { wardId: wardFilter } : {});

  const createMutation = useCreatePollingStation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/geography/polling-stations"] });
        setOpen(false);
        setForm({ name: "", code: "", wardId: 0, registeredVoters: "" });
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Polling Stations</h1>
          <p className="text-muted-foreground">Browse registered polling stations by ward.</p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add Station
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Select value={selectedCounty?.toString() ?? "__all"} onValueChange={(v) => {
          const id = v === "__all" ? null : Number(v);
          setSelectedCounty(id);
          setSelectedConstituency(null);
          setWardFilter(undefined);
        }}>
          <SelectTrigger><SelectValue placeholder="All Counties" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All Counties</SelectItem>
            {counties?.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select disabled={!selectedCounty} value={selectedConstituency?.toString() ?? "__all"} onValueChange={(v) => {
          const id = v === "__all" ? null : Number(v);
          setSelectedConstituency(id);
          setWardFilter(undefined);
        }}>
          <SelectTrigger><SelectValue placeholder="All Constituencies" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All Constituencies</SelectItem>
            {constituencies?.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select disabled={!selectedConstituency} value={wardFilter?.toString() ?? "__all"} onValueChange={(v) => setWardFilter(v === "__all" ? undefined : Number(v))}>
          <SelectTrigger><SelectValue placeholder="All Wards" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All Wards</SelectItem>
            {wards?.map((w) => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Polling Stations</CardTitle>
          <CardDescription>
            {isLoading ? "Loading…" : `${stations?.length ?? 0} stations`}
            {wardFilter ? " in selected ward" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Ward</TableHead>
                  <TableHead className="text-right">Registered Voters</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 4 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                ) : !wardFilter ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Vote className="h-8 w-8 opacity-40" />
                        <p>Select a ward above to browse polling stations.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : stations?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">No polling stations found.</TableCell>
                  </TableRow>
                ) : (
                  stations?.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{s.code}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.wardName ?? "—"}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{s.registeredVoters?.toLocaleString() ?? "—"}</TableCell>
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
          <DialogHeader><DialogTitle>Add Polling Station</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Station Name</Label>
                <Input placeholder="e.g. Eldoret North Primary" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input placeholder="e.g. PS001" value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ward</Label>
              <Select value={form.wardId ? form.wardId.toString() : "__none"} onValueChange={(v) => setForm(f => ({ ...f, wardId: Number(v) }))}>
                <SelectTrigger><SelectValue placeholder="Select ward…" /></SelectTrigger>
                <SelectContent>
                  {wards?.map((w) => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Registered Voters <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input type="number" min="0" value={form.registeredVoters} onChange={(e) => setForm(f => ({ ...f, registeredVoters: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.name.trim() || !form.wardId || !form.code.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate({
                data: {
                  name: form.name,
                  code: form.code,
                  wardId: form.wardId,
                  registeredVoters: form.registeredVoters ? Number(form.registeredVoters) : null,
                }
              })}
            >
              {createMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding…</> : "Add Station"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
