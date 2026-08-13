import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileBarChart, Download } from "lucide-react";

function toCsv(rows: (string | number)[][]) {
  return rows.map((r) => r.map((v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(",")).join("\n");
}
function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

export default function ReportsPanel() {
  const { data: report, isLoading } = useQuery({
    queryKey: ["reports-summary"],
    queryFn: async () => {
      const [purchasesRes, coursesRes, certsRes, reviewsRes] = await Promise.all([
        supabase.from("purchases").select("amount, course_id, user_id, created_at, status"),
        supabase.from("courses").select("id, title, is_published"),
        (supabase as any).from("student_certificates").select("id"),
        supabase.from("reviews").select("rating"),
      ]);
      const completed = (purchasesRes.data || []).filter((p: any) => p.status === "completed");
      const totalRevenue = completed.reduce((s: number, p: any) => s + Number(p.amount), 0);
      const revenueByCourse = new Map<string, number>();
      for (const p of completed) revenueByCourse.set(p.course_id, (revenueByCourse.get(p.course_id) || 0) + Number(p.amount));
      const courseMap = new Map((coursesRes.data || []).map((c: any) => [c.id, c.title]));
      const topCourseEntry = Array.from(revenueByCourse.entries()).sort((a, b) => b[1] - a[1])[0];
      const ratings = (reviewsRes.data || []).map((r: any) => r.rating);

      const monthly = new Map<string, { revenue: number; sales: number }>();
      for (const p of completed) {
        const k = p.created_at.slice(0, 7);
        const e = monthly.get(k) ?? { revenue: 0, sales: 0 };
        e.revenue += Number(p.amount);
        e.sales += 1;
        monthly.set(k, e);
      }

      return {
        totalRevenue,
        totalSales: completed.length,
        totalStudents: new Set(completed.map((p: any) => p.user_id)).size,
        publishedCourses: (coursesRes.data || []).filter((c: any) => c.is_published).length,
        certificatesIssued: (certsRes.data || []).length,
        avgRating: ratings.length ? Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 100) / 100 : null,
        topCourse: topCourseEntry ? { title: courseMap.get(topCourseEntry[0]) || "Unknown", revenue: topCourseEntry[1] } : null,
        monthly: Array.from(monthly.entries()).sort(([a], [b]) => a.localeCompare(b)),
      };
    },
  });

  const exportReport = () => {
    if (!report) return;
    const rows: (string | number)[][] = [
      ["Metric", "Value"],
      ["Total revenue", report.totalRevenue],
      ["Total completed sales", report.totalSales],
      ["Unique paying students", report.totalStudents],
      ["Published courses", report.publishedCourses],
      ["Certificates issued", report.certificatesIssued],
      ["Average rating", report.avgRating ?? "N/A"],
      ["Top course", report.topCourse?.title ?? "N/A"],
      [],
      ["Month", "Revenue", "Sales"],
      ...report.monthly.map(([m, v]) => [m, v.revenue, v.sales]),
    ];
    downloadCsv(`platform-report-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  };

  return (
    <Card className="border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display flex items-center gap-2"><FileBarChart className="h-5 w-5 text-primary" /> Reports</CardTitle>
        <Button size="sm" variant="outline" onClick={exportReport} disabled={!report}><Download className="mr-1 h-4 w-4" /> Export full report CSV</Button>
      </CardHeader>
      <CardContent>
        {isLoading || !report ? (
          <p className="py-8 text-center text-muted-foreground">Crunching numbers…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Total revenue</p><p className="text-2xl font-bold">${report.totalRevenue.toFixed(2)}</p></div>
            <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Completed sales</p><p className="text-2xl font-bold">{report.totalSales}</p></div>
            <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Paying students</p><p className="text-2xl font-bold">{report.totalStudents}</p></div>
            <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Published courses</p><p className="text-2xl font-bold">{report.publishedCourses}</p></div>
            <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Certificates issued</p><p className="text-2xl font-bold">{report.certificatesIssued}</p></div>
            <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Average rating</p><p className="text-2xl font-bold">{report.avgRating ?? "—"}</p></div>
            {report.topCourse && (
              <div className="rounded-lg border p-4 sm:col-span-2 lg:col-span-3"><p className="text-xs text-muted-foreground">Top revenue course</p><p className="text-lg font-semibold">{report.topCourse.title} — ${report.topCourse.revenue.toFixed(2)}</p></div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
