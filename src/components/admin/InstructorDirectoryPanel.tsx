import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Star } from "lucide-react";

export default function InstructorDirectoryPanel() {
  const [selected, setSelected] = useState<any | null>(null);

  const { data: instructors = [], isLoading } = useQuery({
    queryKey: ["instructor-directory"],
    queryFn: async () => {
      const { data: courses } = await supabase.from("courses").select("id, title, instructor_id, price, is_published");
      if (!courses || courses.length === 0) return [];
      const instructorIds = Array.from(new Set(courses.map((c: any) => c.instructor_id)));
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, headline, bio").in("user_id", instructorIds);
      const { data: purchases } = await supabase.from("purchases").select("course_id, user_id, amount").eq("status", "completed");
      const { data: reviews } = await supabase.from("reviews").select("course_id, rating");

      const courseToInstructor = new Map(courses.map((c: any) => [c.id, c.instructor_id]));
      const coursesByInstructor = new Map<string, any[]>();
      for (const c of courses) {
        if (!coursesByInstructor.has(c.instructor_id)) coursesByInstructor.set(c.instructor_id, []);
        coursesByInstructor.get(c.instructor_id)!.push(c);
      }
      const studentsByInstructor = new Map<string, Set<string>>();
      const revenueByInstructor = new Map<string, number>();
      for (const p of purchases || []) {
        const inst = courseToInstructor.get(p.course_id);
        if (!inst) continue;
        if (!studentsByInstructor.has(inst)) studentsByInstructor.set(inst, new Set());
        studentsByInstructor.get(inst)!.add(p.user_id);
        revenueByInstructor.set(inst, (revenueByInstructor.get(inst) || 0) + Number(p.amount));
      }
      const ratingsByInstructor = new Map<string, number[]>();
      for (const r of reviews || []) {
        const inst = courseToInstructor.get(r.course_id);
        if (!inst) continue;
        if (!ratingsByInstructor.has(inst)) ratingsByInstructor.set(inst, []);
        ratingsByInstructor.get(inst)!.push(r.rating);
      }

      return (profiles || []).map((p: any) => {
        const ratings = ratingsByInstructor.get(p.user_id) || [];
        return {
          user_id: p.user_id,
          name: p.full_name || "Unnamed instructor",
          headline: p.headline,
          bio: p.bio,
          courses: coursesByInstructor.get(p.user_id) || [],
          students: studentsByInstructor.get(p.user_id)?.size || 0,
          revenue: revenueByInstructor.get(p.user_id) || 0,
          rating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100 : null,
        };
      }).sort((a, b) => b.revenue - a.revenue);
    },
  });

  return (
    <Card className="border-0">
      <CardHeader><CardTitle className="font-display flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Instructor Directory & Performance</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-8 text-center text-muted-foreground">Loading…</p>
        ) : instructors.length > 0 ? (
          <Table>
            <TableHeader><TableRow><TableHead>Instructor</TableHead><TableHead className="text-right">Courses</TableHead><TableHead className="text-right">Students</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Rating</TableHead></TableRow></TableHeader>
            <TableBody>
              {instructors.map((inst) => (
                <TableRow key={inst.user_id} className="cursor-pointer" onClick={() => setSelected(inst)}>
                  <TableCell className="font-medium">{inst.name}</TableCell>
                  <TableCell className="text-right">{inst.courses.length}</TableCell>
                  <TableCell className="text-right">{inst.students}</TableCell>
                  <TableCell className="text-right">${inst.revenue.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{inst.rating != null ? <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{inst.rating}</span> : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="py-8 text-center text-muted-foreground">No instructors with published courses yet.</p>
        )}
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              {selected.headline && <p className="font-medium text-muted-foreground">{selected.headline}</p>}
              {selected.bio && <p>{selected.bio}</p>}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="rounded-lg bg-secondary/40 p-3 text-center"><p className="text-lg font-bold">{selected.courses.length}</p><p className="text-xs text-muted-foreground">Courses</p></div>
                <div className="rounded-lg bg-secondary/40 p-3 text-center"><p className="text-lg font-bold">{selected.students}</p><p className="text-xs text-muted-foreground">Students</p></div>
                <div className="rounded-lg bg-secondary/40 p-3 text-center"><p className="text-lg font-bold">${selected.revenue.toFixed(0)}</p><p className="text-xs text-muted-foreground">Revenue</p></div>
              </div>
              <div className="space-y-1 pt-2">
                <p className="font-medium">Courses</p>
                {selected.courses.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between rounded border p-2 text-xs">
                    <span>{c.title}</span>
                    <Badge variant={c.is_published ? "default" : "outline"}>{c.is_published ? "published" : "draft"}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
