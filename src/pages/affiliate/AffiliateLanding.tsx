import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Wallet, Link as LinkIcon, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function AffiliateLanding() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();

  const { data: aff, isLoading } = useQuery({
    queryKey: ["my-affiliate", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("affiliates").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({
    display_name: "",
    website: "",
    promo_channels: "",
    audience_size: "",
    tax_id: "",
    payout_method: "upi" as "upi" | "bank" | "paypal" | "stripe",
    upi_id: "",
    bank_account: "",
    bank_ifsc: "",
    bank_holder: "",
    paypal_email: "",
    terms: false,
  });

  const apply = useMutation({
    mutationFn: async () => {
      const payout_details =
        form.payout_method === "upi" ? { upi_id: form.upi_id } :
        form.payout_method === "bank" ? { account: form.bank_account, ifsc: form.bank_ifsc, holder: form.bank_holder } :
        form.payout_method === "paypal" ? { email: form.paypal_email } : {};
      const { data, error } = await supabase.functions.invoke("affiliate-apply", {
        body: {
          display_name: form.display_name,
          website: form.website,
          promo_channels: form.promo_channels,
          audience_size: form.audience_size,
          tax_id: form.tax_id,
          payout_method: form.payout_method,
          payout_details,
          terms_accepted: form.terms,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      toast.success("Application submitted!");
      qc.invalidateQueries({ queryKey: ["my-affiliate"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to apply"),
  });

  if (loading || isLoading) return null;
  if (!user) return <Navigate to="/auth?next=/affiliate" />;

  if (aff) {
    return (
      <div className="container py-12 max-w-3xl space-y-6">
        <Card className="border-0 bg-gradient-to-br from-primary/10 to-transparent">
          <CardHeader>
            <CardTitle className="font-display text-2xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Affiliate Application
            </CardTitle>
            <CardDescription>
              Status:{" "}
              <Badge variant={aff.status === "approved" ? "default" : aff.status === "rejected" || aff.status === "suspended" ? "destructive" : "secondary"}>
                {aff.status}
              </Badge>
              <span className="ml-3 text-xs text-muted-foreground">Code: <code>{aff.code}</code></span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {aff.status === "approved" && (
              <Button asChild><Link to="/affiliate/dashboard">Open dashboard</Link></Button>
            )}
            {aff.status === "pending" && <p className="text-sm text-muted-foreground">An admin will review your application soon.</p>}
            {aff.status === "rejected" && <p className="text-sm text-muted-foreground">Your application was rejected. Contact support for details.</p>}
            {aff.status === "suspended" && <p className="text-sm text-destructive">Your account is suspended: {aff.suspended_reason ?? "—"}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-12 max-w-4xl space-y-8">
      <div className="text-center space-y-3">
        <h1 className="font-display text-4xl font-bold">Become an Affiliate</h1>
        <p className="text-muted-foreground">Earn commission for every learner you refer.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { icon: LinkIcon, t: "Unique links", d: "Share your /ref/CODE link anywhere." },
          { icon: TrendingUp, t: "Realtime analytics", d: "Track clicks, signups, sales." },
          { icon: Wallet, t: "Fast payouts", d: "UPI, bank, PayPal." },
        ].map((x) => (
          <Card key={x.t} className="border-0 bg-secondary/40">
            <CardContent className="p-5 space-y-2">
              <x.icon className="h-5 w-5 text-primary" />
              <p className="font-semibold">{x.t}</p>
              <p className="text-sm text-muted-foreground">{x.d}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0">
        <CardHeader>
          <CardTitle className="font-display">Apply now</CardTitle>
          <CardDescription>Approval is usually within 24 hours.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Display name *</Label>
              <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} maxLength={80} />
            </div>
            <div>
              <Label>Website / channel URL</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} maxLength={200} placeholder="https://" />
            </div>
            <div className="sm:col-span-2">
              <Label>Where do you promote?</Label>
              <Textarea value={form.promo_channels} onChange={(e) => setForm({ ...form, promo_channels: e.target.value })} maxLength={500} placeholder="YouTube, Newsletter, Twitter, …" />
            </div>
            <div>
              <Label>Audience size</Label>
              <Input value={form.audience_size} onChange={(e) => setForm({ ...form, audience_size: e.target.value })} maxLength={80} placeholder="10k subscribers" />
            </div>
            <div>
              <Label>Tax ID / PAN (optional)</Label>
              <Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} maxLength={80} />
            </div>
            <div>
              <Label>Payout method *</Label>
              <Select value={form.payout_method} onValueChange={(v: any) => setForm({ ...form, payout_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank">Bank transfer</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4">
              {form.payout_method === "upi" && (
                <div className="sm:col-span-2">
                  <Label>UPI ID *</Label>
                  <Input value={form.upi_id} onChange={(e) => setForm({ ...form, upi_id: e.target.value })} placeholder="name@bank" />
                </div>
              )}
              {form.payout_method === "bank" && (
                <>
                  <div><Label>Account number *</Label><Input value={form.bank_account} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} /></div>
                  <div><Label>IFSC *</Label><Input value={form.bank_ifsc} onChange={(e) => setForm({ ...form, bank_ifsc: e.target.value })} /></div>
                  <div className="sm:col-span-2"><Label>Account holder *</Label><Input value={form.bank_holder} onChange={(e) => setForm({ ...form, bank_holder: e.target.value })} /></div>
                </>
              )}
              {form.payout_method === "paypal" && (
                <div className="sm:col-span-2"><Label>PayPal email *</Label><Input type="email" value={form.paypal_email} onChange={(e) => setForm({ ...form, paypal_email: e.target.value })} /></div>
              )}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.terms} onCheckedChange={(v) => setForm({ ...form, terms: !!v })} />
            I accept the affiliate program terms.
          </label>
          <Button
            onClick={() => apply.mutate()}
            disabled={apply.isPending || !form.display_name || !form.terms}
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            {apply.isPending ? "Submitting…" : "Submit application"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
