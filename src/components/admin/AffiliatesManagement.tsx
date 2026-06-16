import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle, XCircle, ShieldOff, ShieldCheck, Search } from "lucide-react";

const STATUSES = ["pending", "approved", "rejected", "suspended"] as const;

export default function AffiliatesManagement() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("pending");
  const [search, setSearch] = useState("");

  const { data: affiliates = [], isLoading } = useQuery({
    queryKey: ["admin-affiliates", filter],
    queryFn: async () => {
      let q = supabase
        .from("affiliates")
        .select("*, profiles!affiliates_user_id_fkey(full_name, avatar_url)")
        .order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter as any);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const patch: any = { status };
      if (status === "suspended" && reason) patch.suspended_reason = reason;
      const { error } = await supabase.from("affiliates").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Affiliate updated");
      qc.invalidateQueries({ queryKey: ["admin-affiliates"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = affiliates.filter((a: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      a.code?.toLowerCase().includes(s) ||
      a.display_name?.toLowerCase().includes(s) ||
      a.profiles?.full_name?.toLowerCase().includes(s)
    );
  });

  return (
    <Card className="border-0">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
        <CardTitle className="font-display">Affiliates</CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search code or name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground py-8 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">No affiliates</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Signups</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="text-right">Earned</TableHead>
                <TableHead className="text-right">Risk</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="font-medium">{a.display_name}</div>
                    <div className="text-xs text-muted-foreground">{a.profiles?.full_name}</div>
                  </TableCell>
                  <TableCell><code className="text-xs">{a.code}</code></TableCell>
                  <TableCell>
                    <Badge variant={
                      a.status === "approved" ? "default" :
                      a.status === "rejected" || a.status === "suspended" ? "destructive" :
                      "secondary"
                    }>{a.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{a.total_clicks}</TableCell>
                  <TableCell className="text-right">{a.total_signups}</TableCell>
                  <TableCell className="text-right">{a.total_sales}</TableCell>
                  <TableCell className="text-right">₹{(Number(a.total_earned_cents)/100).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={a.risk_score >= 70 ? "destructive" : a.risk_score >= 40 ? "secondary" : "outline"}>
                      {a.risk_score}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {a.status === "pending" && (
                        <>
                          <Button size="sm" variant="default" onClick={() => setStatus.mutate({ id: a.id, status: "approved" })}>
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setStatus.mutate({ id: a.id, status: "rejected" })}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {a.status === "approved" && (
                        <Button size="sm" variant="outline" onClick={() => {
                          const reason = prompt("Suspension reason?");
                          if (reason) setStatus.mutate({ id: a.id, status: "suspended", reason });
                        }}>
                          <ShieldOff className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {a.status === "suspended" && (
                        <Button size="sm" variant="default" onClick={() => setStatus.mutate({ id: a.id, status: "approved" })}>
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </Button>
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
