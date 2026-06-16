import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { GraduationCap } from "lucide-react";

type Enrollment = { id: string; user_id: string; course_id: string; created_at: string; courses?: { title: string | null } | null };
type Profile = { user_id: string; full_name: string | null };
type Lecture = { id: string; sections?: { course_id: string } | null };
type ProgressRow = { user_id: string; lecture_id: string; completed: boolean; updated_at: string };

export default function StudentProgressPanel() {
  const [courseFilter, setCourseFilter] = useState("all");

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["admin-student-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("id, user_id, course_id, created_at, courses(title)")
        .eq("status", "completed")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Enrollment[];
    },
  });

  const courseIds = useMemo(() => Array.from(new Set(enrollments.map((e) => e.course_id))), [enrollments]);
  const userIds = useMemo(() => Array.from(new Set(enrollments.map((e) => e.user_id))), [enrollments]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-progress-profiles", userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      if (error) throw error;
      return (data || []) as Profile[];
    },
  });

  const { data: lectures = [] } = useQuery({
    queryKey: ["admin-progress-lectures", courseIds],
    enabled: courseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("lectures").select("id, sections!inner(course_id)").in("sections.course_id", courseIds);
      if (error) throw error;
      return (data || []) as Lecture[];
    },
  });

  const lectureIds = useMemo(() => lectures.map((l) => l.id), [lectures]);
  const { data: progressRows = [] } = useQuery({
    queryKey: ["admin-progress-rows", lectureIds, userIds],
    enabled: lectureIds.length > 0 && userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("progress").select("user_id, lecture_id, completed, updated_at").in("lecture_id", lectureIds).in("user_id", userIds);
      if (error) throw error;
      return (data || []) as ProgressRow[];
    },
  });

  const profileByUser = useMemo(() => new Map(profiles.map((p) => [p.user_id, p])), [profiles]);
  const courseOptions = useMemo(() => Array.from(new Map(enrollments.map((e) => [e.course_id, e.courses?.title || "Untitled course"])).entries()), [enrollments]);

  const lectureCourse = useMemo(() => new Map(lectures.map((l) => [l.id, l.sections?.course_id])), [lectures]);
  const totalLecturesByCourse = useMemo(() => {
    const totals = new Map<string, number>();
    lectures.forEach((l) => {
      const courseId = l.sections?.course_id;
      if (courseId) totals.set(courseId, (totals.get(courseId) || 0) + 1);
    });
    return totals;
  }, [lectures]);

  const rows = useMemo(() => enrollments
    .filter((e) => courseFilter === "all" || e.course_id === courseFilter)
    .map((e) => {
      const relevantProgress = progressRows.filter((p) => p.user_id === e.user_id && lectureCourse.get(p.lecture_id) === e.course_id);
      const completed = relevantProgress.filter((p) => p.completed).length;
      const total = totalLecturesByCourse.get(e.course_id) || 0;
      return {
        ...e,
        studentName: profileByUser.get(e.user_id)?.full_name || "Unnamed student",
        completed,
        total,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0,
        lastActive: relevantProgress.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]?.updated_at,
      };
    }), [courseFilter, enrollments, lectureCourse, profileByUser, progressRows, totalLecturesByCourse]);

  return (
    <Card className="border-0">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="font-display flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /> Student Course Progress</CardTitle>
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-full sm:w-[260px]"><SelectValue placeholder="Filter by course" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All enrolled courses</SelectItem>{courseOptions.map(([id, title]) => <SelectItem key={id} value={id}>{title}</SelectItem>)}</SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-center text-muted-foreground py-8">Loading enrollments...</p> : (
          <div className="rounded-lg border overflow-hidden">
            <Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Course</TableHead><TableHead>Progress</TableHead><TableHead>Completed</TableHead><TableHead>Last active</TableHead></TableRow></TableHeader><TableBody>
              {rows.map((row) => <TableRow key={row.id}><TableCell className="font-medium">{row.studentName}</TableCell><TableCell>{row.courses?.title || "Untitled course"}</TableCell><TableCell className="min-w-[180px]"><div className="flex items-center gap-3"><Progress value={row.percent} className="h-2" /><span className="w-10 text-sm text-muted-foreground">{row.percent}%</span></div></TableCell><TableCell><Badge variant={row.percent === 100 ? "default" : "secondary"}>{row.completed}/{row.total}</Badge></TableCell><TableCell>{row.lastActive ? new Date(row.lastActive).toLocaleDateString() : "Not started"}</TableCell></TableRow>)}
              {rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No enrolled student progress found.</TableCell></TableRow>}
            </TableBody></Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
