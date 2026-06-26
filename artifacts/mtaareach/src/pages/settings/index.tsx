import { useState, useEffect } from "react";
import { useGetTenantSettings, useUpdateTenantSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Save, CheckCircle2 } from "lucide-react";

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetTenantSettings();
  const updateMutation = useUpdateTenantSettings({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/tenants/settings"] });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    }
  });

  const [form, setForm] = useState({
    defaultSenderId: "",
    timezone: "Africa/Nairobi",
    allowFieldAgentVillageSubmission: false,
    requireConsentForSms: true,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        defaultSenderId: settings.defaultSenderId ?? "",
        timezone: settings.timezone ?? "Africa/Nairobi",
        allowFieldAgentVillageSubmission: settings.allowFieldAgentVillageSubmission ?? false,
        requireConsentForSms: settings.requireConsentForSms ?? true,
      });
    }
  }, [settings]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Settings</h1>
        <p className="text-muted-foreground">Configure your tenant settings and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">SMS Settings</CardTitle>
          <CardDescription>Configure your SMS sending defaults.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Default Sender ID</Label>
                <Input
                  placeholder="e.g. OUTREACH"
                  value={form.defaultSenderId}
                  onChange={(e) => setForm(f => ({ ...f, defaultSenderId: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Used as the default sender when creating campaigns.</p>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input
                  placeholder="Africa/Nairobi"
                  value={form.timezone}
                  onChange={(e) => setForm(f => ({ ...f, timezone: e.target.value }))}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permissions & Compliance</CardTitle>
          <CardDescription>Control data collection and compliance settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Require SMS Consent</p>
                  <p className="text-xs text-muted-foreground">Only send SMS to contacts who have given consent.</p>
                </div>
                <Switch
                  checked={form.requireConsentForSms}
                  onCheckedChange={(v) => setForm(f => ({ ...f, requireConsentForSms: v }))}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Field Agent Village Submission</p>
                  <p className="text-xs text-muted-foreground">Allow field agents to submit new villages for approval.</p>
                </div>
                <Switch
                  checked={form.allowFieldAgentVillageSubmission}
                  onCheckedChange={(v) => setForm(f => ({ ...f, allowFieldAgentVillageSubmission: v }))}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          disabled={isLoading || updateMutation.isPending}
          onClick={() => updateMutation.mutate({
            data: {
              defaultSenderId: form.defaultSenderId || null,
              timezone: form.timezone,
              allowFieldAgentVillageSubmission: form.allowFieldAgentVillageSubmission,
              requireConsentForSms: form.requireConsentForSms,
            }
          })}
        >
          {updateMutation.isPending
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
            : <><Save className="h-4 w-4 mr-2" />Save Changes</>}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" /> Saved successfully
          </span>
        )}
      </div>
    </div>
  );
}
