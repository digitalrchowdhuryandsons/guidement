import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plug, Save, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type IntegrationKey = "payment_gateway" | "email_tool" | "analytics" | "crm";
type IntegrationEntry = { configured: boolean; provider: string; notes: string };
type Integrations = Record<IntegrationKey, IntegrationEntry>;

const labels: Record<IntegrationKey, string> = {
  payment_gateway: "Payment Gateway",
  email_tool: "Email Tool",
  analytics: "Analytics",
  crm: "CRM",
};

export default function IntegrationsStatusPanel() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState<Integrations | null>(null);

  const { data } = useQuery({
    queryKey: ["platform-settings-integrations"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("platform_settings").select("value").eq("key", "integrations").maybeSingle();
      if (error) throw error;
      return (data?.value ?? {}) as Partial<Integrations>;
    },
  });

  useEffect(() => {
    if (data) {
      const filled = {} as Integrations;
      (Object.keys(labels) as IntegrationKey[]).forEach((k) => {
        filled[k] = data[k] ?? { configured: false, provider: "", notes: "" };
      });
      setForm(filled);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error("Nothing to save");
      const { error } = await (supabase as any)
        .from("platform_settings")
        .update({ value: form, updated_at: new Date().toISOString(), updated_by: user?.id ?? null })
        .eq("key", "integrations");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Integration status saved");
      qc.invalidateQueries({ queryKey: ["platform-settings-integrations"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!form) return null;

  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Plug className="h-4 w-4" /> Integrations</CardTitle>
        <p className="text-sm text-slate-500">Gateway, email, analytics, and CRM status.</p>
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>This tracks status only — actual API keys/secrets live in Supabase Edge Function secrets, never in this table.</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {(Object.keys(labels) as IntegrationKey[]).map((key) => (
          <div key={key} className="rounded-xl border border-slate-200 bg-[#fbfaf8] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{labels[key]}</p>
                <Badge variant={form[key].configured ? "default" : "secondary"} className="mt-1">
                  {form[key].configured ? "Connected" : "Not configured"}
                </Badge>
              </div>
              <Switch
                checked={form[key].configured}
                onCheckedChange={(v) => setForm({ ...form, [key]: { ...form[key], configured: v } })}
              />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div><Label className="text-xs">Provider</Label><Input value={form[key].provider} onChange={(e) => setForm({ ...form, [key]: { ...form[key], provider: e.target.value } })} placeholder="Razorpay, SendGrid…" /></div>
              <div><Label className="text-xs">Notes</Label><Input value={form[key].notes} onChange={(e) => setForm({ ...form, [key]: { ...form[key], notes: e.target.value } })} placeholder="e.g. keys stored in edge function secrets" /></div>
            </div>
          </div>
        ))}
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          <Save className="mr-1 h-4 w-4" /> Save integration status
        </Button>
      </CardContent>
    </Card>
  );
}
