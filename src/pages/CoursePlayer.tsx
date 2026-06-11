import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Navigate, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  Award,
  Home,
  Bookmark,
  Video,
  Briefcase,
  GraduationCap,
  CalendarDays,
  Users,
  ExternalLink,
  Heart,
  FileText,
  Clock,
  StickyNote,
  Trash2,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ChapterQuizDialog } from "@/components/player/ChapterQuizDialog";

interface Lecture {
  id: string;
  title: string;
  description: string | null;
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

type SidebarTab = "videos" | "resources" | "support";
type HubTab =
  | "courses"
  | "workshops"
  | "certifications"
  | "resources"
  | "events"
  | "community"
  | "help";

interface PlayerResource {
  id: string;
  title: string;
  file_url: string;
  file_type: string | null;
  file_size?: number | null;
  position: number;
  lecture_id: string | null;
  section_id?: string | null;
  source: "course_attachments" | "resources";
}

interface CourseReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
  } | null;
}

interface CourseWorkshop {
  id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  meeting_url: string | null;
  recording_url: string | null;
  status: string;
}

interface CourseCertification {
  id: string;
  title: string;
  description: string | null;
  passing_score: number;
  certificate_url: string | null;
}

interface CourseEvent {
  id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  event_url: string | null;
  location: string | null;
}

interface CourseCommunity {
  id: string;
  title: string;
  description: string | null;
  platform: string | null;
  community_url: string | null;
}

interface CoursePlayerNote {
  id: string;
  title: string;
  content: string;
  lecture_id: string | null;
  updated_at: string;
}

