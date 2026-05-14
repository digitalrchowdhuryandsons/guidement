import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BookOpen, Award, Clock, TrendingUp, Receipt, Sparkles, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function Dashboard() {
  const { user, loading, hasRole } = useAuth();

  const { data: purchases } = useQuery({
    queryKey: ["my-purchases", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("purchases")
        .select("*, courses(*, profiles!courses_instructor_profile_fkey(full_name))")
        .eq("user_id", user!.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/auth" />;

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">My Learning</h1>
        <p className="text-muted-foreground">Track your progress and continue learning</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: BookOpen, label: "Enrolled Courses", value: purchases?.length || 0 },
          { icon: Clock, label: "Hours Learned", value: "0" },
          { icon: Award, label: "Certificates", value: "0" },
          { icon: TrendingUp, label: "Streak", value: "0 days" },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="border-0 bg-secondary/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-display font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasRole("instructor") && (
        <Card className="border-0 gradient-primary text-primary-foreground">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold">Instructor Dashboard</h3>
              <p className="text-sm opacity-90">Manage your courses and view analytics</p>
            </div>
            <Link to="/instructor/dashboard">
              <Button variant="secondary">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!hasRole("instructor") && (
        <Card className="border-0 bg-gradient-to-r from-primary/10 to-accent/30">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold">Become an Instructor</h3>
              <p className="text-sm text-muted-foreground">Share your knowledge and earn revenue on Guidement</p>
            </div>
            <Link to="/become-instructor">
              <Button className="gradient-primary text-primary-foreground">Apply Now</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="font-display text-xl font-bold mb-4">Enrolled Courses</h2>
        {purchases && purchases.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {purchases.map((purchase: any) => (
              <Card key={purchase.id} className="overflow-hidden border-0 shadow-sm hover:shadow-glow transition-all">
                <div className="aspect-video bg-muted">
                  {purchase.courses?.thumbnail_url ? (
                    <img src={purchase.courses.thumbnail_url} alt={purchase.courses.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center gradient-primary">
                      <span className="text-2xl font-bold text-primary-foreground">{purchase.courses?.title?.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-display font-semibold text-sm line-clamp-2">{purchase.courses?.title}</h3>
                  <p className="text-xs text-muted-foreground">{purchase.courses?.profiles?.full_name}</p>
                  <Progress value={0} className="h-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">0% complete</span>
                    <Link to={`/learn/${purchase.courses?.slug}`}>
                      <Button size="sm" variant="ghost" className="text-xs">Continue</Button>
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
              <p className="text-sm text-muted-foreground mb-4">Start your learning journey today!</p>
              <Link to="/courses"><Button className="gradient-primary text-primary-foreground">Browse Courses</Button></Link>
            </CardContent>
          </Card>
        )}
      </div>

      {purchases && purchases.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Recently Unlocked
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {purchases.slice(0, 3).map((p: any) => (
              <Card key={`recent-${p.id}`} className="border-0 bg-gradient-to-br from-primary/10 to-accent/20 hover:shadow-glow transition-all">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">Just unlocked</Badge>
                    <span className="text-xs text-muted-foreground">{format(new Date(p.created_at), "MMM d")}</span>
                  </div>
                  <h3 className="font-display font-semibold line-clamp-2">{p.courses?.title}</h3>
                  <p className="text-xs text-muted-foreground">{p.courses?.profiles?.full_name}</p>
                  <Link to={`/learn/${p.courses?.slug}`}>
                    <Button size="sm" className="w-full gradient-primary text-primary-foreground">
                      Jump back in <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" /> Purchase History
        </h2>
        {purchases && purchases.length > 0 ? (
          <Card className="border-0 bg-secondary/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((p: any) => (
                    <TableRow key={`hist-${p.id}`}>
                      <TableCell className="font-medium">{p.courses?.title}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{format(new Date(p.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell>₹{Number(p.amount).toFixed(2)}</TableCell>
                      <TableCell><Badge variant="secondary" className="capitalize">{p.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Link to={`/learn/${p.courses?.slug}`}>
                          <Button size="sm" variant="ghost">Continue</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 bg-secondary/50">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No purchases yet. Browse courses to get started.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
