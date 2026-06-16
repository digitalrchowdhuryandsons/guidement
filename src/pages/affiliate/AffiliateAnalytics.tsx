import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { format, subDays } from "date-fns";

function rupee(c: number) { return `₹${(c / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`; }

export default function AffiliateAnalytics() {
  const { user } = useAuth();
  const [from, setFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [country, setCountry] = useState("");

  const { data: aff } = useQuery({
    queryKey: ["my-affiliate", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("affiliates").select("id").eq("user_id", user!.id).maybeSingle()).data,
  });

  const fromIso = new Date(from).toISOString();
  const toIso = new Date(new Date(to).getTime() + 86400000).toISOString();

  const { data: clicks } = useQuery({
    queryKey: ["analytics-clicks", aff?.id, fromIso, toIso, country],
    enabled: !!aff,
    queryFn: async () => {
      let q = supabase.from("click_events")
        .select("country, is_bot, is_unique, created_at, visitor_id")
        .eq("affiliate_id", aff!.id)
        .gte("created_at", fromIso).lt("created_at", toIso);
      if (country) q = q.eq("country", country);
      return (await q.limit(5000)).data ?? [];
    },
  });

  const { data: referrals } = useQuery({
    queryKey: ["analytics-refs", aff?.id, fromIso, toIso],
    enabled: !!aff,
    queryFn: async () => (await supabase.from("referrals").select("id, attributed_at, created_at")
      .eq("affiliate_id", aff!.id).gte("created_at", fromIso).lt("created_at", toIso)).data ?? [],
  });

  const { data: commissions } = useQuery({
    queryKey: ["analytics-comm", aff?.id, fromIso, toIso],
    enabled: !!aff,
    queryFn: async () => (await supabase.from("commissions").select("amount_cents, base_cents, course_id, created_at, state")
      .eq("affiliate_id", aff!.id).gte("created_at", fromIso).lt("created_at", toIso)).data ?? [],
  });

  const m = useMemo(() => {
    const totalClicks = (clicks ?? []).filter((c: any) => !c.is_bot).length;
    const uniqueVisitors = new Set((clicks ?? []).filter((c: any) => !c.is_bot).map((c: any) => c.visitor_id)).size;
    const signups = referrals?.length ?? 0;
    const sales = commissions?.length ?? 0;
    const revenue = (commissions ?? []).reduce((s, c: any) => s + c.base_cents, 0);
    const earnings = (commissions ?? []).reduce((s, c: any) => s + c.amount_cents, 0);
    const ctr = totalClicks > 0 ? (signups / totalClicks) * 100 : 0;
    const aov = sales > 0 ? revenue / sales : 0;
    return { totalClicks, uniqueVisitors, signups, sales, revenue, earnings, ctr, aov };
  }, [clicks, referrals, commissions]);

  function exportCsv() {
    const rows = [
      ["Date range", `${from} - ${to}`],
      ["Total clicks", m.totalClicks],
      ["Unique visitors", m.uniqueVisitors],
      ["Signups", m.signups],
      ["Sales", m.sales],
      ["Gross revenue (paise)", m.revenue],
      ["Earnings (paise)", m.earnings],
      ["CTR signups/clicks (%)", m.ctr.toFixed(2)],
      ["Average order value (paise)", m.aov.toFixed(0)],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `affiliate-analytics-${from}_${to}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Analytics</h1>

      <Card className="border-0 bg-secondary/40">
        <CardContent className="p-4 flex items-end gap-3 flex-wrap">
          <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div><Label>Country</Label><Input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} placeholder="IN, US…" maxLength={3} /></div>
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Total visitors", m.totalClicks],
          ["Unique visitors", m.uniqueVisitors],
          ["Signups", m.signups],
          ["Sales", m.sales],
          ["Revenue", rupee(m.revenue)],
          ["Earnings", rupee(m.earnings)],
          ["Signup CTR", `${m.ctr.toFixed(2)}%`],
          ["Avg order value", rupee(m.aov)],
        ].map(([l, v]) => (
          <Card key={String(l)} className="border-0 bg-secondary/40">
            <CardContent className="p-4">
              <p className="text-xs uppercase text-muted-foreground">{l}</p>
              <p className="text-xl font-display font-bold mt-1">{v as any}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0">
        <CardHeader><CardTitle className="text-base">Conversion funnel</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[
            { l: "Visitors", v: m.totalClicks, w: 100 },
            { l: "Signups", v: m.signups, w: m.totalClicks > 0 ? (m.signups / m.totalClicks) * 100 : 0 },
            { l: "Sales", v: m.sales, w: m.totalClicks > 0 ? (m.sales / m.totalClicks) * 100 : 0 },
          ].map((r) => (
            <div key={r.l}>
              <div className="flex justify-between text-sm mb-1">
                <span>{r.l}</span><span className="font-mono">{r.v}</span>
              </div>
              <div className="h-2 bg-secondary rounded">
                <div className="h-full bg-primary rounded" style={{ width: `${Math.max(2, r.w)}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
