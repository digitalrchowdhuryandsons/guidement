import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Users,
  BookOpen,
  DollarSign,
  TrendingUp,
  Shield,
  ShieldCheck,
  CheckCircle,
  XCircle,
  GraduationCap,
  Clock,
  Search,
  UserPlus,
  Crown,
  Activity,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

// super_admin is added via migration but types.ts may not reflect it yet
const isSuperAdmin = (hasRole: (role: any) => boolean) => hasRole("super_admin" as any);

export default function SuperAdminDashboard() {
  const { user, loading, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Platform stats
  const { data: stats } = useQuery({
    queryKey: ["superadmin-stats"],
    queryFn: async () => {
      const [courses, purchases, profiles, pendingApps, roles] = await Promise.all([
        supabase.from("courses").select("id, is_approved, is_published", { count: "exact" }),
        supabase.from("purchases").select("amount").eq("status", "completed"),
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("instructor_applications").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("user_roles").select("role"),
      ]);

      const roleCounts = (roles.data || []).reduce(
        (acc: Record<string, number>, r) => {
          acc[r.role] = (acc[r.role] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        totalCourses: courses.count || 0,
        totalUsers: profiles.count || 0,
        totalRevenue: purchases.data?.reduce((s, p) => s + Number(p.amount), 0) || 0,
        totalSales: purchases.data?.length || 0,
        pendingApps: pendingApps.count || 0,
        publishedCourses: courses.data?.filter((c) => c.is_published && c.is_approved).length || 0,
        pendingCourses: courses.data?.filter((c) => c.is_published && !c.is_approved).length || 0,
        roleCounts,
      };
    },
    enabled: !!user && isSuperAdmin(hasRole),
  });

  // All users with profiles and roles
  const { data: allUsers } = useQuery({
    queryKey: ["superadmin-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: roles } = await supabase.from("user_roles").select("*");

      return (profiles || []).map((p) => ({
        ...p,
        roles: (roles || []).filter((r) => r.user_id === p.user_id).map((r) => r.role),
      }));
    },
    enabled: !!user && isSuperAdmin(hasRole),
  });

  // Pending courses
  const { data: pendingCourses } = useQuery({
    queryKey: ["superadmin-pending-courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*, profiles!courses_instructor_profile_fkey(full_name)")
        .eq("is_published", true)
        .eq("is_approved", false);
      return data || [];
    },
    enabled: !!user && isSuperAdmin(hasRole),
  });

  // Instructor applications
  const { data: instructorApps } = useQuery({
    queryKey: ["superadmin-instructor-apps"],
    queryFn: async () => {
      const { data } = await supabase
        .from("instructor_applications")
        .select("*, profiles!instructor_applications_user_id_fkey(full_name, avatar_url)")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user && isSuperAdmin(hasRole),
  });

  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
      if (error) {
        if (error.message.includes("duplicate")) throw new Error("User already has this role");
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Role added successfully!");
      queryClient.invalidateQueries({ queryKey: ["superadmin-users"] });
      queryClient.invalidateQueries({ queryKey: ["superadmin-stats"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role removed!");
      queryClient.invalidateQueries({ queryKey: ["superadmin-users"] });
      queryClient.invalidateQueries({ queryKey: ["superadmin-stats"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Approve/reject course
  const handleCourse = async (courseId: string, approve: boolean) => {
    if (approve) {
      const { error } = await supabase.from("courses").update({ is_approved: true }).eq("id", courseId);
      if (error) toast.error(error.message);
      else toast.success("Course approved!");
    } else {
      const { error } = await supabase.from("courses").update({ is_published: false }).eq("id", courseId);
      if (error) toast.error(error.message);
      else toast.success("Course rejected and unpublished.");
    }
    queryClient.invalidateQueries({ queryKey: ["superadmin-pending-courses"] });
    queryClient.invalidateQueries({ queryKey: ["superadmin-stats"] });
  };

  // Handle instructor application
  const handleApp = useMutation({
    mutationFn: async ({ appId, userId, action }: { appId: string; userId: string; action: "approved" | "rejected" }) => {
      const { error } = await supabase
        .from("instructor_applications")
        .update({ status: action, updated_at: new Date().toISOString() })
        .eq("id", appId);
      if (error) throw error;

      if (action === "approved") {
        const { error: roleErr } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "instructor" });
        if (roleErr && !roleErr.message.includes("duplicate")) throw roleErr;
      }
    },
    onSuccess: (_, { action }) => {
      toast.success(action === "approved" ? "Instructor approved!" : "Application rejected.");
      queryClient.invalidateQueries({ queryKey: ["superadmin-instructor-apps"] });
      queryClient.invalidateQueries({ queryKey: ["superadmin-users"] });
      queryClient.invalidateQueries({ queryKey: ["superadmin-stats"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (loading) return null;
  if (!user || !isSuperAdmin(hasRole)) return <Navigate to="/dashboard" />;

  const filteredUsers = allUsers?.filter((u: any) => {
    const matchesSearch =
      !userSearch ||
      u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.user_id?.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = roleFilter === "all" || u.roles.includes(roleFilter);
    return matchesSearch && matchesRole;
  }) || [];

  const pendingApps = instructorApps?.filter((a: any) => a.status === "pending") || [];

  const roleColorMap: Record<string, string> = {
    student: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    instructor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    admin: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    super_admin: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-red-500/20 to-primary/20">
          <Crown className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">Full platform control and management</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: "Total Users", value: stats?.totalUsers || 0, color: "text-blue-500" },
          { icon: BookOpen, label: "Published Courses", value: stats?.publishedCourses || 0, color: "text-emerald-500" },
          { icon: DollarSign, label: "Total Revenue", value: `$${(stats?.totalRevenue || 0).toFixed(2)}`, color: "text-amber-500" },
          { icon: TrendingUp, label: "Total Sales", value: stats?.totalSales || 0, color: "text-primary" },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="border-0 bg-secondary/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Action Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {stats?.pendingCourses ? (
          <Card className="border-0 bg-amber-500/10 border border-amber-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-semibold text-sm">{stats.pendingCourses} courses</p>
                <p className="text-xs text-muted-foreground">awaiting approval</p>
              </div>
            </CardContent>
          </Card>
        ) : null}
        {stats?.pendingApps ? (
          <Card className="border-0 bg-blue-500/10 border border-blue-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <UserPlus className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-semibold text-sm">{stats.pendingApps} applications</p>
                <p className="text-xs text-muted-foreground">instructor requests</p>
              </div>
            </CardContent>
          </Card>
        ) : null}
        <Card className="border-0 bg-secondary/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold text-sm">Role Breakdown</p>
              <p className="text-xs text-muted-foreground">
                {stats?.roleCounts?.instructor || 0} instructors · {stats?.roleCounts?.admin || 0} admins
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-1" /> User Management
          </TabsTrigger>
          <TabsTrigger value="courses" className="relative">
            <BookOpen className="h-4 w-4 mr-1" /> Course Approvals
            {pendingCourses && pendingCourses.length > 0 && (
              <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {pendingCourses.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="instructors" className="relative">
            <GraduationCap className="h-4 w-4 mr-1" /> Instructor Apps
            {pendingApps.length > 0 && (
              <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {pendingApps.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* USER MANAGEMENT TAB */}
        <TabsContent value="users" className="space-y-4">
          <Card className="border-0">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                User & Role Management
              </CardTitle>
              <CardDescription>Manage user roles across the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users by name..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="student">Students</SelectItem>
                    <SelectItem value="instructor">Instructors</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                    <SelectItem value="super_admin">Super Admins</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Users list */}
              <div className="space-y-3">
                {filteredUsers.map((u: any) => (
                  <div
                    key={u.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg bg-secondary/30"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={u.avatar_url || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {u.full_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{u.full_name || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.user_id}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {u.roles.map((role: string) => (
                        <Badge
                          key={role}
                          variant="outline"
                          className={`text-xs ${roleColorMap[role] || ""}`}
                        >
                          {role === "super_admin" && <Crown className="h-3 w-3 mr-1" />}
                          {role === "admin" && <ShieldCheck className="h-3 w-3 mr-1" />}
                          {role === "instructor" && <GraduationCap className="h-3 w-3 mr-1" />}
                          {role}
                          {role !== "student" && u.user_id !== user?.id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="ml-1.5 hover:text-destructive">
                                  <XCircle className="h-3 w-3" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Role</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Remove the <strong>{role}</strong> role from{" "}
                                    <strong>{u.full_name || "this user"}</strong>?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      removeRoleMutation.mutate({ userId: u.user_id, role })
                                    }
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </Badge>
                      ))}

                      {/* Add Role */}
                      <Select
                        onValueChange={(role) =>
                          addRoleMutation.mutate({ userId: u.user_id, role })
                        }
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue placeholder="+ Add role" />
                        </SelectTrigger>
                        <SelectContent>
                          {(["student", "instructor", "admin", "super_admin"] as string[])
                            .filter((r) => !u.roles.includes(r))
                            .map((r) => (
                              <SelectItem key={r} value={r}>
                                {r}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No users found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COURSE APPROVALS TAB */}
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
                      <div className="w-16 h-10 rounded bg-muted overflow-hidden shrink-0">
                        {course.thumbnail_url ? (
                          <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center gradient-primary">
                            <span className="text-xs font-bold text-primary-foreground">
                              {course.title.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{course.title}</p>
                        <p className="text-xs text-muted-foreground">
                          by {(course as any).profiles?.full_name || "Unknown"} · ${course.price}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" onClick={() => handleCourse(course.id, true)}>
                          <CheckCircle className="mr-1 h-4 w-4" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCourse(course.id, false)}
                        >
                          <XCircle className="mr-1 h-4 w-4" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No pending course approvals</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* INSTRUCTOR APPLICATIONS TAB */}
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
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={app.profiles?.avatar_url || ""} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {app.profiles?.full_name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-display font-semibold text-sm">
                              {app.profiles?.full_name || "Unknown User"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Applied {new Date(app.created_at).toLocaleDateString()}
                            </p>
                          </div>
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
                          <p className="text-muted-foreground font-medium text-xs">Expertise</p>
                          <p className="text-sm">{app.expertise}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground font-medium text-xs">Experience</p>
                          <p className="text-sm">{app.experience}</p>
                        </div>
                      </div>
                      <div className="text-sm">
                        <p className="text-muted-foreground font-medium text-xs">Bio</p>
                        <p className="text-sm">{app.bio}</p>
                      </div>
                      {app.website && (
                        <div className="text-sm">
                          <p className="text-muted-foreground font-medium text-xs">Website</p>
                          <a
                            href={app.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm"
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
                              handleApp.mutate({ appId: app.id, userId: app.user_id, action: "approved" })
                            }
                            disabled={handleApp.isPending}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handleApp.mutate({ appId: app.id, userId: app.user_id, action: "rejected" })
                            }
                            disabled={handleApp.isPending}
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
      </Tabs>
    </div>
  );
}
