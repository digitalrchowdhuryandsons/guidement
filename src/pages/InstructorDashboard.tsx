import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PaymentRetriesPanel from "@/components/admin/PaymentRetriesPanel";
import {
  Plus,
  BookOpen,
  DollarSign,
  Users,
  Star,
  Eye,
  EyeOff,
  TrendingUp,
  BarChart3,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHART_COLORS = [
  "hsl(262, 83%, 58%)",
  "hsl(280, 90%, 65%)",
  "hsl(200, 90%, 55%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
];

export default function InstructorDashboard() {
  const { user, loading, hasRole } = useAuth();

  const { data: courses } = useQuery({
    queryKey: ["instructor-courses", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*, categories(name)")
        .eq("instructor_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: allPurchases } = useQuery({
    queryKey: ["instructor-all-purchases", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("purchases")
        .select("amount, course_id, created_at, courses(title)")
        .in("course_id", courses?.map((c) => c.id) || [])
        .eq("status", "completed")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!courses && courses.length > 0,
  });

  const { data: reviews } = useQuery({
    queryKey: ["instructor-reviews", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("rating, comment, created_at, course_id, courses(title), profiles!reviews_user_profile_fkey(full_name)")
        .in("course_id", courses?.map((c) => c.id) || [])
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!courses && courses.length > 0,
  });

  if (loading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  if (!user) return <Navigate to="/auth" />;
  if (!hasRole("instructor")) return <Navigate to="/dashboard" />;

  const totalRevenue = allPurchases?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const totalStudents = allPurchases?.length || 0;
  const avgRating =
    reviews && reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "N/A";
  const publishedCount = courses?.filter((c) => c.is_published).length || 0;

  // Revenue by month (last 6 months)
  const revenueByMonth = (() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      months[key] = 0;
    }
    allPurchases?.forEach((p) => {
      const d = new Date(p.created_at);
      const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (key in months) months[key] += Number(p.amount);
    });
    return Object.entries(months).map(([month, revenue]) => ({ month, revenue }));
  })();

  // Students per course for pie chart
  const studentsByCourse = (() => {
    const map: Record<string, { name: string; count: number }> = {};
    allPurchases?.forEach((p: any) => {
      const title = p.courses?.title || "Unknown";
      if (!map[p.course_id]) map[p.course_id] = { name: title, count: 0 };
      map[p.course_id].count++;
    });
    return Object.values(map).slice(0, 5);
  })();

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Instructor Dashboard</h1>
          <p className="text-muted-foreground">Manage your courses and track performance</p>
        </div>
        <Link to="/instructor/create-course">
          <Button className="gradient-primary text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" /> New Course
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { icon: BookOpen, label: "Total Courses", value: courses?.length || 0 },
          { icon: Eye, label: "Published", value: publishedCount },
          { icon: Users, label: "Total Students", value: totalStudents },
          { icon: DollarSign, label: "Revenue", value: `$${totalRevenue.toFixed(2)}` },
          { icon: Star, label: "Avg Rating", value: avgRating },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="border-0 bg-secondary/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-display font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="courses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-4">
          {courses && courses.length > 0 ? (
            <div className="space-y-3">
              {courses.map((course: any) => (
                <Card key={course.id} className="border-0 bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-16 w-24 rounded-lg overflow-hidden bg-muted shrink-0">
                      {course.thumbnail_url ? (
                        <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center gradient-primary">
                          <span className="font-bold text-primary-foreground">{course.title.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold truncate">{course.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant={course.is_published ? "default" : "secondary"} className="text-xs">
                          {course.is_published ? (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              Published
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3 mr-1" />
                              Draft
                            </>
                          )}
                        </Badge>
                        {course.is_approved && (
                          <Badge className="text-xs bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]">
                            Approved
                          </Badge>
                        )}
                        {course.categories?.name && (
                          <Badge variant="outline" className="text-xs">
                            {course.categories.name}
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">${Number(course.price).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/course/${course.slug}`}>
                        <Button variant="ghost" size="sm">
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link to={`/instructor/edit-course/${course.id}`}>
                        <Button variant="outline" size="sm">Edit</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-0 bg-secondary/50">
              <CardContent className="p-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-display text-lg font-bold mb-2">No courses yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Create your first course and start teaching!</p>
                <Link to="/instructor/create-course">
                  <Button className="gradient-primary text-primary-foreground">Create Course</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <Card className="border-0 bg-secondary/30">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Revenue (Last 6 Months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--foreground))",
                        }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                      />
                      <Bar dataKey="revenue" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Students per Course */}
            <Card className="border-0 bg-secondary/30">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Students by Course
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {studentsByCourse.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={studentsByCourse}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, count }) => `${name.slice(0, 15)}… (${count})`}
                        >
                          {studentsByCourse.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            color: "hsl(var(--foreground))",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                      No enrollment data yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Purchases */}
          <Card className="border-0 bg-secondary/30">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Recent Enrollments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allPurchases && allPurchases.length > 0 ? (
                <div className="space-y-3">
                  {allPurchases.slice(0, 10).map((p: any, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{p.courses?.title || "Course"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary" className="font-mono">
                        +${Number(p.amount).toFixed(2)}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No enrollments yet</p>
              )}
            </CardContent>
          </Card>

          <PaymentRetriesPanel instructorId={user.id} />
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-4">
          {reviews && reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map((review: any, i) => (
                <Card key={i} className="border-0 bg-secondary/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{review.courses?.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          by {review.profiles?.full_name || "Student"} •{" "}
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star
                            key={j}
                            className={`h-4 w-4 ${j < review.rating ? "text-warning fill-warning" : "text-muted-foreground"}`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-0 bg-secondary/50">
              <CardContent className="p-12 text-center">
                <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-display text-lg font-bold mb-2">No reviews yet</h3>
                <p className="text-sm text-muted-foreground">Reviews will appear here as students rate your courses</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
