import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListContacts, useCreateContact,
  useListCounties, useListConstituencies, useListWards, useListVillages,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Upload, Users, MapPin, Loader2 } from "lucide-react";
import { CsvImportModal } from "@/components/csv-import-modal";
import { useToast } from "@/hooks/use-toast";

// ─── Add Contact Modal ────────────────────────────────────────────────────────

interface ContactForm {
  firstName: string;
  lastName: string;
  phone: string;
  gender: string;
  ageGroup: string;
  occupation: string;
  countyId: string;
  constituencyId: string;
  wardId: string;
  villageId: string;
  consentSms: boolean;
  consentSource: string;
  notes: string;
}

const EMPTY_FORM: ContactForm = {
  firstName: "", lastName: "", phone: "", gender: "", ageGroup: "",
  occupation: "", countyId: "", constituencyId: "", wardId: "", villageId: "",
  consentSms: false, consentSource: "", notes: "",
};

function AddContactModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);

  // Cascading geography
  const { data: counties } = useListCounties();
  const { data: constituencies } = useListConstituencies(
    form.countyId ? { countyId: Number(form.countyId) } : undefined,
    { query: { enabled: !!form.countyId } }
  );
  const { data: wards } = useListWards(
    form.constituencyId ? { constituencyId: Number(form.constituencyId) } : undefined,
    { query: { enabled: !!form.constituencyId } }
  );
  const { data: villages } = useListVillages(
    form.wardId ? { wardId: Number(form.wardId), status: "active" } : undefined,
    { query: { enabled: !!form.wardId } }
  );

  const createMutation = useCreateContact({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
        toast({ title: "Contact added", description: `${form.firstName} ${form.lastName} was saved.` });
        setForm(EMPTY_FORM);
        onOpenChange(false);
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? err?.message ?? "Failed to add contact";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    },
  });

  function set<K extends keyof ContactForm>(key: K, value: ContactForm[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleCountyChange(val: string) {
    setForm(f => ({ ...f, countyId: val, constituencyId: "", wardId: "", villageId: "" }));
  }
  function handleConstituencyChange(val: string) {
    setForm(f => ({ ...f, constituencyId: val, wardId: "", villageId: "" }));
  }
  function handleWardChange(val: string) {
    setForm(f => ({ ...f, wardId: val, villageId: "" }));
  }

  function handleSubmit() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim()) return;
    const payload: Record<string, unknown> = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      consentSms: form.consentSms,
    };
    if (form.gender) payload.gender = form.gender;
    if (form.ageGroup) payload.ageGroup = form.ageGroup;
    if (form.occupation) payload.occupation = form.occupation.trim();
    if (form.countyId) payload.countyId = Number(form.countyId);
    if (form.constituencyId) payload.constituencyId = Number(form.constituencyId);
    if (form.wardId) payload.wardId = Number(form.wardId);
    if (form.villageId) payload.villageId = Number(form.villageId);
    if (form.consentSource) payload.consentSource = form.consentSource.trim();
    if (form.notes) payload.notes = form.notes.trim();
    createMutation.mutate({ data: payload as any });
  }

  const isValid = form.firstName.trim() && form.lastName.trim() && form.phone.trim();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setForm(EMPTY_FORM); onOpenChange(v); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Add Contact
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Jane" value={form.firstName} onChange={e => set("firstName", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Wanjiku" value={form.lastName} onChange={e => set("lastName", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Phone Number <span className="text-destructive">*</span></Label>
            <Input placeholder="+254712345678" value={form.phone} onChange={e => set("phone", e.target.value)} />
            <p className="text-xs text-muted-foreground">Use international format, e.g. +254…</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.gender || "__none"} onValueChange={v => set("gender", v === "__none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Not specified</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Age Group</Label>
              <Select value={form.ageGroup || "__none"} onValueChange={v => set("ageGroup", v === "__none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Not specified</SelectItem>
                  <SelectItem value="18-24">18–24</SelectItem>
                  <SelectItem value="25-34">25–34</SelectItem>
                  <SelectItem value="35-44">35–44</SelectItem>
                  <SelectItem value="45-54">45–54</SelectItem>
                  <SelectItem value="55+">55+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Occupation</Label>
            <Input placeholder="e.g. Teacher, Farmer, Trader…" value={form.occupation} onChange={e => set("occupation", e.target.value)} />
          </div>

          {/* Location — cascading down to village */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-primary" />
              Residence Location
            </div>
            <p className="text-xs text-muted-foreground -mt-1">Select the contact's place of residence down to village level.</p>

            <div className="space-y-1.5">
              <Label>County</Label>
              <Select value={form.countyId || "__none"} onValueChange={v => handleCountyChange(v === "__none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select county…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— Not specified —</SelectItem>
                  {counties?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {form.countyId && (
              <div className="space-y-1.5">
                <Label>Constituency</Label>
                <Select value={form.constituencyId || "__none"} onValueChange={v => handleConstituencyChange(v === "__none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select constituency…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Not specified —</SelectItem>
                    {constituencies?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.constituencyId && (
              <div className="space-y-1.5">
                <Label>Ward</Label>
                <Select value={form.wardId || "__none"} onValueChange={v => handleWardChange(v === "__none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select ward…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Not specified —</SelectItem>
                    {wards?.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.wardId && (
              <div className="space-y-1.5">
                <Label>Village</Label>
                {villages && villages.length === 0 ? (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 border">
                    No approved villages in this ward yet. The contact will be assigned to ward level only.
                  </p>
                ) : (
                  <Select value={form.villageId || "__none"} onValueChange={v => set("villageId", v === "__none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select village…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">— Not specified —</SelectItem>
                      {villages?.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>

          {/* Consent */}
          <div className="space-y-3 border rounded-md p-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <Checkbox
                id="consent-sms"
                checked={form.consentSms}
                onCheckedChange={v => set("consentSms", !!v)}
              />
              <label htmlFor="consent-sms" className="text-sm font-medium cursor-pointer">
                Contact has given SMS consent
              </label>
            </div>
            {form.consentSms && (
              <div className="space-y-1.5">
                <Label>Consent Source</Label>
                <Input
                  placeholder="e.g. Signed form, verbal at rally, WhatsApp opt-in…"
                  value={form.consentSource}
                  onChange={e => set("consentSource", e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              placeholder="Any additional notes about this contact…"
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!isValid || createMutation.isPending}>
              {createMutation.isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                : <><Plus className="h-4 w-4 mr-2" />Add Contact</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Contacts Page ────────────────────────────────────────────────────────────

export default function Contacts() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const { data: contactsPage, isLoading } = useListContacts(
    { page, limit: 10, search: search.length > 2 ? search : undefined },
    { query: { queryKey: ["contacts", page, search.length > 2 ? search : ""] } }
  );

  const totalPages = contactsPage ? Math.ceil(contactsPage.total / contactsPage.limit) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Contacts</h1>
          <p className="text-muted-foreground">Manage your grassroots network.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button className="gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Contact
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone…"
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <CardDescription>
              {isLoading ? "Loading…" : `${contactsPage?.total ?? 0} contacts`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Residence</TableHead>
                  <TableHead>Consent</TableHead>
                  <TableHead>Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : contactsPage?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Users className="h-8 w-8 opacity-40" />
                        <p>{search ? "No contacts match your search." : "No contacts yet."}</p>
                        {!search && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="gap-2" onClick={() => setAddOpen(true)}>
                              <Plus className="h-3.5 w-3.5" /> Add Contact
                            </Button>
                            <Button size="sm" variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
                              <Upload className="h-3.5 w-3.5" /> Import CSV
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  contactsPage?.data.map((contact) => {
                    const c = contact as typeof contact & { wardName?: string; villageName?: string };
                    // Build location string from most specific to broadest
                    const locationParts = [c.villageName, c.wardName].filter(Boolean);
                    return (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <div className="font-medium">{contact.firstName} {contact.lastName}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {contact.gender ?? ""}{contact.ageGroup ? ` · ${contact.ageGroup}` : ""}
                            {contact.occupation ? ` · ${contact.occupation}` : ""}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{contact.phone}</TableCell>
                        <TableCell>
                          {locationParts.length > 0 ? (
                            <div className="flex items-start gap-1">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                              <div>
                                {c.villageName && (
                                  <div className="text-sm font-medium">{c.villageName}</div>
                                )}
                                {c.wardName && (
                                  <div className="text-xs text-muted-foreground">{c.wardName} ward</div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {contact.consentSms === true
                            ? <Badge variant="secondary" className="text-xs text-green-700 bg-green-100">Consented</Badge>
                            : <Badge variant="outline" className="text-xs text-muted-foreground">No consent</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap max-w-[150px]">
                            {contact.tags?.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                            ))}
                            {(contact.tags?.length ?? 0) > 3 && (
                              <Badge variant="outline" className="text-[10px]">+{(contact.tags?.length ?? 0) - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      <CsvImportModal open={importOpen} onOpenChange={setImportOpen} />
      <AddContactModal open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
