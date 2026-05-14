import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, HelpCircle } from "lucide-react";
import { toast } from "sonner";

interface Lecture { id: string; title: string }
interface Question {
  id: string;
  section_id: string;
  lecture_id: string | null;
  question: string;
  options: string[];
  correct_index: number;
  position: number;
}

export function ChapterQuizEditor({ sectionId, lectures }: { sectionId: string; lectures: Lecture[] }) {
  const qc = useQueryClient();

  const { data: questions, refetch } = useQuery({
    queryKey: ["quiz-questions", sectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("section_id", sectionId)
        .order("position");
      if (error) throw error;
      return (data || []).map((q: any) => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : [],
      })) as Question[];
    },
  });

  const addQuestion = async () => {
    const pos = (questions?.length || 0) + 1;
    const { error } = await supabase.from("quiz_questions").insert({
      section_id: sectionId,
      question: "New question",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correct_index: 0,
      position: pos,
      lecture_id: lectures[0]?.id ?? null,
    });
    if (error) toast.error(error.message);
    else refetch();
  };

  const updateQuestion = async (id: string, patch: Partial<Question>) => {
    const { error } = await supabase.from("quiz_questions").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["quiz-questions", sectionId] });
  };

  const deleteQuestion = async (id: string) => {
    const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else refetch();
  };

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5" /> Chapter Quiz ({questions?.length ?? 0})
        </p>
        <Button size="sm" variant="outline" onClick={addQuestion}>
          <Plus className="mr-1 h-3 w-3" /> Add Question
        </Button>
      </div>

      {questions && questions.length > 0 ? (
        <div className="space-y-3">
          {questions.map((q, qi) => (
            <div key={q.id} className="rounded-md border bg-background p-3 space-y-3">
              <div className="flex items-start gap-2">
                <span className="mt-2 text-xs font-bold text-muted-foreground">Q{qi + 1}</span>
                <Textarea
                  defaultValue={q.question}
                  rows={2}
                  className="text-sm"
                  onBlur={(e) => updateQuestion(q.id, { question: e.target.value })}
                />
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteQuestion(q.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-1.5 pl-7">
                <Label className="text-xs">Options (select correct)</Label>
                <RadioGroup
                  value={String(q.correct_index)}
                  onValueChange={(v) => updateQuestion(q.id, { correct_index: Number(v) })}
                >
                  {q.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <RadioGroupItem value={String(i)} id={`${q.id}-${i}`} />
                      <Input
                        defaultValue={opt}
                        className="h-8 text-sm"
                        onBlur={(e) => {
                          const next = [...q.options];
                          next[i] = e.target.value;
                          updateQuestion(q.id, { options: next as any });
                        }}
                      />
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="pl-7">
                <Label className="text-xs">Maps to lesson (for revision)</Label>
                <Select
                  value={q.lecture_id ?? "none"}
                  onValueChange={(v) => updateQuestion(q.id, { lecture_id: v === "none" ? null : v })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select lesson" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {lectures.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No questions yet. Add one to gate this chapter.</p>
      )}
    </div>
  );
}
