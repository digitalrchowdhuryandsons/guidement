import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  BookOpen,
  DollarSign,
  TrendingUp,
  CheckCircle,
  XCircle,
  GraduationCap,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
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

export default function AdminDashboard() {
  const { user, loading, hasRole } = useAuth();
  const queryClient = useQueryClient();

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
    onError: (err: any) => toast.error(err.message),
  });

  if (loading) return null;
  if (!user || !hasRole("admin")) return <Navigate to="/dashboard" />;

  const pendingApps = instructorApps?.filter((a: any) => a.status === "pending") || [];

  return (
    <div className="container py-8 space-y-8">
      <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: "Total Users", value: stats?.totalUsers || 0 },
          { icon: BookOpen, label: "Total Courses", value: stats?.totalCourses || 0 },
          { icon: DollarSign, label: "Total Revenue", value: `$${(stats?.totalRevenue || 0).toFixed(2)}` },
          { icon: TrendingUp, label: "Total Sales", value: stats?.totalSales || 0 },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="border-0 bg-secondary/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
   <Tabs defaultValue="courses" className="space-y-6">
   <TabsList className="flex flex-wrap gap-1 h-auto p-1">
      <TabsTrigger value="courses" className="relative">
            Course Approvals
            {pendingCourses && pendingCourses.length > 0 && (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {pendingCourses.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="instructors" className="relative">
            Instructor Applications
            {pendingApps.length > 0 && (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {pendingApps.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="attempts">Purchase Attempts</TabsTrigger>
          <TabsTrigger value="retries">Payment Retries</TabsTrigger>
          <TabsTrigger value="all-courses">All Courses</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Site Content</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
          <TabsTrigger value="hub">Course Hub</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="progress">Student Progress</TabsTrigger>
        </TabsList>

        {/* Course Approvals */}
        <TabsContent value="courses">
          <Card className="border-0">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Pending Course Approvals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingCourses && pendingCourses.length > 0 ? (
                <div className="space-y-3">
                  {pendingCourses.map((course: any) => (
                    <div key={course.id} className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30">
                      <div className="flex-1">
                        <p className="font-medium">{course.title}</p>
                        <p className="text-sm text-muted-foreground">by {course.profiles?.full_name}</p>
                      </div>
                      <Button size="sm" onClick={() => approveCourse(course.id)}>
                        <CheckCircle className="mr-1 h-4 w-4" /> Approve
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No pending course approvals</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Instructor Applications */}
        <TabsContent value="instructors">
          <Card className="border-0">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Instructor Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {instructorApps && instructorApps.length > 0 ? (
                <div className="space-y-4">
                  {instructorApps.map((app: any) => (
                    <div key={app.id} className="p-4 rounded-lg bg-secondary/30 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-display font-semibold">
                            {app.profiles?.full_name || "Unknown User"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Applied {new Date(app.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          variant={
                            app.status === "approved"
                              ? "default"
                              : app.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {app.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                          {app.status === "approved" && <CheckCircle className="h-3 w-3 mr-1" />}
                          {app.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                          {app.status}
                        </Badge>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground font-medium">Expertise</p>
                          <p>{app.expertise}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground font-medium">Experience</p>
                          <p>{app.experience}</p>
                        </div>
                      </div>
                      <div className="text-sm">
                        <p className="text-muted-foreground font-medium">Bio</p>
                        <p>{app.bio}</p>
                      </div>
                      {app.website && (
                        <div className="text-sm">
                          <a className="text-muted-foreground font-medium"
                          
                            href={app.website}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {app.website}
                          </a>
                        </div>
                      )}
                      {app.status === "pending" && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              handleApplication.mutate({
                                appId: app.id,
                                userId: app.user_id,
                                action: "approved",
                              })
                            }
                            disabled={handleApplication.isPending}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handleApplication.mutate({
                                appId: app.id,
                                userId: app.user_id,
                                action: "rejected",
                              })
                            }
                            disabled={handleApplication.isPending}
                          >
                            <XCircle className="mr-1 h-4 w-4" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No instructor applications</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attempts">
          <PurchaseAttemptsPanel />
        </TabsContent>

        <TabsContent value="retries">
          <PaymentRetriesPanel />
        </TabsContent>

        <TabsContent value="all-courses">
          <CoursesManagement />
        </TabsContent>

        <TabsContent value="users">
          <UsersManagement />
        </TabsContent>

        <TabsContent value="content">
          <SiteContentEditor />
        </TabsContent>

        <TabsContent value="coupons">
          <CouponsManagement />
        </TabsContent>

        <TabsContent value="redemptions">
          <CouponRedemptions />
        </TabsContent>

        <TabsContent value="hub">
          <CoursePlayerHubAdminPanel />
        </TabsContent>

        <TabsContent value="revenue">
          <RevenueAnalyticsPanel />
        </TabsContent>

        <TabsContent value="progress">
          <StudentProgressPanel />
        </TabsContent>
        
      </Tabs>
    </div>
  );
}