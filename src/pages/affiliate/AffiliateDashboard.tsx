import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid,
} from "recharts";
import { format, subDays } from "date-fns";

function fmtRupee(cents: number) {
  return `₹${(cents / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function AffiliateDashboard() {
  const { user } = useAuth();

  const { data: aff } = useQuery({
    queryKey: ["my-affiliate", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("affiliates").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: commissions } = useQuery({
    queryKey: ["my-commissions", aff?.id],
    enabled: !!aff,
    queryFn: async () => {
      const { data } = await supabase
        .from("commissions").select("amount_cents, state, created_at, course_id")
        .eq("affiliate_id", aff!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: clicks } = useQuery({
    queryKey: ["my-clicks", aff?.id],
    enabled: !!aff,
    queryFn: async () => {
      const since = subDays(new Date(), 30).toISOString();
      const { data } = await supabase
        .from("click_events").select("created_at, is_bot, is_unique")
        .eq("affiliate_id", aff!.id).gte("created_at", since)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const pendingCents = (commissions ?? []).filter((c: any) => c.state === "pending" || c.state === "approved").reduce((s, c: any) => s + c.amount_cents, 0);
  const paidCents = (commissions ?? []).filter((c: any) => c.state === "paid").reduce((s, c: any) => s + c.amount_cents, 0);
  const conv = (aff?.total_clicks ?? 0) > 0 ? ((aff?.total_sales ?? 0) / (aff?.total_clicks ?? 1)) * 100 : 0;

  // build last-30-day arrays
  const days = Array.from({ length: 30 }).map((_, i) => {
    const d = subDays(new Date(), 29 - i);
    return { date: format(d, "MMM d"), key: format(d, "yyyy-MM-dd"), clicks: 0, revenue: 0 };
  });
  const byDay = new Map(days.map((d) => [d.key, d]));
  (clicks ?? []).forEach((c: any) => {
    if (c.is_bot) return;
    const k = format(new Date(c.created_at), "yyyy-MM-dd");
    const d = byDay.get(k); if (d) d.clicks += 1;
  });
  (commissions ?? []).forEach((c: any) => {
    const k = format(new Date(c.created_at), "yyyy-MM-dd");
    const d = byDay.get(k); if (d) d.revenue += c.amount_cents / 100;
  });

  const stats = [
    { label: "Total earned", value: fmtRupee(aff?.total_earned_cents ?? 0) },
    { label: "Pending", value: fmtRupee(pendingCents) },
    { label: "Paid", value: fmtRupee(paidCents) },
    { label: "Clicks", value: aff?.total_clicks ?? 0 },
    { label: "Signups", value: aff?.total_signups ?? 0 },
    { label: "Sales", value: aff?.total_sales ?? 0 },
    { label: "Conversion", value: `${conv.toFixed(2)}%` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-2xl font-bold">Overview</h1>
        <Badge variant="default" className="bg-primary/15 text-primary border border-primary/30">Approved</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="border-0 bg-secondary/40 backdrop-blur">
            <CardContent className="p-4">
              <p className="text-xs uppercase text-muted-foreground">{s.label}</p>
              <p className="text-xl font-display font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-0 bg-secondary/40">
          <CardHeader><CardTitle className="text-base">Revenue (last 30 days)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={days}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-0 bg-secondary/40">
          <CardHeader><CardTitle className="text-base">Clicks (last 30 days)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="clicks" fill="hsl(var(--primary))" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0">
        <CardHeader><CardTitle className="text-base">Latest commissions</CardTitle></CardHeader>
        <CardContent>
          {!commissions?.length ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No commissions yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {commissions.slice(0, 8).map((c: any) => (
                <div key={c.created_at + c.amount_cents} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-muted-foreground">{format(new Date(c.created_at), "MMM d, HH:mm")}</span>
                  <Badge variant="outline">{c.state}</Badge>
                  <span className="font-mono">{fmtRupee(c.amount_cents)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
