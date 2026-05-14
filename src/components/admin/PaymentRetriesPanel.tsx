import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RefreshCw, RotateCcw, ShoppingCart, Download } from "lucide-react";

function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((r) =>
      r
        .map((v) => {
          const s = String(v ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type Retry = {
  id: string;
  created_at: string;
  course_id: string;
  user_id: string;
  razorpay_order_id: string | null;
  event_type: "new_order" | "resume";
};

interface Props {
  /** When set, scope to a single instructor's courses. Otherwise show all (admin). */
  instructorId?: string;
}

export default function PaymentRetriesPanel({ instructorId }: Props) {
  const { data: retries = [], isLoading } = useQuery({
    queryKey: ["payment-retries", instructorId ?? "all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payment_retries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as Retry[];
    },
  });

  const courseIds = useMemo(
    () => Array.from(new Set(retries.map((r) => r.course_id))),
    [retries],
  );

  const { data: courses = [] } = useQuery({
    queryKey: ["pr-courses", courseIds],
    enabled: courseIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title, instructor_id")
        .in("id", courseIds);
      return data || [];
    },
  });

  const courseMap = useMemo(
    () => Object.fromEntries(courses.map((c: any) => [c.id, c])),
    [courses],
  );

  const scoped = useMemo(() => {
    if (!instructorId) return retries;
    return retries.filter((r) => courseMap[r.course_id]?.instructor_id === instructorId);
  }, [retries, courseMap, instructorId]);

  const perCourse = useMemo(() => {
    const map = new Map<string, { resumes: number; newOrders: number; users: Set<string> }>();
    for (const r of scoped) {
      const e = map.get(r.course_id) ?? { resumes: 0, newOrders: 0, users: new Set() };
      if (r.event_type === "resume") e.resumes++;
      else e.newOrders++;
      e.users.add(r.user_id);
      map.set(r.course_id, e);
    }
    return Array.from(map.entries())
      .map(([course_id, v]) => ({
        course_id,
        title: courseMap[course_id]?.title ?? course_id.slice(0, 8),
        resumes: v.resumes,
        newOrders: v.newOrders,
        uniqueUsers: v.users.size,
      }))
      .sort((a, b) => b.resumes + b.newOrders - (a.resumes + a.newOrders));
  }, [scoped, courseMap]);

  const totals = useMemo(() => {
    const resumes = scoped.filter((r) => r.event_type === "resume").length;
    return {
      resumes,
      newOrders: scoped.length - resumes,
      total: scoped.length,
    };
  }, [scoped]);

  const perUser = useMemo(() => {
    const map = new Map<string, { resumes: number; newOrders: number; courses: Set<string> }>();
    for (const r of scoped) {
      const e = map.get(r.user_id) ?? { resumes: 0, newOrders: 0, courses: new Set() };
      if (r.event_type === "resume") e.resumes++;
      else e.newOrders++;
      e.courses.add(r.course_id);
      map.set(r.user_id, e);
    }
    return Array.from(map.entries())
      .map(([user_id, v]) => ({
        user_id,
        resumes: v.resumes,
        newOrders: v.newOrders,
        uniqueCourses: v.courses.size,
      }))
      .sort((a, b) => b.resumes + b.newOrders - (a.resumes + a.newOrders));
  }, [scoped]);

  const exportPerCourse = () => {
    const rows: (string | number)[][] = [
      ["Course ID", "Course Title", "New Checkouts", "Resumes", "Unique Users"],
      ...perCourse.map((r) => [r.course_id, r.title, r.newOrders, r.resumes, r.uniqueUsers]),
    ];
    downloadCsv(`payment-retries-by-course-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  };

  const exportPerUser = async () => {
    const userIds = perUser.map((r) => r.user_id);
    let userMap: Record<string, { email: string | null; full_name: string | null }> = {};
    if (userIds.length > 0) {
      const { data, error } = await (supabase as any).rpc("get_retry_user_details", {
        _user_ids: userIds,
      });
      if (!error && Array.isArray(data)) {
        userMap = Object.fromEntries(
          data.map((u: any) => [u.user_id, { email: u.email, full_name: u.full_name }]),
        );
      }
    }
    const rows: (string | number)[][] = [
      ["User ID", "Name", "Email", "New Checkouts", "Resumes", "Unique Courses"],
      ...perUser.map((r) => [
        r.user_id,
        userMap[r.user_id]?.full_name ?? "",
        userMap[r.user_id]?.email ?? "",
        r.newOrders,
        r.resumes,
        r.uniqueCourses,
      ]),
    ];
    downloadCsv(`payment-retries-by-user-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  };

  const exportRaw = () => {
    const rows: (string | number)[][] = [
      ["Created At", "Event Type", "Course ID", "Course Title", "User ID", "Razorpay Order ID"],
      ...scoped.map((r) => [
        r.created_at,
        r.event_type,
        r.course_id,
        courseMap[r.course_id]?.title ?? "",
        r.user_id,
        r.razorpay_order_id ?? "",
      ]),
    ];
    downloadCsv(`payment-retries-events-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  };

  return (
    <Card className="border-0">
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="font-display flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-primary" />
          Checkout Resumes & Retries
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={exportPerCourse} disabled={perCourse.length === 0}>
            <Download className="h-4 w-4" /> Per course CSV
          </Button>
          <Button size="sm" variant="outline" onClick={exportPerUser} disabled={perUser.length === 0}>
            <Download className="h-4 w-4" /> Per user CSV
          </Button>
          <Button size="sm" variant="outline" onClick={exportRaw} disabled={scoped.length === 0}>
            <Download className="h-4 w-4" /> Raw events CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <Card className="border-0 bg-secondary/50">
            <CardContent className="p-4 flex items-center gap-3">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-display font-bold">{totals.newOrders}</p>
                <p className="text-xs text-muted-foreground">New checkouts</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-secondary/50">
            <CardContent className="p-4 flex items-center gap-3">
              <RotateCcw className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-display font-bold">{totals.resumes}</p>
                <p className="text-xs text-muted-foreground">Resumed payments</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-secondary/50">
            <CardContent className="p-4 flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-display font-bold">
                  {totals.newOrders > 0
                    ? `${Math.round((totals.resumes / totals.newOrders) * 100)}%`
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Retry rate</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-lg border bg-secondary/20 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead className="text-right">New checkouts</TableHead>
                <TableHead className="text-right">Resumes</TableHead>
                <TableHead className="text-right">Unique users</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : perCourse.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No checkout activity yet
                  </TableCell>
                </TableRow>
              ) : (
                perCourse.map((row) => (
                  <TableRow key={row.course_id}>
                    <TableCell className="font-medium">{row.title}</TableCell>
                    <TableCell className="text-right">{row.newOrders}</TableCell>
                    <TableCell className="text-right">
                      {row.resumes > 0 ? (
                        <Badge variant="secondary">{row.resumes}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{row.uniqueUsers}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
