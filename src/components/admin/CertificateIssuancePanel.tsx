import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Award, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Course = { id: string; title: string };

export default function CertificateIssuancePanel() {
  const qc = useQueryClient();
  const [courseId, setCourseId] = useState("");

  const { data: courses = [] } = useQuery({
    queryKey: ["cert-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").order("title");
      return (data || []) as Course[];
    },
  });

  const { data: certConfigs = [] } = useQuery({
    queryKey: ["cert-configs", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase.from("course_certifications").select("*").eq("course_id", courseId).eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: eligibility, isLoading } = useQuery({
    queryKey: ["cert-eligibility", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data: enrolled } = await supabase.from("purchases").select("user_id").eq("course_id", courseId).eq("status", "completed");
      const userIds = Array.from(new Set((enrolled || []).map((p: any) => p.user_id)));
      if (userIds.length === 0) return [];

      const { data: sections } = await supabase.from("sections").select("id").eq("course_id", courseId);
      const sectionIds = (sections || []).map((s: any) => s.id);
      const { data: lectures } = sectionIds.length
        ? await supabase.from("lectures").select("id").in("section_id", sectionIds)
        : { data: [] as any[] };
      const lectureIds = (lectures || []).map((l: any) => l.id);
      const totalLectures = lectureIds.length;

      const { data: progressRows } = lectureIds.length
        ? await supabase.from("progress").select("user_id, completed").in("lecture_id", lectureIds).in("user_id", userIds).eq("completed", true)
        : { data: [] as any[] };

      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const nameMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));

      const { data: alreadyIssued } = await (supabase as any)
        .from("student_certificates")
        .select("user_id, certification_id")
        .eq("course_id", courseId);
      const issuedSet = new Set((alreadyIssued || []).map((c: any) => c.user_id));

      const completedCountByUser = new Map<string, number>();
      for (const p of progressRows || []) {
        completedCountByUser.set(p.user_id, (completedCountByUser.get(p.user_id) || 0) + 1);
      }

      return userIds.map((uid) => {
        const done = completedCountByUser.get(uid) || 0;
        const percent = totalLectures > 0 ? Math.round((done / totalLectures) * 100) : 0;
        return {
          user_id: uid,
          name: nameMap.get(uid) || "Unnamed",
          percent,
          eligible: totalLectures > 0 && done === totalLectures,
          alreadyIssued: issuedSet.has(uid),
        };
      }).sort((a, b) => b.percent - a.percent);
    },
  });

  const eligibleUnissued = useMemo(
    () => (eligibility || []).filter((e) => e.eligible && !e.alreadyIssued),
    [eligibility]
  );

  const issue = useMutation({
    mutationFn: async () => {
      if (!courseId) throw new Error("Choose a course");
      if (eligibleUnissued.length === 0) throw new Error("No eligible students to certify");
      const certificationId = certConfigs[0]?.id ?? null;
      const rows = eligibleUnissued.map((e) => ({
        user_id: e.user_id,
        course_id: courseId,
        certification_id: certificationId,
        score_percent: 100,
      }));
      const { error } = await (supabase as any).from("student_certificates").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Issued ${eligibleUnissued.length} certificate(s)`);
      qc.invalidateQueries({ queryKey: ["cert-eligibility"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="border-0">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="font-display flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" /> Certificate Auto-Issue
        </CardTitle>
        <div className="flex items-center gap-2">
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">Choose a course</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <Button size="sm" onClick={() => issue.mutate()} disabled={issue.isPending || eligibleUnissued.length === 0}>
            <Sparkles className="mr-1 h-4 w-4" /> Issue {eligibleUnissued.length > 0 ? `(${eligibleUnissued.length})` : ""}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!courseId ? (
          <p className="py-8 text-center text-muted-foreground">Choose a course to see completion and certificate status.</p>
        ) : certConfigs.length === 0 ? (
          <p className="py-4 text-center text-sm text-amber-700">No active certificate template configured for this course yet — set one up in Curriculum Builder → Certifications first.</p>
        ) : null}
        {courseId && isLoading ? (
          <p className="py-8 text-center text-muted-foreground">Checking completion…</p>
        ) : courseId && eligibility && eligibility.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eligibility.map((e) => (
                <TableRow key={e.user_id}>
                  <TableCell>{e.name}</TableCell>
                  <TableCell>{e.percent}%</TableCell>
                  <TableCell>
                    {e.alreadyIssued ? (
                      <Badge>Issued</Badge>
                    ) : e.eligible ? (
                      <Badge variant="secondary">Eligible</Badge>
                    ) : (
                      <Badge variant="outline">In progress</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : courseId ? (
          <p className="py-8 text-center text-muted-foreground">No enrolled students yet.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
