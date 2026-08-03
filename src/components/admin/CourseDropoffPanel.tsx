import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity } from "lucide-react";

type Course = { id: string; title: string };
type Section = { id: string; title: string; position: number };
type Lecture = { id: string; title: string; section_id: string; position: number };

export default function CourseDropoffPanel() {
  const [courseId, setCourseId] = useState("");

  const { data: courses = [] } = useQuery({
    queryKey: ["dropoff-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").order("title");
      return (data || []) as Course[];
    },
  });

  const { data: funnel, isLoading } = useQuery({
    queryKey: ["dropoff-funnel", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data: enrolled } = await supabase.from("purchases").select("user_id").eq("course_id", courseId).eq("status", "completed");
      const userIds = Array.from(new Set((enrolled || []).map((p: any) => p.user_id)));
      const totalStudents = userIds.length;
      if (totalStudents === 0) return { totalStudents: 0, rows: [] as any[] };

      const { data: sections } = await supabase.from("sections").select("id, title, position").eq("course_id", courseId).order("position");
      const sectionOrder = new Map((sections || []).map((s: any, i: number) => [s.id, i]));

      const { data: lectures } = await supabase
        .from("lectures")
        .select("id, title, section_id, position")
        .in("section_id", (sections || []).map((s: any) => s.id))
        .order("position");

      const orderedLectures = [...(lectures || [])].sort((a: any, b: any) => {
        const sa = sectionOrder.get(a.section_id) ?? 0;
        const sb = sectionOrder.get(b.section_id) ?? 0;
        return sa !== sb ? sa - sb : a.position - b.position;
      });

      const lectureIds = orderedLectures.map((l: any) => l.id);
      const { data: progressRows } = lectureIds.length
        ? await supabase.from("progress").select("user_id, lecture_id, completed").in("lecture_id", lectureIds).in("user_id", userIds).eq("completed", true)
        : { data: [] as any[] };

      const completedByLecture = new Map<string, Set<string>>();
      for (const p of progressRows || []) {
        if (!completedByLecture.has(p.lecture_id)) completedByLecture.set(p.lecture_id, new Set());
        completedByLecture.get(p.lecture_id)!.add(p.user_id);
      }

      const rows = orderedLectures.map((l: any) => {
        const completedCount = completedByLecture.get(l.id)?.size || 0;
        return {
          id: l.id,
          title: l.title,
          completedCount,
          percent: totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0,
        };
      });

      return { totalStudents, rows };
    },
  });

  const biggestDrop = useMemo(() => {
    if (!funnel || funnel.rows.length < 2) return null;
    let maxDrop = 0;
    let at = null as null | { from: string; to: string; drop: number };
    for (let i = 1; i < funnel.rows.length; i++) {
      const drop = funnel.rows[i - 1].percent - funnel.rows[i].percent;
      if (drop > maxDrop) {
        maxDrop = drop;
        at = { from: funnel.rows[i - 1].title, to: funnel.rows[i].title, drop };
      }
    }
    return at;
  }, [funnel]);

  return (
    <Card className="border-0">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="font-display flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" /> Lecture Drop-off Funnel
        </CardTitle>
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Choose a course" /></SelectTrigger>
          <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        {!courseId ? (
          <p className="py-8 text-center text-muted-foreground">Choose a course to see where students drop off.</p>
        ) : isLoading ? (
          <p className="py-8 text-center text-muted-foreground">Crunching progress data…</p>
        ) : funnel && funnel.totalStudents > 0 ? (
          <>
            {biggestDrop && (
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                Biggest drop-off: <strong>{biggestDrop.drop}%</strong> of students stop between "{biggestDrop.from}" and "{biggestDrop.to}".
              </div>
            )}
            <div className="space-y-2">
              {funnel.rows.map((r, i) => (
                <div key={r.id} className="flex items-center gap-3">
                  <span className="w-6 text-xs text-muted-foreground">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium">{r.title}</span>
                      <span className="text-muted-foreground">{r.completedCount}/{funnel.totalStudents} ({r.percent}%)</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-secondary">
                      <div className="h-2 rounded-full bg-[#2a9d8f]" style={{ width: `${r.percent}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-muted-foreground">No enrolled students yet for this course.</p>
        )}
      </CardContent>
    </Card>
  );
}
