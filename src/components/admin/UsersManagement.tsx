import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Users, Trash2, Ban, ShieldCheck, MoreHorizontal, UserPlus, UserMinus,
  RefreshCcw, Mail, Eye, Award, CreditCard, BarChart3,
} from "lucide-react";
import { toast } from "sonner";

type ManagedUser = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  banned_until: string | null;
  roles: string[];
  country: string | null;
};

type Role = "student" | "instructor" | "admin" | "support";
type UserAction =
  | { type: "set_role"; userId: string; role: Role; grant: boolean }
  | { type: "ban"; userId: string; days: number }
  | { type: "unban"; userId: string }
  | { type: "delete"; userId: string }
  | { type: "message"; userIds: string[]; subject: string; body: string };

type BulkKind = "enroll" | "revoke" | "refund" | "message" | null;

const ROLES: Role[] = ["student", "instructor", "admin", "support"];

export default function UsersManagement() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState<BulkKind>(null);
  const [bulkCourseId, setBulkCourseId] = useState("");
  const [messageForm, setMessageForm] = useState({ subject: "", body: "" });

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      const list = (data || []) as Omit<ManagedUser, "country">[];
      const userIds = list.map((u) => u.user_id);
      let countryMap = new Map<string, string | null>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, country")
          .in("user_id", userIds);
        countryMap = new Map((profiles || []).map((p: any) => [p.user_id, p.country]));
      }
      return list.map((u) => ({ ...u, country: countryMap.get(u.user_id) ?? null })) as ManagedUser[];
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["admin-users-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").order("title");
      return data || [];
    },
  });

  const regions = useMemo(
    () => Array.from(new Set((users || []).map((u) => u.country).filter(Boolean))) as string[],
    [users]
  );

  const { data: courseUserIds } = useQuery({
    queryKey: ["users-by-course", courseFilter],
    enabled: courseFilter !== "all",
    queryFn: async () => {
      const { data } = await supabase
        .from("purchases")
        .select("user_id")
        .eq("course_id", courseFilter)
        .eq("status", "completed");
      return new Set((data || []).map((p) => p.user_id));
    },
  });

  const action = useMutation({
    mutationFn: async (payload: UserAction) => {
      const { error } = await supabase.functions.invoke("admin-user-management", { body: payload });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message || "Action failed"),
  });

  const bulkEnroll = useMutation({
    mutationFn: async () => {
      if (!bulkCourseId) throw new Error("Choose a course");
      const rows = Array.from(selected).map((user_id) => ({
        user_id,
        course_id: bulkCourseId,
        amount: 0,
        status: "completed",
      }));
      const { error } = await supabase.from("purchases").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Enrolled ${selected.size} student(s)`);
      setBulkOpen(null);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkRevoke = useMutation({
    mutationFn: async () => {
      if (!bulkCourseId) throw new Error("Choose a course");
      const { error } = await supabase
        .from("purchases")
        .update({ status: "revoked" })
        .eq("course_id", bulkCourseId)
        .in("user_id", Array.from(selected));
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Revoked access for ${selected.size} student(s)`);
      setBulkOpen(null);
      setSelected(new Set());
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkRefund = useMutation({
    mutationFn: async () => {
      if (!bulkCourseId) throw new Error("Choose a course");
      const { data: rows, error: fetchErr } = await supabase
        .from("purchases")
        .select("id, amount")
        .eq("course_id", bulkCourseId)
        .eq("status", "completed")
        .in("user_id", Array.from(selected));
      if (fetchErr) throw fetchErr;
      for (const r of rows || []) {
        const { error } = await supabase
          .from("purchases")
          .update({ status: "refunded", refunded_at: new Date().toISOString(), refund_amount: r.amount })
          .eq("id", r.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(`Refunded ${selected.size} student(s)`);
      setBulkOpen(null);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkMessage = useMutation({
    mutationFn: async () => {
      if (!messageForm.subject.trim() || !messageForm.body.trim()) throw new Error("Subject and message are required");
      const { error } = await supabase.functions.invoke("admin-user-management", {
        body: { type: "message", userIds: Array.from(selected), subject: messageForm.subject, body: messageForm.body } as UserAction,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Message queued for ${selected.size} student(s)`);
      setBulkOpen(null);
      setSelected(new Set());
      setMessageForm({ subject: "", body: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (users || []).filter((u:any) => {
    if (q) {
      const s = q.toLowerCase();
      if (!(u.email || "").toLowerCase().includes(s) && !(u.full_name || "").toLowerCase().includes(s)) return false;
    }
    if (courseFilter !== "all" && !courseUserIds?.has(u.user_id)) return false;
    if (regionFilter !== "all" && u.country !== regionFilter) return false;
    if (dateFrom && new Date(u.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(u.created_at) > new Date(`${dateTo}T23:59:59`)) return false;
    return true;
  });

  const toggleSelected = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((u) => u.user_id))));
  };

  return (
    <Card className="border-0">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> User Management
        </CardTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input placeholder="Search by name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger><SelectValue placeholder="Course" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger><SelectValue placeholder="Region" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All regions</SelectItem>
              {regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="Joined from" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="Joined to" />
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary/40 p-3">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <Button size="sm" variant="outline" onClick={() => setBulkOpen("enroll")}><UserPlus className="mr-1 h-4 w-4" /> Enroll</Button>
            <Button size="sm" variant="outline" onClick={() => setBulkOpen("revoke")}><UserMinus className="mr-1 h-4 w-4" /> Revoke access</Button>
            <Button size="sm" variant="outline" onClick={() => setBulkOpen("refund")}><RefreshCcw className="mr-1 h-4 w-4" /> Refund</Button>
            <Button size="sm" variant="outline" onClick={() => setBulkOpen("message")}><Mail className="mr-1 h-4 w-4" /> Message</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading users…</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-3 px-3 text-xs text-muted-foreground">
              <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleSelectAll} />
              Select all ({filtered.length})
            </div>
            {filtered.map((u) => {
              const banned = u.banned_until && new Date(u.banned_until) > new Date();
              return (
                <div key={u.user_id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-secondary/30">
                  <input type="checkbox" checked={selected.has(u.user_id)} onChange={() => toggleSelected(u.user_id)} />
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={u.avatar_url || undefined} />
                    <AvatarFallback>{(u.full_name || u.email || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-medium text-sm">{u.full_name || "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground">{u.email}{u.country ? ` · ${u.country}` : ""}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {u.roles?.length ? (
                      u.roles.map((r) => (
                        <Badge key={r} variant={r === "admin" || r === "super_admin" ? "default" : "secondary"}>{r}</Badge>
                      ))
                    ) : (
                      <Badge variant="outline">no roles</Badge>
                    )}
                    {banned && <Badge variant="destructive">banned</Badge>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setProfileUserId(u.user_id)}>
                    <Eye className="h-4 w-4 mr-1" /> Profile
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {ROLES.map((r) => {
                        const has = u.roles?.includes(r);
                        return (
                          <DropdownMenuItem
                            key={r}
                            onClick={() => action.mutate({ type: "set_role", userId: u.user_id, role: r, grant: !has })}
                          >
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            {has ? `Remove ${r}` : `Grant ${r}`}
                          </DropdownMenuItem>
                        );
                      })}
                      {banned ? (
                        <DropdownMenuItem onClick={() => action.mutate({ type: "unban", userId: u.user_id })}>
                          <Ban className="h-4 w-4 mr-2" /> Unban
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => action.mutate({ type: "ban", userId: u.user_id, days: 365 })}>
                          <Ban className="h-4 w-4 mr-2" /> Ban (1 year)
                        </DropdownMenuItem>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" /> Delete user
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently removes <b>{u.email}</b>. Their courses and data may cascade.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => action.mutate({ type: "delete", userId: u.user_id })}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-center text-muted-foreground py-6">No users found.</p>}
          </div>
        )}
      </CardContent>

      {/* Bulk action dialogs */}
      <Dialog open={bulkOpen === "enroll" || bulkOpen === "revoke" || bulkOpen === "refund"} onOpenChange={(o) => !o && setBulkOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkOpen === "enroll" && `Enroll ${selected.size} student(s)`}
              {bulkOpen === "revoke" && `Revoke access for ${selected.size} student(s)`}
              {bulkOpen === "refund" && `Refund ${selected.size} student(s)`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Course</Label>
            <Select value={bulkCourseId} onValueChange={setBulkCourseId}>
              <SelectTrigger><SelectValue placeholder="Choose a course" /></SelectTrigger>
              <SelectContent>
                {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (bulkOpen === "enroll") bulkEnroll.mutate();
                if (bulkOpen === "revoke") bulkRevoke.mutate();
                if (bulkOpen === "refund") bulkRefund.mutate();
              }}
              disabled={bulkEnroll.isPending || bulkRevoke.isPending || bulkRefund.isPending}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen === "message"} onOpenChange={(o) => !o && setBulkOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Message {selected.size} student(s)</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Subject</Label><Input value={messageForm.subject} onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })} /></div>
            <div><Label>Message</Label><Textarea value={messageForm.body} onChange={(e) => setMessageForm({ ...messageForm, body: e.target.value })} rows={5} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(null)}>Cancel</Button>
            <Button onClick={() => bulkMessage.mutate()} disabled={bulkMessage.isPending}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StudentProfileDialog userId={profileUserId} onClose={() => setProfileUserId(null)} />
    </Card>
  );
}

function StudentProfileDialog({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ["student-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: purchases } = await supabase
        .from("purchases")
        .select("id, amount, status, created_at, refunded_at, refund_amount, course_id, courses(title)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      const courseIds = Array.from(new Set((purchases || []).map((p: any) => p.course_id)));

      let completionByCourse: Record<string, { total: number; done: number }> = {};
      if (courseIds.length > 0) {
        const { data: sections } = await supabase.from("sections").select("id, course_id").in("course_id", courseIds);
        const sectionIds = (sections || []).map((s: any) => s.id);
        const { data: lectures } = sectionIds.length
          ? await supabase.from("lectures").select("id, section_id").in("section_id", sectionIds)
          : { data: [] as any[] };
        const sectionToCourse = new Map((sections || []).map((s: any) => [s.id, s.course_id]));
        const lectureToCourse = new Map((lectures || []).map((l: any) => [l.id, sectionToCourse.get(l.section_id)]));
        const lectureIds = (lectures || []).map((l: any) => l.id);
        const { data: progressRows } = lectureIds.length
          ? await supabase.from("progress").select("lecture_id, completed").eq("user_id", userId).in("lecture_id", lectureIds)
          : { data: [] as any[] };

        completionByCourse = {};
        for (const l of lectures || []) {
          const cId = lectureToCourse.get(l.id);
          if (!cId) continue;
          completionByCourse[cId] ??= { total: 0, done: 0 };
          completionByCourse[cId].total += 1;
        }
        for (const p of progressRows || []) {
          if (!p.completed) continue;
          const cId = lectureToCourse.get(p.lecture_id);
          if (!cId || !completionByCourse[cId]) continue;
          completionByCourse[cId].done += 1;
        }
      }

      const { data: certificates } = await supabase
        .from("student_certificates")
        .select("id, issued_at, certificate_url, score_percent, course_id, courses(title)")
        .eq("user_id", userId)
        .order("issued_at", { ascending: false });

      return { purchases: purchases || [], completionByCourse, certificates: certificates || [] };
    },
  });

  return (
    <Dialog open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Student Profile</DialogTitle></DialogHeader>
        {!data ? (
          <p className="py-8 text-center text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-6">
            <section>
              <p className="mb-2 flex items-center gap-2 font-medium"><BarChart3 className="h-4 w-4" /> Enrollment & Progress</p>
              <div className="space-y-2">
                {data.purchases.map((p: any) => {
                  const comp = data.completionByCourse[p.course_id];
                  const pct = comp && comp.total > 0 ? Math.round((comp.done / comp.total) * 100) : 0;
                  return (
                    <div key={p.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{p.courses?.title || "Untitled course"}</span>
                        <Badge variant={p.status === "completed" ? "default" : p.status === "refunded" ? "destructive" : "secondary"}>{p.status}</Badge>
                      </div>
                      {comp && <p className="mt-1 text-xs text-muted-foreground">{comp.done}/{comp.total} lectures complete ({pct}%)</p>}
                    </div>
                  );
                })}
                {data.purchases.length === 0 && <p className="text-sm text-muted-foreground">No enrollments yet.</p>}
              </div>
            </section>

            <section>
              <p className="mb-2 flex items-center gap-2 font-medium"><Award className="h-4 w-4" /> Certificates</p>
              <div className="space-y-2">
                {data.certificates.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <span>{c.courses?.title || "Course"}</span>
                    <span className="text-xs text-muted-foreground">{new Date(c.issued_at).toLocaleDateString()}{c.score_percent != null ? ` · ${c.score_percent}%` : ""}</span>
                  </div>
                ))}
                {data.certificates.length === 0 && <p className="text-sm text-muted-foreground">No certificates issued yet.</p>}
              </div>
            </section>

            <section>
              <p className="mb-2 flex items-center gap-2 font-medium"><CreditCard className="h-4 w-4" /> Payment History</p>
              <div className="space-y-2">
                {data.purchases.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <span>{new Date(p.created_at).toLocaleDateString()}</span>
                    <span>${Number(p.amount).toFixed(2)}</span>
                    <Badge variant="outline">{p.status}</Badge>
                    {p.refunded_at && <span className="text-xs text-muted-foreground">refunded ${Number(p.refund_amount).toFixed(2)}</span>}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
