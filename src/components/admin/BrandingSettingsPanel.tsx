import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Search, Bell, Settings, Plus, BookOpen, CheckCircle, XCircle, GraduationCap, Clock,
  LayoutDashboard, Users2, MessagesSquare, Wallet, Landmark, Grid3x3, Blocks, Handshake,
} from "lucide-react";
import { toast } from "sonner";
import AdminSidebarFlyout, { FlyoutGroup } from "@/components/admin/AdminSidebarFlyout";
import DashboardOverviewV2 from "@/components/admin/DashboardOverviewV2";
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
import CategoriesManagement from "@/components/admin/CategoriesManagement";
import ReviewsRatingsPanel from "@/components/admin/ReviewsRatingsPanel";
import StudentLeaderboardPanel from "@/components/admin/StudentLeaderboardPanel";
import InstructorDirectoryPanel from "@/components/admin/InstructorDirectoryPanel";
import AttendancePanel from "@/components/admin/AttendancePanel";
import NotificationsPanel from "@/components/admin/NotificationsPanel";
import ScholarshipsPanel from "@/components/admin/ScholarshipsPanel";
import InvoicesPanel from "@/components/admin/InvoicesPanel";
import ReportsPanel from "@/components/admin/ReportsPanel";

type PendingCourse = { id: string; title: string; profiles?: { full_name?: string | null } | null };
type InstructorApplication = { id: string; user_id: string; status: string; created_at: string; expertise?: string | null; experience?: string | null; bio?: string | null; profiles?: { full_name?: string | null } | null };

