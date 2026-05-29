import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  PlayCircle,
  Menu,
  X,
  Lock,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Award,
  Download,
   Bell,
  MessageCircle,
  Settings,
  HelpCircle,
  User,
  Search,
  Star,
  Volume2,
  Captions,
  Cog,
} from "lucide-react";
import { generateCertificate } from "@/lib/generateCertificate";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ChapterQuizDialog } from "@/components/player/ChapterQuizDialog";

interface Lecture {
  id: string;
  title: string;
  video_url: string | null;
  duration: number | null;
  position: number;
  is_preview: boolean;
  section_id: string;
}

interface Section {
  id: string;
  title: string;
  position: number;
  lectures: Lecture[];
}

export default function CoursePlayer() {
  const { slug } = useParams<{ slug: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [activeLectureId, setActiveLectureId] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [quizSectionId, setQuizSectionId] = useState<string | null>(null);
  const [revisionQueue, setRevisionQueue] = useState<string[]>([]);
  const [quizzedSections, setQuizzedSections] = useState<Set<string>>(new Set());

  // Fetch course by slug
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["player-course", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, profiles!courses_instructor_profile_fkey(full_name)")
        .eq("slug", slug!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Check purchase
  const { data: purchase, isLoading: purchaseLoading } = useQuery({
    queryKey: ["player-purchase", course?.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("purchases")
        .select("id")
        .eq("course_id", course!.id)
        .eq("user_id", user!.id)
        .eq("status", "completed")
        .maybeSingle();
      return data;
    },
    enabled: !!course && !!user,
  });

  // Fetch sections + lectures
  const { data: sections } = useQuery({
    queryKey: ["player-sections", course?.id],
    queryFn: async () => {
      const { data: secs } = await supabase
        .from("sections")
        .select("*")
        .eq("course_id", course!.id)
        .order("position");

      if (!secs || secs.length === 0) return [];

      const { data: lecs } = await supabase
        .from("lectures")
        .select("*")
        .in("section_id", secs.map((s) => s.id))
        .order("position");

      return secs.map((s) => ({
        ...s,
        lectures: (lecs || []).filter((l) => l.section_id === s.id),
      })) as Section[];
    },
    enabled: !!course,
  });

  // Fetch user progress
  const { data: progressData } = useQuery({
    queryKey: ["player-progress", course?.id, user?.id],
    queryFn: async () => {
      const lectureIds = sections?.flatMap((s) => s.lectures.map((l) => l.id)) || [];
      if (lectureIds.length === 0) return [];
      const { data } = await supabase
        .from("progress")
        .select("*")
        .eq("user_id", user!.id)
        .in("lecture_id", lectureIds);
      return data || [];
    },
    enabled: !!sections && !!user,
  });

  // All lectures flat
  const allLectures = sections?.flatMap((s) => s.lectures) || [];

  // Set initial active lecture (resume from last watched or first)
  useEffect(() => {
    if (!allLectures.length || activeLectureId) return;
    if (progressData && progressData.length > 0) {
      // Find the last uncompleted lecture, or the one with the most recent update
      const incomplete = progressData
        .filter((p) => !p.completed)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      if (incomplete.length > 0) {
        setActiveLectureId(incomplete[0].lecture_id);
        // Expand its section
        const lecture = allLectures.find((l) => l.id === incomplete[0].lecture_id);
        if (lecture) setExpandedSections(new Set([lecture.section_id]));
        return;
      }
    }
    // Default: first lecture
    setActiveLectureId(allLectures[0].id);
    if (sections?.[0]) setExpandedSections(new Set([sections[0].id]));
  }, [allLectures.length, progressData, activeLectureId]);

  const activeLecture = allLectures.find((l) => l.id === activeLectureId);
  const activeProgress = progressData?.find((p) => p.lecture_id === activeLectureId);
  const activeIndex = allLectures.findIndex((l) => l.id === activeLectureId);

  // Resume playback position
  useEffect(() => {
    if (videoRef.current && activeProgress?.last_position) {
      videoRef.current.currentTime = activeProgress.last_position;
    }
  }, [activeLectureId, activeProgress?.last_position]);

  // Save progress mutation
  const saveMutation = useMutation({
    mutationFn: async ({
      lectureId,
      position,
      completed,
      watchTime,
    }: {
      lectureId: string;
      position: number;
      completed: boolean;
      watchTime: number;
    }) => {
      const existing = progressData?.find((p) => p.lecture_id === lectureId);
      if (existing) {
        await supabase
          .from("progress")
          .update({
            last_position: Math.floor(position),
            completed,
            watch_time: Math.floor(watchTime),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("progress").insert({
          user_id: user!.id,
          lecture_id: lectureId,
          last_position: Math.floor(position),
          completed,
          watch_time: Math.floor(watchTime),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-progress"] });
    },
  });

  // Periodic save (every 10s)
  useEffect(() => {
    if (!activeLectureId || !user) return;
    saveTimerRef.current = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        saveMutation.mutate({
          lectureId: activeLectureId,
          position: videoRef.current.currentTime,
          completed: false,
          watchTime: videoRef.current.currentTime,
        });
      }
    }, 10000);
    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
  }, [activeLectureId, user]);

  // Mark complete when video ends
  const handleVideoEnded = useCallback(() => {
    if (!activeLectureId || !videoRef.current) return;
    saveMutation.mutate({
      lectureId: activeLectureId,
      position: videoRef.current.duration,
      completed: true,
      watchTime: videoRef.current.duration,
    });
    // If we're in revision mode, advance to the next failed lesson
    setTimeout(() => advanceRevisionQueueRef.current?.(), 200);
  }, [activeLectureId]);

  // Use a ref to break the circular dep between handleVideoEnded and advanceRevisionQueue
  const advanceRevisionQueueRef = useRef<(() => void) | null>(null);

  // Save on pause
  const handlePause = useCallback(() => {
    if (!activeLectureId || !videoRef.current) return;
    saveMutation.mutate({
      lectureId: activeLectureId,
      position: videoRef.current.currentTime,
      completed: false,
      watchTime: videoRef.current.currentTime,
    });
  }, [activeLectureId]);

  const navigateLecture = (direction: "prev" | "next") => {
    const newIndex = direction === "next" ? activeIndex + 1 : activeIndex - 1;
    if (newIndex >= 0 && newIndex < allLectures.length) {
      // Save current progress before navigating
      if (videoRef.current && activeLectureId) {
        saveMutation.mutate({
          lectureId: activeLectureId,
          position: videoRef.current.currentTime,
          completed: false,
          watchTime: videoRef.current.currentTime,
        });
      }
      setActiveLectureId(allLectures[newIndex].id);
      const section = sections?.find((s) => s.lectures.some((l) => l.id === allLectures[newIndex].id));
      if (section) setExpandedSections((prev) => new Set([...prev, section.id]));
    }
  };

  const navigateToLecture = (lectureId: string) => {
    setActiveLectureId(lectureId);
    const section = sections?.find((s) => s.lectures.some((l) => l.id === lectureId));
    if (section) setExpandedSections((prev) => new Set([...prev, section.id]));
  };

  const skipToNextSection = (currentSectionId: string) => {
    if (!sections) return;
    const idx = sections.findIndex((s) => s.id === currentSectionId);
    const next = sections[idx + 1];
    if (next && next.lectures[0]) {
      navigateToLecture(next.lectures[0].id);
    } else {
      toast.success("You've reached the end of the course!");
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const isLectureCompleted = (lectureId: string) =>
    progressData?.some((p) => p.lecture_id === lectureId && p.completed) || false;

  const firstSectionId = sections?.[0]?.id;
  const isLectureLocked = (lecture: Lecture) => {
    if (!course) return false;
    const isOwnerLocal = course.instructor_id === user?.id;
    if (isOwnerLocal || purchase) return false;
    if (lecture.is_preview) return false;
    if (lecture.section_id === firstSectionId) return false;
    return true;
  };

  const logPurchaseAttempt = async (lectureId?: string) => {
    if (!course || !user) return;
    await supabase.from("purchase_attempts").insert({
      user_id: user.id,
      course_id: course.id,
      lecture_id: lectureId ?? null,
      source: "course_player",
      is_guest: false,
      user_agent: navigator.userAgent,
    });
  };

  // Overall progress
  const completedCount = allLectures.filter((l) => isLectureCompleted(l.id)).length;
  const overallProgress = allLectures.length > 0 ? Math.round((completedCount / allLectures.length) * 100) : 0;

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatChapterDuration = (seconds: number) => {
    if (!seconds) return "0 min";
    const m = Math.round(seconds / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem ? `${h}h ${rem}m` : `${h}h`;
  };

  // Trigger chapter quiz when the last lecture of a section is completed
  useEffect(() => {
    if (!sections || !activeLecture || !user) return;
    if (revisionQueue.length > 0) return; // don't pop quiz mid-revision
    if (quizSectionId) return;
    const section = sections.find((s) => s.id === activeLecture.section_id);
    if (!section || section.lectures.length === 0) return;
    const allDone = section.lectures.every((l) => isLectureCompleted(l.id));
    if (!allDone) return;
    if (quizzedSections.has(section.id)) return;
    // Only open if the section actually has quiz questions
    (async () => {
      const { count } = await supabase
        .from("quiz_questions")
        .select("id", { count: "exact", head: true })
        .eq("section_id", section.id);
      if ((count ?? 0) > 0) {
        setQuizSectionId(section.id);
        setQuizzedSections((prev) => new Set(prev).add(section.id));
      }
    })();
  }, [progressData, activeLectureId, sections, user]);

  // After completing a revision lecture, advance to the next failed lesson in the queue
  const advanceRevisionQueue = useCallback(() => {
    if (revisionQueue.length === 0 || !activeLectureId) return;
    const remaining = revisionQueue.filter((id) => id !== activeLectureId);
    if (remaining.length > 0) {
      setRevisionQueue(remaining);
      navigateToLecture(remaining[0]);
      toast.info(`Revising next lesson (${revisionQueue.length - remaining.length}/${revisionQueue.length} done)`);
    } else {
      setRevisionQueue([]);
      toast.success("Revision complete — retake the chapter quiz!");
      const sectionId = sections?.find((s) =>
        s.lectures.some((l) => l.id === activeLectureId)
      )?.id;
      if (sectionId) {
        setQuizzedSections((prev) => {
          const next = new Set(prev);
          next.delete(sectionId);
          return next;
        });
        setQuizSectionId(sectionId);
      }
    }
  }, [revisionQueue, activeLectureId, sections]);

  // Keep the ref pointing at the latest callback so handleVideoEnded can invoke it
  useEffect(() => {
    advanceRevisionQueueRef.current = advanceRevisionQueue;
  }, [advanceRevisionQueue]);

  // Loading states
  if (authLoading || courseLoading || purchaseLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" />;
  if (!course) return <Navigate to="/courses" />;

  // Owner (instructor) or purchaser gets full access; otherwise allow preview-only
  // (RLS already filters lectures to first-section / is_preview for non-purchasers)
  const isOwner = course.instructor_id === user.id;
  const hasAccess = !!purchase || isOwner;
  const previewLectures = allLectures.filter((l) => l.video_url);
  if (!hasAccess && sections && sections.length > 0 && previewLectures.length === 0) {
    return <Navigate to={`/course/${slug}`} />;
  }
  const firstName = profile?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "Learner";
  const activeSection = sections?.find((section) => section.lectures.some((lecture) => lecture.id === activeLectureId));

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#eeeff5] p-4">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="rounded-2xl border bg-[#f7f8fc] p-4 shadow-sm">
          <p className="mb-6 font-display text-xl font-bold">Guidement</p>
          <div className="space-y-1 text-sm">
            <p className="rounded-lg px-3 py-2">Home</p>
            <p className="rounded-lg px-3 py-2">Bookmark</p>
            <p className="rounded-lg bg-violet-600 px-3 py-2 font-semibold text-white">Courses</p>
            <p className="rounded-lg px-3 py-2">Tutorials</p>
            <p className="rounded-lg px-3 py-2">Workshop</p>
            <p className="rounded-lg px-3 py-2">Resources</p>
          </div>
          <div className="mt-16 space-y-1 text-sm">
            <p className="flex items-center gap-2 rounded-lg px-3 py-2"><Settings className="h-4 w-4" /> Settings</p>
            <p className="flex items-center gap-2 rounded-lg px-3 py-2"><HelpCircle className="h-4 w-4" /> Help Center</p>
            <p className="flex items-center gap-2 rounded-lg px-3 py-2"><User className="h-4 w-4" /> My Account</p>
          </div>
        </aside>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-slate-100 p-3">
            <div>
              <p className="text-sm font-semibold">👋 Welcome back, {firstName}!</p>
              <p className="text-xs text-muted-foreground">Boost your skill to shine in your life.</p>
            </div>
            <div className="ml-auto flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4" /> Search Courses
            </div>
            <MessageCircle className="h-4 w-4" />
            <Bell className="h-4 w-4" />
            <Link to={`/course/${slug}`} className="text-xs text-muted-foreground underline">Back</Link>
          </div>

          <div className="rounded-xl bg-[#f8f8fc] p-4">
            <p className="mb-3 text-sm font-medium">Courses · <span className="text-muted-foreground">{course.title}</span></p>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
              <div>
                <div className="overflow-hidden rounded-xl bg-black">
                  {activeLecture?.video_url ? (
                    <video
                      ref={videoRef}
                      key={activeLecture.id}
                      src={activeLecture.video_url}
                      controls
                      autoPlay
                      className="aspect-video w-full object-cover"
                      onEnded={handleVideoEnded}
                      onPause={handlePause}
                    />
                  ) : (
                    <div className="flex aspect-video items-center justify-center text-white">
                      <PlayCircle className="mr-2 h-5 w-5" /> No video available
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                  <Volume2 className="h-4 w-4" /><Captions className="h-4 w-4" /><Cog className="h-4 w-4" />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Advance</Badge>
                  <Badge variant="secondary">Live Class</Badge>
                  <Badge variant="secondary">2k Class</Badge>
                  <Button className="ml-auto" size="sm">Enroll Now</Button>
                  <Button variant="outline" size="sm">Add to Favourite</Button>
                </div>
                <h1 className="mt-3 font-display text-3xl font-bold">{course.title}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{course.description || "This comprehensive course covers practical testing and UX law concepts with real-world examples."}</p>
                <div className="mt-4 rounded-xl border bg-white p-3">
                  <p className="text-xs text-muted-foreground">Instructor</p>
                  <p className="font-semibold">{(course as any)?.profiles?.full_name || "Instructor"}</p>
                  <div className="mt-1 flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                  </div>
                </div>
              </div>

              <div className={`${sidebarOpen ? "block" : "hidden xl:block"} rounded-xl border bg-white`}>
                <div className="border-b p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-violet-600 text-white">All Videos</Badge>
                      <Badge variant="outline">Resources</Badge>
                      <Badge variant="outline">Support</Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="xl:hidden" onClick={() => setSidebarOpen(false)}><X className="h-4 w-4" /></Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{completedCount}/{allLectures.length} lessons complete</p>
                  <Progress value={overallProgress} className="mt-2 h-1.5" />
                </div>

                <ScrollArea className="h-[560px]">
                  <div className="p-2">
                    {sections?.map((section) => (
                      <div key={section.id} className="mb-1">
                        <button
                          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                          onClick={() => toggleSection(section.id)}
                        >
                          {expandedSections.has(section.id) ? (
                            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{section.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {section.lectures.length} lessons · {formatChapterDuration(section.lectures.reduce((sum, l) => sum + (l.duration || 0), 0))}
                            </p>
                          </div>
                        </button>

                        {expandedSections.has(section.id) && (
                          <div className="ml-2 space-y-0.5">
                            {section.lectures.map((lecture) => {
                              const completed = isLectureCompleted(lecture.id);
                              const isActive = lecture.id === activeLectureId;
                              const locked = isLectureLocked(lecture);
                              return (
                                <button
                                  key={lecture.id}
                                  className={`w-full flex items-center gap-2 p-2.5 pl-4 rounded-lg text-left transition-colors text-sm ${
                                    isActive
                                      ? "bg-primary/10 text-primary"
                                      : "hover:bg-secondary/50 text-foreground"
                                  } ${locked ? "opacity-70" : ""}`}
                                  onClick={() => {
                                    if (locked) {
                                      logPurchaseAttempt(lecture.id);
                                      setBuyDialogOpen(true);
                                      return;
                                    }
                                    if (videoRef.current && activeLectureId) {
                                      saveMutation.mutate({
                                        lectureId: activeLectureId,
                                        position: videoRef.current.currentTime,
                                        completed: false,
                                        watchTime: videoRef.current.currentTime,
                                      });
                                    }
                                    setActiveLectureId(lecture.id);
                                  }}
                                >
                                  {locked ? (
                                    <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  ) : completed ? (
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[hsl(var(--success))]" />
                                  ) : isActive ? (
                                    <PlayCircle className="h-4 w-4 shrink-0 text-primary" />
                                  ) : (
                                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  )}
                                  <span className="flex-1 truncate">{lecture.title}</span>
                                  {lecture.duration ? (
                                    <span className="text-xs text-muted-foreground shrink-0">
                                      {formatDuration(lecture.duration)}
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t pt-3">
              <Button variant="ghost" size="sm" disabled={activeIndex <= 0} onClick={() => navigateLecture("prev")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <div className="text-center">
                <p className="text-sm font-medium">{activeLecture?.title}</p>
                <p className="text-xs text-muted-foreground">{activeSection?.title || "Section"} · Lecture {activeIndex + 1} of {allLectures.length}</p>
              </div>
              <div className="flex items-center gap-2">
                {overallProgress === 100 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs gap-1 text-[hsl(var(--success))]"
                    onClick={() =>
                      generateCertificate({
                        studentName: profile?.full_name || user?.email || "Student",
                        courseName: course.title,
                        instructorName: (course as any)?.profiles?.full_name || "Instructor",
                        completionDate: new Date(),
                      })
                    }
                  >
                    <Award className="h-4 w-4" /> Certificate
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="xl:hidden" onClick={() => setSidebarOpen((v) => !v)}>
                  {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" disabled={activeIndex >= allLectures.length - 1} onClick={() => navigateLecture("next")}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" /> Unlock the full course
            </DialogTitle>
            <DialogDescription>
              This lecture is locked. Purchase the course to unlock all chapters, lectures, and downloadable resources.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="font-display text-2xl font-bold">
              {course.price === 0 ? "Free" : `$${Number(course.price).toFixed(2)}`}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyDialogOpen(false)}>Cancel</Button>
            <Link to={`/course/${slug}`}>
              <Button
                className="gradient-primary text-primary-foreground"
                onClick={() => toast.info("Redirecting to course page")}
              >
                {course.price === 0 ? "Enroll for Free" : "Buy Now"}
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {quizSectionId && course && user && (
        <ChapterQuizDialog
          open={!!quizSectionId}
          onOpenChange={(o) => { if (!o) setQuizSectionId(null); }}
          sectionId={quizSectionId}
          sectionTitle={sections?.find((s) => s.id === quizSectionId)?.title || "Chapter"}
          courseId={course.id}
          userId={user.id}
          onContinue={() => skipToNextSection(quizSectionId)}
          onSkipNext={() => skipToNextSection(quizSectionId)}
          onRevise={(wrongIds) => {
            if (wrongIds.length === 0) return;
            setRevisionQueue(wrongIds);
            navigateToLecture(wrongIds[0]);
          }}
        />
      )}
    </div>
  );
}
