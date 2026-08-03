import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Search,
  Bell,
  Settings,
  Plus,
  BookOpen,
  CheckCircle,
  XCircle,
  GraduationCap,
  Clock,
  LayoutDashboard,
  Users2,
  CreditCard,
  ClapperboardIcon,
  Image,
  Award,
  Megaphone,
  BarChart3,
  MessagesSquare,
} from "lucide-react";
import { toast } from "sonner";
import AdminSidebar, { NavGroup } from "./AdminSidebar";
import PurchaseAttemptsPanel from "@/components/admin/PurchaseAttemptsPanel";
import PaymentRetriesPanel from "@/components/admin/PaymentRetriesPanel";
import CoursePlayerHubAdminPanel from "@/components/admin/CoursePlayerHubAdminPanel";
import CoursesManagement from "@/components/admin/CoursesManagement";
import UsersManagement from "@/components/admin/UsersManagement";
import SiteContentEditor from "@/components/admin/SiteContentEditor";
import CouponsManagement from "@/components/admin/CouponsManagement";
import CouponRedemptions from "@/components/admin/CouponRedemptions";
import RevenueAnalyticsPanel from "@/components/admin/ReveneuAnalyticsPanel";
import StudentProgressPanel from "@/components/admin/StudentProgressPanel";
import AffiliatesManagement from "@/components/admin/AffiliatesManagement";
import ReferralLogsPanel from "@/components/admin/ReferralLogsPanel";
import PayoutQueuePanel from "@/components/admin/PayoutQueuePanel";
import FraudCenterPanel from "@/components/admin/FraudCenterPanel";
import CampaignManagerPanel from "@/components/admin/CampaignManagerPanel";
import PricingTiersManagement from "@/components/admin/PricingTiersManagement";
import QuizBuilderPanel from "@/components/admin/QuizBuilderPanel";
import CertificateIssuancePanel from "@/components/admin/CertificateIssuancePanel";
import CommunityManagementPanel from "@/components/admin/CommunityManagementPanel";
import MediaLibraryPanel from "@/components/admin/MediaLibraryPanel";
import CourseLandingPageEditor from "@/components/admin/CourseLandingPageEditor";
import CampaignPerformancePanel from "@/components/admin/CampaignPerformancePanel";
import CourseDropoffPanel from "@/components/admin/CourseDropoffPanel";
import BrandingSettingsPanel from "@/components/admin/BrandingSettingsPanel";
import IntegrationsStatusPanel from "@/components/admin/IntegrationsStatusPanel";

type PendingCourse = { id: string; title: string; profiles?: { full_name?: string | null } | null };
type InstructorApplication = { id: string; user_id: string; status: string; created_at: string; expertise?: string | null; experience?: string | null; bio?: string | null; profiles?: { full_name?: string | null } | null };

