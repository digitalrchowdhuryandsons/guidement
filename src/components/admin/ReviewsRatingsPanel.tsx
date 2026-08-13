import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function ReviewsRatingsPanel() {
  const qc = useQueryClient();
  const [courseFilter, setCourseFilter] = useState("all");

  const { data: courses = [] } = useQuery({
    queryKey: ["reviews-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").order("title");
      return data || [];
    },
  });

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews-admin", courseFilter],
    queryFn: async () => {
      let q = supabase.from("reviews").select("*, courses(title)").order("created_at", { ascending: false });
      if (courseFilter !== "all") q = q.eq("course_id", courseFilter);
      const { data, error } = await q;
      if (error) throw error;
      const userIds = Array.from(new Set((data || []).map((r: any) => r.user_id)));
      const { data: profiles } = userIds.length ? await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds) : { data: [] as any[] };
      const nameMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));
      return (data || []).map((r: any) => ({ ...r, studentName: nameMap.get(r.user_id) || "Unnamed" }));
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review removed");
      qc.invalidateQueries({ queryKey: ["reviews-admin"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const avgRating = reviews.length ? (reviews.reduce((s, r: any) => s + r.rating, 0) / reviews.length).toFixed(2) : "—";

  return (
    <Card className="border-0">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="font-display flex items-center gap-2"><Star className="h-5 w-5 text-primary" /> Reviews & Ratings <Badge variant="secondary">avg {avgRating}</Badge></CardTitle>
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="py-8 text-center text-muted-foreground">Loading…</p>
        ) : reviews.length > 0 ? (
          reviews.map((r: any) => (
            <div key={r.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{r.studentName}</span>
                  <span className="flex items-center gap-0.5 text-amber-500">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-400" />)}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
              <p className="text-xs text-muted-foreground">{r.courses?.title} · {new Date(r.created_at).toLocaleDateString()}</p>
              {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-muted-foreground">No reviews yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
