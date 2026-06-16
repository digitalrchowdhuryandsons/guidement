import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function PayoutQueuePanel() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("requested");
  const [active, setActive] = useState<any>(null);
  const [txnRef, setTxnRef] = useState("");
  const [reason, setReason] = useState("");

  const { data: withdrawals = [], isLoading } = useQuery({
    queryKey: ["admin-withdrawals", filter],
    queryFn: async () => {
      let q = supabase
        .from("withdrawals")
        .select("*, affiliates(code, display_name, payout_method, payout_details)")
        .order("requested_at", { ascending: false });
      if (filter !== "all") q = q.eq("state", filter as any);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const updateState = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("withdrawals").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Withdrawal updated");
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      setActive(null);
      setTxnRef("");
      setReason("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display">Payout Queue</CardTitle>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="requested">Requested</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading…</p>
        ) : withdrawals.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No withdrawals</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Affiliate</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.map((w: any) => (
                <TableRow key={w.id}>
                  <TableCell>
                    <div className="font-medium">{w.affiliates?.display_name}</div>
                    <code className="text-xs text-muted-foreground">{w.affiliates?.code}</code>
                  </TableCell>
                  <TableCell><Badge variant="outline">{w.method}</Badge></TableCell>
                  <TableCell className="text-right font-medium">
                    {w.currency} {(Number(w.amount_cents)/100).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      w.state === "paid" ? "default" :
                      w.state === "rejected" || w.state === "failed" ? "destructive" :
                      "secondary"
                    }>{w.state}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{new Date(w.requested_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {w.state === "requested" && (
                        <>
                          <Button size="sm" onClick={() => updateState.mutate({ id: w.id, patch: { state: "approved" } })}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => {
                            const r = prompt("Rejection reason?");
                            if (r) updateState.mutate({ id: w.id, patch: { state: "rejected", rejection_reason: r } });
                          }}>Reject</Button>
                        </>
                      )}
                      {(w.state === "approved" || w.state === "processing") && (
                        <Dialog open={active?.id === w.id} onOpenChange={(o) => setActive(o ? w : null)}>
                          <DialogTrigger asChild><Button size="sm">Mark Paid</Button></DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Mark as Paid</DialogTitle></DialogHeader>
                            <div className="space-y-3">
                              <div>
                                <Label>Transaction Reference</Label>
                                <Input value={txnRef} onChange={(e) => setTxnRef(e.target.value)} placeholder="UTR / Razorpay payout ID" />
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Payout details: <code>{JSON.stringify(w.affiliates?.payout_details)}</code>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button onClick={async () => {
                                if (!txnRef) { toast.error("Reference required"); return; }
                                await supabase.from("payout_transactions").insert({
                                  withdrawal_id: w.id,
                                  affiliate_id: w.affiliate_id,
                                  amount_cents: w.amount_cents,
                                  currency: w.currency,
                                  provider: "manual",
                                  provider_txn_id: txnRef,
                                  status: "success",
                                } as any);
                                updateState.mutate({
                                  id: w.id,
                                  patch: { state: "paid", processed_at: new Date().toISOString(), razorpay_payout_id: txnRef },
                                });
                              }}>Confirm</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
