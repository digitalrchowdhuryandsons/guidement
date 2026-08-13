import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

export default function StudentLeaderboardPanel() {
  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ["student-leaderboard"],
    queryFn: async () => {
      const { data: purchases } = await supabase.from("purchases").select("user_id, course_id").eq("status", "completed");
      const { data: certs } = await (supabase as any).from("student_certificates").select("user_id");
      if (!purchases || purchases.length === 0) return [];

      const userIds = Array.from(new Set(purchases.map((p: any) => p.user_id)));
      const courseIds = Array.from(new Set(purchases.map((p: any) => p.course_id)));
      const { data: sections } = await supabase.from("sections").select("id, course_id").in("course_id", courseIds);
      const sectionIds = (sections || []).map((s: any) => s.id);
      const { data: lectures } = sectionIds.length ? await supabase.from("lectures").select("id, section_id").in("section_id", sectionIds) : { data: [] as any[] };
      const lectureIds = (lectures || []).map((l: any) => l.id);
      const { data: progressRows } = lectureIds.length ? await supabase.from("progress").select("user_id, completed").eq("completed", true).in("lecture_id", lectureIds).in("user_id", userIds) : { data: [] as any[] };

      const certCountByUser = new Map<string, number>();
      for (const c of certs || []) certCountByUser.set(c.user_id, (certCountByUser.get(c.user_id) || 0) + 1);
      const completedLecturesByUser = new Map<string, number>();
      for (const p of progressRows || []) completedLecturesByUser.set(p.user_id, (completedLecturesByUser.get(p.user_id) || 0) + 1);
      const coursesByUser = new Map<string, Set<string>>();
      for (const p of purchases) {
        if (!coursesByUser.has(p.user_id)) coursesByUser.set(p.user_id, new Set());
        coursesByUser.get(p.user_id)!.add(p.course_id);
      }

      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const nameMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));

      return userIds
        .map((uid) => ({
          user_id: uid,
          name: nameMap.get(uid) || "Unnamed",
          certificates: certCountByUser.get(uid) || 0,
          lecturesCompleted: completedLecturesByUser.get(uid) || 0,
          coursesEnrolled: coursesByUser.get(uid)?.size || 0,
          score: (certCountByUser.get(uid) || 0) * 10 + (completedLecturesByUser.get(uid) || 0),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
    },
  });

  return (
    <Card className="border-0">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> Student Leaderboard</CardTitle>
        <p className="text-sm text-muted-foreground">Ranked by certificates earned and lessons completed — a real engagement score, not a popularity guess.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="py-8 text-center text-muted-foreground">Loading…</p>
        ) : leaderboard.length > 0 ? (
          leaderboard.map((s, i) => (
            <div key={s.user_id} className="flex items-center gap-3 rounded-lg border p-3">
              <span className="w-6 text-center font-bold text-muted-foreground">{i + 1}</span>
              <div className="flex-1"><p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.coursesEnrolled} courses · {s.lecturesCompleted} lessons completed</p></div>
              {s.certificates > 0 && <Badge>{s.certificates} certificate{s.certificates === 1 ? "" : "s"}</Badge>}
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-muted-foreground">No enrollment activity yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
