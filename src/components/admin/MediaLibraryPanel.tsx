import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FolderOpen, FileText, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

type Scope = "attachments" | "resources";
type Course = { id: string; title: string };
type Lecture = { id: string; title: string; section_id: string };
type AssetRow = { id: string; title: string; file_url: string; file_type: string | null; course_id?: string; lecture_id?: string; position?: number };

const emptyForm = { title: "", file_url: "", file_type: "" };

export default function MediaLibraryPanel() {
  const qc = useQueryClient();
  const [scope, setScope] = useState<Scope>("attachments");
  const [courseId, setCourseId] = useState("");
  const [lectureId, setLectureId] = useState("");
  const [form, setForm] = useState(emptyForm);

  const { data: courses = [] } = useQuery({
    queryKey: ["media-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").order("title");
      return (data || []) as Course[];
    },
  });

  const { data: lectures = [] } = useQuery({
    queryKey: ["media-lectures", courseId],
    enabled: scope === "resources" && !!courseId,
    queryFn: async () => {
      const { data: sections } = await supabase.from("sections").select("id").eq("course_id", courseId);
      const sectionIds = (sections || []).map((s: any) => s.id);
      if (sectionIds.length === 0) return [];
      const { data, error } = await supabase.from("lectures").select("id, title, section_id").in("section_id", sectionIds).order("position");
      if (error) throw error;
      return (data || []) as Lecture[];
    },
  });

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["media-assets", scope, courseId, lectureId],
    queryFn: async () => {
      if (scope === "attachments") {
        let q = supabase.from("course_attachments").select("*").order("created_at", { ascending: false });
        if (courseId) q = q.eq("course_id", courseId);
        const { data, error } = await q;
        if (error) throw error;
        return (data || []) as AssetRow[];
      }
      let q = supabase.from("resources").select("*").order("position");
      if (lectureId) q = q.eq("lecture_id", lectureId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AssetRow[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title.trim() || !form.file_url.trim()) throw new Error("Title and file URL are required");
      if (scope === "attachments") {
        if (!courseId) throw new Error("Choose a course");
        const { error } = await supabase.from("course_attachments").insert({
          course_id: courseId,
          title: form.title.trim(),
          file_url: form.file_url.trim(),
          file_type: form.file_type || null,
        } as any);
        if (error) throw error;
      } else {
        if (!lectureId) throw new Error("Choose a lecture");
        const { error } = await supabase.from("resources").insert({
          lecture_id: lectureId,
          title: form.title.trim(),
          file_url: form.file_url.trim(),
          file_type: form.file_type || null,
          position: assets.length,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Asset added");
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["media-assets"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const table = scope === "attachments" ? "course_attachments" : "resources";
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Asset removed");
      qc.invalidateQueries({ queryKey: ["media-assets"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="border-0">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" /> Media Library
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Course-level attachments (downloadable extras) and lecture-level resources (linked to a specific lesson).
          Video hosting/CDN and transcoding status require your video provider's API/webhooks — not wired up yet.
        </p>
        <Tabs value={scope} onValueChange={(v) => { setScope(v as Scope); setForm(emptyForm); }}>
          <TabsList>
            <TabsTrigger value="attachments">Course Attachments</TabsTrigger>
            <TabsTrigger value="resources">Lecture Resources</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Course</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={courseId} onChange={(e) => { setCourseId(e.target.value); setLectureId(""); }}>
              <option value="">{scope === "attachments" ? "All courses" : "Choose a course"}</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          {scope === "resources" && (
            <div>
              <Label>Lecture</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={lectureId} onChange={(e) => setLectureId(e.target.value)} disabled={!courseId}>
                <option value="">Choose a lecture</option>
                {lectures.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-secondary/20 p-4">
          <p className="mb-3 font-medium">Add {scope === "attachments" ? "attachment" : "resource"}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>File type</Label><Input placeholder="pdf, mp4, zip…" value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })} /></div>
            <div className="sm:col-span-3"><Label>File URL</Label><Input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="https://..." /></div>
          </div>
          <Button className="mt-3" onClick={() => create.mutate()} disabled={create.isPending}>
            <Plus className="mr-1 h-4 w-4" /> Add asset
          </Button>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Loading…</p>
          ) : assets.length > 0 ? (
            assets.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.file_url}</p>
                </div>
                {a.file_type && <Badge variant="outline">{a.file_type}</Badge>}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete "{a.title}"?</AlertDialogTitle>
                      <AlertDialogDescription>This only removes the reference here, not the underlying file at the URL.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => del.mutate(a.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-muted-foreground">No assets yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
