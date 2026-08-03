import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

type Link = {
  id: string;
  label: string;
  slug: string;
  clicks: number;
  conversions: number;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  campaign_id: string | null;
  course_id: string | null;
  is_active: boolean;
  campaigns?: { name: string } | null;
  courses?: { title: string } | null;
};

export default function CampaignPerformancePanel() {
  const [groupBy, setGroupBy] = useState<"campaign" | "source" | "medium">("campaign");

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["campaign-performance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_links")
        .select("*, campaigns(name), courses(title)")
        .order("clicks", { ascending: false });
      if (error) throw error;
      return (data || []) as Link[];
    },
  });

  const grouped = useMemo(() => {
    const key = (l: Link) => {
      if (groupBy === "campaign") return l.campaigns?.name || "No campaign";
      if (groupBy === "source") return l.utm_source || "Unknown source";
      return l.utm_medium || "Unknown medium";
    };
    const map = new Map<string, { clicks: number; conversions: number; links: number }>();
    for (const l of links) {
      const k = key(l);
      const e = map.get(k) ?? { clicks: 0, conversions: 0, links: 0 };
      e.clicks += l.clicks;
      e.conversions += l.conversions;
      e.links += 1;
      map.set(k, e);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v, rate: v.clicks > 0 ? Math.round((v.conversions / v.clicks) * 1000) / 10 : 0 }))
      .sort((a, b) => b.clicks - a.clicks);
  }, [links, groupBy]);

  const totals = useMemo(
    () => links.reduce((acc, l) => ({ clicks: acc.clicks + l.clicks, conversions: acc.conversions + l.conversions }), { clicks: 0, conversions: 0 }),
    [links]
  );

  return (
    <Card className="border-0">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="font-display flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" /> Campaign & UTM Performance
        </CardTitle>
        <Select value={groupBy} onValueChange={(v: "campaign" | "source" | "medium") => setGroupBy(v)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="campaign">By campaign</SelectItem>
            <SelectItem value="source">By UTM source</SelectItem>
            <SelectItem value="medium">By UTM medium</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="border-0 bg-secondary/50"><CardContent className="p-4"><p className="text-2xl font-display font-bold">{totals.clicks}</p><p className="text-xs text-muted-foreground">Total clicks</p></CardContent></Card>
          <Card className="border-0 bg-secondary/50"><CardContent className="p-4"><p className="text-2xl font-display font-bold">{totals.conversions}</p><p className="text-xs text-muted-foreground">Total conversions</p></CardContent></Card>
          <Card className="border-0 bg-secondary/50"><CardContent className="p-4"><p className="text-2xl font-display font-bold">{totals.clicks > 0 ? `${Math.round((totals.conversions / totals.clicks) * 1000) / 10}%` : "—"}</p><p className="text-xs text-muted-foreground">Overall conversion rate</p></CardContent></Card>
        </div>

        {isLoading ? (
          <p className="py-8 text-center text-muted-foreground">Loading…</p>
        ) : grouped.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{groupBy === "campaign" ? "Campaign" : groupBy === "source" ? "UTM Source" : "UTM Medium"}</TableHead>
                <TableHead className="text-right">Links</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Conversions</TableHead>
                <TableHead className="text-right">Conv. rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped.map((g) => (
                <TableRow key={g.name}>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell className="text-right">{g.links}</TableCell>
                  <TableCell className="text-right">{g.clicks}</TableCell>
                  <TableCell className="text-right">{g.conversions}</TableCell>
                  <TableCell className="text-right"><Badge variant={g.rate > 5 ? "default" : "secondary"}>{g.rate}%</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="py-8 text-center text-muted-foreground">No affiliate link activity yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
