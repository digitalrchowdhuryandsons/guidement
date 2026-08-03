import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { LayoutTemplate, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type Course = { id: string; title: string };
type LandingPage = {
  course_id: string;
  headline: string | null;
  subheadline: string | null;
  hero_image_url: string | null;
  video_url: string | null;
  highlights: string[] | null;
  faq: { q: string; a: string }[] | null;
  is_published: boolean;
};

export default function CourseLandingPageEditor() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [courseId, setCourseId] = useState("");
  const [form, setForm] = useState<LandingPage | null>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ["landing-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").order("title");
      return (data || []) as Course[];
    },
  });

  const { data: page } = useQuery({
    queryKey: ["landing-page", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("course_landing_pages").select("*").eq("course_id", courseId).maybeSingle();
      if (error) throw error;
      return data as LandingPage | null;
    },
  });

  useEffect(() => {
    if (!courseId) { setForm(null); return; }
    setForm(
      page ?? {
        course_id: courseId,
        headline: "",
        subheadline: "",
        hero_image_url: "",
        video_url: "",
        highlights: [],
        faq: [],
        is_published: false,
      }
    );
  }, [courseId, page]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error("Nothing to save");
      const payload = { ...form, course_id: courseId, updated_at: new Date().toISOString(), updated_by: user?.id ?? null };
      const { error } = await (supabase as any).from("course_landing_pages").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Landing page saved");
      qc.invalidateQueries({ queryKey: ["landing-page", courseId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateHighlight = (i: number, value: string) => {
    if (!form) return;
    const next = [...(form.highlights || [])];
    next[i] = value;
    setForm({ ...form, highlights: next });
  };

  const updateFaq = (i: number, key: "q" | "a", value: string) => {
    if (!form) return;
    const next = [...(form.faq || [])];
    next[i] = { ...next[i], [key]: value };
    setForm({ ...form, faq: next });
  };

  return (
    <Card className="border-0">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <LayoutTemplate className="h-5 w-5 text-primary" /> Course Landing Pages
        </CardTitle>
        <p className="text-sm text-muted-foreground">Per-course marketing page content — separate from the global site hero/popup in Media → Site Content.</p>
        <select className="h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">Choose a course</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </CardHeader>
      <CardContent>
        {!form ? (
          <p className="py-8 text-center text-muted-foreground">Choose a course to edit its landing page.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
              <Label>Published</Label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Headline</Label><Input value={form.headline || ""} onChange={(e) => setForm({ ...form, headline: e.target.value })} /></div>
              <div><Label>Hero image URL</Label><Input value={form.hero_image_url || ""} onChange={(e) => setForm({ ...form, hero_image_url: e.target.value })} /></div>
            </div>
            <div><Label>Subheadline</Label><Textarea value={form.subheadline || ""} onChange={(e) => setForm({ ...form, subheadline: e.target.value })} /></div>
            <div><Label>Promo video URL</Label><Input value={form.video_url || ""} onChange={(e) => setForm({ ...form, video_url: e.target.value })} /></div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Highlights</Label>
                <Button size="sm" variant="outline" onClick={() => setForm({ ...form, highlights: [...(form.highlights || []), ""] })}>
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {(form.highlights || []).map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={h} onChange={(e) => updateHighlight(i, e.target.value)} />
                    <Button size="icon" variant="ghost" onClick={() => setForm({ ...form, highlights: (form.highlights || []).filter((_, idx) => idx !== i) })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>FAQ</Label>
                <Button size="sm" variant="outline" onClick={() => setForm({ ...form, faq: [...(form.faq || []), { q: "", a: "" }] })}>
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>
              <div className="space-y-3">
                {(form.faq || []).map((f, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <Input placeholder="Question" value={f.q} onChange={(e) => updateFaq(i, "q", e.target.value)} />
                        <Textarea placeholder="Answer" value={f.a} onChange={(e) => updateFaq(i, "a", e.target.value)} />
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => setForm({ ...form, faq: (form.faq || []).filter((_, idx) => idx !== i) })}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              <Save className="mr-1 h-4 w-4" /> Save landing page
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
