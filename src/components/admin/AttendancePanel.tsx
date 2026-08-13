import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck } from "lucide-react";

export default function AttendancePanel() {
  const [courseId, setCourseId] = useState("");

  const { data: courses = [] } = useQuery({
    queryKey: ["attendance-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").order("title");
      return data || [];
    },
  });

  const { data: workshops = [], isLoading } = useQuery({
    queryKey: ["attendance-workshops", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data: ws } = await supabase.from("course_workshops").select("id, title, starts_at").eq("course_id", courseId).order("starts_at", { ascending: false });
      const workshopIds = (ws || []).map((w: any) => w.id);
      const { data: attendance } = workshopIds.length
        ? await (supabase as any).from("session_attendance").select("workshop_id, user_id, attended").in("workshop_id", workshopIds)
        : { data: [] as any[] };
      const countByWorkshop = new Map<string, number>();
      for (const a of attendance || []) {
        if (a.attended) countByWorkshop.set(a.workshop_id, (countByWorkshop.get(a.workshop_id) || 0) + 1);
      }
      return (ws || []).map((w: any) => ({ ...w, attendeeCount: countByWorkshop.get(w.id) || 0 }));
    },
  });

  return (
    <Card className="border-0">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" /> Attendance</CardTitle>
        <select className="h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">Choose a course</option>
          {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </CardHeader>
      <CardContent className="space-y-2">
        {!courseId ? (
          <p className="py-8 text-center text-muted-foreground">Choose a course to see live-session attendance.</p>
        ) : isLoading ? (
          <p className="py-8 text-center text-muted-foreground">Loading…</p>
        ) : workshops.length > 0 ? (
          workshops.map((w: any) => (
            <div key={w.id} className="flex items-center justify-between rounded-lg border p-3">
              <div><p className="font-medium">{w.title}</p><p className="text-xs text-muted-foreground">{new Date(w.starts_at).toLocaleString()}</p></div>
              <Badge variant="secondary">{w.attendeeCount} attended</Badge>
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-muted-foreground">No workshops scheduled for this course yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
