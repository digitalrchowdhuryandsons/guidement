import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Plus, QrCode } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

function urlFor(code: string, slug?: string) {
  const base = window.location.origin;
  return slug ? `${base}/ref/L_${slug}` : `${base}/ref/${code}`;
}

export default function AffiliateLinks() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: aff } = useQuery({
    queryKey: ["my-affiliate", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("affiliates").select("*").eq("user_id", user!.id).maybeSingle()).data,
  });

  const { data: courses } = useQuery({
    queryKey: ["aff-courses"],
    queryFn: async () => (await supabase.from("courses").select("id,title").eq("is_published", true).eq("is_approved", true).limit(200)).data ?? [],
  });

  const { data: links } = useQuery({
    queryKey: ["my-links", aff?.id],
    enabled: !!aff,
    queryFn: async () => (await supabase.from("affiliate_links").select("*").eq("affiliate_id", aff!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    label: "",
    course_id: "",
    landing_path: "/",
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_content: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      const slug = Math.random().toString(36).slice(2, 10);
      const { error } = await supabase.from("affiliate_links").insert({
        affiliate_id: aff!.id,
        slug,
        label: form.label || "Untitled",
        course_id: form.course_id || null,
        landing_path: form.landing_path || "/",
        utm_source: form.utm_source || null,
        utm_medium: form.utm_medium || null,
        utm_campaign: form.utm_campaign || null,
        utm_content: form.utm_content || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Link created");
      setOpen(false);
      setForm({ label: "", course_id: "", landing_path: "/", utm_source: "", utm_medium: "", utm_campaign: "", utm_content: "" });
      qc.invalidateQueries({ queryKey: ["my-links"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, v }: { id: string; v: boolean }) => {
      const { error } = await supabase.from("affiliate_links").update({ is_active: v }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-links"] }),
  });

  const primary = aff ? urlFor(aff.code) : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-2xl font-bold">Referral Links</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New campaign link</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create link</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Label *</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div>
              <div>
                <Label>Course (optional)</Label>
                <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v === "_all" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="All courses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All courses</SelectItem>
                    {(courses ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Landing path</Label><Input value={form.landing_path} onChange={(e) => setForm({ ...form, landing_path: e.target.value })} placeholder="/" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>utm_source</Label><Input value={form.utm_source} onChange={(e) => setForm({ ...form, utm_source: e.target.value })} /></div>
                <div><Label>utm_medium</Label><Input value={form.utm_medium} onChange={(e) => setForm({ ...form, utm_medium: e.target.value })} /></div>
                <div><Label>utm_campaign</Label><Input value={form.utm_campaign} onChange={(e) => setForm({ ...form, utm_campaign: e.target.value })} /></div>
                <div><Label>utm_content</Label><Input value={form.utm_content} onChange={(e) => setForm({ ...form, utm_content: e.target.value })} /></div>
              </div>
              <Button onClick={() => create.mutate()} disabled={create.isPending || !form.label}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 bg-gradient-to-br from-primary/10 to-transparent">
        <CardHeader><CardTitle className="text-base">Your primary link</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input readOnly value={primary} />
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(primary); toast.success("Copied"); }}>
              <Copy className="h-4 w-4" />
            </Button>
            <Dialog>
              <DialogTrigger asChild><Button variant="outline"><QrCode className="h-4 w-4" /></Button></DialogTrigger>
              <DialogContent className="flex justify-center"><QRCodeSVG value={primary} size={220} /></DialogContent>
            </Dialog>
          </div>
          <p className="text-xs text-muted-foreground">Share this anywhere. Signups + purchases attribute back to you for {60} days.</p>
        </CardContent>
      </Card>

      <Card className="border-0">
        <CardHeader><CardTitle className="text-base">Campaign links</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border">
          {!links?.length && <p className="text-sm text-muted-foreground py-6 text-center">No campaign links yet.</p>}
          {links?.map((l: any) => {
            const url = urlFor(aff!.code, l.slug);
            return (
              <div key={l.id} className="py-3 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{l.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{url}</p>
                </div>
                <span className="text-xs text-muted-foreground">{l.clicks} clicks · {l.conversions} conv.</span>
                <Switch checked={l.is_active} onCheckedChange={(v) => toggle.mutate({ id: l.id, v })} />
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast.success("Copied"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