export default function AdminDashboard() {
  const { user, loading, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [courses, purchases, profiles] = await Promise.all([
        supabase.from("courses").select("id, is_approved, is_published", { count: "exact" }),
        supabase.from("purchases").select("amount").eq("status", "completed"),
        supabase.from("profiles").select("id", { count: "exact" }),
      ]);
      return {
        totalCourses: courses.count || 0,
        totalUsers: profiles.count || 0,
        totalRevenue: purchases.data?.reduce((s, p) => s + Number(p.amount), 0) || 0,
        totalSales: purchases.data?.length || 0,
      };
    },
    enabled: !!user && hasRole("admin"),
  });

  const { data: pendingCourses, refetch: refetchCourses } = useQuery({
    queryKey: ["pending-courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*, profiles!courses_instructor_profile_fkey(full_name)")
        .eq("is_published", true)
        .eq("is_approved", false);
      return data || [];
    },
    enabled: !!user && hasRole("admin"),
  });

  const { data: instructorApps, refetch: refetchApps } = useQuery({
    queryKey: ["instructor-applications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("instructor_applications")
        .select("*, profiles!instructor_applications_user_id_fkey(full_name, avatar_url)")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user && hasRole("admin"),
  });

  const approveCourse = async (courseId: string) => {
    const { error } = await supabase.from("courses").update({ is_approved: true }).eq("id", courseId);
    if (error) toast.error(error.message);
    else {
      toast.success("Course approved!");
      refetchCourses();
    }
  };

  const handleApplication = useMutation({
    mutationFn: async ({ appId, userId, action }: { appId: string; userId: string; action: "approved" | "rejected" }) => {
      const { error: appError } = await supabase
        .from("instructor_applications")
        .update({ status: action, updated_at: new Date().toISOString() })
        .eq("id", appId);
      if (appError) throw appError;

      if (action === "approved") {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "instructor" });
        if (roleError && !roleError.message.includes("duplicate")) throw roleError;
      }
    },
    onSuccess: (_, { action }) => {
      toast.success(action === "approved" ? "Instructor approved!" : "Application rejected.");
      refetchApps();
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (loading) return null;
  if (!user || !hasRole("admin")) return <Navigate to="/dashboard" />;

  const pendingApps = instructorApps?.filter((application: InstructorApplication) => application.status === "pending") || [];
  const currentRole = hasRole("super_admin") ? "super_admin" : "admin";

  const { data: adminProfile } = useQuery({
    queryKey: ["admin-current-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const displayName = adminProfile?.full_name || user?.email?.split("@")[0] || "Admin";

  const { data: regionalPricing = [] } = useQuery({
    queryKey: ["dashboard-regional-pricing"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("course_price_tiers").select("region_code, label, currency, price").eq("is_active", true);
      if (error) throw error;
      const map = new Map<string, { label: string; currency: string; total: number; count: number }>();
      for (const t of data || []) {
        const e = map.get(t.region_code) ?? { label: t.label, currency: t.currency, total: 0, count: 0 };
        e.total += Number(t.price);
        e.count += 1;
        map.set(t.region_code, e);
      }
      return Array.from(map.entries()).map(([region, v]) => ({
        region,
        label: v.label,
        price: `${v.currency} ${(v.total / v.count).toFixed(2)}`,
      }));
    },
    enabled: !!user && hasRole("admin"),
  });

  const { data: completionRate } = useQuery({
    queryKey: ["dashboard-completion-rate"],
    queryFn: async () => {
      const { data: purchases } = await supabase.from("purchases").select("course_id, user_id").eq("status", "completed");
      if (!purchases || purchases.length === 0) return 0;
      const courseIds = Array.from(new Set(purchases.map((p) => p.course_id)));
      const userIds = Array.from(new Set(purchases.map((p) => p.user_id)));
      const { data: sections } = await supabase.from("sections").select("id, course_id").in("course_id", courseIds);
      const sectionIds = (sections || []).map((s: any) => s.id);
      const { data: lectures } = sectionIds.length
        ? await supabase.from("lectures").select("id, section_id").in("section_id", sectionIds)
        : { data: [] as any[] };
      const sectionToCourse = new Map((sections || []).map((s: any) => [s.id, s.course_id]));
      const lectureToCourse = new Map((lectures || []).map((l: any) => [l.id, sectionToCourse.get(l.section_id)]));
      const lecturesByCourse = new Map<string, number>();
      for (const l of lectures || []) {
        const cid = lectureToCourse.get(l.id);
        if (cid) lecturesByCourse.set(cid, (lecturesByCourse.get(cid) || 0) + 1);
      }
      const lectureIds = (lectures || []).map((l: any) => l.id);
      const { data: progressRows } = lectureIds.length && userIds.length
        ? await supabase.from("progress").select("user_id, lecture_id, completed").in("lecture_id", lectureIds).in("user_id", userIds).eq("completed", true)
        : { data: [] as any[] };
      const completedByEnrollment = new Map<string, number>();
      for (const p of progressRows || []) {
        const cid = lectureToCourse.get(p.lecture_id);
        if (!cid) continue;
        const key = `${cid}|${p.user_id}`;
        completedByEnrollment.set(key, (completedByEnrollment.get(key) || 0) + 1);
      }
      let sumPercent = 0;
      let count = 0;
      for (const p of purchases) {
        const total = lecturesByCourse.get(p.course_id) || 0;
        if (total === 0) continue;
        const done = completedByEnrollment.get(`${p.course_id}|${p.user_id}`) || 0;
        sumPercent += done / total;
        count += 1;
      }
      return count > 0 ? Math.round((sumPercent / count) * 100) : 0;
    },
    enabled: !!user && hasRole("admin"),
  });

  const formatCurrency = (amount: number) => `$${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const metricCards = [
    { label: "Active Students", value: (stats?.totalUsers || 0).toLocaleString(), change: "total", note: `across ${stats?.totalCourses || 0} courses`, tone: "text-[#2a9d8f] bg-[#dcefec]" },
    { label: "Revenue (30d)", value: formatCurrency(stats?.totalRevenue || 0), change: "total", note: `${regionalPricing.length} regional price tier${regionalPricing.length === 1 ? "" : "s"}`, tone: "text-[#2a9d8f] bg-[#dcefec]" },
    { label: "Completion Rate", value: `${completionRate ?? 0}%`, change: "avg", note: "avg across enrolled students", tone: "text-[#d1495b] bg-[#fbe4e7]" },
    { label: "Open Support", value: "—", change: "n/a", note: "no support-ticket table yet", tone: "text-[#2a9d8f] bg-[#dcefec]" },
  ];

  const { data: courseProgress = [] } = useQuery({
    queryKey: ["dashboard-course-progress"],
    queryFn: async () => {
      const { data: coursesData } = await supabase
        .from("courses")
        .select("id, title, category_id, categories(name)")
        .eq("is_published", true);
      if (!coursesData || coursesData.length === 0) return [];

      const { data: purchases } = await supabase.from("purchases").select("course_id, user_id").eq("status", "completed");
      const enrollCount = new Map<string, number>();
      const usersByCourse = new Map<string, Set<string>>();
      for (const p of purchases || []) {
        enrollCount.set(p.course_id, (enrollCount.get(p.course_id) || 0) + 1);
        if (!usersByCourse.has(p.course_id)) usersByCourse.set(p.course_id, new Set());
        usersByCourse.get(p.course_id)!.add(p.user_id);
      }

      const top = coursesData
        .map((c: any) => ({ ...c, enrolled: enrollCount.get(c.id) || 0 }))
        .sort((a: any, b: any) => b.enrolled - a.enrolled)
        .slice(0, 3);
      if (top.length === 0) return [];

      const courseIds = top.map((c: any) => c.id);
      const { data: sections } = await supabase.from("sections").select("id, course_id").in("course_id", courseIds);
      const sectionIds = (sections || []).map((s: any) => s.id);
      const { data: lectures } = sectionIds.length
        ? await supabase.from("lectures").select("id, section_id").in("section_id", sectionIds)
        : { data: [] as any[] };
      const sectionToCourse = new Map((sections || []).map((s: any) => [s.id, s.course_id]));
      const lectureToCourse = new Map((lectures || []).map((l: any) => [l.id, sectionToCourse.get(l.section_id)]));
      const lectureIds = (lectures || []).map((l: any) => l.id);
      const allUserIds = Array.from(new Set(top.flatMap((c: any) => Array.from(usersByCourse.get(c.id) || []))));

      const { data: progressRows } = lectureIds.length && allUserIds.length
        ? await supabase.from("progress").select("user_id, lecture_id, completed").in("lecture_id", lectureIds).in("user_id", allUserIds).eq("completed", true)
        : { data: [] as any[] };

      const completedByCourseUser = new Map<string, number>();
      for (const p of progressRows || []) {
        const cid = lectureToCourse.get(p.lecture_id);
        if (!cid) continue;
        const key = `${cid}|${p.user_id}`;
        completedByCourseUser.set(key, (completedByCourseUser.get(key) || 0) + 1);
      }

      return top.map((c: any) => {
        const totalLectures = (lectures || []).filter((l: any) => lectureToCourse.get(l.id) === c.id).length;
        const users = Array.from(usersByCourse.get(c.id) || []);
        const sumCompleted = users.reduce((sum, uid) => sum + (completedByCourseUser.get(`${c.id}|${uid}`) || 0), 0);
        const avgCompleted = users.length ? sumCompleted / users.length : 0;
        const segments = Math.max(totalLectures, 1);
        const done = Math.floor(avgCompleted);
        return {
          title: c.title,
          subtitle: `${c.categories?.name || "General"} · ${totalLectures} lesson${totalLectures === 1 ? "" : "s"} · ${c.enrolled} enrolled`,
          progressLabel: totalLectures > 0 ? `${Math.round((avgCompleted / totalLectures) * 100)}% avg` : "No lessons yet",
          segments,
          done: Math.min(done, segments),
          current: done < segments ? 1 : 0,
        };
      });
    },
    enabled: !!user && hasRole("admin"),
  });

  const { data: recentEnrollments = [] } = useQuery({
    queryKey: ["dashboard-recent-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("id, status, created_at, user_id, course_id, courses(title)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      const userIds = Array.from(new Set((data || []).map((p: any) => p.user_id)));
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("user_id, full_name, country").in("user_id", userIds)
        : { data: [] as any[] };
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return (data || []).map((p: any) => ({
        id: p.id,
        student: profileMap.get(p.user_id)?.full_name || "Unnamed student",
        course: p.courses?.title || "Untitled course",
        region: profileMap.get(p.user_id)?.country || "—",
        status: p.status as string,
        joined: new Date(p.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      }));
    },
    enabled: !!user && hasRole("admin"),
  });

  const timeAgo = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(diffMs / 3_600_000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  const { data: activityFeed = [] } = useQuery({
    queryKey: ["dashboard-activity-feed"],
    queryFn: async () => {
      const [purchasesRes, retriesRes, certsRes] = await Promise.all([
        supabase.from("purchases").select("id, created_at, courses(title)").eq("status", "completed").order("created_at", { ascending: false }).limit(5),
        (supabase as any).from("payment_retries").select("id, created_at, courses(title)").order("created_at", { ascending: false }).limit(5),
        (supabase as any).from("student_certificates").select("id, issued_at, courses(title)").order("issued_at", { ascending: false }).limit(5),
      ]);
      const events: { id: string; tone: "teal" | "amber" | "rose"; text: string; time: string }[] = [];
      for (const p of purchasesRes.data || []) events.push({ id: `p-${p.id}`, tone: "teal", text: `New enrollment — ${p.courses?.title || "a course"}`, time: p.created_at });
      for (const r of retriesRes.data || []) events.push({ id: `r-${r.id}`, tone: "amber", text: `Payment retry logged — ${r.courses?.title || "a course"}`, time: r.created_at });
      for (const c of certsRes.data || []) events.push({ id: `c-${c.id}`, tone: "teal", text: `Certificate issued — ${c.courses?.title || "a course"}`, time: c.issued_at });
      return events
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 5)
        .map((e) => ({ ...e, time: timeAgo(e.time) }));
    },
    enabled: !!user && hasRole("admin"),
  });


  // Config-driven, collapsible, role-aware sidebar. Add/reorder items or whole groups
  // here without touching layout code — AdminSidebar renders whatever it's given.
  const navGroups: NavGroup[] = [
    {
      label: "",
      items: [
        { value: "overview", label: "Dashboard", icon: LayoutDashboard },
        { value: "all-courses", label: "Courses", icon: BookOpen, badge: pendingCourses?.length || undefined },
        { value: "users", label: "Students", icon: Users2 },
        { value: "payments", label: "Payments & Pricing", icon: CreditCard },
      ],
    },
    {
      label: "Content",
      items: [
        { value: "hub", label: "Curriculum Builder", icon: ClapperboardIcon },
        { value: "media", label: "Media Library", icon: Image },
        { value: "certificates", label: "Certificates", icon: Award },
        { value: "community", label: "Community", icon: MessagesSquare },
      ],
    },
    {
      label: "Growth",
      items: [
        { value: "marketing", label: "Marketing Calendar", icon: Megaphone },
        { value: "analytics", label: "Analytics", icon: BarChart3 },
      ],
    },
    {
      label: "System",
      items: [
        { value: "instructors", label: "Team & Roles", icon: GraduationCap, badge: pendingApps.length || undefined, roles: ["admin", "super_admin"] },
        { value: "settings", label: "Settings", icon: Settings, roles: ["super_admin"] },
      ],
    },
  ];

  const dashboardAlerts = ["Failed payments: 3 subscription retries scheduled", "Support tickets: 9 open, 3 new", "Low engagement: AI Marketing Engine Week 1 cohort"];
  const courseCapabilities = ["Create, edit, archive courses with title, description, thumbnail, and status", "Build modules → lessons → video/PDF/quiz/assignment content blocks", "Configure weekly drip schedules for multi-week cohorts", "Track version notes before publishing course updates"];
  const studentCapabilities = ["Search and filter learners by course, region, and enrollment date", "Open student profiles with enrollment, progress, certificates, and payment history", "Run bulk enroll, refund, message, and revoke-access actions"];
  const paymentCapabilities = ["Manage Regional/PPP pricing tiers per course", "Maintain coupons, discount redemptions, transaction logs, refunds, and failed payment retries", "Track payment gateway health and toggle subscription vs one-time purchase offers"];
  const mediaCapabilities = ["Reuse videos, PDFs, templates, and supporting documents across courses", "Monitor video hosting/CDN status and transcoding queue", "Keep landing-page and email media in one governed library"];
  const marketingCapabilities = ["Edit course landing pages and launch 90-day content calendar campaigns", "Manage welcome, drip nurture, and abandoned-cart automation sequences", "Track affiliate/referral links plus UTM campaign performance"];
  const certificateCapabilities = ["Build quizzes and assignments with auto-grading rules", "Design certificate templates and auto-issue on completion", "Review learner progress and assessment completion reports"];
  const communityCapabilities = ["Moderate discussion forums and cohort groups", "Schedule live sessions and webinars for active cohorts", "Track engagement signals for low-participation cohorts"];
  const analyticsCapabilities = ["Analyze cohort-level completion funnels", "Report revenue by course, region, and pricing tier", "Find lesson-level drop-off points inside courses"];
  const settingsCapabilities = ["Manage admin, instructor, and support roles", "Update branding, logo, domain, and email templates", "Configure payment gateway, email, analytics, and CRM integrations"];

  const capabilityCard = (title: string, description: string, items: string[]) => (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <p className="text-sm text-slate-500">{description}</p>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item} className="rounded-xl border border-slate-200 bg-[#fbfaf8] p-4 text-sm text-slate-700">
            <span className="mr-2 text-[#2a9d8f]">●</span>{item}
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const teamSettingsPanel = (
    <div className="space-y-5">
      {capabilityCard("Settings & Team", "Manage roles, branding, and third-party integrations for the academy console.", settingsCapabilities)}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <UsersManagement />

        <div className="space-y-5">
          <BrandingSettingsPanel />
          <IntegrationsStatusPanel />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-slate-950">
      <Tabs defaultValue="overview" orientation="vertical" className="flex min-h-screen">
        <AdminSidebar
          navGroups={navGroups}
          role={currentRole}
          userName={displayName}
          userRoleLabel={currentRole === "super_admin" ? "Founder · Super Admin" : "Admin"}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
        />

        <main className={`w-full transition-[padding] duration-200 ${sidebarCollapsed ? "lg:pl-[76px]" : "lg:pl-[258px]"}`}>
          <header className="sticky top-0 z-10 flex h-[75px] items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur lg:px-9">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="h-9 w-full rounded-lg border border-slate-200 bg-[#fbfaf8] pl-10 pr-4 text-sm outline-none placeholder:text-slate-500" placeholder="Search students, courses, transactions..." />
            </div>
            <div className="flex items-center gap-3">
              <button className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-[#ffc83d] text-white">
                <Bell className="h-4 w-4" />
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#d1495b] ring-2 ring-white" />
              </button>
              <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700">
                <Settings className="h-4 w-4" />
              </button>
              <Button className="gap-1.5 rounded-lg bg-[#14213d] px-4 hover:bg-[#1f2f52]">
                <Plus className="h-4 w-4" /> New Course
              </Button>
            </div>
          </header>

          <div className="space-y-7 p-6 lg:p-9">
            <TabsContent value="overview" className="m-0 space-y-7">
              <section>
                <h1 className="font-display text-2xl font-bold">Welcome back, {displayName}</h1>
                <p className="text-sm text-slate-500">Here's how DigiDominance Academy is performing today — {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
              </section>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metricCards.map((metric) => (
                  <Card key={metric.label} className="rounded-2xl border-slate-200 bg-white shadow-none">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-600">{metric.label}</p>
                        <Badge className={`${metric.tone} border-0 hover:${metric.tone}`}>{metric.change}</Badge>
                      </div>
                      <p className="mt-4 text-3xl font-bold tracking-tight">{metric.value}</p>
                      <p className="mt-1 text-xs text-slate-500">{metric.note}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="rounded-2xl border-slate-200 bg-white shadow-none">
                <CardHeader className="pb-2"><CardTitle className="text-base">Operational Alerts</CardTitle></CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                  {dashboardAlerts.map((alert) => <div key={alert} className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{alert}</div>)}
                </CardContent>
              </Card>

              <div className="grid gap-5 xl:grid-cols-[1fr_385px]">
                <div className="space-y-5">
                  <Card className="rounded-2xl border-slate-200 bg-white shadow-none">
                    <CardHeader className="flex-row items-center justify-between pb-3"><CardTitle className="text-base">Course Progress</CardTitle><button className="text-sm font-semibold text-[#2a9d8f]">Manage courses →</button></CardHeader>
                    <CardContent className="space-y-5">
                      {courseProgress.length > 0 ? courseProgress.map((course) => (
                        <div key={course.title} className="border-b border-slate-200 pb-4 last:border-0 last:pb-0">
                          <div className="flex justify-between gap-4"><div><p className="font-semibold">{course.title}</p><p className="text-xs text-slate-500">{course.subtitle}</p></div><p className="text-sm text-slate-600">{course.progressLabel}</p></div>
                          <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${course.segments}, minmax(0, 1fr))` }}>{Array.from({ length: course.segments }).map((_, i) => <span key={i} className={`h-2 rounded-full ${i < course.done ? "bg-[#2a9d8f]" : i < course.done + course.current ? "bg-[#e9a344]" : "bg-[#e7e6e1]"}`} />)}</div>
                        </div>
                      )) : (
                        <p className="py-6 text-center text-sm text-slate-500">No published courses with enrollments yet.</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-slate-200 bg-white shadow-none">
                    <CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-base">Recent Enrollments</CardTitle><button className="text-sm font-semibold text-[#2a9d8f]">View all students →</button></CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase tracking-wide text-slate-500"><tr className="border-b"><th className="py-3">Student</th><th>Course</th><th>Region</th><th>Status</th><th>Joined</th></tr></thead><tbody>
                        {recentEnrollments.length > 0 ? recentEnrollments.map((row) => {
                          const tone = row.status === "completed" ? "bg-[#dcefec] text-[#2a9d8f]"
                            : row.status === "refunded" || row.status === "revoked" ? "bg-[#fbe4e7] text-[#d1495b]"
                            : "bg-amber-100 text-amber-700";
                          return (
                            <tr key={row.id} className="border-b last:border-0">
                              <td className="flex items-center gap-3 py-3"><span className="h-7 w-7 rounded-full bg-[#14213d]" />{row.student}</td>
                              <td>{row.course}</td>
                              <td className="text-slate-600">{row.region}</td>
                              <td><Badge className={`${tone} border-0 whitespace-normal`}>{row.status}</Badge></td>
                              <td>{row.joined}</td>
                            </tr>
                          );
                        }) : (
                          <tr><td colSpan={5} className="py-6 text-center text-slate-500">No enrollments yet.</td></tr>
                        )}
                      </tbody></table></div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-5">
                  <Card className="rounded-2xl border-slate-200 bg-white shadow-none"><CardHeader><CardTitle className="text-base">Activity Feed</CardTitle></CardHeader><CardContent className="space-y-0">
                    {activityFeed.length > 0 ? activityFeed.map((e) => (
                      <div key={e.id} className="flex gap-3 border-b py-3 last:border-0">
                        <span className={`mt-1.5 h-2 w-2 rounded-full ${e.tone === "teal" ? "bg-[#2a9d8f]" : e.tone === "amber" ? "bg-[#e9a344]" : "bg-[#d1495b]"}`} />
                        <div><p className="text-sm">{e.text}</p><p className="text-xs text-slate-500">{e.time}</p></div>
                      </div>
                    )) : (
                      <p className="py-6 text-center text-sm text-slate-500">No recent activity.</p>
                    )}
                  </CardContent></Card>
                  <Card className="rounded-2xl border-slate-200 bg-white shadow-none"><CardHeader><CardTitle className="text-base">Regional Pricing Snapshot</CardTitle></CardHeader><CardContent><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr className="border-b"><th className="py-3">Region</th><th>Tier</th><th>Avg Price</th></tr></thead><tbody>
                    {regionalPricing.length > 0 ? regionalPricing.map((r) => (
                      <tr key={r.region} className="border-b last:border-0"><td className="py-3 text-slate-600">{r.region}</td><td>{r.label}</td><td>{r.price}</td></tr>
                    )) : (
                      <tr><td colSpan={3} className="py-6 text-center text-slate-500">No regional pricing tiers set up yet.</td></tr>
                    )}
                  </tbody></table></CardContent></Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="courses" className="m-0"><Card className="border-0"><CardHeader><CardTitle className="font-display flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" />Pending Course Approvals</CardTitle></CardHeader><CardContent>{pendingCourses && pendingCourses.length > 0 ? <div className="space-y-3">{pendingCourses.map((course: PendingCourse) => <div key={course.id} className="flex items-center gap-4 rounded-lg bg-secondary/30 p-4"><div className="flex-1"><p className="font-medium">{course.title}</p><p className="text-sm text-muted-foreground">by {course.profiles?.full_name}</p></div><Button size="sm" onClick={() => approveCourse(course.id)}><CheckCircle className="mr-1 h-4 w-4" /> Approve</Button></div>)}</div> : <p className="py-8 text-center text-muted-foreground">No pending course approvals</p>}</CardContent></Card></TabsContent>
            <TabsContent value="instructors" className="m-0"><Card className="border-0"><CardHeader><CardTitle className="font-display flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" />Instructor Applications</CardTitle></CardHeader><CardContent>{instructorApps && instructorApps.length > 0 ? <div className="space-y-4">{instructorApps.map((app: InstructorApplication) => <div key={app.id} className="space-y-3 rounded-lg bg-secondary/30 p-4"><div className="flex items-start justify-between"><div><p className="font-display font-semibold">{app.profiles?.full_name || "Unknown User"}</p><p className="text-sm text-muted-foreground">Applied {new Date(app.created_at).toLocaleDateString()}</p></div><Badge variant={app.status === "approved" ? "default" : app.status === "rejected" ? "destructive" : "secondary"}>{app.status === "pending" && <Clock className="mr-1 h-3 w-3" />}{app.status === "approved" && <CheckCircle className="mr-1 h-3 w-3" />}{app.status === "rejected" && <XCircle className="mr-1 h-3 w-3" />}{app.status}</Badge></div><div className="grid gap-3 text-sm sm:grid-cols-2"><div><p className="font-medium text-muted-foreground">Expertise</p><p>{app.expertise}</p></div><div><p className="font-medium text-muted-foreground">Experience</p><p>{app.experience}</p></div></div><div className="text-sm"><p className="font-medium text-muted-foreground">Bio</p><p>{app.bio}</p></div>{app.status === "pending" && <div className="flex gap-2 pt-2"><Button size="sm" onClick={() => handleApplication.mutate({ appId: app.id, userId: app.user_id, action: "approved" })} disabled={handleApplication.isPending}><CheckCircle className="mr-1 h-4 w-4" /> Approve</Button><Button size="sm" variant="destructive" onClick={() => handleApplication.mutate({ appId: app.id, userId: app.user_id, action: "rejected" })} disabled={handleApplication.isPending}><XCircle className="mr-1 h-4 w-4" /> Reject</Button></div>}</div>)}</div> : <p className="py-8 text-center text-muted-foreground">No instructor applications</p>}</CardContent></Card></TabsContent>
            <TabsContent value="attempts" className="m-0"><PurchaseAttemptsPanel /></TabsContent>
            <TabsContent value="retries" className="m-0"><PaymentRetriesPanel /></TabsContent>
            <TabsContent value="all-courses" className="m-0 space-y-5">{capabilityCard("Course Management", "Course list, curriculum planning, drip schedules, and versioning live together here.", courseCapabilities)}<CoursesManagement /></TabsContent>
            <TabsContent value="users" className="m-0 space-y-5">{capabilityCard("Student Management", "Directory, profiles, history, progress, certificates, payments, and bulk actions.", studentCapabilities)}<UsersManagement /></TabsContent>
            <TabsContent value="payments" className="m-0 space-y-5">{capabilityCard("Pricing & Payments", "Regional/PPP pricing, coupons, gateway health, transactions, refunds, and purchase models.", paymentCapabilities)}<PricingTiersManagement /><RevenueAnalyticsPanel /><CouponsManagement /><CouponRedemptions /><PurchaseAttemptsPanel /><PaymentRetriesPanel /></TabsContent>
            <TabsContent value="media" className="m-0 space-y-5">{capabilityCard("Content & Media Library", "Reusable assets and delivery operations for videos, docs, templates, and course collateral.", mediaCapabilities)}<MediaLibraryPanel /><SiteContentEditor /></TabsContent>
            <TabsContent value="content" className="m-0"><SiteContentEditor /></TabsContent>
            <TabsContent value="coupons" className="m-0"><CouponsManagement /></TabsContent>
            <TabsContent value="redemptions" className="m-0"><CouponRedemptions /></TabsContent>
            <TabsContent value="hub" className="m-0 space-y-5">{capabilityCard("Curriculum Builder", "Module, lesson, content-block, quiz, assignment, and drip-schedule workspace.", courseCapabilities)}<CoursePlayerHubAdminPanel /></TabsContent>
            <TabsContent value="certificates" className="m-0 space-y-5">{capabilityCard("Certificates & Assessments", "Quiz/assignment building, grading rules, template design, and completion-based issuing.", certificateCapabilities)}<QuizBuilderPanel /><CertificateIssuancePanel /><StudentProgressPanel /></TabsContent>
            <TabsContent value="community" className="m-0 space-y-5">{capabilityCard("Community & Engagement", "Cohort discussions, live sessions, webinar operations, and engagement monitoring.", communityCapabilities)}<CommunityManagementPanel /></TabsContent>
            <TabsContent value="marketing" className="m-0 space-y-5">{capabilityCard("Marketing & Growth", "Landing pages, automation sequences, affiliate/referral operations, and UTM reporting.", marketingCapabilities)}<CourseLandingPageEditor /><CampaignPerformancePanel /><CampaignManagerPanel /><AffiliatesManagement /><ReferralLogsPanel /><PayoutQueuePanel /><FraudCenterPanel /></TabsContent>
            <TabsContent value="analytics" className="m-0 space-y-5">{capabilityCard("Analytics & Reporting", "Cohort funnels, revenue slices, and course drop-off analysis.", analyticsCapabilities)}<CourseDropoffPanel /><RevenueAnalyticsPanel /><StudentProgressPanel /></TabsContent>
            <TabsContent value="settings" className="m-0">{teamSettingsPanel}</TabsContent>
            <TabsContent value="revenue" className="m-0"><RevenueAnalyticsPanel /></TabsContent>
            <TabsContent value="progress" className="m-0"><StudentProgressPanel /></TabsContent>
          </div>
        </main>
      </Tabs>
    </div>
  );
}