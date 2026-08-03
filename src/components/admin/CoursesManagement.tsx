import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { BookOpen, Pencil, Trash2, Plus, CheckCircle, XCircle, History } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function CoursesManagement() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: 0,
    purchase_type: "one_time" as "one_time" | "subscription",
    subscription_interval: "month" as "month" | "year",
    drip_enabled: false,
  });
  const [versionCourse, setVersionCourse] = useState<any | null>(null);
  const [versionForm, setVersionForm] = useState({ version_label: "", notes: "" });
  const [historyCourseId, setHistoryCourseId] = useState<string | null>(null);

  const { data: courses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, profiles!courses_instructor_profile_fkey(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: versionHistory } = useQuery({
    queryKey: ["course-versions", historyCourseId],
    enabled: !!historyCourseId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("course_versions")
        .select("*")
        .eq("course_id", historyCourseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createCourse = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Title required");
      const slug = `${slugify(form.title)}-${Math.random().toString(36).slice(2, 7)}`;
      const { error } = await supabase.from("courses").insert({
        title: form.title,
        description: form.description,
        price: form.price,
        slug,
        instructor_id: user!.id,
        is_published: false,
        is_approved: true,
        purchase_type: form.purchase_type,
        subscription_interval: form.purchase_type === "subscription" ? form.subscription_interval : null,
        drip_enabled: form.drip_enabled,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Course created");
      setOpen(false);
      setForm({ title: "", description: "", price: 0, purchase_type: "one_time", subscription_interval: "month", drip_enabled: false });
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleApproved = useMutation({
    mutationFn: async (c: any) => {
      const { error } = await supabase.from("courses").update({ is_approved: !c.is_approved }).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-courses"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const togglePublished = useMutation({
    mutationFn: async (c: any) => {
      const { error } = await supabase.from("courses").update({ is_published: !c.is_published }).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-courses"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const toggleDrip = useMutation({
    mutationFn: async (c: any) => {
      const { error } = await (supabase as any).from("courses").update({ drip_enabled: !c.drip_enabled }).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-courses"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const togglePurchaseType = useMutation({
    mutationFn: async (c: any) => {
      const next = c.purchase_type === "subscription" ? "one_time" : "subscription";
      const { error } = await (supabase as any)
        .from("courses")
        .update({ purchase_type: next, subscription_interval: next === "subscription" ? "month" : null })
        .eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-courses"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCourse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Course deleted");
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveVersion = useMutation({
    mutationFn: async () => {
      if (!versionCourse) throw new Error("No course selected");
      if (!versionForm.version_label.trim()) throw new Error("Version label required (e.g. v1.1)");
      const { error } = await (supabase as any).from("course_versions").insert({
        course_id: versionCourse.id,
        version_label: versionForm.version_label.trim(),
        notes: versionForm.notes || null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Version note logged");
      setVersionCourse(null);
      setVersionForm({ version_label: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["course-versions"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (courses || []).filter((c: any) =>
    !q ? true : c.title.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <Card className="border-0">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="font-display flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> All Courses
          </CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Course</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create course</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div><Label>Price (USD)</Label><Input type="number" min={0} step={0.01} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
                <div>
                  <Label>Purchase model</Label>
                  <Select value={form.purchase_type} onValueChange={(v: "one_time" | "subscription") => setForm({ ...form, purchase_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">One-time purchase</SelectItem>
                      <SelectItem value="subscription">Subscription</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.purchase_type === "subscription" && (
                  <div>
                    <Label>Billing interval</Label>
                    <Select value={form.subscription_interval} onValueChange={(v: "month" | "year") => setForm({ ...form, subscription_interval: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">Monthly</SelectItem>
                        <SelectItem value="year">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Switch checked={form.drip_enabled} onCheckedChange={(v) => setForm({ ...form, drip_enabled: v })} />
                  <Label>Enable drip scheduling for lectures</Label>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => createCourse.mutate()} disabled={createCourse.isPending}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <Input className="max-w-sm" placeholder="Search courses…" value={q} onChange={(e) => setQ(e.target.value)} />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {filtered.map((c: any) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-secondary/30">
              <div className="flex-1 min-w-[220px]">
                <p className="font-medium">{c.title}</p>
                <p className="text-xs text-muted-foreground">
                  by {c.profiles?.full_name || "Unknown"} · ${Number(c.price).toFixed(2)}
                  {c.purchase_type === "subscription" ? ` / ${c.subscription_interval}` : ""}
                </p>
              </div>
              <Badge variant={c.is_published ? "default" : "outline"}>{c.is_published ? "published" : "draft"}</Badge>
              <Badge variant={c.is_approved ? "default" : "secondary"}>{c.is_approved ? "approved" : "pending"}</Badge>
              <Badge variant="outline" className="cursor-pointer" onClick={() => togglePurchaseType.mutate(c)}>
                {c.purchase_type === "subscription" ? "Subscription" : "One-time"}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Switch checked={!!c.drip_enabled} onCheckedChange={() => toggleDrip.mutate(c)} />
                Drip
              </div>
              <Button size="sm" variant="ghost" onClick={() => toggleApproved.mutate(c)}>
                {c.is_approved ? <XCircle className="h-4 w-4 mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                {c.is_approved ? "Unapprove" : "Approve"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => togglePublished.mutate(c)}>
                {c.is_published ? "Unpublish" : "Publish"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setVersionCourse(c)}>
                <History className="h-4 w-4 mr-1" /> Log version
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setHistoryCourseId(c.id)}>History</Button>
              <Link to={`/instructor/edit-course/${c.id}`}>
                <Button size="sm" variant="outline"><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete course?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Permanently removes <b>{c.title}</b> including sections, lectures, and progress.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteCourse.mutate(c.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-6">No courses.</p>}
        </div>
      </CardContent>

      <Dialog open={!!versionCourse} onOpenChange={(o) => !o && setVersionCourse(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log a version update — {versionCourse?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Version label</Label><Input value={versionForm.version_label} onChange={(e) => setVersionForm({ ...versionForm, version_label: e.target.value })} placeholder="v1.1" /></div>
            <div><Label>Notes</Label><Textarea value={versionForm.notes} onChange={(e) => setVersionForm({ ...versionForm, notes: e.target.value })} placeholder="What changed in this update?" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVersionCourse(null)}>Cancel</Button>
            <Button onClick={() => saveVersion.mutate()} disabled={saveVersion.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyCourseId} onOpenChange={(o) => !o && setHistoryCourseId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Version history</DialogTitle></DialogHeader>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {(versionHistory || []).map((v: any) => (
              <div key={v.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold">{v.version_label}</span>
                  <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString()}</span>
                </div>
                {v.notes && <p className="mt-1 text-muted-foreground">{v.notes}</p>}
              </div>
            ))}
            {(!versionHistory || versionHistory.length === 0) && <p className="py-6 text-center text-muted-foreground">No version notes logged yet.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
