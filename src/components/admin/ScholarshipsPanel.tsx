import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GraduationCap, Plus, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type Course = { id: string; title: string };
const emptyForm = { user_email: "", course_id: "", amount: "", reason: "" };

export default function ScholarshipsPanel() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: courses = [] } = useQuery({
    queryKey: ["scholarship-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").order("title");
      return (data || []) as Course[];
    },
  });

  const { data: scholarships = [], isLoading } = useQuery({
    queryKey: ["scholarships"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("scholarships").select("*, courses(title)").order("created_at", { ascending: false });
      if (error) throw error;
      const userIds = Array.from(new Set((data || []).map((s: any) => s.user_id)));
      const { data: profiles } = userIds.length ? await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds) : { data: [] as any[] };
      const nameMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));
      return (data || []).map((s: any) => ({ ...s, studentName: nameMap.get(s.user_id) || "Unknown" }));
    },
  });

  const grant = useMutation({
    mutationFn: async () => {
      if (!form.user_email.trim() || !form.course_id || !form.amount) throw new Error("Email, course, and amount are required");
      const { data: rpcResult, error: rpcError } = await supabase.rpc("admin_list_users");
      if (rpcError) throw rpcError;
      const target = (rpcResult || []).find((u: any) => u.email?.toLowerCase() === form.user_email.trim().toLowerCase());
      if (!target) throw new Error("No user found with that email");
      const { error } = await (supabase as any).from("scholarships").insert({
        user_id: target.user_id,
        course_id: form.course_id,
        amount: Number(form.amount),
        reason: form.reason || null,
        status: "pending",
        granted_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Scholarship request created");
      setOpen(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["scholarships"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from("scholarships").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scholarships"] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /> Scholarships</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> Grant scholarship</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Grant a scholarship</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Student email</Label><Input value={form.user_email} onChange={(e) => setForm({ ...form, user_email: e.target.value })} placeholder="student@example.com" /></div>
              <div>
                <Label>Course</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}>
                  <option value="">Choose a course</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div><Label>Amount ($)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div><Label>Reason</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={() => grant.mutate()} disabled={grant.isPending}>Create request</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="py-8 text-center text-muted-foreground">Loading…</p>
        ) : scholarships.length > 0 ? (
          scholarships.map((s: any) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.studentName} — {s.courses?.title}</p>
                <p className="text-xs text-muted-foreground">${Number(s.amount).toFixed(2)}{s.reason ? ` · ${s.reason}` : ""}</p>
              </div>
              <Badge variant={s.status === "approved" ? "default" : s.status === "rejected" ? "destructive" : "secondary"}>{s.status}</Badge>
              {s.status === "pending" && (
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => setStatus.mutate({ id: s.id, status: "approved" })}><CheckCircle className="mr-1 h-4 w-4" /> Approve</Button>
                  <Button size="sm" variant="destructive" onClick={() => setStatus.mutate({ id: s.id, status: "rejected" })}><XCircle className="mr-1 h-4 w-4" /> Reject</Button>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-muted-foreground">No scholarship requests yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
