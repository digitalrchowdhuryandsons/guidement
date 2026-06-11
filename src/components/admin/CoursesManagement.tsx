import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { BookOpen, Pencil, Trash2, Plus, CheckCircle, XCircle } from "lucide-react";
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
  const [form, setForm] = useState({ title: "", description: "", price: 0 });

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
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Course created");
      setOpen(false);
      setForm({ title: "", description: "", price: 0 });
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
                </p>
              </div>
              <Badge variant={c.is_published ? "default" : "outline"}>{c.is_published ? "published" : "draft"}</Badge>
              <Badge variant={c.is_approved ? "default" : "secondary"}>{c.is_approved ? "approved" : "pending"}</Badge>
              <Button size="sm" variant="ghost" onClick={() => toggleApproved.mutate(c)}>
                {c.is_approved ? <XCircle className="h-4 w-4 mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                {c.is_approved ? "Unapprove" : "Approve"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => togglePublished.mutate(c)}>
                {c.is_published ? "Unpublish" : "Publish"}
              </Button>
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
    </Card>
  );
}
