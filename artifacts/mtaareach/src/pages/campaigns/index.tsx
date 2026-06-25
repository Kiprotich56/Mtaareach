import { useState } from "react";
import {
  useListCampaigns, useCreateCampaign, usePreviewCampaign,
  useListSenderIds, useListTemplates, useListGroups,
  useListCounties, useListConstituencies, useListWards,
  CampaignStatus, CampaignInput, AudienceFilter
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus, Send, Clock, CheckCircle2, XCircle, PauseCircle,
  Loader2, MessageSquare, Users, Wallet, ChevronRight, ChevronLeft,
  AlertCircle, Zap
} from "lucide-react";

const SMS_CHARS = 160;
const SMS_COST_KES = 1.5;

function smsInfo(text: string) {
  const chars = text.length;
  const parts = Math.ceil(chars / SMS_CHARS) || 1;
  return { chars, parts };
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const map: Record<CampaignStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    draft: { label: "Draft", variant: "outline", icon: <Clock className="h-3 w-3" /> },
    queued: { label: "Queued", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
    sending: { label: "Sending", variant: "default", icon: <Send className="h-3 w-3" /> },
    completed: { label: "Completed", variant: "secondary", icon: <CheckCircle2 className="h-3 w-3" /> },
    paused: { label: "Paused", variant: "outline", icon: <PauseCircle className="h-3 w-3" /> },
    failed: { label: "Failed", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  };
  const { label, variant, icon } = map[status] ?? map.draft;
  return (
    <Badge variant={variant} className="gap-1 capitalize">
      {icon}{label}
    </Badge>
  );
}

type Step = 1 | 2 | 3 | 4;

function StepIndicator({ current }: { current: Step }) {
  const steps = ["Compose", "Audience", "Preview", "Launch"];
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((label, i) => {
        const n = (i + 1) as Step;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex items-center flex-1 last:flex-none">
            <div className={`flex flex-col items-center gap-1`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors
                ${done ? "bg-primary border-primary text-primary-foreground" : active ? "border-primary text-primary bg-primary/10" : "border-muted text-muted-foreground"}`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : n}
              </div>
              <span className={`text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 ${done ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CampaignBuilder({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<CampaignInput>({
    name: "",
    senderId: "",
    body: "",
    templateId: null,
    audience: {},
    scheduledAt: null,
    sendNow: false,
  });
  const [schedule, setSchedule] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState("");

  const { data: senderIds } = useListSenderIds();
  const { data: templates } = useListTemplates();
  const { data: groups } = useListGroups();
  const { data: counties } = useListCounties();
  const [selectedCounty, setSelectedCounty] = useState<number | null>(null);
  const { data: constituencies } = useListConstituencies(
    selectedCounty ? { countyId: selectedCounty } : undefined
  );
  const [selectedConstituency, setSelectedConstituency] = useState<number | null>(null);
  const { data: wards } = useListWards(
    selectedConstituency ? { constituencyId: selectedConstituency } : undefined
  );

  const previewMutation = usePreviewCampaign();
  const createMutation = useCreateCampaign({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
        onClose();
      }
    }
  });

  const { chars, parts } = smsInfo(form.body);
  const approvedSenders = senderIds?.filter((s) => s.status === "approved") ?? [];

  function toggleAudienceId<K extends keyof AudienceFilter>(key: K, id: number) {
    setForm((f) => {
      const cur = (f.audience[key] as number[] | undefined) ?? [];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      return { ...f, audience: { ...f.audience, [key]: next.length ? next : undefined } };
    });
  }

  const audienceIds = (f: AudienceFilter) =>
    (f.groupIds?.length ?? 0) + (f.wardIds?.length ?? 0) +
    (f.constituencyIds?.length ?? 0) + (f.countyIds?.length ?? 0);

  function handleNext() {
    if (step === 2) previewMutation.mutate(form);
    setStep((s) => (s < 4 ? (s + 1) as Step : s));
  }

  function handleLaunch() {
    const payload: CampaignInput = {
      ...form,
      sendNow: schedule === "now",
      scheduledAt: schedule === "later" && scheduledAt ? new Date(scheduledAt).toISOString() : null,
    };
    createMutation.mutate(payload);
  }

  return (
    <div className="min-h-[500px] flex flex-col">
      <StepIndicator current={step} />

      {/* Step 1: Compose */}
      {step === 1 && (
        <div className="space-y-4 flex-1">
          <div className="space-y-2">
            <Label>Campaign Name</Label>
            <Input
              placeholder="e.g. Eldoret North Rally — June 25"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Sender ID</Label>
            <Select value={form.senderId} onValueChange={(v) => setForm((f) => ({ ...f, senderId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Choose approved sender ID…" />
              </SelectTrigger>
              <SelectContent>
                {approvedSenders.length === 0 ? (
                  <SelectItem value="__none" disabled>No approved sender IDs yet</SelectItem>
                ) : (
                  approvedSenders.map((s) => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Start from template <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Select
              value={form.templateId?.toString() ?? "__none"}
              onValueChange={(v) => {
                if (v === "__none") { setForm((f) => ({ ...f, templateId: null })); return; }
                const t = templates?.find((t) => t.id === Number(v));
                if (t) setForm((f) => ({ ...f, templateId: t.id, body: t.body }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="None — write from scratch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">None — write from scratch</SelectItem>
                {templates?.map((t) => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Message Body</Label>
              <span className={`text-xs tabular-nums ${chars > SMS_CHARS ? "text-amber-600 font-semibold" : "text-muted-foreground"}`}>
                {chars} chars · {parts} SMS
              </span>
            </div>
            <Textarea
              rows={5}
              placeholder="Type your message…"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Cost per SMS: KES {SMS_COST_KES.toFixed(2)} · Est. cost per recipient: KES {(parts * SMS_COST_KES).toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Step 2: Audience */}
      {step === 2 && (
        <div className="space-y-5 flex-1">
          <p className="text-sm text-muted-foreground">Filter who receives this message. Leave all empty to target all opted-in contacts.</p>

          {/* Groups */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Users className="h-4 w-4" />Contact Groups</Label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
              {groups?.length === 0 && <p className="text-sm text-muted-foreground col-span-2 text-center py-2">No groups yet</p>}
              {groups?.map((g) => (
                <label key={g.id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={(form.audience.groupIds ?? []).includes(g.id)}
                    onCheckedChange={() => toggleAudienceId("groupIds", g.id)}
                  />
                  {g.name} <span className="text-muted-foreground">({g.memberCount ?? 0})</span>
                </label>
              ))}
            </div>
          </div>

          {/* County */}
          <div className="space-y-2">
            <Label>County</Label>
            <Select
              value={selectedCounty?.toString() ?? "__all"}
              onValueChange={(v) => {
                const id = v === "__all" ? null : Number(v);
                setSelectedCounty(id);
                setSelectedConstituency(null);
                setForm((f) => ({ ...f, audience: { ...f.audience, countyIds: id ? [id] : undefined, constituencyIds: undefined, wardIds: undefined } }));
              }}
            >
              <SelectTrigger><SelectValue placeholder="All counties" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All counties</SelectItem>
                {counties?.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {selectedCounty && (
            <div className="space-y-2">
              <Label>Constituency</Label>
              <Select
                value={selectedConstituency?.toString() ?? "__all"}
                onValueChange={(v) => {
                  const id = v === "__all" ? null : Number(v);
                  setSelectedConstituency(id);
                  setForm((f) => ({ ...f, audience: { ...f.audience, constituencyIds: id ? [id] : undefined, wardIds: undefined } }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="All constituencies" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All constituencies</SelectItem>
                  {constituencies?.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedConstituency && (
            <div className="space-y-2">
              <Label>Wards</Label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {wards?.map((w) => (
                  <label key={w.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={(form.audience.wardIds ?? []).includes(w.id)}
                      onCheckedChange={() => toggleAudienceId("wardIds", w.id)}
                    />
                    {w.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
            <strong>{audienceIds(form.audience) > 0 ? `${audienceIds(form.audience)} filter(s) applied` : "No filters"}</strong> — all opted-in contacts
            {audienceIds(form.audience) > 0 ? " matching filters" : ""} will receive this message.
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && (
        <div className="flex-1 space-y-4">
          {previewMutation.isPending ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Calculating audience…</p>
            </div>
          ) : previewMutation.data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total matched", value: previewMutation.data.totalSelected, icon: <Users className="h-4 w-4 text-primary" /> },
                  { label: "Eligible (opted-in)", value: previewMutation.data.eligible, icon: <CheckCircle2 className="h-4 w-4 text-green-600" /> },
                  { label: "Excluded (opted-out)", value: previewMutation.data.excluded, icon: <XCircle className="h-4 w-4 text-muted-foreground" /> },
                  { label: "Est. cost (KES)", value: `KES ${previewMutation.data.estimatedCost.toFixed(2)}`, icon: <Wallet className="h-4 w-4 text-amber-600" /> },
                ].map(({ label, value, icon }) => (
                  <Card key={label}>
                    <CardContent className="p-4 flex items-center gap-3">
                      {icon}
                      <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-lg font-bold">{value}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className={previewMutation.data.canAfford ? "border-green-200 bg-green-50" : "border-destructive bg-destructive/5"}>
                <CardContent className="p-4 flex items-center gap-3">
                  {previewMutation.data.canAfford
                    ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    : <AlertCircle className="h-5 w-5 text-destructive shrink-0" />}
                  <div>
                    <p className="text-sm font-medium">
                      {previewMutation.data.canAfford ? "Sufficient balance" : "Insufficient wallet balance"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Wallet: KES {previewMutation.data.walletBalance.toFixed(2)} ·
                      Required: KES {previewMutation.data.estimatedCost.toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="border rounded-md p-4 space-y-2 bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Message preview</p>
                <p className="text-sm whitespace-pre-wrap">{form.body}</p>
                <p className="text-xs text-muted-foreground">Sender: {form.senderId} · {smsInfo(form.body).parts} SMS per recipient</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              Failed to load preview. Check your audience selection.
            </div>
          )}
        </div>
      )}

      {/* Step 4: Launch */}
      {step === 4 && (
        <div className="flex-1 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {(["now", "later"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setSchedule(opt)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors cursor-pointer
                  ${schedule === opt ? "border-primary bg-primary/5 text-primary" : "border-muted text-muted-foreground hover:border-border"}`}
              >
                {opt === "now" ? <Zap className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                <span className="font-semibold text-sm">{opt === "now" ? "Send Now" : "Schedule"}</span>
                <span className="text-xs">{opt === "now" ? "Dispatch immediately" : "Pick a date & time"}</span>
              </button>
            ))}
          </div>

          {schedule === "later" && (
            <div className="space-y-2">
              <Label>Schedule Date & Time</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          )}

          <div className="border rounded-md p-4 space-y-2 bg-muted/30 text-sm">
            <p className="font-semibold">{form.name}</p>
            <p className="text-muted-foreground">Sender: {form.senderId}</p>
            {previewMutation.data && (
              <>
                <p className="text-muted-foreground">{previewMutation.data.eligible} recipients · KES {previewMutation.data.estimatedCost.toFixed(2)} estimated cost</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between pt-6 border-t mt-6">
        <Button variant="outline" onClick={() => step === 1 ? onClose() : setStep((s) => (s - 1) as Step)}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          {step === 1 ? "Cancel" : "Back"}
        </Button>
        {step < 4 ? (
          <Button
            onClick={handleNext}
            disabled={
              (step === 1 && (!form.name.trim() || !form.senderId || !form.body.trim())) ||
              (step === 2 && false)
            }
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleLaunch}
            disabled={createMutation.isPending || !previewMutation.data?.canAfford || (schedule === "later" && !scheduledAt)}
          >
            {createMutation.isPending
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Launching…</>
              : <><Send className="h-4 w-4 mr-2" />{schedule === "now" ? "Send Now" : "Schedule Campaign"}</>
            }
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Campaigns() {
  const [open, setOpen] = useState(false);
  const { data: campaigns, isLoading } = useListCampaigns({ page: 1, limit: 20 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Campaigns</h1>
          <p className="text-muted-foreground">Create and manage SMS outreach campaigns.</p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New Campaign
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Campaigns</CardTitle>
          <CardDescription>{isLoading ? "Loading…" : `${campaigns?.total ?? 0} campaigns`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : campaigns?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <MessageSquare className="h-8 w-8 opacity-40" />
                        <p>No campaigns yet. Create your first one!</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  campaigns?.data.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="text-sm">{c.senderId}</TableCell>
                      <TableCell className="text-sm">{c.totalRecipients ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        {c.deliveredCount != null && c.totalRecipients
                          ? `${c.deliveredCount} (${Math.round((c.deliveredCount / (c.totalRecipients || 1)) * 100)}%)`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{c.actualCost != null ? `KES ${c.actualCost.toFixed(2)}` : "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              New Campaign
            </DialogTitle>
          </DialogHeader>
          <CampaignBuilder onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