export default function CoursePlayer() {
  const { slug } = useParams<{ slug: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  // FIX 1: useNavigate was imported but never called — added the hook call
  const navigate = useNavigate();
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
  const [recordingBlocked, setRecordingBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<string>(
    "Screen recording, screen sharing, or switching tabs is not allowed during playback. Return focus to this window to resume."
  );
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>("videos");
  const [activeHubTab, setActiveHubTab] = useState<HubTab>("courses");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

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
        .in(
          "section_id",
          secs.map((s) => s.id)
        )
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
      const lectureIds =
        sections?.flatMap((s) => s.lectures.map((l) => l.id)) || [];
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

  const lectureIds =
    sections?.flatMap((s) => s.lectures.map((l) => l.id)) || [];

  // Fetch downloadable course resources from both legacy lecture resources and course attachments
  const { data: resources = [], isLoading: resourcesLoading } = useQuery({
    queryKey: ["player-resources", course?.id, lectureIds.join(",")],
    queryFn: async () => {
      const [attachmentsResult, lectureResourcesResult] = await Promise.all([
        supabase
          .from("course_attachments")
          .select(
            "id,title,file_url,file_type,file_size,position,lecture_id,section_id"
          )
          .eq("course_id", course!.id)
          .order("position"),
        lectureIds.length
          ? supabase
              .from("resources")
              .select("id,title,file_url,file_type,position,lecture_id")
              .in("lecture_id", lectureIds)
              .order("position")
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (attachmentsResult.error) throw attachmentsResult.error;
      if (lectureResourcesResult.error) throw lectureResourcesResult.error;

      const attachments = (attachmentsResult.data || []).map((item) => ({
        ...item,
        source: "course_attachments" as const,
      }));
      const lectureResources = (lectureResourcesResult.data || []).map(
        (item) => ({
          ...item,
          section_id:
            sections?.find((section) =>
              section.lectures.some((lecture) => lecture.id === item.lecture_id)
            )?.id || null,
          file_size: null,
          source: "resources" as const,
        })
      );

      return [...attachments, ...lectureResources] as PlayerResource[];
    },
    enabled:
      !!course &&
      !!sections &&
      (!!purchase || course?.instructor_id === user?.id),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["player-reviews", course?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select(
          "id,rating,comment,created_at,profiles!reviews_user_profile_fkey(full_name)"
        )
        .eq("course_id", course!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []) as CourseReview[];
    },
    enabled: !!course,
  });

  const { data: wishlistItem } = useQuery({
    queryKey: ["player-wishlist", course?.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("id")
        .eq("course_id", course!.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!course && !!user,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["course-player-notes", course?.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_player_notes")
        .select("id,title,content,lecture_id,updated_at")
        .eq("course_id", course!.id)
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as CoursePlayerNote[];
    },
    enabled: !!course && !!user,
  });

  const saveNoteMutation = useMutation({
    mutationFn: async () => {
      if (!course || !user) return;
      const payload = {
        user_id: user.id,
        course_id: course.id,
        lecture_id: activeLectureId,
        title:
          noteTitle.trim() || activeLecture?.title || "Untitled note",
        content: noteContent,
        updated_at: new Date().toISOString(),
      };

      const result = editingNoteId
        ? await supabase
            .from("course_player_notes")
            .update(payload)
            .eq("id", editingNoteId)
        : await supabase.from("course_player_notes").insert(payload);
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      toast.success(editingNoteId ? "Note updated" : "Note saved");
      setEditingNoteId(null);
      setNoteTitle("");
      setNoteContent("");
      queryClient.invalidateQueries({ queryKey: ["course-player-notes"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Could not save note"
      ),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from("course_player_notes")
        .delete()
        .eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note deleted");
      setEditingNoteId(null);
      setNoteTitle("");
      setNoteContent("");
      queryClient.invalidateQueries({ queryKey: ["course-player-notes"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Could not delete note"
      ),
  });

  const canFetchPremiumHubData =
    !!course && !!user && (!!purchase || course.instructor_id === user.id);

  const { data: courseWorkshops = [] } = useQuery({
    queryKey: ["player-course-workshops", course?.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_workshops")
        .select(
          "id,title,description,starts_at,ends_at,meeting_url,recording_url,status"
        )
        .eq("course_id", course!.id)
        .eq("is_active", true)
        .order("starts_at", { ascending: true })
        .order("position");
      if (error) throw error;
      return (data || []) as CourseWorkshop[];
    },
    enabled: canFetchPremiumHubData,
  });

  const { data: courseCertifications = [] } = useQuery({
    queryKey: ["player-course-certifications", course?.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_certifications")
        .select("id,title,description,passing_score,certificate_url")
        .eq("course_id", course!.id)
        .eq("is_active", true)
        .order("position");
      if (error) throw error;
      return (data || []) as CourseCertification[];
    },
    enabled: canFetchPremiumHubData,
  });

  const { data: courseEvents = [] } = useQuery({
    queryKey: ["player-course-events", course?.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_events")
        .select(
          "id,title,description,starts_at,ends_at,event_url,location"
        )
        .eq("course_id", course!.id)
        .eq("is_active", true)
        .order("starts_at", { ascending: true })
        .order("position");
      if (error) throw error;
      return (data || []) as CourseEvent[];
    },
    enabled: canFetchPremiumHubData,
  });

  const { data: courseCommunities = [] } = useQuery({
    queryKey: ["player-course-communities", course?.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_communities")
        .select("id,title,description,platform,community_url")
        .eq("course_id", course!.id)
        .eq("is_active", true)
        .order("position");
      if (error) throw error;
      return (data || []) as CourseCommunity[];
    },
    enabled: canFetchPremiumHubData,
  });

  // All lectures flat
  const allLectures = sections?.flatMap((s) => s.lectures) || [];

  // Set initial active lecture (resume from last watched or first)
  useEffect(() => {
    if (!allLectures.length || activeLectureId) return;
    if (progressData && progressData.length > 0) {
      const incomplete = progressData
        .filter((p) => !p.completed)
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      if (incomplete.length > 0) {
        setActiveLectureId(incomplete[0].lecture_id);
        const lecture = allLectures.find(
          (l) => l.id === incomplete[0].lecture_id
        );
        if (lecture) setExpandedSections(new Set([lecture.section_id]));
        return;
      }
    }
    setActiveLectureId(allLectures[0].id);
    if (sections?.[0]) setExpandedSections(new Set([sections[0].id]));
  }, [allLectures.length, progressData, activeLectureId]);

  const activeLecture = allLectures.find((l) => l.id === activeLectureId);
  const activeProgress = progressData?.find(
    (p) => p.lecture_id === activeLectureId
  );
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
    setTimeout(() => advanceRevisionQueueRef.current?.(), 200);
  }, [activeLectureId]);

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

  // ─── Anti screen-recording + keyboard/context-menu protection ───────────────
  useEffect(() => {
    const video = videoRef.current;

    const block = (reason?: string) => {
      setBlockReason(
        reason ??
          "Screen recording, screen sharing, or switching tabs is not allowed during playback. Return focus to this window to resume."
      );
      setRecordingBlocked(true);
      if (videoRef.current && !videoRef.current.paused)
        videoRef.current.pause();
    };

    const unblock = () => {
      setDevToolsOpen((dt) => {
        if (!dt) setRecordingBlocked(false);
        return dt;
      });
    };

    const onVisibility = () => {
      if (document.hidden) block();
      else unblock();
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      block();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const ctrlOrMeta = e.ctrlKey || e.metaKey;
      const isF12 = key === "f12";
      const isDevTools =
        (ctrlOrMeta && e.shiftKey && ["i", "j", "c"].includes(key)) ||
        (ctrlOrMeta && key === "u") ||
        (ctrlOrMeta && key === "s") ||
        (ctrlOrMeta && key === "p") ||
        (ctrlOrMeta && e.shiftKey && key === "s");
      const isPrintScreen = key === "printscreen";
      const isWinCapture =
        (e as any).getModifierState?.("Meta") &&
        (key === "s" || key === "g" || key === "r");

      if (isF12 || isDevTools || isPrintScreen || isWinCapture) {
        e.preventDefault();
        e.stopPropagation();
        block();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        navigator.clipboard?.writeText("").catch(() => {});
        block();
      }
    };

    const onDragStart = (e: DragEvent) => e.preventDefault();
    const onBlur = () => block();
    const onFocus = () => unblock();
    const onEnterPiP = () => block("Picture-in-picture is not allowed during playback.");
    const onLeavePiP = () => unblock();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    video?.addEventListener("enterpictureinpicture", onEnterPiP);
    video?.addEventListener("leavepictureinpicture", onLeavePiP);
    video?.addEventListener("dragstart", onDragStart);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      video?.removeEventListener("enterpictureinpicture", onEnterPiP);
      video?.removeEventListener("leavepictureinpicture", onLeavePiP);
      video?.removeEventListener("dragstart", onDragStart);
    };
  }, [activeLectureId]);

  // ─── DevTools detection ────────────────────────────────────────────
  useEffect(() => {
    const DEVTOOLS_MSG =
      "Developer tools detected. Close DevTools to resume playback.";
    const THRESHOLD = 160;

    const isOpen = () =>
      window.outerWidth - window.innerWidth > THRESHOLD ||
      window.outerHeight - window.innerHeight > THRESHOLD;

    const runCheck = () => {
      if (isOpen()) {
        setDevToolsOpen(true);
        setBlockReason(DEVTOOLS_MSG);
        setRecordingBlocked(true);
        if (videoRef.current && !videoRef.current.paused)
          videoRef.current.pause();
      } else {
        setDevToolsOpen((prev) => {
          if (prev) setRecordingBlocked(false);
          return false;
        });
      }
    };

    const intervalId = window.setInterval(runCheck, 1000);
    window.addEventListener("resize", runCheck);
    runCheck();

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("resize", runCheck);
    };
  }, []);

  const navigateLecture = (direction: "prev" | "next") => {
    const newIndex =
      direction === "next" ? activeIndex + 1 : activeIndex - 1;
    if (newIndex >= 0 && newIndex < allLectures.length) {
      if (videoRef.current && activeLectureId) {
        saveMutation.mutate({
          lectureId: activeLectureId,
          position: videoRef.current.currentTime,
          completed: false,
          watchTime: videoRef.current.currentTime,
        });
      }
      setActiveLectureId(allLectures[newIndex].id);
      const section = sections?.find((s) =>
        s.lectures.some((l) => l.id === allLectures[newIndex].id)
      );
      if (section)
        setExpandedSections((prev) => new Set([...prev, section.id]));
    }
  };

  const navigateToLecture = (lectureId: string) => {
    if (
      videoRef.current &&
      activeLectureId &&
      activeLectureId !== lectureId
    ) {
      saveMutation.mutate({
        lectureId: activeLectureId,
        position: videoRef.current.currentTime,
        completed: false,
        watchTime: videoRef.current.currentTime,
      });
    }
    setActiveLectureId(lectureId);
    const section = sections?.find((s) =>
      s.lectures.some((l) => l.id === lectureId)
    );
    if (section)
      setExpandedSections((prev) => new Set([...prev, section.id]));
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
    progressData?.some(
      (p) => p.lecture_id === lectureId && p.completed
    ) || false;

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

  const wishlistMutation = useMutation({
    mutationFn: async () => {
      if (!course || !user) return;
      if (wishlistItem) {
        const { error } = await supabase
          .from("wishlists")
          .delete()
          .eq("id", wishlistItem.id);
        if (error) throw error;
        return "removed" as const;
      }

      const { error } = await supabase.from("wishlists").insert({
        course_id: course.id,
        user_id: user.id,
      });
      if (error) throw error;
      return "added" as const;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["player-wishlist"] });
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success(
        result === "removed"
          ? "Removed from favourites"
          : "Added to favourites"
      );
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update favourites"
      );
    },
  });

  const completedCount = allLectures.filter((l) =>
    isLectureCompleted(l.id)
  ).length;
  const overallProgress =
    allLectures.length > 0
      ? Math.round((completedCount / allLectures.length) * 100)
      : 0;

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

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return null;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDateTime = (value: string | null) => {
    if (!value) return "Date TBA";
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  };

  const openPremiumLockedDialog = () => {
    logPurchaseAttempt(activeLectureId || undefined);
    setBuyDialogOpen(true);
  };

  // Trigger chapter quiz when the last lecture of a section is completed
  useEffect(() => {
    if (!sections || !activeLecture || !user) return;
    if (revisionQueue.length > 0) return;
    if (quizSectionId) return;
    const section = sections.find((s) => s.id === activeLecture.section_id);
    if (!section || section.lectures.length === 0) return;
    const allDone = section.lectures.every((l) => isLectureCompleted(l.id));
    if (!allDone) return;
    if (quizzedSections.has(section.id)) return;
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

  const advanceRevisionQueue = useCallback(() => {
    if (revisionQueue.length === 0 || !activeLectureId) return;
    const remaining = revisionQueue.filter((id) => id !== activeLectureId);
    if (remaining.length > 0) {
      setRevisionQueue(remaining);
      navigateToLecture(remaining[0]);
      toast.info(
        `Revising next lesson (${revisionQueue.length - remaining.length}/${revisionQueue.length} done)`
      );
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

  useEffect(() => {
    advanceRevisionQueueRef.current = advanceRevisionQueue;
  }, [advanceRevisionQueue]);

  if (authLoading || courseLoading || purchaseLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" />;
  if (!course) return <Navigate to="/courses" />;

  const isOwner = course.instructor_id === user.id;
  const hasAccess = !!purchase || isOwner;
  const previewLectures = allLectures.filter((l) => l.video_url);
  if (
    !hasAccess &&
    sections &&
    sections.length > 0 &&
    previewLectures.length === 0
  ) {
    return <Navigate to={`/course/${slug}`} />;
  }

  const firstName =
    profile?.full_name?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "Learner";
  const activeSection = sections?.find((section) =>
    section.lectures.some((lecture) => lecture.id === activeLectureId)
  );

  const normalizedSidebarSearch = sidebarSearch.trim().toLowerCase();
  const visibleSections = sections
    ?.map((section) => ({
      ...section,
      lectures: section.lectures.filter((lecture) => {
        if (!normalizedSidebarSearch) return true;
        return `${section.title} ${lecture.title} ${lecture.description || ""}`
          .toLowerCase()
          .includes(normalizedSidebarSearch);
      }),
    }))
    .filter(
      (section) =>
        !normalizedSidebarSearch || section.lectures.length > 0
    );

  const visibleResources = resources.filter((resource) => {
    if (!normalizedSidebarSearch) return true;
    const lecture = resource.lecture_id
      ? allLectures.find((item) => item.id === resource.lecture_id)
      : null;
    const section = resource.section_id
      ? sections?.find((item) => item.id === resource.section_id)
      : null;
    return `${resource.title} ${resource.file_type || ""} ${lecture?.title || ""} ${section?.title || ""}`
      .toLowerCase()
      .includes(normalizedSidebarSearch);
  });

  const averageRating = reviews.length
    ? (
        reviews.reduce((sum, review) => sum + review.rating, 0) /
        reviews.length
      ).toFixed(1)
    : null;

  const canAccessResources = hasAccess;
  // FIX 2: instructorName was rendered twice in the card — unified to one source
  const instructorName =
    (course as { profiles?: { full_name?: string | null } | null }).profiles
      ?.full_name || "Instructor";

  const activeLectureNotes = notes.filter(
    (note) => note.lecture_id === activeLectureId
  );

  const startEditingNote = (note: CoursePlayerNote) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
  };

  const cancelEditingNote = () => {
    setEditingNoteId(null);
    setNoteTitle("");
    setNoteContent("");
  };

  const renderNoteBoard = () => (
    <div className="mt-4 rounded-xl border bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-violet-600" />
          <div>
            <h2 className="font-display text-lg font-bold">Lecture notes</h2>
            <p className="text-xs text-muted-foreground">
              Save private notes for the current lecture.
            </p>
          </div>
        </div>
        <Badge variant="secondary">{activeLectureNotes.length} notes</Badge>
      </div>
      <div className="space-y-3">
        <Input
          placeholder={activeLecture?.title || "Note title"}
          value={noteTitle}
          onChange={(event) => setNoteTitle(event.target.value)}
        />
        <Textarea
          className="min-h-28"
          placeholder="Write your key takeaways, timestamps, questions, or revision reminders..."
          value={noteContent}
          onChange={(event) => setNoteContent(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => saveNoteMutation.mutate()}
            disabled={
              saveNoteMutation.isPending ||
              (!noteTitle.trim() && !noteContent.trim())
            }
          >
            {editingNoteId ? "Update note" : "Save note"}
          </Button>
          {editingNoteId && (
            <Button size="sm" variant="outline" onClick={cancelEditingNote}>
              Cancel edit
            </Button>
          )}
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {activeLectureNotes.length > 0 ? (
          activeLectureNotes.map((note) => (
            <div key={note.id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{note.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Updated {new Date(note.updated_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEditingNote(note)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteNoteMutation.mutate(note.id)}
                    disabled={deleteNoteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {note.content && (
                <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                  {note.content}
                </p>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            No notes yet for this lecture.
          </div>
        )}
      </div>
    </div>
  );

  const emptyHubState = (label: string) => (
    <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
      No {label.toLowerCase()} have been added for this course yet.
    </div>
  );

  const lockedHubState = (label: string) => (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <div className="mb-1 flex items-center gap-2 font-semibold">
        <Lock className="h-4 w-4" /> {label} locked
      </div>
      Purchase the course to unlock this section and its content.
      <Button
        className="mt-3"
        size="sm"
        onClick={openPremiumLockedDialog}
      >
        Unlock course
      </Button>
    </div>
  );

  // FIX 3: renderHubPanel had a broken structure — the "courses" branch returned
  // early into a dangling block, and all subsequent tab branches were outside the
  // function body entirely. Rewrote as a single clean if/else-if chain.
  const renderHubPanel = () => {
    if (activeHubTab === "courses") {
      return (
        <div className="rounded-xl border bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Course progress</p>
              <h2 className="font-display text-lg font-bold">
                Continue learning
              </h2>
            </div>
            <Badge variant="secondary">{overallProgress}% complete</Badge>
          </div>
          <Progress value={overallProgress} className="h-2" />
          <p className="mt-2 text-sm text-muted-foreground">
            {completedCount}/{allLectures.length} lessons completed. Use the
            lesson list, resources, and support tabs to continue.
          </p>
        </div>
      );
    }

    if (activeHubTab === "workshops") {
      if (!hasAccess) return lockedHubState("Workshops");
      return (
        <div className="rounded-xl border bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-violet-600" />
            <h2 className="font-display text-lg font-bold">Workshops</h2>
          </div>
          {courseWorkshops.length > 0 ? (
            <div className="space-y-3">
              {courseWorkshops.map((workshop) => (
                <div key={workshop.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{workshop.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(workshop.starts_at)} ·{" "}
                        {workshop.status}
                      </p>
                    </div>
                    <Badge variant="secondary">{workshop.status}</Badge>
                  </div>
                  {workshop.description && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {workshop.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {workshop.meeting_url && (
                      <a
                        href={workshop.meeting_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button size="sm">Join workshop</Button>
                      </a>
                    )}
                    {workshop.recording_url && (
                      <a
                        href={workshop.recording_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button size="sm" variant="outline">
                          Recording
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            emptyHubState("Workshops")
          )}
        </div>
      );
    }

    if (activeHubTab === "certifications") {
      if (!hasAccess) return lockedHubState("Certifications");
      return (
        <div className="rounded-xl border bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-violet-600" />
            <h2 className="font-display text-lg font-bold">Certifications</h2>
          </div>
          {courseCertifications.length > 0 ? (
            <div className="space-y-3">
              {courseCertifications.map((certification) => (
                <div
                  key={certification.id}
                  className="rounded-lg border p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{certification.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Passing score: {certification.passing_score}% · Your
                        progress: {overallProgress}%
                      </p>
                    </div>
                    <Award className="h-5 w-5 text-violet-600" />
                  </div>
                  {certification.description && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {certification.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {overallProgress === 100 ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          generateCertificate({
                            studentName:
                              profile?.full_name ||
                              user?.email ||
                              "Student",
                            courseName: course.title,
                            instructorName,
                            completionDate: new Date(),
                          })
                        }
                      >
                        Generate certificate
                      </Button>
                    ) : (
                      <Button size="sm" disabled>
                        Complete course to unlock
                      </Button>
                    )}
                    {certification.certificate_url && (
                      <a
                        href={certification.certificate_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button size="sm" variant="outline">
                          Template
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            emptyHubState("Certifications")
          )}
        </div>
      );
    }

    if (activeHubTab === "resources") {
      return (
        <div className="rounded-xl border bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-violet-600" />
            <h2 className="font-display text-lg font-bold">Resources</h2>
          </div>
          {!hasAccess ? (
            lockedHubState("Resources")
          ) : visibleResources.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-2">
              {visibleResources.map((resource) => (
                <a
                  key={`${resource.source}-hub-${resource.id}`}
                  href={resource.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-lg border p-3 text-sm hover:bg-secondary/50"
                >
                  <Download className="h-4 w-4 text-violet-600" />
                  <span className="min-w-0 flex-1 truncate">
                    {resource.title}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              ))}
            </div>
          ) : (
            emptyHubState("Resources")
          )}
        </div>
      );
    }

    if (activeHubTab === "events") {
      if (!hasAccess) return lockedHubState("Events");
      return (
        <div className="rounded-xl border bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-violet-600" />
            <h2 className="font-display text-lg font-bold">Events</h2>
          </div>
          {courseEvents.length > 0 ? (
            <div className="space-y-3">
              {courseEvents.map((event) => (
                <div key={event.id} className="rounded-lg border p-3">
                  <p className="font-semibold">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(event.starts_at)}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                  {event.description && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {event.description}
                    </p>
                  )}
                  {event.event_url && (
                    <a
                      href={event.event_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button
                        className="mt-3"
                        size="sm"
                        variant="outline"
                      >
                        View event{" "}
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            emptyHubState("Events")
          )}
        </div>
      );
    }

    if (activeHubTab === "community") {
      if (!hasAccess) return lockedHubState("Community");
      return (
        <div className="rounded-xl border bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-600" />
            <h2 className="font-display text-lg font-bold">Community</h2>
          </div>
          {courseCommunities.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {courseCommunities.map((community) => (
                <div key={community.id} className="rounded-lg border p-3">
                  <p className="font-semibold">{community.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {community.platform || "Community"}
                  </p>
                  {community.description && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {community.description}
                    </p>
                  )}
                  {community.community_url && (
                    <a
                      href={community.community_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button className="mt-3" size="sm">
                        Join community
                      </Button>
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            emptyHubState("Community links")
          )}
        </div>
      );
    }

    // help (default / fallthrough)
    return (
      <div className="rounded-xl border bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-violet-600" />
          <h2 className="font-display text-lg font-bold">Help Center</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Need help with this course? Review recent learner feedback or open
          your account center to contact support.
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#eeeff5] p-4">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* ── Left nav sidebar ── */}
        <aside className="rounded-2xl border bg-[#f7f8fc] p-4 shadow-sm">
          <p className="mb-6 font-display text-xl font-bold">
            <Link
              to="/"
              className="flex items-center gap-2 font-display text-xl font-bold"
            >
              <img src="/logo.png" alt="" className="w-30 h-20" />
            </Link>
          </p>
          <div className="space-y-1 text-sm">
            <p className="rounded-lg px-3 py-2">Home</p>
            <p className="rounded-lg px-3 py-2">Bookmark</p>
            <p className="rounded-lg bg-violet-600 px-3 py-2 font-semibold text-white">
              Courses
            </p>
            <p className="rounded-lg px-3 py-2">Workshop</p>
            <p className="rounded-lg px-3 py-2">Resources</p>
          </div>
          <div className="mt-16 space-y-1 text-sm">
            <p className="flex items-center gap-2 rounded-lg px-3 py-2">
              <Settings className="h-4 w-4" /> Settings
            </p>
            <p className="flex items-center gap-2 rounded-lg px-3 py-2">
              <HelpCircle className="h-4 w-4" /> Help Center
            </p>
            <p className="flex items-center gap-2 rounded-lg px-3 py-2">
              <User className="h-4 w-4" /> My Account
            </p>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          {/* Top bar */}
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-slate-100 p-3">
            <div>
              <p className="text-sm font-semibold">
                👋 Welcome back, {firstName}!
              </p>
              <p className="text-xs text-muted-foreground">
                Boost your skill to shine in your life.
              </p>
            </div>
            {/* FIX 4: Removed the duplicate static "Search Courses" box;
                kept only the functional lesson-search input */}
            <label className="ml-auto flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              <input
                className="w-40 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                placeholder="Search lessons"
                value={sidebarSearch}
                onChange={(event) => setSidebarSearch(event.target.value)}
              />
            </label>
            <MessageCircle className="h-4 w-4" />
            <Bell className="h-4 w-4" />
            <Link
              to={`/course/${slug}`}
              className="text-xs text-muted-foreground underline"
            >
              Back
            </Link>
          </div>

          <div className="rounded-xl bg-[#f8f8fc] p-4">
            <p className="mb-3 text-sm font-medium">
              Courses ·{" "}
              <span className="text-muted-foreground">{course.title}</span>
            </p>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
              {/* ── Video + hub panel ── */}
              <div>
                <div className="overflow-hidden rounded-xl bg-black">
                  {activeLecture?.video_url ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <video
                        ref={videoRef}
                        key={activeLecture.id}
                        src={activeLecture.video_url}
                        controls
                        autoPlay
                        controlsList="nodownload noremoteplayback"
                        disablePictureInPicture
                        onContextMenu={(e) => e.preventDefault()}
                        className={`aspect-video w-full object-cover select-none ${
                          recordingBlocked ? "invisible" : ""
                        }`}
                        onEnded={handleVideoEnded}
                        onPause={handlePause}
                      />
                      {recordingBlocked && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/95 text-center p-6">
                          <Lock className="h-10 w-10 text-destructive" />
                          <h3 className="font-display text-lg font-semibold text-foreground">
                            Playback paused
                          </h3>
                          <p className="text-sm text-muted-foreground max-w-sm">
                            {blockReason}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex aspect-video items-center justify-center text-white">
                      <PlayCircle className="mr-2 h-5 w-5" /> No video
                      available
                    </div>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                  <Volume2 className="h-4 w-4" />
                  <Captions className="h-4 w-4" />
                  <Cog className="h-4 w-4" />
                </div>

                {/* FIX 5: Removed the duplicate hardcoded static Enroll/Favourite
                    buttons that appeared after the real conditional ones */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Advance</Badge>
                  <Badge variant="secondary">Live Class</Badge>
                  <Badge variant="secondary">2k Class</Badge>
                  <Button
                    className="ml-auto"
                    size="sm"
                    onClick={() => {
                      if (hasAccess) {
                        toast.success(
                          "You already have access to this course"
                        );
                        return;
                      }
                      logPurchaseAttempt(activeLectureId || undefined);
                      setBuyDialogOpen(true);
                    }}
                  >
                    {hasAccess ? "Enrolled" : "Enroll Now"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={wishlistMutation.isPending}
                    onClick={() => wishlistMutation.mutate()}
                  >
                    <Heart
                      className={`mr-1 h-4 w-4 ${
                        wishlistItem ? "fill-current text-rose-500" : ""
                      }`}
                    />
                    {wishlistItem ? "Favourited" : "Add to Favourite"}
                  </Button>
                </div>

                <h1 className="mt-3 font-display text-3xl font-bold">
                  {course.title}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {course.description ||
                    "This comprehensive course covers practical testing and UX law concepts with real-world examples."}
                </p>

                {/* FIX 6: Instructor card was rendering instructorName twice
                    (once from the const and once from the raw cast) — deduplicated */}
                <div className="mt-4 rounded-xl border bg-white p-3">
                  <p className="text-xs text-muted-foreground">Instructor</p>
                  <p className="font-semibold">{instructorName}</p>
                  <div className="mt-1 flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>

                {/* Hub tabs */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {(
                    [
                      ["courses", "Overview"],
                      ["workshops", "Workshops"],
                      ["certifications", "Certifications"],
                      ["resources", "Resources"],
                      ["events", "Events"],
                      ["community", "Community"],
                      ["help", "Help"],
                    ] as const
                  ).map(([tab, label]) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveHubTab(tab)}
                    >
                      <Badge
                        className={
                          activeHubTab === tab
                            ? "bg-violet-600 text-white"
                            : ""
                        }
                        variant={
                          activeHubTab === tab ? "default" : "outline"
                        }
                      >
                        {label}
                      </Badge>
                    </button>
                  ))}
                </div>

                <div className="mt-4">{renderHubPanel()}</div>
                {renderNoteBoard()}
              </div>

              {/* ── Right sidebar (lesson list) ── */}
              <div
                className={`${
                  sidebarOpen ? "block" : "hidden xl:block"
                } rounded-xl border bg-white`}
              >
                {/* FIX 7: Removed the duplicated header block and second
                    ScrollArea opening that broke the JSX tree */}
                <div className="border-b p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      {(
                        [
                          ["videos", "All Videos"],
                          [
                            "resources",
                            `Resources (${resources.length})`,
                          ],
                          ["support", "Support"],
                        ] as const
                      ).map(([tab, label]) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setActiveSidebarTab(tab)}
                        >
                          <Badge
                            className={
                              activeSidebarTab === tab
                                ? "bg-violet-600 text-white"
                                : ""
                            }
                            variant={
                              activeSidebarTab === tab
                                ? "default"
                                : "outline"
                            }
                          >
                            {label}
                          </Badge>
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="xl:hidden"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {completedCount}/{allLectures.length} lessons complete
                  </p>
                  <Progress
                    value={overallProgress}
                    className="mt-2 h-1.5"
                  />
                </div>

                <ScrollArea className="h-[560px]">
                  <div className="p-2">
                    {activeSidebarTab === "videos" &&
                      (visibleSections && visibleSections.length > 0 ? (
                        visibleSections.map((section) => (
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
                                <p className="text-sm font-medium truncate">
                                  {section.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {section.lectures.length} lessons ·{" "}
                                  {formatChapterDuration(
                                    section.lectures.reduce(
                                      (sum, l) => sum + (l.duration || 0),
                                      0
                                    )
                                  )}
                                </p>
                              </div>
                            </button>

                            {expandedSections.has(section.id) && (
                              <div className="ml-2 space-y-0.5">
                                {section.lectures.map((lecture) => {
                                  const completed = isLectureCompleted(
                                    lecture.id
                                  );
                                  const isActive =
                                    lecture.id === activeLectureId;
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
                                        navigateToLecture(lecture.id);
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
                                      <span className="flex-1 truncate">
                                        {lecture.title}
                                      </span>
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
                        ))
                      ) : (
                        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                          No lessons match your search.
                        </div>
                      ))}

                    {activeSidebarTab === "resources" && (
                      <div className="space-y-2">
                        {!canAccessResources && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                            <div className="mb-1 flex items-center gap-2 font-medium">
                              <Lock className="h-4 w-4" /> Resources locked
                            </div>
                            Purchase the course to download worksheets,
                            PDFs, and lecture files.
                          </div>
                        )}
                        {resourcesLoading ? (
                          <div className="p-6 text-center text-sm text-muted-foreground">
                            Loading resources...
                          </div>
                        ) : visibleResources.length > 0 ? (
                          visibleResources.map((resource) => {
                            const lecture = resource.lecture_id
                              ? allLectures.find(
                                  (item) =>
                                    item.id === resource.lecture_id
                                )
                              : null;
                            const size = formatFileSize(resource.file_size);
                            return (
                              <a
                                key={`${resource.source}-${resource.id}`}
                                href={resource.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-start gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-secondary/50"
                              >
                                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-medium">
                                    {resource.title}
                                  </span>
                                  <span className="block text-xs text-muted-foreground">
                                    {lecture?.title || "Course resource"}
                                    {resource.file_type
                                      ? ` · ${resource.file_type}`
                                      : ""}
                                    {size ? ` · ${size}` : ""}
                                  </span>
                                </span>
                                <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                              </a>
                            );
                          })
                        ) : (
                          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                            {canAccessResources
                              ? "No resources have been added for this course yet."
                              : "No preview resources are available."}
                          </div>
                        )}
                      </div>
                    )}

                    {activeSidebarTab === "support" && (
                      <div className="space-y-3 text-sm">
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">
                            Instructor support
                          </p>
                          <p className="font-semibold">{instructorName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Ask course questions through your account
                            dashboard or continue reviewing the lesson list.
                          </p>
                          <Button
                            className="mt-3 w-full"
                            size="sm"
                            variant="outline"
                            onClick={() => navigate("/profile")}
                          >
                            <MessageCircle className="mr-2 h-4 w-4" /> Open
                            account center
                          </Button>
                        </div>
                        <div className="rounded-lg border p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="font-semibold">Course feedback</p>
                            {averageRating && (
                              <Badge variant="secondary">
                                {averageRating}/5
                              </Badge>
                            )}
                          </div>
                          {reviews.length > 0 ? (
                            <div className="space-y-3">
                              {reviews.map((review) => (
                                <div
                                  key={review.id}
                                  className="border-t pt-2 first:border-t-0 first:pt-0"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate font-medium">
                                      {review.profiles?.full_name ||
                                        "Learner"}
                                    </span>
                                    <span className="flex items-center gap-1 text-amber-500">
                                      <Star className="h-3.5 w-3.5 fill-current" />{" "}
                                      {review.rating}
                                    </span>
                                  </div>
                                  {review.comment && (
                                    <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                                      {review.comment}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              No learner reviews yet.
                            </p>
                          )}
                        </div>
                        <div className="rounded-lg border p-3 text-xs text-muted-foreground">
                          <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                            <Clock className="h-4 w-4" /> Progress help
                          </div>
                          Your video position is saved every 10 seconds
                          while playing and whenever you pause.
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Bottom nav bar */}
            <div className="mt-4 flex items-center justify-between border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                disabled={activeIndex <= 0}
                onClick={() => navigateLecture("prev")}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <div className="text-center">
                <p className="text-sm font-medium">{activeLecture?.title}</p>
                <p className="text-xs text-muted-foreground">
                  {activeSection?.title || "Section"} · Lecture{" "}
                  {activeIndex + 1} of {allLectures.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {overallProgress === 100 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs gap-1 text-[hsl(var(--success))]"
                    onClick={() =>
                      generateCertificate({
                        studentName:
                          profile?.full_name ||
                          user?.email ||
                          "Student",
                        courseName: course.title,
                        instructorName,
                        completionDate: new Date(),
                      })
                    }
                  >
                    <Award className="h-4 w-4" /> Certificate
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="xl:hidden"
                  onClick={() => setSidebarOpen((v) => !v)}
                >
                  {sidebarOpen ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Menu className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={activeIndex >= allLectures.length - 1}
                  onClick={() => navigateLecture("next")}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Buy/unlock dialog ── */}
      <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" /> Unlock the full
              course
            </DialogTitle>
            <DialogDescription>
              This lecture is locked. Purchase the course to unlock all
              chapters, lectures, and downloadable resources.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="font-display text-2xl font-bold">
              {course.price === 0
                ? "Free"
                : `$${Number(course.price).toFixed(2)}`}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBuyDialogOpen(false)}
            >
              Cancel
            </Button>
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

      {/* ── Chapter quiz dialog ── */}
      {quizSectionId && course && user && (
        <ChapterQuizDialog
          open={!!quizSectionId}
          onOpenChange={(o) => {
            if (!o) setQuizSectionId(null);
          }}
          sectionId={quizSectionId}
          sectionTitle={
            sections?.find((s) => s.id === quizSectionId)?.title ||
            "Chapter"
          }
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