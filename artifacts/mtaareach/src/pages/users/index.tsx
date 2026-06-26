import { useState } from "react";
import { useListUsers, useCreateUser, useDeleteUser } from "@workspace/api-client-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Trash2, Loader2, UserCheck, UserX } from "lucide-react";
import type { UserInputRole } from "@workspace/api-client-react";

const ROLES: { value: UserInputRole; label: string }[] = [
  { value: "tenant_admin", label: "Tenant Admin" },
  { value: "county_coordinator", label: "County Coordinator" },
  { value: "constituency_coordinator", label: "Constituency Coordinator" },
  { value: "ward_coordinator", label: "Ward Coordinator" },
  { value: "village_coordinator", label: "Village Coordinator" },
  { value: "field_agent", label: "Field Agent" },
];

const ROLE_COLORS: Record<string, string> = {
  tenant_admin: "bg-primary/10 text-primary",
  county_coordinator: "bg-blue-100 text-blue-700",
  constituency_coordinator: "bg-purple-100 text-purple-700",
  ward_coordinator: "bg-amber-100 text-amber-700",
  village_coordinator: "bg-emerald-100 text-emerald-700",
  field_agent: "bg-slate-100 text-slate-700",
  super_admin: "bg-rose-100 text-rose-700",
};

function initials(f: string, l: string) {
  return `${f?.[0] ?? ""}${l?.[0] ?? ""}`.toUpperCase();
}

export default function Users() {
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useListUsers();
  const deleteMutation = useDeleteUser({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/users"] }) }
  });
  const createMutation = useCreateUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        setOpen(false);
        setForm({ firstName: "", lastName: "", email: "", password: "", role: "field_agent" });
      }
    }
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ firstName: string; lastName: string; email: string; password: string; role: UserInputRole }>({
    firstName: "", lastName: "", email: "", password: "", role: "field_agent"
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Users</h1>
          <p className="text-muted-foreground">Manage team members and their roles.</p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Invite User
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Team Members</CardTitle>
          <CardDescription>{isLoading ? "Loading…" : `${users?.length ?? 0} users`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-40" /></div></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell />
                    </TableRow>
                  ))
                ) : users?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {initials(u.firstName, u.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${ROLE_COLORS[u.role] ?? ""}`}>
                        {ROLES.find(r => r.value === u.role)?.label ?? u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.isActive
                        ? <span className="flex items-center gap-1 text-xs text-green-700"><UserCheck className="h-3.5 w-3.5" />Active</span>
                        : <span className="flex items-center gap-1 text-xs text-muted-foreground"><UserX className="h-3.5 w-3.5" />Inactive</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMutation.mutate({ userId: u.id })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite User</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={form.firstName} onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={form.lastName} onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Temporary Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v as UserInputRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.firstName || !form.lastName || !form.email || !form.password || createMutation.isPending}
              onClick={() => createMutation.mutate({ data: { firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password, role: form.role } })}
            >
              {createMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating…</> : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
