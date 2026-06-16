import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useState } from "react";

export default function FraudCenterPanel() {
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: reports = [] } = useQuery({
    queryKey: ["admin-fraud"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fraud_reports")
        .select("*, affiliates(code, display_name, status)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, status, reviewer_notes }: { id: string; status: string; reviewer_notes?: string }) => {
      const { error } = await supabase.from("fraud_reports").update({
        status,
        reviewer_notes,
        reviewer_id: (await supabase.auth.getUser()).data.user?.id,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-fraud"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="border-0">
      <CardHeader><CardTitle className="font-display">Fraud Center</CardTitle></CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No fraud reports</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Affiliate</TableHead>
                <TableHead className="text-right">Risk</TableHead>
                <TableHead>Rule Hits</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-80">Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.affiliates?.display_name}</div>
                    <code className="text-xs text-muted-foreground">{r.affiliates?.code}</code>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={r.risk_score >= 70 ? "destructive" : r.risk_score >= 40 ? "secondary" : "outline"}>
                      {r.risk_score}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(r.rule_hits || []).map((h: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          {typeof h === "string" ? h : h.rule || JSON.stringify(h)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell><Badge>{r.status}</Badge></TableCell>
                  <TableCell>
                    <Textarea
                      placeholder="Reviewer notes"
                      value={notes[r.id] ?? r.reviewer_notes ?? ""}
                      onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                      className="mb-2 h-16 text-xs"
                    />
                    <div className="flex gap-1">
                      <Button size="sm" variant="default" onClick={() =>
                        update.mutate({ id: r.id, status: "cleared", reviewer_notes: notes[r.id] })
                      }>Clear</Button>
                      <Button size="sm" variant="destructive" onClick={async () => {
                        await supabase.from("affiliates").update({ status: "suspended", suspended_reason: notes[r.id] || "Fraud" }).eq("id", r.affiliate_id);
                        update.mutate({ id: r.id, status: "confirmed", reviewer_notes: notes[r.id] });
                      }}>Confirm + Suspend</Button>
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
