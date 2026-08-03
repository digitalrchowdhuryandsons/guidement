import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Palette } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type Branding = {
  logo_url: string;
  favicon_url: string;
  custom_domain: string;
  support_email: string;
  primary_color: string;
};

export default function BrandingSettingsPanel() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState<Branding | null>(null);

  const { data } = useQuery({
    queryKey: ["platform-settings-branding"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("platform_settings").select("value").eq("key", "branding").maybeSingle();
      if (error) throw error;
      return (data?.value ?? {}) as Partial<Branding>;
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        logo_url: data.logo_url || "",
        favicon_url: data.favicon_url || "",
        custom_domain: data.custom_domain || "",
        support_email: data.support_email || "",
        primary_color: data.primary_color || "#14213d",
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error("Nothing to save");
      const { error } = await (supabase as any)
        .from("platform_settings")
        .update({ value: form, updated_at: new Date().toISOString(), updated_by: user?.id ?? null })
        .eq("key", "branding");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Branding saved");
      qc.invalidateQueries({ queryKey: ["platform-settings-branding"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!form) return null;

  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Palette className="h-4 w-4" /> Branding</CardTitle>
        <p className="text-sm text-slate-500">Logo, domain, and support contact used across the public site.</p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Logo URL</Label><Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" /></div>
          <div><Label>Favicon URL</Label><Input value={form.favicon_url} onChange={(e) => setForm({ ...form, favicon_url: e.target.value })} placeholder="https://…" /></div>
          <div><Label>Custom domain</Label><Input value={form.custom_domain} onChange={(e) => setForm({ ...form, custom_domain: e.target.value })} placeholder="admin.digidominance.academy" /></div>
          <div><Label>Support email</Label><Input value={form.support_email} onChange={(e) => setForm({ ...form, support_email: e.target.value })} placeholder="support@…" /></div>
          <div>
            <Label>Primary brand color</Label>
            <div className="flex items-center gap-2">
              <Input value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} placeholder="#14213d" />
              <span className="h-9 w-9 shrink-0 rounded-md border" style={{ backgroundColor: form.primary_color }} />
            </div>
          </div>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          <Save className="mr-1 h-4 w-4" /> Save branding
        </Button>
        <p className="text-xs text-slate-500">
          SSL/DNS for a custom domain still needs to be configured with your host — this field just stores what to display.
        </p>
      </CardContent>
    </Card>
  );
}
