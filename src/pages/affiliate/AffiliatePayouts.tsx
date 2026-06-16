import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { toast } from "sonner";

function rupee(c: number) { return `₹${(c / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`; }
const MIN_PAYOUT_CENTS = 50000; // ₹500

export default function AffiliatePayouts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");

  const { data: aff } = useQuery({
    queryKey: ["my-affiliate", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("affiliates").select("*").eq("user_id", user!.id).maybeSingle()).data,
  });

  const { data: commissions } = useQuery({
    queryKey: ["payout-commissions", aff?.id],
    enabled: !!aff,
    queryFn: async () => (await supabase.from("commissions").select("amount_cents, state").eq("affiliate_id", aff!.id)).data ?? [],
  });

  const { data: withdrawals } = useQuery({
    queryKey: ["my-withdrawals", aff?.id],
    enabled: !!aff,
    queryFn: async () => (await supabase.from("withdrawals").select("*").eq("affiliate_id", aff!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const approved = (commissions ?? []).filter((c: any) => c.state === "approved").reduce((s, c: any) => s + c.amount_cents, 0);
  const pendingWithdraw = (withdrawals ?? []).filter((w: any) => ["requested", "approved", "processing"].includes(w.state)).reduce((s, w: any) => s + w.amount_cents, 0);
  const available = Math.max(0, approved - pendingWithdraw);

  const request = useMutation({
    mutationFn: async () => {
      const cents = Math.round(parseFloat(amount) * 100);
      if (!cents || cents < MIN_PAYOUT_CENTS) throw new Error(`Minimum ${rupee(MIN_PAYOUT_CENTS)}`);
      if (cents > available) throw new Error("Exceeds available balance");
      const { error } = await supabase.from("withdrawals").insert({
        affiliate_id: aff!.id, amount_cents: cents, currency: "INR",
        method: aff!.payout_method, payout_details: aff!.payout_details, state: "requested",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payout requested");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["my-withdrawals"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Payouts</h1>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="border-0 bg-secondary/40"><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Available</p><p className="text-2xl font-display font-bold mt-1">{rupee(available)}</p></CardContent></Card>
        <Card className="border-0 bg-secondary/40"><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">In review</p><p className="text-2xl font-display font-bold mt-1">{rupee(pendingWithdraw)}</p></CardContent></Card>
        <Card className="border-0 bg-secondary/40"><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Lifetime paid</p><p className="text-2xl font-display font-bold mt-1">{rupee(aff?.total_paid_cents ?? 0)}</p></CardContent></Card>
      </div>

      <Card className="border-0">
        <CardHeader><CardTitle className="text-base">Request payout</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Method: <span className="font-medium">{aff?.payout_method?.toUpperCase()}</span></p>
          <div className="flex items-end gap-3">
            <div className="flex-1"><Label>Amount (INR)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`${MIN_PAYOUT_CENTS / 100}`} /></div>
            <Button onClick={() => request.mutate()} disabled={request.isPending}>Request</Button>
          </div>
          <p className="text-xs text-muted-foreground">Minimum {rupee(MIN_PAYOUT_CENTS)}. Payouts process within 5 business days.</p>
        </CardContent>
      </Card>

      <Card className="border-0">
        <CardHeader><CardTitle className="text-base">History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>State</TableHead><TableHead>Ref</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {!withdrawals?.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No payouts yet.</TableCell></TableRow>}
              {withdrawals?.map((w: any) => (
                <TableRow key={w.id}>
                  <TableCell>{format(new Date(w.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell className="font-mono">{rupee(w.amount_cents)}</TableCell>
                  <TableCell>{w.method.toUpperCase()}</TableCell>
                  <TableCell><Badge variant={w.state === "paid" ? "default" : w.state === "rejected" || w.state === "failed" ? "destructive" : "secondary"}>{w.state}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{w.razorpay_payout_id ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
