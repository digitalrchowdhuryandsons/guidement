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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  PlayCircle,
  Menu,
  X,
  Send,
  Sparkles,
  Lock,
  ChevronDown,
  ChevronUp,
  Award,
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
  Radio,
  Video,
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
  host_name?: string | null;
  agenda?: string[] | null;
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
  whatsapp_url?: string | null;
  faq?: { question: string; answer: string }[] | null;
}

interface CourseCommunityMessage {
  id: string;
  message: string;
  created_at: string;
  user_id: string;
  profiles?: { full_name: string | null; avatar_url?: string | null } | null;
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
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiChatPrompt, setAiChatPrompt] = useState("");
  const [lessonDrawerOpen, setLessonDrawerOpen] = useState(false);
  const [notesCollapsed, setNotesCollapsed] = useState(false);
  const [communityMessage, setCommunityMessage] = useState("");

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
          "id,title,description,starts_at,ends_at,meeting_url,recording_url,status,host_name,agenda"
        )
        .eq("course_id", course!.id)
        .eq("is_active", true)
        .order("starts_at", { ascending: true })
        .order("position");
      if (error) throw error;
      const signedWorkshops = await Promise.all(
        (data || []).map(async (workshop) => {
          if (!workshop.recording_url || /^https?:\/\//i.test(workshop.recording_url)) return workshop;
          const { data: signed } = await supabase.storage
            .from("course-materials")
            .createSignedUrl(workshop.recording_url, 60 * 60);
          return { ...workshop, recording_url: signed?.signedUrl || workshop.recording_url };
        })
      );
      return signedWorkshops as CourseWorkshop[];
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
        .select("id,title,description,platform,community_url,whatsapp_url,faq")
        .eq("course_id", course!.id)
        .eq("is_active", true)
        .order("position");
      if (error) throw error;
      return (data || []) as CourseCommunity[];
    },
    enabled: canFetchPremiumHubData,
  });



  const { data: communityMessages = [] } = useQuery({
    queryKey: ["player-course-community-messages", course?.id, user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("course_community_messages")
        .select("id,message,created_at,user_id,profiles!course_community_messages_user_id_fkey(full_name,avatar_url)")
        .eq("course_id", course!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data || []) as CourseCommunityMessage[];
    },
    enabled: canFetchPremiumHubData,
  });

  const sendCommunityMessageMutation = useMutation({
    mutationFn: async () => {
      if (!course || !user || !communityMessage.trim()) return;
      const { error } = await (supabase as any)
        .from("course_community_messages")
        .insert({
          course_id: course.id,
          user_id: user.id,
          message: communityMessage.trim(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setCommunityMessage("");
      queryClient.invalidateQueries({ queryKey: ["player-course-community-messages"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not send message"),
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
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-violet-600" />
              <div>
                <h2 className="font-display text-lg font-bold">Live Zoom workshops & recordings</h2>
                <p className="text-sm text-muted-foreground">Join the Zoom session shared by the admin or replay uploaded workshop recordings.</p>
              </div>
            </div>
            <Badge variant="secondary">{courseWorkshops.length} sessions</Badge>
          </div>
          {courseWorkshops.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {courseWorkshops.map((workshop) => {
                const isLive = workshop.status?.toLowerCase() === "live";
                const isRecorded = !!workshop.recording_url && !workshop.meeting_url;
                return (
                  <div key={workshop.id} className="rounded-2xl border bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Badge className={isLive ? "bg-red-600 text-white" : "bg-violet-600 text-white"}>
                          {isLive ? <Radio className="mr-1 h-3 w-3" /> : <Video className="mr-1 h-3 w-3" />}
                          {isRecorded ? "Recorded" : workshop.status}
                        </Badge>
                        <p className="mt-2 font-semibold">{workshop.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(workshop.starts_at)}
                          {workshop.host_name ? ` · Hosted by ${workshop.host_name}` : ""}
                        </p>
                      </div>
                    </div>
                    {workshop.description && <p className="mt-3 text-sm text-muted-foreground">{workshop.description}</p>}
                    {workshop.agenda && workshop.agenda.length > 0 && (
                      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                        {workshop.agenda.map((item) => (
                          <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-violet-600" />{item}</li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {workshop.meeting_url && <a href={workshop.meeting_url} target="_blank" rel="noreferrer"><Button size="sm">Join Zoom workshop</Button></a>}
                      {workshop.recording_url && <a href={workshop.recording_url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline">Watch recording</Button></a>}
                    </div>
                  </div>
                );
              })}
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
      const faqs = courseCommunities.flatMap((community) => community.faq || []);
      return (
        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-600" />
              <div>
                <h2 className="font-display text-lg font-bold">Course community</h2>
                <p className="text-sm text-muted-foreground">Use the in-app course community for member chat and FAQs, then join the WhatsApp group shared by the admin.</p>
              </div>
            </div>
            {courseCommunities.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {courseCommunities.map((community) => (
                  <div key={community.id} className="rounded-lg border p-3">
                    <p className="font-semibold">{community.title}</p>
                    <p className="text-xs text-muted-foreground">{community.platform || "In-app community"}</p>
                    {community.description && <p className="mt-2 text-sm text-muted-foreground">{community.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {community.community_url && <a href={community.community_url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline">Open in-app community</Button></a>}
                      {community.whatsapp_url && <a href={community.whatsapp_url} target="_blank" rel="noreferrer"><Button size="sm" className="bg-green-600 hover:bg-green-700">Join WhatsApp</Button></a>}
                    </div>
                  </div>
                ))}
              </div>
            ) : emptyHubState("Community links")}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <div className="rounded-xl border bg-white p-4">
              <h3 className="mb-3 font-semibold">Frequently asked questions</h3>
              {faqs.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={`${faq.question}-${index}`} value={`faq-${index}`}>
                      <AccordionTrigger className="text-left text-sm">{faq.question}</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">{faq.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : emptyHubState("FAQs")}
            </div>

            <div className="rounded-xl border bg-white p-4">
              <h3 className="font-semibold">Member chat</h3>
              <p className="text-sm text-muted-foreground">Messages are visible to enrolled learners and the instructor.</p>
              <div className="mt-3 space-y-2">
                <Textarea value={communityMessage} onChange={(event) => setCommunityMessage(event.target.value)} placeholder="Share a question or update with the community..." />
                <Button onClick={() => sendCommunityMessageMutation.mutate()} disabled={!communityMessage.trim() || sendCommunityMessageMutation.isPending}>
                  <Send className="mr-2 h-4 w-4" /> Send message
                </Button>
              </div>
              <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
                {communityMessages.length > 0 ? communityMessages.map((message) => (
                  <div key={message.id} className="rounded-lg border bg-secondary/30 p-3">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{message.profiles?.full_name || (message.user_id === user?.id ? "You" : "Community member")}</span>
                      <span>{formatDateTime(message.created_at)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{message.message}</p>
                  </div>
                )) : emptyHubState("Community messages")}
              </div>
            </div>
          </div>
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
 
  <div className="min-h-[calc(100vh-4rem)] bg-[#eeeff5] dark:bg-[#0f1117] p-2 sm:p-4 transition-colors duration-300">

    {/* ── Top-level grid: stacks vertically on mobile, 2-col on md, 4-col on xl ── */}
    <div className="mx-auto max-w-[1400px]">

      {/* === MOBILE AI CHAT DRAWER (fixed bottom sheet, only on < xl) === */}
      {aiChatOpen && (
        <div className="xl:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t dark:border-white/10 bg-white dark:bg-[#1a1d27] shadow-2xl max-h-[80dvh] flex flex-col">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-border dark:bg-white/20" />
          </div>
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-white shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold">AI Course Assistant</h2>
                  <p className="text-xs text-white/80">Ask about this lesson or your progress.</p>
                </div>
              </div>
              <Button
                variant="ghost" size="icon"
                className="h-8 w-8 rounded-full text-white hover:bg-white/20 hover:text-white shrink-0"
                aria-label="Close AI assistant"
                onClick={() => setAiChatOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-3 p-4 overflow-y-auto">
            <div className="rounded-2xl bg-slate-100 dark:bg-white/5 p-3 text-sm text-slate-700 dark:text-white/80">
              <p className="mb-1 font-semibold text-slate-900 dark:text-white">Hi {firstName}, how can I help?</p>
              <p className="text-xs">Try asking for a summary, a simpler explanation, or what to review next.</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground dark:text-white/40">Suggested</p>
              <div className="flex flex-wrap gap-2">
                {["Summarize this lesson", "Explain the key idea", "What should I revise?"].map((prompt) => (
                  <button
                    key={prompt} type="button"
                    className="rounded-full border border-border dark:border-white/20 bg-white dark:bg-white/5 px-3 py-1.5 text-xs text-slate-700 dark:text-white/70 transition-colors hover:border-primary hover:text-primary active:scale-95"
                    onClick={() => setAiChatPrompt(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="shrink-0 p-3 border-t border-border dark:border-white/10">
            <div className="flex items-center gap-2 rounded-2xl border border-border dark:border-white/10 bg-white dark:bg-white/5 p-2">
              <input
                className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground dark:text-white dark:placeholder:text-white/30"
                placeholder="Ask the AI assistant..."
                value={aiChatPrompt}
                onChange={(e) => setAiChatPrompt(e.target.value)}
              />
              <Button
                size="icon" className="h-9 w-9 rounded-full shrink-0"
                disabled={!aiChatPrompt.trim()}
                onClick={() => toast.info("AI chat is opening soon. Your question is ready.")}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Backdrop for mobile AI drawer */}
      {aiChatOpen && (
        <div
          className="xl:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setAiChatOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* === DESKTOP LAYOUT: flex row at xl === */}
      <div className="flex flex-col xl:flex-row gap-3 sm:gap-4 items-start">

        {/* ── LEFT: Notes panel — hidden on mobile/tablet, sticky on desktop ── */}
        <aside className="hidden xl:flex xl:w-[220px] xl:shrink-0 xl:sticky xl:top-4 w-full rounded-2xl border border-border bg-[#f7f8fc] dark:bg-[#1a1d27] dark:border-white/10 shadow-sm flex-col overflow-hidden">
          <button
            type="button"
            onClick={() => setNotesCollapsed((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-4 py-4 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />
              <span className="font-display text-sm font-bold text-foreground dark:text-white">My Notes</span>
            </div>
            {notesCollapsed
              ? <ChevronDown className="h-4 w-4 text-muted-foreground dark:text-white/50" />
              : <ChevronUp className="h-4 w-4 text-muted-foreground dark:text-white/50" />
            }
          </button>

          {!notesCollapsed && (
            <div className="flex flex-col gap-3 px-4 pb-4">
              <div>
                <p className="text-xs text-muted-foreground dark:text-white/50 mb-1">
                  {activeLecture?.title || "Select a lesson"}
                </p>
                <Badge variant="secondary">{activeLectureNotes.length} notes</Badge>
              </div>
              <Input
                placeholder="Note title"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="text-sm dark:bg-[#252836] dark:border-white/10 dark:text-white dark:placeholder:text-white/30"
              />
              <Textarea
                className="min-h-24 text-sm resize-none dark:bg-[#252836] dark:border-white/10 dark:text-white dark:placeholder:text-white/30"
                placeholder="Key takeaways, timestamps, questions..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
              />
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => saveNoteMutation.mutate()}
                  disabled={saveNoteMutation.isPending || (!noteTitle.trim() && !noteContent.trim())}
                  className="flex-1"
                >
                  {editingNoteId ? "Update" : "Save note"}
                </Button>
                {editingNoteId && (
                  <Button size="sm" variant="outline" onClick={cancelEditingNote}
                    className="dark:border-white/10 dark:text-white dark:hover:bg-white/10">
                    Cancel
                  </Button>
                )}
              </div>
              <ScrollArea className="max-h-64">
                <div className="space-y-2 pr-1">
                  {activeLectureNotes.length > 0 ? (
                    activeLectureNotes.map((note) => (
                      <div key={note.id} className="rounded-lg border border-border dark:border-white/10 bg-white dark:bg-[#252836] p-2.5 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold truncate dark:text-white">{note.title}</p>
                            <p className="text-muted-foreground dark:text-white/40">
                              {new Date(note.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10" onClick={() => startEditingNote(note)}>
                              <FileText className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive dark:text-red-400 dark:hover:bg-red-400/10" onClick={() => deleteNoteMutation.mutate(note.id)} disabled={deleteNoteMutation.isPending}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {note.content && (
                          <p className="mt-1.5 text-muted-foreground dark:text-white/50 line-clamp-3 whitespace-pre-wrap">{note.content}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-border dark:border-white/20 p-3 text-center text-xs text-muted-foreground dark:text-white/40">
                      No notes for this lesson yet.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </aside>

        {/* ── AI CHAT sidebar — desktop only (xl+), full panel ── */}
        {aiChatOpen && (
          <aside className="hidden xl:flex xl:w-[300px] xl:shrink-0 xl:sticky xl:top-4 overflow-hidden rounded-2xl border dark:border-white/10 bg-white dark:bg-[#1a1d27] shadow-sm flex-col">
            <div className="flex flex-col min-h-[520px]">
              <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 shrink-0">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-bold">AI Course Assistant</h2>
                      <p className="text-xs text-white/80">Ask about this lesson or your progress.</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 rounded-full text-white hover:bg-white/20 hover:text-white shrink-0"
                    aria-label="Close AI assistant"
                    onClick={() => setAiChatOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-4 p-5">
                <div className="rounded-2xl bg-slate-100 dark:bg-white/5 p-4 text-sm text-slate-700 dark:text-white/80">
                  <p className="mb-2 font-semibold text-slate-900 dark:text-white">Hi {firstName}, how can I help?</p>
                  <p>Try asking for a summary of the current lecture, a simpler explanation, or what to review next.</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground dark:text-white/40">Suggested prompts</p>
                  <div className="flex flex-wrap gap-2">
                    {["Summarize this lesson", "Explain the key idea", "What should I revise?"].map((prompt) => (
                      <button
                        key={prompt} type="button"
                        className="rounded-full border border-border dark:border-white/20 bg-white dark:bg-white/5 px-3 py-1.5 text-xs text-slate-700 dark:text-white/70 transition-colors hover:border-primary hover:text-primary"
                        onClick={() => setAiChatPrompt(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-auto flex items-center gap-2 rounded-2xl border border-border dark:border-white/10 bg-white dark:bg-white/5 p-2">
                  <input
                    className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground dark:text-white dark:placeholder:text-white/30"
                    placeholder="Ask the AI assistant..."
                    value={aiChatPrompt}
                    onChange={(e) => setAiChatPrompt(e.target.value)}
                  />
                  <Button
                    size="icon" className="h-9 w-9 rounded-full shrink-0"
                    disabled={!aiChatPrompt.trim()}
                    onClick={() => toast.info("AI chat is opening soon. Your question is ready.")}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* ── MAIN CONTENT ── */}
        <div className="w-full min-w-0 rounded-2xl border border-border dark:border-white/10 bg-white dark:bg-[#1a1d27] p-3 sm:p-4 shadow-sm flex-1">

          {/* Top bar */}
          <div className="mb-3 sm:mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-slate-100 dark:bg-white/5 p-2 sm:p-3">
            <div className="min-w-0 flex-1 sm:flex-none">
              <p className="text-sm font-semibold dark:text-white truncate">👋 Welcome back, {firstName}!</p>
              <p className="text-xs text-muted-foreground dark:text-white/50 hidden sm:block">Boost your skill to shine in your life.</p>
            </div>
            {/* Search — collapses to icon-only on xs */}
            <label className="flex items-center gap-2 rounded-lg border border-border dark:border-white/10 bg-white dark:bg-white/5 px-2 sm:px-3 py-1.5 sm:py-2 text-sm text-muted-foreground dark:text-white/50 ml-auto sm:ml-0">
              <Search className="h-4 w-4 shrink-0" />
              <input
                className="w-0 sm:w-28 md:w-40 bg-transparent text-foreground dark:text-white outline-none placeholder:text-muted-foreground dark:placeholder:text-white/30 text-xs sm:text-sm transition-all duration-200 focus:w-32 sm:focus:w-40"
                placeholder="Search lessons"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
              />
            </label>
            {/* AI toggle */}
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 rounded-full text-slate-700 dark:text-white/70 hover:bg-white dark:hover:bg-white/10 hover:text-primary shrink-0"
              aria-label="Toggle AI chat assistant"
              aria-expanded={aiChatOpen}
              onClick={() => setAiChatOpen((open) => !open)}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            <Bell className="h-4 w-4 shrink-0 text-muted-foreground dark:text-white/50" />
            <Link to={`/course/${slug}`} className="text-xs text-muted-foreground dark:text-white/50 underline underline-offset-2 shrink-0">Back</Link>
          </div>

          <div className="rounded-xl bg-[#f8f8fc] dark:bg-white/[0.03] p-2.5 sm:p-4">
            <p className="mb-2 sm:mb-3 text-xs sm:text-sm font-medium dark:text-white/80 truncate">
              Courses · <span className="text-muted-foreground dark:text-white/40">{course.title}</span>
            </p>

            {/* Video */}
            <div className="overflow-hidden rounded-xl bg-black">
              {activeLecture?.video_url ? (
                <div className="relative w-full flex items-center justify-center">
                  <video
                    ref={videoRef}
                    key={activeLecture.id}
                    src={activeLecture.video_url}
                    controls autoPlay
                    controlsList="nodownload noremoteplayback"
                    disablePictureInPicture
                    onContextMenu={(e) => e.preventDefault()}
                    className={`aspect-video w-full object-cover select-none ${recordingBlocked ? "invisible" : ""}`}
                    onEnded={handleVideoEnded}
                    onPause={handlePause}
                  />
                  {recordingBlocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/95 dark:bg-black/90 text-center p-4 sm:p-6">
                      <Lock className="h-8 w-8 sm:h-10 sm:w-10 text-destructive" />
                      <h3 className="font-display text-base sm:text-lg font-semibold text-foreground dark:text-white">Playback paused</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground dark:text-white/60 max-w-xs sm:max-w-sm">{blockReason}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center text-white text-sm">
                  <PlayCircle className="mr-2 h-5 w-5" /> No video available
                </div>
              )}
            </div>

            {/* Video controls row */}
            <div className="mt-2 flex items-center gap-3 text-muted-foreground dark:text-white/40">
              <Volume2 className="h-4 w-4" />
              <Captions className="h-4 w-4" />
              <Cog className="h-4 w-4" />
            </div>

            {/* Badges + actions */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Advance</Badge>
              <Badge variant="secondary">Live Class</Badge>
              <Badge variant="secondary" className="hidden sm:inline-flex">2k Class</Badge>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (hasAccess) { toast.success("You already have access to this course"); return; }
                    logPurchaseAttempt(activeLectureId || undefined);
                    setBuyDialogOpen(true);
                  }}
                >
                  {hasAccess ? "Enrolled" : "Enroll Now"}
                </Button>
                <Button
                  variant="outline" size="sm"
                  disabled={wishlistMutation.isPending}
                  onClick={() => wishlistMutation.mutate()}
                  className="dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                >
                  <Heart className={`h-4 w-4 ${wishlistItem ? "fill-current text-rose-500" : ""} sm:mr-1`} />
                  <span className="hidden sm:inline">{wishlistItem ? "Favourited" : "Add to Favourite"}</span>
                </Button>
              </div>
            </div>

            {/* Title + description */}
            <h1 className="mt-3 font-display text-lg sm:text-2xl lg:text-3xl font-bold dark:text-white leading-tight">{course.title}</h1>
            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted-foreground dark:text-white/50 line-clamp-3 sm:line-clamp-none">
              {course.description || "This comprehensive course covers practical testing and UX law concepts with real-world examples."}
            </p>

            {/* Instructor card */}
            <div className="mt-3 sm:mt-4 rounded-xl border border-border dark:border-white/10 bg-white dark:bg-white/5 p-3">
              <p className="text-xs text-muted-foreground dark:text-white/40">Instructor</p>
              <p className="font-semibold dark:text-white">{instructorName}</p>
              <div className="mt-1 flex items-center gap-0.5 text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (<Star key={i} className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />))}
              </div>
            </div>

            {/* Hub tabs — horizontally scrollable on mobile */}
            <div className="mt-3 sm:mt-4 -mx-1 px-1 overflow-x-auto scrollbar-none">
              <div className="flex gap-2 min-w-max sm:flex-wrap sm:min-w-0">
                {(
                  [
                    ["courses", "Overview"], ["workshops", "Workshops"], ["certifications", "Certifications"],
                    ["resources", "Resources"], ["events", "Events"], ["community", "Community"], ["help", "Help"],
                  ] as const
                ).map(([tab, label]) => (
                  <button key={tab} type="button" onClick={() => setActiveHubTab(tab)}>
                    <Badge
                      className={`whitespace-nowrap cursor-pointer ${activeHubTab === tab ? "bg-violet-600 text-white dark:bg-violet-500" : "dark:border-white/20 dark:text-white/60 dark:hover:border-white/40"}`}
                      variant={activeHubTab === tab ? "default" : "outline"}
                    >
                      {label}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 sm:mt-4">{renderHubPanel()}</div>

            {/* Bottom nav */}
            <div className="mt-3 sm:mt-4 flex items-center justify-between border-t border-border dark:border-white/10 pt-3 gap-2">
              <Button
                variant="ghost" size="sm"
                disabled={activeIndex <= 0}
                onClick={() => navigateLecture("prev")}
                className="dark:text-white/70 dark:hover:text-white dark:hover:bg-white/10 shrink-0"
              >
                <ChevronLeft className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <div className="text-center min-w-0 flex-1 px-2">
                <p className="text-xs sm:text-sm font-medium dark:text-white truncate">{activeLecture?.title}</p>
                <p className="text-xs text-muted-foreground dark:text-white/40">
                  <span className="hidden md:inline">{activeSection?.title || "Section"} · </span>
                  Lecture {activeIndex + 1} of {allLectures.length}
                </p>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {overallProgress === 100 && (
                  <Button
                    size="sm" variant="ghost"
                    className="text-xs gap-1 text-[hsl(var(--success))] dark:hover:bg-white/10 px-2 sm:px-3"
                    onClick={() => generateCertificate({ studentName: profile?.full_name || user?.email || "Student", courseName: course.title, instructorName, completionDate: new Date() })}
                  >
                    <Award className="h-4 w-4" />
                    <span className="hidden sm:inline">Certificate</span>
                  </Button>
                )}
                <Button
                  variant="ghost" size="sm"
                  disabled={activeIndex >= allLectures.length - 1}
                  onClick={() => navigateLecture("next")}
                  className="dark:text-white/70 dark:hover:text-white dark:hover:bg-white/10 shrink-0"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4 sm:ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Lesson sidebar ── */}
        <aside className="w-full xl:w-[360px] xl:shrink-0 xl:sticky xl:top-4 rounded-2xl border border-border dark:border-white/10 bg-white dark:bg-[#1a1d27] shadow-sm flex flex-col">
          <div className="p-2.5 sm:p-3">
            <button
              type="button"
              onClick={() => setLessonDrawerOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 rounded-lg border border-border dark:border-white/10 px-3 py-2.5 text-sm font-medium hover:bg-secondary/50 dark:hover:bg-white/5 transition-colors dark:text-white"
            >
              <div className="flex items-center gap-2 min-w-0">
                <PlayCircle className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />
                <span>Lessons</span>
                <Badge variant="secondary" className="text-xs shrink-0">{completedCount}/{allLectures.length}</Badge>
              </div>
              {lessonDrawerOpen
                ? <ChevronUp className="h-4 w-4 text-muted-foreground dark:text-white/40 shrink-0" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground dark:text-white/40 shrink-0" />
              }
            </button>

            {lessonDrawerOpen && (
              <div className="mt-2 rounded-lg border border-border dark:border-white/10 bg-white dark:bg-[#1e2130] shadow-lg overflow-hidden">
                {/* Sidebar sub-tabs */}
                <div className="border-b border-border dark:border-white/10 p-2 flex items-center gap-1 overflow-x-auto scrollbar-none">
                  {(
                    [
                      ["videos", "Videos"],
                      ["resources", `Resources (${resources.length})`],
                      ["support", "Support"],
                    ] as const
                  ).map(([tab, label]) => (
                    <button key={tab} type="button" onClick={() => setActiveSidebarTab(tab)} className="shrink-0">
                      <Badge
                        className={`whitespace-nowrap cursor-pointer ${activeSidebarTab === tab ? "bg-violet-600 text-white dark:bg-violet-500" : "dark:border-white/20 dark:text-white/60"}`}
                        variant={activeSidebarTab === tab ? "default" : "outline"}
                      >
                        {label}
                      </Badge>
                    </button>
                  ))}
                </div>

                <div className="px-2 pt-1.5">
                  <p className="text-xs text-muted-foreground dark:text-white/40">{completedCount}/{allLectures.length} lessons complete</p>
                  <Progress value={overallProgress} className="mt-1 h-1" />
                </div>

                <ScrollArea className="h-64 sm:h-72">
                  <div className="p-2">
                    {activeSidebarTab === "videos" &&
                      (visibleSections && visibleSections.length > 0 ? (
                        visibleSections.map((section) => (
                          <div key={section.id} className="mb-1">
                            <button
                              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 dark:hover:bg-white/5 transition-colors text-left"
                              onClick={() => toggleSection(section.id)}
                            >
                              {expandedSections.has(section.id)
                                ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground dark:text-white/40" />
                                : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground dark:text-white/40" />
                              }
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate dark:text-white">{section.title}</p>
                                <p className="text-xs text-muted-foreground dark:text-white/40">
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
                                          ? "bg-primary/10 text-primary dark:bg-violet-500/20 dark:text-violet-400"
                                          : "hover:bg-secondary/50 dark:hover:bg-white/5 text-foreground dark:text-white/80"
                                      } ${locked ? "opacity-70" : ""}`}
                                      onClick={() => {
                                        if (locked) { logPurchaseAttempt(lecture.id); setBuyDialogOpen(true); return; }
                                        navigateToLecture(lecture.id);
                                      }}
                                    >
                                      {locked ? (
                                        <Lock className="h-4 w-4 shrink-0 text-muted-foreground dark:text-white/30" />
                                      ) : completed ? (
                                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[hsl(var(--success))]" />
                                      ) : isActive ? (
                                        <PlayCircle className="h-4 w-4 shrink-0 text-primary dark:text-violet-400" />
                                      ) : (
                                        <Circle className="h-4 w-4 shrink-0 text-muted-foreground dark:text-white/30" />
                                      )}
                                      <span className="flex-1 truncate">{lecture.title}</span>
                                      {lecture.duration && (
                                        <span className="text-xs text-muted-foreground dark:text-white/30 shrink-0">{formatDuration(lecture.duration)}</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg border border-dashed border-border dark:border-white/20 p-6 text-center text-sm text-muted-foreground dark:text-white/40">
                          No lessons match your search.
                        </div>
                      ))}

                    {activeSidebarTab === "resources" && (
                      <div className="space-y-2">
                        {!canAccessResources && (
                          <div className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-300">
                            <div className="mb-1 flex items-center gap-2 font-medium">
                              <Lock className="h-4 w-4" /> Resources locked
                            </div>
                            Purchase the course to download worksheets, PDFs, and lecture files.
                          </div>
                        )}
                        {resourcesLoading ? (
                          <div className="p-6 text-center text-sm text-muted-foreground dark:text-white/40">Loading resources...</div>
                        ) : visibleResources.length > 0 ? (
                          visibleResources.map((resource) => {
                            const lecture = resource.lecture_id ? allLectures.find((item) => item.id === resource.lecture_id) : null;
                            const size = formatFileSize(resource.file_size);
                            return (
                              <a
                                key={`${resource.source}-${resource.id}`}
                                href={resource.file_url}
                                target="_blank" rel="noreferrer"
                                className="flex items-start gap-3 rounded-lg border border-border dark:border-white/10 p-3 text-sm transition-colors hover:bg-secondary/50 dark:hover:bg-white/5 active:scale-[0.99]"
                              >
                                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-medium dark:text-white">{resource.title}</span>
                                  <span className="block text-xs text-muted-foreground dark:text-white/40">
                                    {lecture?.title || "Course resource"}
                                    {resource.file_type ? ` · ${resource.file_type}` : ""}
                                    {size ? ` · ${size}` : ""}
                                  </span>
                                </span>
                                <Download className="h-4 w-4 shrink-0 text-muted-foreground dark:text-white/30" />
                              </a>
                            );
                          })
                        ) : (
                          <div className="rounded-lg border border-dashed border-border dark:border-white/20 p-6 text-center text-sm text-muted-foreground dark:text-white/40">
                            {canAccessResources ? "No resources have been added for this course yet." : "No preview resources are available."}
                          </div>
                        )}
                      </div>
                    )}

                    {activeSidebarTab === "support" && (
                      <div className="space-y-3 text-sm">
                        <div className="rounded-lg border border-border dark:border-white/10 p-3">
                          <p className="text-xs text-muted-foreground dark:text-white/40">Instructor support</p>
                          <p className="font-semibold dark:text-white">{instructorName}</p>
                          <p className="mt-1 text-xs text-muted-foreground dark:text-white/50">
                            Ask course questions through your account dashboard or continue reviewing the lesson list.
                          </p>
                          <Button className="mt-3 w-full dark:border-white/10 dark:text-white dark:hover:bg-white/10" size="sm" variant="outline" onClick={() => navigate("/profile")}>
                            <MessageCircle className="mr-2 h-4 w-4" /> Open account center
                          </Button>
                        </div>
                        <div className="rounded-lg border border-border dark:border-white/10 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="font-semibold dark:text-white">Course feedback</p>
                            {averageRating && <Badge variant="secondary">{averageRating}/5</Badge>}
                          </div>
                          {reviews.length > 0 ? (
                            <div className="space-y-3">
                              {reviews.map((review) => (
                                <div key={review.id} className="border-t border-border dark:border-white/10 pt-2 first:border-t-0 first:pt-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate font-medium dark:text-white">{review.profiles?.full_name || "Learner"}</span>
                                    <span className="flex items-center gap-1 text-amber-500 shrink-0">
                                      <Star className="h-3.5 w-3.5 fill-current" /> {review.rating}
                                    </span>
                                  </div>
                                  {review.comment && (
                                    <p className="mt-1 line-clamp-3 text-xs text-muted-foreground dark:text-white/50">{review.comment}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground dark:text-white/40">No learner reviews yet.</p>
                          )}
                        </div>
                        <div className="rounded-lg border border-border dark:border-white/10 p-3 text-xs text-muted-foreground dark:text-white/40">
                          <div className="mb-1 flex items-center gap-2 font-medium text-foreground dark:text-white">
                            <Clock className="h-4 w-4" /> Progress help
                          </div>
                          Your video position is saved every 10 seconds while playing and whenever you pause.
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Mobile Notes accordion — visible only below xl */}
          <div className="xl:hidden border-t border-border dark:border-white/10">
            <button
              type="button"
              onClick={() => setNotesCollapsed((v) => !v)}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />
                <span className="font-display text-sm font-bold text-foreground dark:text-white">My Notes</span>
                <Badge variant="secondary" className="text-xs">{activeLectureNotes.length}</Badge>
              </div>
              {notesCollapsed
                ? <ChevronDown className="h-4 w-4 text-muted-foreground dark:text-white/50" />
                : <ChevronUp className="h-4 w-4 text-muted-foreground dark:text-white/50" />
              }
            </button>
            {!notesCollapsed && (
              <div className="flex flex-col gap-3 px-4 pb-4">
                <p className="text-xs text-muted-foreground dark:text-white/50">
                  {activeLecture?.title || "Select a lesson"}
                </p>
                <Input
                  placeholder="Note title"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="text-sm dark:bg-[#252836] dark:border-white/10 dark:text-white dark:placeholder:text-white/30"
                />
                <Textarea
                  className="min-h-20 text-sm resize-none dark:bg-[#252836] dark:border-white/10 dark:text-white dark:placeholder:text-white/30"
                  placeholder="Key takeaways, timestamps, questions..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => saveNoteMutation.mutate()}
                    disabled={saveNoteMutation.isPending || (!noteTitle.trim() && !noteContent.trim())}
                    className="flex-1"
                  >
                    {editingNoteId ? "Update" : "Save note"}
                  </Button>
                  {editingNoteId && (
                    <Button size="sm" variant="outline" onClick={cancelEditingNote}
                      className="dark:border-white/10 dark:text-white dark:hover:bg-white/10">
                      Cancel
                    </Button>
                  )}
                </div>
                <ScrollArea className="max-h-48">
                  <div className="space-y-2 pr-1">
                    {activeLectureNotes.length > 0 ? (
                      activeLectureNotes.map((note) => (
                        <div key={note.id} className="rounded-lg border border-border dark:border-white/10 bg-white dark:bg-[#252836] p-2.5 text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold truncate dark:text-white">{note.title}</p>
                              <p className="text-muted-foreground dark:text-white/40">
                                {new Date(note.updated_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10" onClick={() => startEditingNote(note)}>
                                <FileText className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive dark:text-red-400 dark:hover:bg-red-400/10" onClick={() => deleteNoteMutation.mutate(note.id)} disabled={deleteNoteMutation.isPending}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {note.content && (
                            <p className="mt-1.5 text-muted-foreground dark:text-white/50 line-clamp-3 whitespace-pre-wrap">{note.content}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-border dark:border-white/20 p-3 text-center text-xs text-muted-foreground dark:text-white/40">
                        No notes for this lesson yet.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Bottom utility links */}
          <div className="border-t border-border dark:border-white/10 p-2.5 sm:p-3 space-y-0.5 text-sm mt-auto">
            <p className="flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-secondary/50 dark:hover:bg-white/5 transition-colors cursor-pointer dark:text-white/70 dark:hover:text-white">
              <Settings className="h-4 w-4 shrink-0" /> Settings
            </p>
            <p className="flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-secondary/50 dark:hover:bg-white/5 transition-colors cursor-pointer dark:text-white/70 dark:hover:text-white">
              <HelpCircle className="h-4 w-4 shrink-0" /> Help Center
            </p>
            <p className="flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-secondary/50 dark:hover:bg-white/5 transition-colors cursor-pointer dark:text-white/70 dark:hover:text-white">
              <User className="h-4 w-4 shrink-0" /> My Account
            </p>
          </div>
        </aside>

      </div>{/* end flex row */}
    </div>{/* end max-w container */}

    {/* ── Buy/unlock dialog ── */}
    <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
      <DialogContent className="dark:bg-[#1a1d27] dark:border-white/10 max-w-sm mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 dark:text-white">
            <Lock className="h-5 w-5 text-primary" /> Unlock the full course
          </DialogTitle>
          <DialogDescription className="dark:text-white/50">
            This lecture is locked. Purchase the course to unlock all chapters, lectures, and downloadable resources.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <p className="font-display text-2xl font-bold dark:text-white">
            {course.price === 0 ? "Free" : `$${Number(course.price).toFixed(2)}`}
          </p>
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setBuyDialogOpen(false)} className="dark:border-white/10 dark:text-white dark:hover:bg-white/10 w-full sm:w-auto">
            Cancel
          </Button>
          <Link to={`/course/${slug}`} className="w-full sm:w-auto">
            <Button className="gradient-primary text-primary-foreground w-full" onClick={() => toast.info("Redirecting to course page")}>
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