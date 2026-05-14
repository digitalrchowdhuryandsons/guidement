import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, Users, UserCheck, UserX } from "lucide-react";

type Attempt = {
  id: string;
  created_at: string;
  course_id: string;
  lecture_id: string | null;
  source: string;
  is_guest: boolean;
  user_id: string | null;
  user_agent: string | null;
};

export default function PurchaseAttemptsPanel() {
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [userTypeFilter, setUserTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ["purchase-attempts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_attempts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as Attempt[];
    },
  });

  const courseIds = useMemo(
    () => Array.from(new Set(attempts.map((a) => a.course_id))),
    [attempts]
  );
  const lectureIds = useMemo(
    () =>
      Array.from(
        new Set(attempts.map((a) => a.lecture_id).filter(Boolean) as string[])
      ),
    [attempts]
  );

  const { data: courses = [] } = useQuery({
    queryKey: ["pa-courses", courseIds],
    enabled: courseIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title, slug")
        .in("id", courseIds);
      return data || [];
    },
  });

  const { data: lectures = [] } = useQuery({
    queryKey: ["pa-lectures", lectureIds],
    enabled: lectureIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("lectures")
        .select("id, title")
        .in("id", lectureIds);
      return data || [];
    },
  });

  const courseMap = useMemo(
    () => Object.fromEntries(courses.map((c: any) => [c.id, c])),
    [courses]
  );
  const lectureMap = useMemo(
    () => Object.fromEntries(lectures.map((l: any) => [l.id, l])),
    [lectures]
  );

  const sources = useMemo(
    () => Array.from(new Set(attempts.map((a) => a.source))),
    [attempts]
  );

  const filtered = useMemo(() => {
    return attempts.filter((a) => {
      if (courseFilter !== "all" && a.course_id !== courseFilter) return false;
      if (sourceFilter !== "all" && a.source !== sourceFilter) return false;
      if (userTypeFilter === "guest" && !a.is_guest) return false;
      if (userTypeFilter === "user" && a.is_guest) return false;
      if (search) {
        const q = search.toLowerCase();
        const courseTitle = courseMap[a.course_id]?.title?.toLowerCase() || "";
        const lectureTitle = a.lecture_id
          ? lectureMap[a.lecture_id]?.title?.toLowerCase() || ""
          : "";
        if (!courseTitle.includes(q) && !lectureTitle.includes(q)) return false;
      }
      return true;
    });
  }, [attempts, courseFilter, sourceFilter, userTypeFilter, search, courseMap, lectureMap]);

  const stats = useMemo(() => {
    const guests = filtered.filter((a) => a.is_guest).length;
    return {
      total: filtered.length,
      guests,
      users: filtered.length - guests,
    };
  }, [filtered]);

  return (
    <Card className="border-0">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Purchase Attempts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <Card className="border-0 bg-secondary/50">
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-display font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total attempts</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-secondary/50">
            <CardContent className="p-4 flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-display font-bold">{stats.users}</p>
                <p className="text-xs text-muted-foreground">Signed-in users</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-secondary/50">
            <CardContent className="p-4 flex items-center gap-3">
              <UserX className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-display font-bold">{stats.guests}</p>
                <p className="text-xs text-muted-foreground">Guests</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            placeholder="Search course or lecture..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              {courses.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="User type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              <SelectItem value="user">Signed-in only</SelectItem>
              <SelectItem value="guest">Guests only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border bg-secondary/20 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Lecture</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No purchase attempts match the filters
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(a.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {courseMap[a.course_id]?.title || a.course_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.lecture_id
                        ? lectureMap[a.lecture_id]?.title || "—"
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.source}</Badge>
                    </TableCell>
                    <TableCell>
                      {a.is_guest ? (
                        <Badge variant="secondary">Guest</Badge>
                      ) : (
                        <Badge>Signed-in</Badge>
                      )}
                    </TableCell>
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
