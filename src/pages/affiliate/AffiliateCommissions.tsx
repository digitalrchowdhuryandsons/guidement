import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

function rupee(c: number) { return `₹${(c / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`; }

export default function AffiliateCommissions() {
  const { user } = useAuth();

  const { data: aff } = useQuery({
    queryKey: ["my-affiliate", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("affiliates").select("id").eq("user_id", user!.id).maybeSingle()).data,
  });

  const { data } = useQuery({
    queryKey: ["my-commissions-full", aff?.id],
    enabled: !!aff,
    queryFn: async () => (await supabase.from("commissions")
      .select("id, amount_cents, base_cents, rate_percent, state, created_at, course_id, currency")
      .eq("affiliate_id", aff!.id).order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Commissions</h1>
      <Card className="border-0">
        <CardHeader><CardTitle className="text-base">All commissions</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Earned</TableHead>
                <TableHead>State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data?.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No commissions yet.</TableCell></TableRow>}
              {data?.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{format(new Date(c.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                  <TableCell className="font-mono">{rupee(c.base_cents)}</TableCell>
                  <TableCell>{c.rate_percent ? `${c.rate_percent}%` : "flat"}</TableCell>
                  <TableCell className="font-mono font-semibold">{rupee(c.amount_cents)}</TableCell>
                  <TableCell><Badge variant={c.state === "paid" ? "default" : c.state === "rejected" || c.state === "reversed" ? "destructive" : "secondary"}>{c.state}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
