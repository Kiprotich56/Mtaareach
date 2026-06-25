import { useState, useEffect } from "react";
import { useGetTenantSettings, useUpdateTenantSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const [form, setForm] = useState({ name: "", contactEmail: "", smsCostPerMessage: 1.5 });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        name: settings.name ?? "",
        contactEmail: settings.contactEmail ?? "",
        smsCostPerMessage: settings.smsCostPerMessage ?? 1.5,
      });
    }
  }, [settings]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Settings</h1>
        <p className="text-muted-foreground">Configure your tenant settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organisation Details</CardTitle>
          <CardDescription>Basic information about your outreach organisation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Organisation Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">SMS Configuration</CardTitle>
          <CardDescription>Cost and messaging settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="space-y-2">
              <Label>SMS Cost per Message (KES)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.smsCostPerMessage}
                onChange={(e) => setForm(f => ({ ...f, smsCostPerMessage: parseFloat(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">Used to estimate campaign costs and deduct from wallet balance.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          disabled={isLoading || updateMutation.isPending}
          onClick={() => updateMutation.mutate(form)}
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
