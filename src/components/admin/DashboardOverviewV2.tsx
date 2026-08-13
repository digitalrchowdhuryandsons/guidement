import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Star, Award, Flame, Zap, PlusCircle, Radio, CalendarClock,
} from "lucide-react";

type Range = "7D" | "30D" | "90D" | "12M";

interface Props {
  onNavigate: (tab: string) => void;
}

const rangeDays: Record<Range, number> = { "7D": 7, "30D": 30, "90D": 90, "12M": 365 };

const cardCls = "rounded-2xl border border-white/10 bg-[#1e1836] p-5";

export default function DashboardOverviewV2({ onNavigate }: Props) {
  const [range, setRange] = useState<Range>("30D");

  const { data: hero } = useQuery({
    queryKey: ["v2-hero"],
    queryFn: async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const [presenceRes, progressTodayRes, npsRes, reviewsRes, coursesCountRes] = await Promise.all([
        (supabase as any).from("user_presence").select("user_id", { count: "exact", head: true }).gte("last_seen_at", fiveMinAgo),
        supabase.from("progress").select("lecture_id").eq("completed", true).gte("updated_at", todayStart),
        (supabase as any).from("nps_responses").select("score").gte("created_at", monthStart),
        supabase.from("reviews").select("rating"),
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("is_published", true).gte("created_at", monthStart),
      ]);

      const lectureIds = Array.from(new Set((progressTodayRes.data || []).map((p: any) => p.lecture_id)));
      const { data: lectureDurations } = lectureIds.length
        ? await supabase.from("lectures").select("id, duration").in("id", lectureIds)
        : { data: [] as any[] };
      const durationMap = new Map((lectureDurations || []).map((l: any) => [l.id, l.duration || 0]));
      const secondsWatched = (progressTodayRes.data || []).reduce((sum: number, p: any) => sum + (durationMap.get(p.lecture_id) || 0), 0);

      const npsScores = (npsRes.data || []).map((r: any) => r.score);
      const promoters = npsScores.filter((s: number) => s >= 9).length;
      const detractors = npsScores.filter((s: number) => s <= 6).length;
      const nps = npsScores.length > 0 ? Math.round(((promoters - detractors) / npsScores.length) * 100) : null;

      const ratings = (reviewsRes.data || []).map((r: any) => r.rating);
      const avgRating = ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : null;

      return {
        activeNow: presenceRes.count || 0,
        hoursWatchedToday: Math.round((secondsWatched / 3600) * 10) / 10,
        nps,
        avgRating,
        newCoursesThisMonth: coursesCountRes.count || 0,
      };
    },
  });

  const { data: statCards } = useQuery({
    queryKey: ["v2-stat-cards"],
    queryFn: async () => {
      const months: string[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }
      const rangeStart = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

      const [purchasesRes, coursesRes, certsRes] = await Promise.all([
        supabase.from("purchases").select("amount, user_id, created_at, status").gte("created_at", rangeStart),
        supabase.from("courses").select("id, is_published, created_at"),
        (supabase as any).from("student_certificates").select("issued_at").gte("issued_at", rangeStart),
      ]);

      const monthKey = (iso: string) => iso.slice(0, 7);
      const bucket = (rows: any[], dateField: string, valueFn: (r: any) => number) => {
        const map = new Map(months.map((m) => [m, 0]));
        for (const r of rows) {
          const k = monthKey(r[dateField]);
          if (map.has(k)) map.set(k, (map.get(k) || 0) + valueFn(r));
        }
        return months.map((m) => map.get(m) || 0);
      };

      const completed = (purchasesRes.data || []).filter((p: any) => p.status === "completed");
      const revenueSeries = bucket(completed, "created_at", (p) => Number(p.amount));
      const studentSeries = (() => {
        const seenByMonth = new Map(months.map((m) => [m, new Set<string>()]));
        for (const p of completed) {
          const k = monthKey(p.created_at);
          if (seenByMonth.has(k)) seenByMonth.get(k)!.add(p.user_id);
        }
        return months.map((m) => seenByMonth.get(m)!.size);
      })();
      const liveCoursesSeries = bucket((coursesRes.data || []).filter((c: any) => c.is_published), "created_at", () => 1);
      const certSeries = bucket(certsRes.data || [], "issued_at", () => 1);

      const pctChange = (series: number[]) => {
        const last = series[series.length - 1] || 0;
        const prev = series[series.length - 2] || 0;
        if (prev === 0) return last > 0 ? 100 : 0;
        return Math.round(((last - prev) / prev) * 100);
      };

      return {
        revenue: { total: revenueSeries.reduce((a, b) => a + b, 0), series: revenueSeries, change: pctChange(revenueSeries) },
        students: { total: new Set(completed.map((p: any) => p.user_id)).size, series: studentSeries, change: pctChange(studentSeries) },
        liveCourses: { total: (coursesRes.data || []).filter((c: any) => c.is_published).length, series: liveCoursesSeries, change: pctChange(liveCoursesSeries) },
        certificates: { total: certSeries.reduce((a, b) => a + b, 0), series: certSeries, change: pctChange(certSeries) },
      };
    },
  });

  const { data: chartData = [] } = useQuery({
    queryKey: ["v2-enroll-vs-complete", range],
    queryFn: async () => {
      const days = rangeDays[range];
      const buckets = range === "12M" ? 12 : Math.min(days, 30);
      const bucketSizeDays = days / buckets;
      const start = new Date(Date.now() - days * 86400000);

      const [purchasesRes, certsRes] = await Promise.all([
        supabase.from("purchases").select("created_at").eq("status", "completed").gte("created_at", start.toISOString()),
        (supabase as any).from("student_certificates").select("issued_at").gte("issued_at", start.toISOString()),
      ]);

      const bucketIndex = (iso: string) => {
        const diffDays = (new Date(iso).getTime() - start.getTime()) / 86400000;
        return Math.max(0, Math.min(buckets - 1, Math.floor(diffDays / bucketSizeDays)));
      };

      const enrollments = new Array(buckets).fill(0);
      const completions = new Array(buckets).fill(0);
      for (const p of purchasesRes.data || []) enrollments[bucketIndex(p.created_at)]++;
      for (const c of certsRes.data || []) completions[bucketIndex(c.issued_at)]++;

      return enrollments.map((e, i) => ({ enrollments: e, completions: completions[i] }));
    },
  });

  const quarterLabel = useMemo(() => {
    const d = new Date();
    return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
  }, []);

  const { data: goalProgress } = useQuery({
    queryKey: ["v2-quarterly-goals", quarterLabel],
    queryFn: async () => {
      const { data: goal } = await (supabase as any).from("quarterly_goals").select("*").eq("quarter_label", quarterLabel).maybeSingle();

      const { data: purchases } = await supabase.from("purchases").select("course_id, user_id, created_at").eq("status", "completed");
      const courseIds = Array.from(new Set((purchases || []).map((p: any) => p.course_id)));
      const userIds = Array.from(new Set((purchases || []).map((p: any) => p.user_id)));
      const { data: sections } = courseIds.length ? await supabase.from("sections").select("id, course_id").in("course_id", courseIds) : { data: [] as any[] };
      const sectionIds = (sections || []).map((s: any) => s.id);
      const { data: lectures } = sectionIds.length ? await supabase.from("lectures").select("id, section_id").in("section_id", sectionIds) : { data: [] as any[] };
      const sectionToCourse = new Map((sections || []).map((s: any) => [s.id, s.course_id]));
      const lectureToCourse = new Map((lectures || []).map((l: any) => [l.id, sectionToCourse.get(l.section_id)]));
      const totalsByCourse = new Map<string, number>();
      for (const l of lectures || []) {
        const cid = lectureToCourse.get(l.id);
        if (cid) totalsByCourse.set(cid, (totalsByCourse.get(cid) || 0) + 1);
      }
      const lectureIds = (lectures || []).map((l: any) => l.id);
      const { data: progressRows } = lectureIds.length && userIds.length
        ? await supabase.from("progress").select("user_id, lecture_id, completed, updated_at").in("lecture_id", lectureIds).in("user_id", userIds).eq("completed", true)
        : { data: [] as any[] };
      const doneMap = new Map<string, number>();
      for (const p of progressRows || []) {
        const cid = lectureToCourse.get(p.lecture_id);
        if (!cid) continue;
        const key = `${cid}|${p.user_id}`;
        doneMap.set(key, (doneMap.get(key) || 0) + 1);
      }
      let sumPct = 0, count = 0;
      for (const p of purchases || []) {
        const total = totalsByCourse.get(p.course_id) || 0;
        if (total === 0) continue;
        sumPct += (doneMap.get(`${p.course_id}|${p.user_id}`) || 0) / total;
        count++;
      }
      const completionActual = count > 0 ? Math.round((sumPct / count) * 100) : 0;

      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: npsRows } = await (supabase as any).from("nps_responses").select("score").gte("created_at", monthStart);
      const scores = (npsRows || []).map((r: any) => r.score);
      const promoters = scores.filter((s: number) => s >= 9).length;
      const detractors = scores.filter((s: number) => s <= 6).length;
      const npsActual = scores.length > 0 ? Math.round(((promoters - detractors) / scores.length) * 100) : 0;

      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
      const oldEnrollments = (purchases || []).filter((p: any) => new Date(p.created_at) < ninetyDaysAgo);
      const oldUserIds = new Set(oldEnrollments.map((p: any) => p.user_id));
      const recentActiveUserIds = new Set((progressRows || []).filter((p: any) => new Date(p.updated_at) > new Date(Date.now() - 30 * 86400000)).map((p: any) => p.user_id));
      let retained = 0;
      oldUserIds.forEach((uid) => { if (recentActiveUserIds.has(uid)) retained++; });
      const retentionActual = oldUserIds.size > 0 ? Math.round((retained / oldUserIds.size) * 100) : 0;

      const targets = goal || { completion_target: 80, nps_target: 60, retention_target: 70 };
      const overall = Math.round(
        ((completionActual / targets.completion_target) * 100 +
          (Math.max(npsActual, 0) / Math.max(targets.nps_target, 1)) * 100 +
          (retentionActual / targets.retention_target) * 100) / 3
      );

      return {
        completion: { actual: completionActual, target: targets.completion_target },
        nps: { actual: npsActual, target: targets.nps_target },
        retention: { actual: retentionActual, target: targets.retention_target },
        overall: Math.min(overall, 999),
        hasGoal: !!goal,
      };
    },
  });

  const { data: topCourses = [] } = useQuery({
    queryKey: ["v2-top-courses"],
    queryFn: async () => {
      const { data: courses } = await supabase.from("courses").select("id, title, price, thumbnail_url, category_id, categories(name)").eq("is_published", true);
      if (!courses || courses.length === 0) return [];
      const courseIds = courses.map((c: any) => c.id);
      const { data: purchases } = await supabase.from("purchases").select("course_id, user_id, amount").eq("status", "completed").in("course_id", courseIds);
      const { data: reviews } = await supabase.from("reviews").select("course_id, rating").in("course_id", courseIds);

      const revenueByCourse = new Map<string, number>();
      const studentsByCourse = new Map<string, Set<string>>();
      for (const p of purchases || []) {
        revenueByCourse.set(p.course_id, (revenueByCourse.get(p.course_id) || 0) + Number(p.amount));
        if (!studentsByCourse.has(p.course_id)) studentsByCourse.set(p.course_id, new Set());
        studentsByCourse.get(p.course_id)!.add(p.user_id);
      }
      const ratingsByCourse = new Map<string, number[]>();
      for (const r of reviews || []) {
        if (!ratingsByCourse.has(r.course_id)) ratingsByCourse.set(r.course_id, []);
        ratingsByCourse.get(r.course_id)!.push(r.rating);
      }

      return courses
        .map((c: any) => {
          const ratings = ratingsByCourse.get(c.id) || [];
          return {
            id: c.id,
            title: c.title,
            price: c.price,
            thumbnail: c.thumbnail_url,
            category: c.categories?.name || "General",
            revenue: revenueByCourse.get(c.id) || 0,
            students: studentsByCourse.get(c.id)?.size || 0,
            rating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
          };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 4);
    },
  });

  const { data: liveActivity = [] } = useQuery({
    queryKey: ["v2-live-activity"],
    queryFn: async () => {
      const [purchasesRes, reviewsRes, certsRes] = await Promise.all([
        supabase.from("purchases").select("id, created_at, user_id, courses(title)").eq("status", "completed").order("created_at", { ascending: false }).limit(6),
        supabase.from("reviews").select("id, created_at, rating, user_id, courses(title)").order("created_at", { ascending: false }).limit(6),
        (supabase as any).from("student_certificates").select("id, issued_at, user_id, courses(title)").order("issued_at", { ascending: false }).limit(6),
      ]);
      const userIds = Array.from(new Set([
        ...(purchasesRes.data || []).map((p: any) => p.user_id),
        ...(reviewsRes.data || []).map((r: any) => r.user_id),
        ...(certsRes.data || []).map((c: any) => c.user_id),
      ]));
      const { data: profiles } = userIds.length ? await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds) : { data: [] as any[] };
      const nameMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name || "A student"]));

      type Event = { id: string; icon: "enroll" | "review" | "cert"; text: string; time: string };
      const events: Event[] = [];
      for (const p of purchasesRes.data || []) events.push({ id: `e-${p.id}`, icon: "enroll", text: `${nameMap.get(p.user_id)} enrolled in ${(p as any).courses?.title || "a course"}`, time: p.created_at });
      for (const r of reviewsRes.data || []) events.push({ id: `r-${r.id}`, icon: "review", text: `${nameMap.get(r.user_id)} left a ${r.rating}-star review on ${(r as any).courses?.title || "a course"}`, time: r.created_at });
      for (const c of certsRes.data || []) events.push({ id: `c-${c.id}`, icon: "cert", text: `${nameMap.get(c.user_id)} earned a certificate`, time: c.issued_at });

      return events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6);
    },
  });

  const { data: todaySchedule = [] } = useQuery({
    queryKey: ["v2-today-schedule"],
    queryFn: async () => {
      const start = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      const end = new Date(new Date().setHours(23, 59, 59, 999)).toISOString();
      const { data, error } = await supabase
        .from("course_workshops")
        .select("id, title, starts_at, meeting_url, courses(title)")
        .gte("starts_at", start)
        .lte("starts_at", end)
        .order("starts_at");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: topInstructors = [] } = useQuery({
    queryKey: ["v2-top-instructors"],
    queryFn: async () => {
      const { data: courses } = await supabase.from("courses").select("id, instructor_id");
      if (!courses || courses.length === 0) return [];
      const instructorIds = Array.from(new Set(courses.map((c: any) => c.instructor_id)));
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", instructorIds);
      const { data: purchases } = await supabase.from("purchases").select("course_id, user_id").eq("status", "completed");
      const { data: reviews } = await supabase.from("reviews").select("course_id, rating");

      const courseToInstructor = new Map(courses.map((c: any) => [c.id, c.instructor_id]));
      const studentsByInstructor = new Map<string, Set<string>>();
      for (const p of purchases || []) {
        const inst = courseToInstructor.get(p.course_id);
        if (!inst) continue;
        if (!studentsByInstructor.has(inst)) studentsByInstructor.set(inst, new Set());
        studentsByInstructor.get(inst)!.add(p.user_id);
      }
      const ratingsByInstructor = new Map<string, number[]>();
      for (const r of reviews || []) {
        const inst = courseToInstructor.get(r.course_id);
        if (!inst) continue;
        if (!ratingsByInstructor.has(inst)) ratingsByInstructor.set(inst, []);
        ratingsByInstructor.get(inst)!.push(r.rating);
      }

      return (profiles || [])
        .map((p: any) => {
          const ratings = ratingsByInstructor.get(p.user_id) || [];
          return {
            user_id: p.user_id,
            name: p.full_name || "Unnamed instructor",
            students: studentsByInstructor.get(p.user_id)?.size || 0,
            rating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100 : null,
          };
        })
        .sort((a, b) => b.students - a.students)
        .slice(0, 4);
    },
  });

  const { data: certsThisWeek } = useQuery({
    queryKey: ["v2-certs-this-week"],
    queryFn: async () => {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { count } = await (supabase as any).from("student_certificates").select("id", { count: "exact", head: true }).gte("issued_at", weekAgo);
      return count || 0;
    },
  });

  const { data: trending } = useQuery({
    queryKey: ["v2-trending-category"],
    queryFn: async () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: purchases } = await supabase.from("purchases").select("created_at, course_id, courses(category_id, categories(name))").eq("status", "completed").gte("created_at", twoWeeksAgo);
      const thisWeek = new Map<string, number>();
      const lastWeek = new Map<string, number>();
      for (const p of purchases || []) {
        const name = (p as any).courses?.categories?.name || "Uncategorized";
        if (p.created_at >= weekAgo) thisWeek.set(name, (thisWeek.get(name) || 0) + 1);
        else lastWeek.set(name, (lastWeek.get(name) || 0) + 1);
      }
      let best: { name: string; growth: number } | null = null;
      thisWeek.forEach((count, name) => {
        const prev = lastWeek.get(name) || 0;
        const growth = prev > 0 ? Math.round(((count - prev) / prev) * 100) : count > 0 ? 100 : 0;
        if (!best || growth > best.growth) best = { name, growth };
      });
      return best;
    },
  });

  const { data: aiTip } = useQuery({
    queryKey: ["v2-ai-tip"],
    queryFn: async () => {
      const { data: purchases } = await supabase.from("purchases").select("user_id, course_id, created_at").eq("status", "completed");
      if (!purchases || purchases.length < 10) return null;

      const courseIds = Array.from(new Set(purchases.map((p: any) => p.course_id)));
      const { data: sections } = await supabase.from("sections").select("id, course_id").in("course_id", courseIds);
      const sectionIds = (sections || []).map((s: any) => s.id);
      const { data: lectures } = sectionIds.length ? await supabase.from("lectures").select("id, section_id").in("section_id", sectionIds) : { data: [] as any[] };
      const sectionToCourse = new Map((sections || []).map((s: any) => [s.id, s.course_id]));
      const lectureToCourse = new Map((lectures || []).map((l: any) => [l.id, sectionToCourse.get(l.section_id)]));
      const totalsByCourse = new Map<string, number>();
      for (const l of lectures || []) {
        const cid = lectureToCourse.get(l.id);
        if (cid) totalsByCourse.set(cid, (totalsByCourse.get(cid) || 0) + 1);
      }
      const lectureIds = (lectures || []).map((l: any) => l.id);
      const userIds = Array.from(new Set(purchases.map((p: any) => p.user_id)));
      const { data: progressRows } = lectureIds.length
        ? await supabase.from("progress").select("user_id, lecture_id, completed, created_at").eq("completed", true).in("lecture_id", lectureIds).in("user_id", userIds)
        : { data: [] as any[] };

      const early = new Set<string>();
      for (const p of purchases) {
        const enrolledAt = new Date(p.created_at).getTime();
        const within48h = (progressRows || []).filter((pr: any) => pr.user_id === p.user_id && lectureToCourse.get(pr.lecture_id) === p.course_id && new Date(pr.created_at).getTime() - enrolledAt <= 48 * 3600000).length;
        if (within48h >= 3) early.add(`${p.user_id}|${p.course_id}`);
      }
      const doneCountByEnrollment = new Map<string, number>();
      for (const p of progressRows || []) {
        const cid = lectureToCourse.get(p.lecture_id);
        if (!cid) continue;
        const key = `${p.user_id}|${cid}`;
        doneCountByEnrollment.set(key, (doneCountByEnrollment.get(key) || 0) + 1);
      }
      const isComplete = (uid: string, cid: string) => {
        const total = totalsByCourse.get(cid) || 0;
        return total > 0 && (doneCountByEnrollment.get(`${uid}|${cid}`) || 0) === total;
      };

      let earlyCompleted = 0, earlyTotal = 0, lateCompleted = 0, lateTotal = 0;
      for (const p of purchases) {
        const key = `${p.user_id}|${p.course_id}`;
        if (early.has(key)) { earlyTotal++; if (isComplete(p.user_id, p.course_id)) earlyCompleted++; }
        else { lateTotal++; if (isComplete(p.user_id, p.course_id)) lateCompleted++; }
      }
      if (earlyTotal < 3 || lateTotal < 3) return null;
      const earlyRate = earlyCompleted / earlyTotal;
      const lateRate = lateCompleted / lateTotal;
      if (lateRate === 0) return null;
      const multiplier = Math.round((earlyRate / lateRate) * 10) / 10;
      if (multiplier <= 1) return null;
      return `Students who complete 3+ lessons in their first 48 hours finish courses ${multiplier}\u00d7 more often than those who don't, based on your actual enrollment data. Consider a welcome-week nudge for new cohorts.`;
    },
  });

  const sparkline = (series: number[], color: string) => {
    const max = Math.max(...series, 1);
    return (
      <div className="mt-3 flex h-8 items-end gap-1">
        {series.map((v, i) => (
          <div key={i} className="flex-1 rounded-sm" style={{ height: `${Math.max((v / max) * 100, 6)}%`, backgroundColor: color }} />
        ))}
      </div>
    );
  };

  const maxChartVal = Math.max(...chartData.map((d) => Math.max(d.enrollments, d.completions)), 1);
  const linePoints = (key: "enrollments" | "completions") =>
    chartData.map((d, i) => `${(i / Math.max(chartData.length - 1, 1)) * 100},${100 - (d[key] / maxChartVal) * 100}`).join(" ");

  const goalRing = (actual: number, target: number, color: string, radius: number) => {
    const pct = Math.min(actual / Math.max(target, 1), 1);
    const circumference = 2 * Math.PI * radius;
    return (
      <circle
        cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${circumference * pct} ${circumference}`}
        transform="rotate(-90 60 60)"
        opacity={0.9}
      />
    );
  };

  return (
    <div className="space-y-6 text-white">
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="rounded-2xl bg-gradient-to-br from-[#7c3aed] via-[#c026d3] to-[#ec4899] p-7 text-white">
          <Badge className="border-0 bg-white/20 text-white">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-300" /> LIVE · {hero?.activeNow ?? 0} ACTIVE LEARNERS NOW
          </Badge>
          <h1 className="mt-3 text-3xl font-bold">The academy is humming.</h1>
          <p className="mt-2 max-w-md text-white/80">
            {hero?.newCoursesThisMonth ?? 0} new course{hero?.newCoursesThisMonth === 1 ? "" : "s"} live this month
            {hero?.nps != null ? ` · NPS at ${hero.nps}` : ""}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button className="bg-black/30 hover:bg-black/40" onClick={() => onNavigate("all-courses")}><PlusCircle className="mr-1.5 h-4 w-4" /> Create course</Button>
            <Button className="bg-black/30 hover:bg-black/40" onClick={() => onNavigate("hub")}><Radio className="mr-1.5 h-4 w-4" /> Schedule live</Button>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-black/20 p-3"><p className="text-xs uppercase text-white/70">Today</p><p className="text-xl font-bold">{hero?.hoursWatchedToday ?? 0}h</p><p className="text-xs text-white/70">watched (est.)</p></div>
            <div className="rounded-xl bg-black/20 p-3"><p className="text-xs uppercase text-white/70">NPS</p><p className="text-xl font-bold">{hero?.nps ?? "—"}</p><p className="text-xs text-white/70">this month</p></div>
            <div className="rounded-xl bg-black/20 p-3"><p className="text-xs uppercase text-white/70">Rating</p><p className="text-xl font-bold">{hero?.avgRating?.toFixed(2) ?? "—"}</p><p className="text-xs text-white/70">avg ★</p></div>
            <div className="rounded-xl bg-black/20 p-3"><p className="text-xs uppercase text-white/70">Rate</p><p className="text-xl font-bold">{goalProgress?.completion.actual ?? 0}%</p><p className="text-xs text-white/70">completion</p></div>
          </div>
        </div>

        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-semibold"><CalendarClock className="h-4 w-4" /> Today's pulse</p>
            <button className="text-xs font-semibold text-[#ec4899]" onClick={() => onNavigate("hub")}>View all →</button>
          </div>
          <div className="mt-3 space-y-3">
            {todaySchedule.length > 0 ? todaySchedule.slice(0, 4).map((s: any) => (
              <div key={s.id} className="flex items-center gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ec4899]" />
                <span className="w-12 shrink-0 text-xs text-[#8b8aa3]">{new Date(s.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <div><p className="font-medium">{s.title}</p><p className="text-xs text-[#8b8aa3]">{s.courses?.title}</p></div>
              </div>
            )) : <p className="py-4 text-center text-sm text-[#8b8aa3]">No live sessions scheduled today.</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardCls}>
          <p className="text-sm text-[#8b8aa3]">Quick actions</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" className="border-white/15 bg-transparent text-white hover:bg-white/10" onClick={() => onNavigate("all-courses")}>New course</Button>
            <Button size="sm" variant="outline" className="border-white/15 bg-transparent text-white hover:bg-white/10" onClick={() => onNavigate("users")}>Invite</Button>
            <Button size="sm" variant="outline" className="border-white/15 bg-transparent text-white hover:bg-white/10" onClick={() => onNavigate("hub")}>Schedule</Button>
            <Button size="sm" variant="outline" className="border-white/15 bg-transparent text-white hover:bg-white/10" onClick={() => onNavigate("users")}>Message</Button>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-[#059669] to-[#10b981] p-5 text-white">
          <p className="text-sm text-white/80">Revenue this month</p>
          <p className="mt-1 text-3xl font-bold">${(statCards?.revenue.total ?? 0).toLocaleString()}</p>
          <p className="text-xs text-white/80">{(statCards?.revenue.change ?? 0) >= 0 ? "↗" : "↘"} {Math.abs(statCards?.revenue.change ?? 0)}% vs last month</p>
          {sparkline(statCards?.revenue.series || [0], "rgba(255,255,255,0.85)")}
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#a855f7] p-5 text-white">
          <p className="text-sm text-white/80">Active students</p>
          <p className="mt-1 text-3xl font-bold">{(statCards?.students.total ?? 0).toLocaleString()}</p>
          <p className="text-xs text-white/80">{(statCards?.students.change ?? 0) >= 0 ? "↗" : "↘"} {Math.abs(statCards?.students.change ?? 0)}% this month</p>
          {sparkline(statCards?.students.series || [0], "rgba(255,255,255,0.85)")}
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-[#db2777] to-[#f43f5e] p-5 text-white">
          <p className="text-sm text-white/80">Certificates issued</p>
          <p className="mt-1 text-3xl font-bold">{(statCards?.certificates.total ?? 0).toLocaleString()}</p>
          <p className="text-xs text-white/80">{(statCards?.certificates.change ?? 0) >= 0 ? "↗" : "↘"} {Math.abs(statCards?.certificates.change ?? 0)}% vs last month</p>
          {sparkline(statCards?.certificates.series || [0], "rgba(255,255,255,0.85)")}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className={cardCls}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Enrollments vs Completions</p>
              <p className="text-xs text-[#8b8aa3]">Rolling view across all course categories</p>
            </div>
            <div className="flex gap-1 rounded-lg bg-white/5 p-1">
              {(["7D", "30D", "90D", "12M"] as Range[]).map((r) => (
                <button key={r} onClick={() => setRange(r)} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${range === r ? "bg-gradient-to-r from-[#7c3aed] to-[#ec4899] text-white" : "text-[#8b8aa3]"}`}>{r}</button>
              ))}
            </div>
          </div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mt-4 h-56 w-full">
            <polyline points={linePoints("enrollments")} fill="none" stroke="#a855f7" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <polyline points={linePoints("completions")} fill="none" stroke="#ec4899" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="mt-2 flex gap-4 text-xs text-[#a5a3bd]">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#a855f7]" /> Enrollments</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#ec4899]" /> Completions</span>
          </div>
        </div>

        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <p className="font-semibold">Quarterly goals</p>
            <Badge className={goalProgress && goalProgress.overall >= 100 ? "border-0 bg-emerald-500/20 text-emerald-300" : "border-0 bg-white/10 text-[#c9c7dd]"}>
              {goalProgress && goalProgress.overall >= 100 ? "On track" : "In progress"}
            </Badge>
          </div>
          <p className="text-xs text-[#8b8aa3]">{quarterLabel} progress{!goalProgress?.hasGoal ? " (default targets — set real ones in Settings)" : ""}</p>
          <div className="relative mx-auto mt-4 h-32 w-32">
            <svg viewBox="0 0 120 120" className="h-full w-full">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
              <circle cx="60" cy="60" r="38" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
              <circle cx="60" cy="60" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
              {goalProgress && goalRing(goalProgress.completion.actual, goalProgress.completion.target, "#a855f7", 50)}
              {goalProgress && goalRing(Math.max(goalProgress.nps.actual, 0), goalProgress.nps.target, "#ec4899", 38)}
              {goalProgress && goalRing(goalProgress.retention.actual, goalProgress.retention.target, "#22d3ee", 26)}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-lg font-bold">{goalProgress?.overall ?? 0}%</p>
              <p className="text-[10px] text-[#8b8aa3]">Overall</p>
            </div>
          </div>
          <div className="mt-3 space-y-1 text-xs text-[#c9c7dd]">
            <p className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#a855f7]" /> Completion {goalProgress?.completion.actual}% / {goalProgress?.completion.target}%</p>
            <p className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#ec4899]" /> NPS {goalProgress?.nps.actual} / {goalProgress?.nps.target}</p>
            <p className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#22d3ee]" /> Retention {goalProgress?.retention.actual}% / {goalProgress?.retention.target}%</p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="font-semibold">Top performing courses</p>
            <p className="text-xs text-[#8b8aa3]">Highest revenue and completion this quarter</p>
          </div>
          <button className="text-sm font-semibold text-[#ec4899]" onClick={() => onNavigate("all-courses")}>Browse all →</button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {topCourses.length > 0 ? topCourses.map((c) => (
            <div key={c.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#1e1836]">
              <div className="flex h-32 items-center justify-center bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-white">
                {c.thumbnail ? <img src={c.thumbnail} alt={c.title} className="h-full w-full object-cover" /> : <Sparkles className="h-8 w-8" />}
              </div>
              <div className="p-4">
                <p className="text-xs font-semibold uppercase text-[#ec4899]">{c.category}</p>
                <p className="mt-1 truncate font-semibold">{c.title}</p>
                <div className="mt-1 flex items-center gap-1 text-xs text-[#8b8aa3]">
                  {c.rating != null && <><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {c.rating}</>} {c.students} students
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-semibold text-[#ec4899]">${Number(c.price).toFixed(0)}</span>
                  <Button size="sm" className="bg-white/10 text-white hover:bg-white/20" onClick={() => onNavigate("all-courses")}>Manage</Button>
                </div>
              </div>
            </div>
          )) : <p className="col-span-4 py-8 text-center text-[#8b8aa3]">No published courses with sales yet.</p>}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className={cardCls}>
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold">Live activity</p>
            <Badge className="border-0 bg-emerald-500/20 text-emerald-300"><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live</Badge>
          </div>
          <div className="space-y-3">
            {liveActivity.length > 0 ? liveActivity.map((a) => (
              <div key={a.id} className="flex items-start gap-2 text-sm">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${a.icon === "enroll" ? "bg-[#a855f7]" : a.icon === "review" ? "bg-amber-400" : "bg-[#ec4899]"}`} />
                <div><p className="text-[#e4e2f0]">{a.text}</p><p className="text-xs text-[#8b8aa3]">{new Date(a.time).toLocaleString()}</p></div>
              </div>
            )) : <p className="py-4 text-center text-sm text-[#8b8aa3]">No recent activity.</p>}
          </div>
        </div>

        <div className={cardCls}>
          <p className="mb-3 font-semibold">Today's schedule</p>
          <div className="space-y-3">
            {todaySchedule.length > 0 ? todaySchedule.map((s: any) => (
              <div key={s.id} className="rounded-lg border-l-4 border-[#a855f7] bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8b8aa3]">{new Date(s.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  {s.meeting_url && <a href={s.meeting_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#ec4899]">Join →</a>}
                </div>
                <p className="font-medium">{s.title}</p>
                <p className="text-xs text-[#8b8aa3]">{s.courses?.title}</p>
              </div>
            )) : <p className="py-4 text-center text-sm text-[#8b8aa3]">Nothing scheduled today.</p>}
          </div>
        </div>

        <div className={cardCls}>
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold">Top instructors</p>
            <button className="text-xs font-semibold text-[#ec4899]" onClick={() => onNavigate("instructor-directory")}>View all</button>
          </div>
          <div className="space-y-3">
            {topInstructors.length > 0 ? topInstructors.map((inst) => (
              <div key={inst.user_id} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-xs font-bold text-white">{inst.name.slice(0, 1)}</div>
                <div className="flex-1"><p className="text-sm font-medium">{inst.name}</p><p className="text-xs text-[#8b8aa3]">{inst.students} students</p></div>
                {inst.rating != null && <span className="flex items-center gap-1 text-xs font-semibold text-amber-400"><Star className="h-3 w-3 fill-amber-400" /> {inst.rating}</span>}
              </div>
            )) : <p className="py-4 text-center text-sm text-[#8b8aa3]">No instructor data yet.</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#c026d3] to-[#ec4899] p-5 text-white">
          <Award className="h-5 w-5" />
          <p className="mt-2 font-semibold">Certificates this week</p>
          <p className="text-sm text-white/85">{certsThisWeek ?? 0} student{certsThisWeek === 1 ? "" : "s"} earned a credential.</p>
          <Button className="mt-3 bg-black/25 hover:bg-black/35" size="sm" onClick={() => onNavigate("certificates")}>Celebrate them →</Button>
        </div>

        <div className={cardCls}>
          <p className="flex items-center gap-1.5 font-semibold"><Flame className="h-4 w-4 text-rose-400" /> Trending category</p>
          {trending ? (
            <>
              <p className="mt-1 text-xl font-bold text-[#ec4899]">{trending.name}</p>
              <p className="text-xs text-[#8b8aa3]">{trending.growth >= 0 ? "+" : ""}{trending.growth}% enrollments week-over-week</p>
            </>
          ) : <p className="mt-2 text-sm text-[#8b8aa3]">Not enough data yet to detect a trend.</p>}
        </div>

        <div className={cardCls}>
          <p className="flex items-center gap-1.5 font-semibold"><Zap className="h-4 w-4 text-[#a855f7]" /> Data-driven insight</p>
          <p className="mt-2 text-sm text-[#c9c7dd]">{aiTip || "Not enough enrollment data yet to surface a reliable pattern."}</p>
        </div>
      </div>
    </div>
  );
}
