import { useState } from "react";
import {
  useListVillages, useListCounties, useListConstituencies, useListWards, useCreateVillage
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, MapPin } from "lucide-react";
import type { VillageStatus } from "@workspace/api-client-react";

function statusBadge(status: VillageStatus) {
  if (status === "active") return <Badge variant="secondary" className="text-green-700 bg-green-100">Active</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}

export default function Villages() {
  const queryClient = useQueryClient();
  const [wardFilter, setWardFilter] = useState<number | undefined>();
  const [selectedCounty, setSelectedCounty] = useState<number | null>(null);
  const [selectedConstituency, setSelectedConstituency] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", wardId: 0 });

  const { data: counties } = useListCounties();
  const { data: constituencies } = useListConstituencies(selectedCounty ? { countyId: selectedCounty } : undefined);
  const { data: wards } = useListWards(selectedConstituency ? { constituencyId: selectedConstituency } : undefined);
  const { data: villages, isLoading } = useListVillages(wardFilter ? { wardId: wardFilter } : {});

  const createMutation = useCreateVillage({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/geography/villages"] });
        setOpen(false);
        setForm({ name: "", wardId: 0 });
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Villages</h1>
          <p className="text-muted-foreground">Browse and manage villages within your area.</p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add Village
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
          <CardTitle className="text-base">Villages</CardTitle>
          <CardDescription>
            {isLoading ? "Loading…" : `${villages?.length ?? 0} villages`}
            {wardFilter ? " in selected ward" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Village Name</TableHead>
                  <TableHead>Ward</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Population</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 4 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                ) : !wardFilter ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <MapPin className="h-8 w-8 opacity-40" />
                        <p>Select a ward above to browse villages.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : villages?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">No villages found in this ward.</TableCell>
                  </TableRow>
                ) : (
                  villages?.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{v.wardName ?? "—"}</TableCell>
                      <TableCell>{statusBadge(v.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{v.population?.toLocaleString() ?? "—"}</TableCell>
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
          <DialogHeader><DialogTitle>Add Village</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Village Name</Label>
              <Input placeholder="e.g. Sirikwa" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Ward</Label>
              <Select value={form.wardId ? form.wardId.toString() : "__none"} onValueChange={(v) => setForm(f => ({ ...f, wardId: Number(v) }))}>
                <SelectTrigger><SelectValue placeholder="Select ward…" /></SelectTrigger>
                <SelectContent>
                  {wards?.map((w) => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {!wards?.length && <p className="text-xs text-muted-foreground">Select a constituency in the filter above to see wards.</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.name.trim() || !form.wardId || createMutation.isPending}
              onClick={() => createMutation.mutate({ data: { name: form.name, wardId: form.wardId } })}
            >
              {createMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding…</> : "Add Village"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
