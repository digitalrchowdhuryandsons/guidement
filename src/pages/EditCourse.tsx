import { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { ChapterQuizEditor } from "@/components/instructor/ChapterQuizEditor";

export default function EditCourse() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, loading, hasRole } = useAuth();
  const queryClient = useQueryClient();

  const { data: course, isLoading } = useQuery({
    queryKey: ["edit-course", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("id", courseId!).single();
      return data;
    },
    enabled: !!courseId,
  });

  const { data: sections, refetch: refetchSections } = useQuery({
    queryKey: ["edit-sections", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("sections")
        .select("*, lectures(*)")
        .eq("course_id", courseId!)
        .order("position");
      return data || [];
    },
    enabled: !!courseId,
  });

  const [saving, setSaving] = useState(false);

  if (loading || isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!user || !hasRole("instructor")) return <Navigate to="/dashboard" />;
  if (!course || course.instructor_id !== user.id) return <Navigate to="/instructor/dashboard" />;

  const togglePublish = async () => {
    const { error } = await supabase.from("courses").update({ is_published: !course.is_published }).eq("id", course.id);
    if (error) toast.error(error.message);
    else {
      toast.success(course.is_published ? "Course unpublished" : "Course published!");
      queryClient.invalidateQueries({ queryKey: ["edit-course", courseId] });
    }
  };

  const addSection = async () => {
    const pos = (sections?.length || 0) + 1;
    const { error } = await supabase.from("sections").insert({
      course_id: course.id,
      title: `Section ${pos}`,
      position: pos,
    });
    if (error) toast.error(error.message);
    else refetchSections();
  };

  const addLecture = async (sectionId: string, lectureCount: number) => {
    const { error } = await supabase.from("lectures").insert({
      section_id: sectionId,
      title: `Lecture ${lectureCount + 1}`,
      position: lectureCount + 1,
    });
    if (error) toast.error(error.message);
    else refetchSections();
  };

  const deleteSection = async (sectionId: string) => {
    const { error } = await supabase.from("sections").delete().eq("id", sectionId);
    if (error) toast.error(error.message);
    else refetchSections();
  };

  const deleteLecture = async (lectureId: string) => {
    const { error } = await supabase.from("lectures").delete().eq("id", lectureId);
    if (error) toast.error(error.message);
    else refetchSections();
  };

  const updateSectionTitle = async (sectionId: string, title: string) => {
    await supabase.from("sections").update({ title }).eq("id", sectionId);
  };

  const updateLectureTitle = async (lectureId: string, title: string) => {
    await supabase.from("lectures").update({ title }).eq("id", lectureId);
  };

  return (
    <div className="container py-8 max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Edit Course</h1>
        <div className="flex items-center gap-3">
          <Label htmlFor="publish">Published</Label>
          <Switch id="publish" checked={course.is_published} onCheckedChange={togglePublish} />
        </div>
      </div>

      {/* Course Curriculum */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-display">Course Content</CardTitle>
            <Button size="sm" onClick={addSection}><Plus className="mr-1 h-4 w-4" /> Add Section</Button>
          </div>
        </CardHeader>
        <CardContent>
          {sections && sections.length > 0 ? (
            <Accordion type="multiple" className="space-y-2">
              {sections.map((section: any) => (
                <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2 flex-1">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Input
                        defaultValue={section.title}
                        onBlur={(e) => updateSectionTitle(section.id, e.target.value)}
                        className="h-8 border-0 bg-transparent font-medium p-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2 pt-2">
                    {section.lectures?.sort((a: any, b: any) => a.position - b.position).map((lecture: any) => (
                      <div key={lecture.id} className="flex items-center gap-2 py-1">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <Input
                          defaultValue={lecture.title}
                          onBlur={(e) => updateLectureTitle(lecture.id, e.target.value)}
                          className="h-8 text-sm"
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteLecture(lecture.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => addLecture(section.id, section.lectures?.length || 0)}>
                        <Plus className="mr-1 h-3 w-3" /> Add Lecture
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteSection(section.id)}>
                        <Trash2 className="mr-1 h-3 w-3" /> Delete Section
                      </Button>
                    </div>
                    <div className="pt-3">
                      <ChapterQuizEditor
                        sectionId={section.id}
                        lectures={(section.lectures || []).sort((a: any, b: any) => a.position - b.position)}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-center text-muted-foreground py-8">No sections yet. Add your first section to get started.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
