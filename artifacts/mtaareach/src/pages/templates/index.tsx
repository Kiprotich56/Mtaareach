import { useState } from "react";
import { useListTemplates, useCreateTemplate, useDeleteTemplate } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, Trash2, Loader2, MessageSquare } from "lucide-react";

const MAX_SMS_CHARS = 160;

function smsCount(text: string) {
  const len = text.length;
  return { chars: len, sms: Math.ceil(len / MAX_SMS_CHARS) || 1 };
}

export default function Templates() {
  const queryClient = useQueryClient();
  const { data: templates, isLoading } = useListTemplates();
  const createMutation = useCreateTemplate({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
        setOpen(false);
        setForm({ name: "", body: "" });
      }
    }
  });
  const deleteMutation = useDeleteTemplate({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/templates"] })
    }
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", body: "" });
  const { chars, sms } = smsCount(form.body);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Templates</h1>
          <p className="text-muted-foreground">Reusable SMS message templates.</p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New Template
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-4 w-32 mb-2" /><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : templates?.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">No templates yet</p>
            <p className="text-sm text-muted-foreground">Create reusable message templates to speed up campaign creation.</p>
            <Button className="mt-2 gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Create first template</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates?.map((t) => {
            const { chars, sms } = smsCount(t.body);
            return (
              <Card key={t.id} className="flex flex-col">
                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-semibold leading-none">{t.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <MessageSquare className="h-2.5 w-2.5" />{sms} SMS · {chars} chars
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate({ templateId: t.id })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap flex-1">
                  {t.body}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input placeholder="e.g. Rally Reminder" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Message Body</Label>
                <span className={`text-xs ${chars > MAX_SMS_CHARS ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                  {chars} chars · {sms} SMS
                </span>
              </div>
              <Textarea
                rows={5}
                placeholder="Type your message here..."
                value={form.body}
                onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Use {"{name}"} for personalisation placeholders.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.name.trim() || !form.body.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate(form)}
            >
              {createMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