export default function AdminDashboard() {
  const { user, loading, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

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

  const { data: adminProfile } = useQuery({
    queryKey: ["admin-current-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: unreadNotifCount = 0 } = useQuery({
    queryKey: ["admin-unread-notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await (supabase as any).from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user!.id).eq("is_read", false);
      return count || 0;
    },
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

  // Signs the current admin out and returns them to the public site.
  // Swap this for your AuthContext's signOut() if it exposes one.
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(error.message);
  };

  if (loading) return null;
  if (!user || !hasRole("admin")) return <Navigate to="/dashboard" />;

  const pendingApps = instructorApps?.filter((application: InstructorApplication) => application.status === "pending") || [];
  const currentRole = hasRole("super_admin") ? "super_admin" : "admin";
  const displayName = adminProfile?.full_name || user?.email?.split("@")[0] || "Admin";

  // ---------------------------------------------------------------------------
  // Flyout nav groups. "Academy", "Apps", and "Elements" submenus were never
  // shown in the reference screenshots, so they route to Settings for now
  // rather than guessing fake destinations — see chat for what to fill in.
  // "Partners" currently routes to a placeholder tab until a dedicated
  // PartnersManagement panel exists.
  // ---------------------------------------------------------------------------
  const navGroups: FlyoutGroup[] = [
    { key: "dashboard", icon: LayoutDashboard, label: "Dashboard", items: [{ value: "overview", label: "Dashboard" }] },
    {
      key: "course", icon: BookOpen, label: "Course",
      items: [
        { value: "all-courses", label: "Courses List", badge: pendingCourses?.length || undefined },
        { value: "all-courses", label: "Courses Grid" },
        { value: "all-courses", label: "Course Detail" },
        { value: "all-courses", label: "Create Course" },
        { value: "categories", label: "Categories" },
        { value: "hub", label: "Lessons" },
        { value: "hub", label: "Curriculum Builder" },
        { value: "reviews", label: "Reviews & Ratings" },
        { value: "payments", label: "Pricing Plans" },
        { value: "coupons", label: "Coupons" },
      ],
    },
    {
      key: "students", icon: Users2, label: "Students",
      items: [
        { value: "users", label: "Student Directory" },
        { value: "users", label: "Student Profile" },
        { value: "users", label: "Enrollments" },
        { value: "progress", label: "Progress Tracker" },
        { value: "attendance", label: "Attendance" },
        { value: "certificates", label: "Certificates" },
        { value: "users", label: "Applications" },
        { value: "leaderboard", label: "Leaderboard" },
      ],
    },
    {
      key: "instructors", icon: GraduationCap, label: "Instructors",
      items: [
        { value: "instructor-directory", label: "Instructor Directory" },
        { value: "instructor-directory", label: "Instructor Profile" },
        { value: "instructors", label: "Applications", badge: pendingApps.length || undefined },
        { value: "marketing", label: "Payouts" },
        { value: "hub", label: "Schedule" },
        { value: "instructor-directory", label: "Performance" },
      ],
    },
    { key: "academy", icon: Grid3x3, label: "Academy", items: [{ value: "settings", label: "Academy Settings" }] },
    {
      key: "communication", icon: MessagesSquare, label: "Community",
      items: [
        { value: "community", label: "Forum" },
        { value: "community", label: "Discussions" },
        { value: "community", label: "Messages" },
        { value: "media", label: "Announcements" },
        { value: "hub", label: "Live Classes" },
        { value: "hub", label: "Webinars" },
        { value: "notifications", label: "Notifications", badge: unreadNotifCount || undefined },
      ],
    },
    {
      key: "finance", icon: Wallet, label: "Finance",
      items: [
        { value: "payments", label: "Fees" },
        { value: "invoices", label: "Invoices" },
        { value: "payments", label: "Payments" },
        { value: "scholarships", label: "Scholarships" },
        { value: "users", label: "Refunds" },
        { value: "marketing", label: "Payouts" },
        { value: "reports", label: "Reports" },
      ],
    },
    {
      key: "partners", icon: Handshake, label: "Partners",
      items: [
        { value: "partners", label: "All Partners" },
        { value: "partners", label: "Partner Agreements" },
      ],
    },
    { key: "apps", icon: Blocks, label: "Apps", items: [{ value: "settings", label: "App Settings" }] },
    { key: "elements", icon: Landmark, label: "Elements", items: [{ value: "settings", label: "Design Elements" }] },
  ];

  const activeGroupKey = useMemo(() => navGroups.find((g) => g.items.some((i) => i.value === activeTab))?.key || "dashboard", [activeTab, navGroups]);

  const courseCapabilities = ["Create, edit, archive courses with title, description, thumbnail, and status", "Build modules → lessons → video/PDF/quiz/assignment content blocks", "Configure weekly drip schedules for multi-week cohorts", "Track version notes before publishing course updates"];
  const studentCapabilities = ["Search and filter learners by course, region, and enrollment date", "Open student profiles with enrollment, progress, certificates, and payment history", "Run bulk enroll, refund, message, and revoke-access actions"];
  const paymentCapabilities = ["Manage Regional/PPP pricing tiers per course", "Maintain coupons, discount redemptions, transaction logs, refunds, and failed payment retries", "Track payment gateway health and toggle subscription vs one-time purchase offers"];
  const mediaCapabilities = ["Reuse videos, PDFs, templates, and supporting documents across courses", "Monitor video hosting/CDN status and transcoding queue", "Keep landing-page and email media in one governed library"];
  const marketingCapabilities = ["Edit course landing pages and launch 90-day content calendar campaigns", "Manage welcome, drip nurture, and abandoned-cart automation sequences", "Track affiliate/referral links plus UTM campaign performance"];
  const certificateCapabilities = ["Build quizzes and assignments with auto-grading rules", "Design certificate templates and auto-issue on completion", "Review learner progress and assessment completion reports"];
  const analyticsCapabilities = ["Analyze cohort-level completion funnels", "Report revenue by course, region, and pricing tier", "Find lesson-level drop-off points inside courses"];
  const settingsCapabilities = ["Manage admin, instructor, and support roles", "Update branding, logo, domain, and email templates", "Configure payment gateway, email, analytics, and CRM integrations"];
  const partnersCapabilities = ["Track partner organizations and their point of contact", "Manage revenue-share and referral agreement terms", "Review joint marketing and co-branded course activity"];

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
    // Dark page background matches the rest of the admin theme, so nothing
    // light shows through the gaps around/below individual panels.
    <div className="min-h-screen bg-[#14101f] text-white">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-screen">
        <AdminSidebarFlyout
          groups={navGroups}
          activeGroupKey={activeGroupKey}
          onNavigate={setActiveTab}
          profileName={displayName}
          onProfileClick={() => setActiveTab("settings")}
          onLogout={handleLogout}
        />

        <main className="w-full lg:pl-[76px]">
          <header className="sticky top-0 z-20 flex h-[75px] items-center justify-between border-b border-white/5 bg-[#1c162f] px-6 lg:px-9">
            <div className="flex items-center gap-3">
              <span className="font-display text-lg font-bold text-white">Acadx <span className="ml-1 text-xs font-normal uppercase tracking-widest text-[#8b8aa3]">Academy Suite</span></span>
            </div>
            <div className="relative hidden w-full max-w-sm md:block">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b8aa3]" />
              <input className="h-9 w-full rounded-full border border-white/10 bg-[#2e1b46] pl-10 pr-4 text-sm text-white outline-none placeholder:text-[#8b8aa3]" placeholder="Search courses, students, lessons..." />
            </div>
            <div className="flex items-center gap-3">
              <button className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#2e1b46] text-white" onClick={() => setActiveTab("settings")}>
                <Settings className="h-4 w-4" />
              </button>
              <button className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#2e1b46] text-white" onClick={() => setActiveTab("notifications")}>
                <Bell className="h-4 w-4" />
                {unreadNotifCount > 0 && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#ec4899] ring-2 ring-[#1c162f]" />}
              </button>
              <div className="flex items-center gap-2 pl-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-sm font-bold text-white">{displayName.slice(0, 1).toUpperCase()}</div>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-semibold text-white">{displayName}</p>
                  <p className="text-xs text-[#8b8aa3]">{currentRole === "super_admin" ? "Founder" : "Academy Director"}</p>
                </div>
              </div>
            </div>
          </header>

          <div className="space-y-7 p-6 lg:p-9">
            <TabsContent value="overview" className="m-0 -mx-6 -mt-7 min-h-screen bg-[#14101f] p-6 lg:-mx-9 lg:p-9"><DashboardOverviewV2 onNavigate={setActiveTab} /></TabsContent>

            <TabsContent value="courses" className="m-0"><Card className="border-0"><CardHeader><CardTitle className="font-display flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" />Pending Course Approvals</CardTitle></CardHeader><CardContent>{pendingCourses && pendingCourses.length > 0 ? <div className="space-y-3">{pendingCourses.map((course: PendingCourse) => <div key={course.id} className="flex items-center gap-4 rounded-lg bg-secondary/30 p-4"><div className="flex-1"><p className="font-medium">{course.title}</p><p className="text-sm text-muted-foreground">by {course.profiles?.full_name}</p></div><Button size="sm" onClick={() => approveCourse(course.id)}><CheckCircle className="mr-1 h-4 w-4" /> Approve</Button></div>)}</div> : <p className="py-8 text-center text-muted-foreground">No pending course approvals</p>}</CardContent></Card></TabsContent>
            <TabsContent value="instructors" className="m-0"><Card className="border-0"><CardHeader><CardTitle className="font-display flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" />Instructor Applications</CardTitle></CardHeader><CardContent>{instructorApps && instructorApps.length > 0 ? <div className="space-y-4">{instructorApps.map((app: InstructorApplication) => <div key={app.id} className="space-y-3 rounded-lg bg-secondary/30 p-4"><div className="flex items-start justify-between"><div><p className="font-display font-semibold">{app.profiles?.full_name || "Unknown User"}</p><p className="text-sm text-muted-foreground">Applied {new Date(app.created_at).toLocaleDateString()}</p></div><Badge variant={app.status === "approved" ? "default" : app.status === "rejected" ? "destructive" : "secondary"}>{app.status === "pending" && <Clock className="mr-1 h-3 w-3" />}{app.status === "approved" && <CheckCircle className="mr-1 h-3 w-3" />}{app.status === "rejected" && <XCircle className="mr-1 h-3 w-3" />}{app.status}</Badge></div><div className="grid gap-3 text-sm sm:grid-cols-2"><div><p className="font-medium text-muted-foreground">Expertise</p><p>{app.expertise}</p></div><div><p className="font-medium text-muted-foreground">Experience</p><p>{app.experience}</p></div></div><div className="text-sm"><p className="font-medium text-muted-foreground">Bio</p><p>{app.bio}</p></div>{app.status === "pending" && <div className="flex gap-2 pt-2"><Button size="sm" onClick={() => handleApplication.mutate({ appId: app.id, userId: app.user_id, action: "approved" })} disabled={handleApplication.isPending}><CheckCircle className="mr-1 h-4 w-4" /> Approve</Button><Button size="sm" variant="destructive" onClick={() => handleApplication.mutate({ appId: app.id, userId: app.user_id, action: "rejected" })} disabled={handleApplication.isPending}><XCircle className="mr-1 h-4 w-4" /> Reject</Button></div>}</div>)}</div> : <p className="py-8 text-center text-muted-foreground">No instructor applications</p>}</CardContent></Card></TabsContent>
            <TabsContent value="attempts" className="m-0"><PurchaseAttemptsPanel /></TabsContent>
            <TabsContent value="retries" className="m-0"><PaymentRetriesPanel /></TabsContent>
            <TabsContent value="all-courses" className="m-0 space-y-5">{capabilityCard("Course Management", "Course list, curriculum planning, drip schedules, and versioning live together here.", courseCapabilities)}<CoursesManagement /></TabsContent>
            <TabsContent value="categories" className="m-0"><CategoriesManagement /></TabsContent>
            <TabsContent value="reviews" className="m-0"><ReviewsRatingsPanel /></TabsContent>
            <TabsContent value="users" className="m-0 space-y-5">{capabilityCard("Student Management", "Directory, profiles, history, progress, certificates, payments, and bulk actions.", studentCapabilities)}<UsersManagement /></TabsContent>
            <TabsContent value="leaderboard" className="m-0"><StudentLeaderboardPanel /></TabsContent>
            <TabsContent value="attendance" className="m-0"><AttendancePanel /></TabsContent>
            <TabsContent value="instructor-directory" className="m-0"><InstructorDirectoryPanel /></TabsContent>
            <TabsContent value="payments" className="m-0 space-y-5">{capabilityCard("Pricing & Payments", "Regional/PPP pricing, coupons, gateway health, transactions, refunds, and purchase models.", paymentCapabilities)}<PricingTiersManagement /><RevenueAnalyticsPanel /><CouponsManagement /><CouponRedemptions /><PurchaseAttemptsPanel /><PaymentRetriesPanel /></TabsContent>
            <TabsContent value="invoices" className="m-0"><InvoicesPanel /></TabsContent>
            <TabsContent value="scholarships" className="m-0"><ScholarshipsPanel /></TabsContent>
            <TabsContent value="reports" className="m-0"><ReportsPanel /></TabsContent>
            <TabsContent value="media" className="m-0 space-y-5">{capabilityCard("Content & Media Library", "Reusable assets and delivery operations for videos, docs, templates, and course collateral.", mediaCapabilities)}<MediaLibraryPanel /><SiteContentEditor /></TabsContent>
            <TabsContent value="content" className="m-0"><SiteContentEditor /></TabsContent>
            <TabsContent value="coupons" className="m-0"><CouponsManagement /></TabsContent>
            <TabsContent value="redemptions" className="m-0"><CouponRedemptions /></TabsContent>
            <TabsContent value="hub" className="m-0 space-y-5">{capabilityCard("Curriculum Builder", "Module, lesson, content-block, quiz, assignment, and drip-schedule workspace.", courseCapabilities)}<CoursePlayerHubAdminPanel /></TabsContent>
            <TabsContent value="certificates" className="m-0 space-y-5">{capabilityCard("Certificates & Assessments", "Quiz/assignment building, grading rules, template design, and completion-based issuing.", certificateCapabilities)}<QuizBuilderPanel /><CertificateIssuancePanel /><StudentProgressPanel /></TabsContent>
            <TabsContent value="community" className="m-0"><CommunityManagementPanel /></TabsContent>
            <TabsContent value="marketing" className="m-0 space-y-5">{capabilityCard("Marketing & Growth", "Landing pages, automation sequences, affiliate/referral operations, and UTM reporting.", marketingCapabilities)}<CourseLandingPageEditor /><CampaignPerformancePanel /><CampaignManagerPanel /><AffiliatesManagement /><ReferralLogsPanel /><PayoutQueuePanel /><FraudCenterPanel /></TabsContent>
            <TabsContent value="analytics" className="m-0 space-y-5">{capabilityCard("Analytics & Reporting", "Cohort funnels, revenue slices, and course drop-off analysis.", analyticsCapabilities)}<CourseDropoffPanel /><RevenueAnalyticsPanel /><StudentProgressPanel /></TabsContent>
            <TabsContent value="notifications" className="m-0"><NotificationsPanel /></TabsContent>
            <TabsContent value="settings" className="m-0">{teamSettingsPanel}</TabsContent>
            <TabsContent value="revenue" className="m-0"><RevenueAnalyticsPanel /></TabsContent>
            <TabsContent value="progress" className="m-0"><StudentProgressPanel /></TabsContent>
            <TabsContent value="partners" className="m-0 space-y-5">{capabilityCard("Partners", "Partner organizations, agreements, and revenue-share terms — hook this up to a PartnersManagement panel once it exists.", partnersCapabilities)}</TabsContent>
          </div>
        </main>
      </Tabs>
    </div>
  );
}