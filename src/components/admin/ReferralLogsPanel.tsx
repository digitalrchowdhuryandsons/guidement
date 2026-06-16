import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default function ReferralLogsPanel() {
  const { data: referrals = [] } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals")
        .select("*, affiliates(code, display_name)")
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ["admin-commissions-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("commissions")
        .select("*, affiliates(code, display_name), courses(title)")
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <Card className="border-0">
        <CardHeader><CardTitle className="font-display">Recent Referrals</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Affiliate</TableHead>
                <TableHead>Visitor</TableHead>
                <TableHead>User</TableHead>
                <TableHead>First Click</TableHead>
                <TableHead>Attributed</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrals.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.affiliates?.display_name}</div>
                    <code className="text-xs text-muted-foreground">{r.affiliates?.code}</code>
                  </TableCell>
                  <TableCell><code className="text-xs">{r.visitor_id?.slice(0, 12)}…</code></TableCell>
                  <TableCell>{r.user_id ? <code className="text-xs">{r.user_id.slice(0,8)}…</code> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-xs">{new Date(r.first_click_at).toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{r.attributed_at ? new Date(r.attributed_at).toLocaleString() : "—"}</TableCell>
                  <TableCell className="text-xs">{new Date(r.expires_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {referrals.length === 0 && <p className="text-center text-muted-foreground py-8">No referrals yet</p>}
        </CardContent>
      </Card>

      <Card className="border-0">
        <CardHeader><CardTitle className="font-display">Recent Commissions</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Affiliate</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Base</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium">{c.affiliates?.display_name}</div>
                    <code className="text-xs text-muted-foreground">{c.affiliates?.code}</code>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{c.courses?.title}</TableCell>
                  <TableCell>
                    <Badge variant={
                      c.state === "paid" ? "default" :
                      c.state === "approved" ? "secondary" :
                      c.state === "rejected" || c.state === "reversed" ? "destructive" :
                      "outline"
                    }>{c.state}</Badge>
                  </TableCell>
                  <TableCell className="text-right">₹{(Number(c.base_cents)/100).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">₹{(Number(c.amount_cents)/100).toFixed(2)}</TableCell>
                  <TableCell className="text-xs">{new Date(c.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {commissions.length === 0 && <p className="text-center text-muted-foreground py-8">No commissions yet</p>}
        </CardContent>
      </Card>
    </div>
  );
}
