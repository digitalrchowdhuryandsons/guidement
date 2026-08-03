import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MessagesSquare, Pin, Lock, Unlock, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

type Course = { id: string; title: string };
type Thread = {
  id: string;
  course_id: string;
  user_id: string;
  title: string;
  body: string | null;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
};
type Reply = { id: string; thread_id: string; user_id: string; body: string; created_at: string };

export default function CommunityManagementPanel() {
  const qc = useQueryClient();
  const [courseId, setCourseId] = useState("");
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ["community-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").order("title");
      return (data || []) as Course[];
    },
  });

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["community-threads", courseId],
    queryFn: async () => {
      let q = (supabase as any).from("forum_threads").select("*").order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
      if (courseId) q = q.eq("course_id", courseId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Thread[];
    },
  });

  const { data: replies = {} } = useQuery({
    queryKey: ["community-replies", openThreadId],
    enabled: !!openThreadId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("forum_replies").select("*").eq("thread_id", openThreadId).order("created_at");
      if (error) throw error;
      return { [openThreadId as string]: (data || []) as Reply[] };
    },
  });

  const courseTitle = (id: string) => courses.find((c:any) => c.id === id)?.title || "Unknown course";

  const togglePin = useMutation({
    mutationFn: async (t: Thread) => {
      const { error } = await (supabase as any).from("forum_threads").update({ is_pinned: !t.is_pinned }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community-threads"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const toggleLock = useMutation({
    mutationFn: async (t: Thread) => {
      const { error } = await (supabase as any).from("forum_threads").update({ is_locked: !t.is_locked }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community-threads"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteThread = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("forum_threads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thread deleted");
      qc.invalidateQueries({ queryKey: ["community-threads"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteReply = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("forum_replies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reply removed");
      qc.invalidateQueries({ queryKey: ["community-replies"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="border-0">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="font-display flex items-center gap-2">
          <MessagesSquare className="h-5 w-5 text-primary" /> Community Moderation
        </CardTitle>
        <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">All courses</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Live sessions and webinars are scheduled per course under Curriculum Builder → Workshops — this panel is for discussion moderation only.
        </p>
        {isLoading ? (
          <p className="py-8 text-center text-muted-foreground">Loading threads…</p>
        ) : threads.length > 0 ? (
          threads.map((t) => (
            <div key={t.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                {t.is_pinned && <Badge variant="secondary">Pinned</Badge>}
                {t.is_locked && <Badge variant="outline">Locked</Badge>}
                <p className="flex-1 font-medium">{t.title}</p>
                <span className="text-xs text-muted-foreground">{courseTitle(t.course_id)}</span>
              </div>
              {t.body && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.body}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => togglePin.mutate(t)}>
                  <Pin className="mr-1 h-4 w-4" /> {t.is_pinned ? "Unpin" : "Pin"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleLock.mutate(t)}>
                  {t.is_locked ? <Unlock className="mr-1 h-4 w-4" /> : <Lock className="mr-1 h-4 w-4" />}
                  {t.is_locked ? "Unlock" : "Lock"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setOpenThreadId(openThreadId === t.id ? null : t.id)}>
                  {openThreadId === t.id ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
                  Replies
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive"><Trash2 className="mr-1 h-4 w-4" /> Delete</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this thread?</AlertDialogTitle>
                      <AlertDialogDescription>This removes the thread and all its replies.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteThread.mutate(t.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              {openThreadId === t.id && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  {(replies[t.id] || []).map((r) => (
                    <div key={r.id} className="flex items-start justify-between gap-2 rounded bg-secondary/30 p-2 text-sm">
                      <p className="flex-1">{r.body}</p>
                      <Button size="sm" variant="ghost" onClick={() => deleteReply.mutate(r.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {(replies[t.id] || []).length === 0 && <p className="text-xs text-muted-foreground">No replies yet.</p>}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-muted-foreground">No discussion threads yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
