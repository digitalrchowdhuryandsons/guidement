import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2, RotateCcw, SkipForward } from "lucide-react";
import { toast } from "sonner";

interface QuizQuestion {
  id: string;
  section_id: string;
  lecture_id: string | null;
  question: string;
  options: string[];
  correct_index: number;
  position: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: string;
  sectionTitle: string;
  courseId: string;
  userId: string;
  /** Called with ordered list of lecture IDs that the user got wrong (deduplicated) */
  onRevise: (wrongLectureIds: string[]) => void;
  /** Called when user chooses to skip to the next chapter */
  onSkipNext: () => void;
  /** Called when user passed (>=70%) and wants to continue */
  onContinue: () => void;
}

const PASS_THRESHOLD = 70;

export function ChapterQuizDialog({
  open,
  onOpenChange,
  sectionId,
  sectionTitle,
  courseId,
  userId,
  onRevise,
  onSkipNext,
  onContinue,
}: Props) {
  const { data: questions, isLoading } = useQuery({
    queryKey: ["player-quiz", sectionId],
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
      })) as QuizQuestion[];
    },
    enabled: open && !!sectionId,
  });

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    correct: number;
    total: number;
    percent: number;
    wrongLectureIds: string[];
  } | null>(null);

  useEffect(() => {
    if (open) {
      setAnswers({});
      setSubmitted(false);
      setResult(null);
    }
  }, [open, sectionId]);

  const handleSubmit = async () => {
    if (!questions || questions.length === 0) return;
    let correct = 0;
    const wrongLectureSet: string[] = [];
    for (const q of questions) {
      if (answers[q.id] === q.correct_index) {
        correct++;
      } else if (q.lecture_id && !wrongLectureSet.includes(q.lecture_id)) {
        wrongLectureSet.push(q.lecture_id);
      }
    }
    const total = questions.length;
    const percent = Math.round((correct / total) * 100);
    setResult({ correct, total, percent, wrongLectureIds: wrongLectureSet });
    setSubmitted(true);

    const { error } = await supabase.from("quiz_attempts").insert({
      user_id: userId,
      section_id: sectionId,
      course_id: courseId,
      score_percent: percent,
      total_questions: total,
      correct_count: correct,
      wrong_lecture_ids: wrongLectureSet,
    });
    if (error) console.error("quiz attempt save failed", error);
  };

  const allAnswered = questions ? questions.every((q) => answers[q.id] !== undefined) : false;
  const passed = result ? result.percent >= PASS_THRESHOLD : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {!submitted ? (
          <>
            <DialogHeader>
              <DialogTitle>Chapter Quiz: {sectionTitle}</DialogTitle>
              <DialogDescription>
                Answer all questions to complete this chapter. You need {PASS_THRESHOLD}% to pass.
              </DialogDescription>
            </DialogHeader>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : !questions || questions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No questions configured.</p>
            ) : (
              <div className="space-y-5 py-2">
                {questions.map((q, qi) => (
                  <div key={q.id} className="space-y-2">
                    <p className="font-medium text-sm">
                      <span className="text-muted-foreground mr-1">Q{qi + 1}.</span>
                      {q.question}
                    </p>
                    <RadioGroup
                      value={answers[q.id] !== undefined ? String(answers[q.id]) : undefined}
                      onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: Number(v) }))}
                    >
                      {q.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-md border p-2 hover:bg-secondary/30 transition-colors">
                          <RadioGroupItem value={String(i)} id={`pl-${q.id}-${i}`} />
                          <Label htmlFor={`pl-${q.id}-${i}`} className="text-sm font-normal cursor-pointer flex-1">
                            {opt}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button disabled={!allAnswered || !questions?.length} onClick={handleSubmit}>
                Submit Answers
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {passed ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" />
                    Great work!
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Performance below {PASS_THRESHOLD}%
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                You scored <strong>{result!.correct}/{result!.total}</strong> ({result!.percent}%) on {sectionTitle}.
              </DialogDescription>
            </DialogHeader>

            <div className="py-3 space-y-2">
              <Progress value={result!.percent} className="h-2" />
              {!passed && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm space-y-1">
                  <p className="font-medium text-foreground">We recommend revising this chapter.</p>
                  {result!.wrongLectureIds.length > 0 ? (
                    <p className="text-muted-foreground">
                      We'll replay {result!.wrongLectureIds.length} lesson
                      {result!.wrongLectureIds.length === 1 ? "" : "s"} tied to questions you missed.
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      No lessons were mapped to the missed questions — you can rewatch the chapter or skip ahead.
                    </p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              {passed ? (
                <Button onClick={() => { onOpenChange(false); onContinue(); }}>
                  Continue to Next Chapter
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => { onOpenChange(false); onSkipNext(); toast.info("Skipped to next chapter"); }}>
                    <SkipForward className="mr-1 h-4 w-4" /> Skip to Next Chapter
                  </Button>
                  <Button
                    onClick={() => {
                      onOpenChange(false);
                      if (result!.wrongLectureIds.length > 0) {
                        onRevise(result!.wrongLectureIds);
                        toast.info("Replaying lessons you struggled with");
                      } else {
                        onSkipNext();
                      }
                    }}
                  >
                    <RotateCcw className="mr-1 h-4 w-4" /> Revise Chapter
                  </Button>
                </>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
