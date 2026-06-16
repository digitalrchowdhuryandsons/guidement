import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp } from "lucide-react";

type Purchase = {
  id: string;
  amount: number;
  created_at: string;
  status: string | null;
  course_id: string;
  courses?: { title: string | null } | null;
};

const monthKey = (date: string) => date.slice(0, 7);
const formatMonth = (key: string) => {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
};

export default function RevenueAnalyticsPanel() {
  const [monthFilter, setMonthFilter] = useState("all");

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["admin-revenue-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("id, amount, created_at, status, course_id, courses(title)")
        .eq("status", "completed")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Purchase[];
    },
  });

  const months = useMemo(() => Array.from(new Set(purchases.map((p) => monthKey(p.created_at)))).sort().reverse(), [purchases]);
  const filteredPurchases = useMemo(
    () => (monthFilter === "all" ? purchases : purchases.filter((p) => monthKey(p.created_at) === monthFilter)),
    [monthFilter, purchases]
  );

  const monthlyRevenue = useMemo(
    () =>
      months.map((key) => {
        const monthPurchases = purchases.filter((p) => monthKey(p.created_at) === key);
        return {
          key,
          revenue: monthPurchases.reduce((sum, p) => sum + Number(p.amount), 0),
          sales: monthPurchases.length,
        };
      }),
    [months, purchases]
  );

  const selectedRevenue = filteredPurchases.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <Card className="border-0">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="font-display flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" /> Revenue by Month
          </CardTitle>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Filter by month" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {months.map((month) => <SelectItem key={month} value={month}>{formatMonth(month)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-0 bg-secondary/50"><CardContent className="p-4"><p className="text-2xl font-display font-bold">${selectedRevenue.toFixed(2)}</p><p className="text-xs text-muted-foreground">Revenue for selected filter</p></CardContent></Card>
          <Card className="border-0 bg-secondary/50"><CardContent className="p-4"><p className="text-2xl font-display font-bold">{filteredPurchases.length}</p><p className="text-xs text-muted-foreground">Completed sales</p></CardContent></Card>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? <p className="text-center text-muted-foreground py-8">Loading revenue...</p> : (
          <>
            <div className="rounded-lg border overflow-hidden">
              <Table><TableHeader><TableRow><TableHead>Month</TableHead><TableHead>Sales</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader><TableBody>
                {monthlyRevenue.map((m) => <TableRow key={m.key}><TableCell className="font-medium">{formatMonth(m.key)}</TableCell><TableCell><Badge variant="secondary">{m.sales} sales</Badge></TableCell><TableCell className="text-right font-semibold">${m.revenue.toFixed(2)}</TableCell></TableRow>)}
              </TableBody></Table>
            </div>
            <div className="rounded-lg border overflow-hidden">
              <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Course</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>
                {filteredPurchases.map((p) => <TableRow key={p.id}><TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell><TableCell>{p.courses?.title || "Untitled course"}</TableCell><TableCell className="text-right">${Number(p.amount).toFixed(2)}</TableCell></TableRow>)}
                {filteredPurchases.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8"><TrendingUp className="mx-auto mb-2 h-5 w-5" />No completed revenue for this filter.</TableCell></TableRow>}
              </TableBody></Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
