import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, HelpCircle } from "lucide-react";
import { toast } from "sonner";

type Section = { id: string; title: string; course_id: string };
type Course = { id: string; title: string };
type Question = {
  id: string;
  section_id: string;
  lecture_id: string | null;
  question: string;
  options: string[];
  correct_index: number;
  position: number;
};

const emptyQuestion = { question: "", options: ["", "", "", ""], correct_index: 0, position: 0 };

export default function QuizBuilderPanel() {
  const qc = useQueryClient();
  const [courseId, setCourseId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [form, setForm] = useState<{ id: string | null } & typeof emptyQuestion>({ id: null, ...emptyQuestion });

  const { data: courses = [] } = useQuery({
    queryKey: ["quiz-builder-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").order("title");
      return (data || []) as Course[];
    },
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["quiz-builder-sections", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase.from("sections").select("id, title, course_id").eq("course_id", courseId).order("position");
      if (error) throw error;
      return (data || []) as Section[];
    },
  });

  useEffect(() => { setSectionId(""); }, [courseId]);
  useEffect(() => { if (!sectionId && sections[0]) setSectionId(sections[0].id); }, [sections, sectionId]);

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["quiz-builder-questions", sectionId],
    enabled: !!sectionId,
    queryFn: async () => {
      const { data, error } = await supabase.from("quiz_questions").select("*").eq("section_id", sectionId).order("position");
      if (error) throw error;
      return (data || []).map((q: any) => ({ ...q, options: Array.isArray(q.options) ? q.options : [] })) as Question[];
    },
  });

  const resetForm = () => setForm({ id: null, ...emptyQuestion, position: questions.length });

  const editQuestion = (q: Question) => {
    setForm({ id: q.id, question: q.question, options: [...q.options, "", "", "", ""].slice(0, Math.max(4, q.options.length)), correct_index: q.correct_index, position: q.position });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!sectionId) throw new Error("Choose a section first");
      if (!form.question.trim()) throw new Error("Question text is required");
      const options = form.options.map((o) => o.trim()).filter(Boolean);
      if (options.length < 2) throw new Error("Add at least 2 answer options");
      if (form.correct_index >= options.length) throw new Error("Correct answer index out of range");

      const payload = {
        section_id: sectionId,
        question: form.question.trim(),
        options,
        correct_index: form.correct_index,
        position: form.position,
        updated_at: new Date().toISOString(),
      };
      const result = form.id
        ? await supabase.from("quiz_questions").update(payload).eq("id", form.id)
        : await supabase.from("quiz_questions").insert(payload);
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      toast.success(form.id ? "Question updated" : "Question added");
      resetForm();
      qc.invalidateQueries({ queryKey: ["quiz-builder-questions"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Question deleted");
      qc.invalidateQueries({ queryKey: ["quiz-builder-questions"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filteredSections = useMemo(() => sections.filter((s) => s.course_id === courseId), [sections, courseId]);

  return (
    <Card className="border-0">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" /> Quiz Builder
        </CardTitle>
        <p className="text-sm text-muted-foreground">Auto-grading works off the correct answer index you set here — no separate grading rules needed.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Course</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">Choose a course</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div>
            <Label>Section</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={sectionId} onChange={(e) => setSectionId(e.target.value)} disabled={!courseId}>
              {filteredSections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
        </div>

        <div className="rounded-lg border bg-secondary/20 p-4">
          <p className="mb-3 font-medium">{form.id ? "Edit" : "Add"} question</p>
          <div className="space-y-3">
            <div><Label>Question</Label><Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></div>
            <div className="grid gap-2 sm:grid-cols-2">
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="radio" checked={form.correct_index === i} onChange={() => setForm({ ...form, correct_index: i })} title="Mark as correct answer" />
                  <Input
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const next = [...form.options];
                      next[i] = e.target.value;
                      setForm({ ...form, options: next });
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Select the radio button next to the correct answer.</p>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending || !sectionId}>{form.id ? "Update question" : "Add question"}</Button>
            <Button type="button" variant="outline" onClick={resetForm}>Clear</Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-medium">Questions in this section</p>
            <Badge variant="secondary">{questions.length}</Badge>
          </div>
          {isLoading ? (
            <p className="py-6 text-center text-muted-foreground">Loading…</p>
          ) : questions.length > 0 ? (
            questions.map((q) => (
              <div key={q.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{q.question}</p>
                  <p className="text-xs text-muted-foreground">
                    Correct: {q.options[q.correct_index] || "—"} · {q.options.length} options
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => editQuestion(q)}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => del.mutate(q.id)} disabled={del.isPending}>
                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-dashed py-6 text-center text-muted-foreground">No questions yet for this section.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}