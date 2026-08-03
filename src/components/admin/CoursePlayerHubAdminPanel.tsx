import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, FilePenLine, GraduationCap, Trash2, Users, Video } from "lucide-react";
import { toast } from "sonner";

type HubKind = "tutorials" | "workshops" | "certifications" | "events" | "communities";

type HubItem = {
  id: string;
  title: string;
  description: string | null;
  is_active?: boolean;
  [key: string]: string | number | boolean | null | undefined;
};

type CourseOption = {
  id: string;
  title: string;
};

type HubForm = {
  id: string | null;
  title: string;
  description: string;
  url: string;
  secondaryUrl: string;
  startsAt: string;
  endsAt: string;
  location: string;
  platform: string;
  status: string;
  passingScore: string;
  duration: string;
  position: string;
  isActive: boolean;
};

const emptyForm: HubForm = {
  id: null,
  title: "",
  description: "",
  url: "",
  secondaryUrl: "",
  startsAt: "",
  endsAt: "",
  location: "",
  platform: "",
  status: "scheduled",
  passingScore: "80",
  duration: "0",
  position: "0",
  isActive: true,
};

const hubMeta: Record<HubKind, { label: string; icon: typeof Video; helper: string }> = {
  tutorials: { label: "Tutorials", icon: Video, helper: "Create supplemental videos or lesson-linked tutorials." },
  workshops: { label: "Workshops", icon: FilePenLine, helper: "Schedule live sessions and attach recordings." },
  certifications: { label: "Certifications", icon: GraduationCap, helper: "Configure certificate cards and passing scores." },
  events: { label: "Events", icon: CalendarDays, helper: "Publish course events with dates, links, and locations." },
  communities: { label: "Community", icon: Users, helper: "Add Discord, Slack, WhatsApp, or community links." },
};

const asNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toInputDateTime = (value?: string | null) => (value ? value.slice(0, 16) : "");
const toIsoOrNull = (value: string) => (value ? new Date(value).toISOString() : null);

export default function CoursePlayerHubAdminPanel() {
  const queryClient = useQueryClient();
  const [activeKind, setActiveKind] = useState<HubKind>("tutorials");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [form, setForm] = useState<HubForm>(emptyForm);

  const { data: courses = [] } = useQuery({
    queryKey: ["admin-hub-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as CourseOption[];
    },
  });

  useEffect(() => {
    if (!selectedCourseId && courses[0]) setSelectedCourseId(courses[0].id);
  }, [courses, selectedCourseId]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-course-player-hub", activeKind, selectedCourseId],
    queryFn: async () => {
      if (!selectedCourseId) return [];
      if (activeKind === "tutorials") {
        const { data, error } = await (supabase as any).from("course_tutorials").select("*").eq("course_id", selectedCourseId).order("position");
        if (error) throw error;
        return (data || []) as HubItem[];
      }
      if (activeKind === "workshops") {
        const { data, error } = await supabase.from("course_workshops").select("*").eq("course_id", selectedCourseId).order("starts_at").order("position");
        if (error) throw error;
        return (data || []) as HubItem[];
      }
      if (activeKind === "certifications") {
        const { data, error } = await supabase.from("course_certifications").select("*").eq("course_id", selectedCourseId).order("position");
        if (error) throw error;
        return (data || []) as HubItem[];
      }
      if (activeKind === "events") {
        const { data, error } = await supabase.from("course_events").select("*").eq("course_id", selectedCourseId).order("starts_at").order("position");
        if (error) throw error;
        return (data || []) as HubItem[];
      }
      const { data, error } = await supabase.from("course_communities").select("*").eq("course_id", selectedCourseId).order("position");
      if (error) throw error;
      return (data || []) as HubItem[];
    },
    enabled: !!selectedCourseId,
  });

  const activeMeta = hubMeta[activeKind];
  const ActiveIcon = activeMeta.icon;
  const selectedCourseTitle = useMemo(
    () => courses.find((course) => course.id === selectedCourseId)?.title || "Select a course",
    [courses, selectedCourseId]
  );

  const resetForm = () => setForm(emptyForm);

  const editItem = (item: HubItem) => {
    setForm({
      id: item.id,
      title: item.title || "",
      description: item.description || "",
      url: String(item.video_url || item.meeting_url || item.certificate_url || item.event_url || item.community_url || ""),
      secondaryUrl: String(item.recording_url || item.thumbnail_url || ""),
      startsAt: toInputDateTime(String(item.starts_at || "")),
      endsAt: toInputDateTime(String(item.ends_at || "")),
      location: String(item.location || ""),
      platform: String(item.platform || ""),
      status: String(item.status || "scheduled"),
      passingScore: String(item.passing_score || 80),
      duration: String(item.duration || 0),
      position: String(item.position || 0),
      isActive: item.is_active !== false,
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCourseId) throw new Error("Select a course first");
      if (!form.title.trim()) throw new Error("Title is required");

      if (activeKind === "tutorials") {
        const payload = {
          course_id: selectedCourseId,
          title: form.title.trim(),
          description: form.description || null,
          video_url: form.url || null,
          thumbnail_url: form.secondaryUrl || null,
          duration: asNumber(form.duration, 0),
          position: asNumber(form.position, 0),
          is_active: form.isActive,
          updated_at: new Date().toISOString(),
        };
        const result = form.id
          ? await (supabase as any).from("course_tutorials").update(payload).eq("id", form.id)
          : await (supabase as any).from("course_tutorials").insert(payload);
        if (result.error) throw result.error;
        return;
      }

      if (activeKind === "workshops") {
        const payload = {
          course_id: selectedCourseId,
          title: form.title.trim(),
          description: form.description || null,
          starts_at: toIsoOrNull(form.startsAt),
          ends_at: toIsoOrNull(form.endsAt),
          meeting_url: form.url || null,
          recording_url: form.secondaryUrl || null,
          status: form.status,
          position: asNumber(form.position, 0),
          is_active: form.isActive,
          updated_at: new Date().toISOString(),
        };
        const result = form.id
          ? await supabase.from("course_workshops").update(payload).eq("id", form.id)
          : await supabase.from("course_workshops").insert(payload);
        if (result.error) throw result.error;
        return;
      }

      if (activeKind === "certifications") {
        const payload = {
          course_id: selectedCourseId,
          title: form.title.trim(),
          description: form.description || null,
          passing_score: asNumber(form.passingScore, 80),
          certificate_url: form.url || null,
          position: asNumber(form.position, 0),
          is_active: form.isActive,
          updated_at: new Date().toISOString(),
        };
        const result = form.id
          ? await supabase.from("course_certifications").update(payload).eq("id", form.id)
          : await supabase.from("course_certifications").insert(payload);
        if (result.error) throw result.error;
        return;
      }

      if (activeKind === "events") {
        const payload = {
          course_id: selectedCourseId,
          title: form.title.trim(),
          description: form.description || null,
          starts_at: toIsoOrNull(form.startsAt),
          ends_at: toIsoOrNull(form.endsAt),
          event_url: form.url || null,
          location: form.location || null,
          position: asNumber(form.position, 0),
          is_active: form.isActive,
          updated_at: new Date().toISOString(),
        };
        const result = form.id
          ? await supabase.from("course_events").update(payload).eq("id", form.id)
          : await supabase.from("course_events").insert(payload);
        if (result.error) throw result.error;
        return;
      }

      const payload = {
        course_id: selectedCourseId,
        title: form.title.trim(),
        description: form.description || null,
        platform: form.platform || null,
        community_url: form.url || null,
        position: asNumber(form.position, 0),
        is_active: form.isActive,
        updated_at: new Date().toISOString(),
      };
      const result = form.id
        ? await supabase.from("course_communities").update(payload).eq("id", form.id)
        : await supabase.from("course_communities").insert(payload);
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      toast.success(form.id ? "Hub item updated" : "Hub item created");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["admin-course-player-hub"] });
      queryClient.invalidateQueries({ queryKey: ["player-course-tutorials"] });
      queryClient.invalidateQueries({ queryKey: ["player-course-workshops"] });
      queryClient.invalidateQueries({ queryKey: ["player-course-certifications"] });
      queryClient.invalidateQueries({ queryKey: ["player-course-events"] });
      queryClient.invalidateQueries({ queryKey: ["player-course-communities"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save hub item"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (activeKind === "tutorials") {
        const { error } = await (supabase as any).from("course_tutorials").delete().eq("id", id);
        if (error) throw error;
        return;
      }
      if (activeKind === "workshops") {
        const { error } = await supabase.from("course_workshops").delete().eq("id", id);
        if (error) throw error;
        return;
      }
      if (activeKind === "certifications") {
        const { error } = await supabase.from("course_certifications").delete().eq("id", id);
        if (error) throw error;
        return;
      }
      if (activeKind === "events") {
        const { error } = await supabase.from("course_events").delete().eq("id", id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("course_communities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Hub item deleted");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["admin-course-player-hub"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not delete hub item"),
  });

  return (
    <Card className="border-0">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <ActiveIcon className="h-5 w-5 text-primary" /> Course Player Hub CRUD
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage the Supabase records that power the blue-box options in the course player.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-[260px_minmax(0,1fr)]">
          <div className="space-y-2">
            <Label htmlFor="hub-course">Course</Label>
            <select
              id="hub-course"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selectedCourseId}
              onChange={(event) => {
                setSelectedCourseId(event.target.value);
                resetForm();
              }}
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Hub section</Label>
            <Tabs value={activeKind} onValueChange={(value) => { setActiveKind(value as HubKind); resetForm(); }}>
              <TabsList className="flex h-auto flex-wrap justify-start">
                {(Object.keys(hubMeta) as HubKind[]).map((kind) => (
                  <TabsTrigger key={kind} value={kind}>{hubMeta[kind].label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="rounded-lg border bg-secondary/20 p-4">
          <p className="font-medium">{form.id ? "Edit" : "Create"} {activeMeta.label} item</p>
          <p className="mb-4 text-sm text-muted-foreground">{activeMeta.helper} Course: {selectedCourseTitle}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="hub-title">Title</Label>
              <Input id="hub-title" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="hub-description">Description</Label>
              <Textarea id="hub-description" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hub-url">Primary URL</Label>
              <Input id="hub-url" value={form.url} placeholder="Video, meeting, certificate, event, or community URL" onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))} />
            </div>
            {(activeKind === "tutorials" || activeKind === "workshops") && (
              <div className="space-y-2">
                <Label htmlFor="hub-secondary-url">{activeKind === "tutorials" ? "Thumbnail URL" : "Recording URL"}</Label>
                <Input id="hub-secondary-url" value={form.secondaryUrl} onChange={(event) => setForm((prev) => ({ ...prev, secondaryUrl: event.target.value }))} />
              </div>
            )}
            {(activeKind === "workshops" || activeKind === "events") && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="hub-starts">Starts at</Label>
                  <Input id="hub-starts" type="datetime-local" value={form.startsAt} onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hub-ends">Ends at</Label>
                  <Input id="hub-ends" type="datetime-local" value={form.endsAt} onChange={(event) => setForm((prev) => ({ ...prev, endsAt: event.target.value }))} />
                </div>
              </>
            )}
            {activeKind === "workshops" && (
              <div className="space-y-2">
                <Label htmlFor="hub-status">Status</Label>
                <select id="hub-status" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
                  <option value="scheduled">scheduled</option>
                  <option value="live">live</option>
                  <option value="completed">completed</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>
            )}
            {activeKind === "certifications" && (
              <div className="space-y-2">
                <Label htmlFor="hub-score">Passing score</Label>
                <Input id="hub-score" type="number" min="0" max="100" value={form.passingScore} onChange={(event) => setForm((prev) => ({ ...prev, passingScore: event.target.value }))} />
              </div>
            )}
            {activeKind === "tutorials" && (
              <div className="space-y-2">
                <Label htmlFor="hub-duration">Duration (seconds)</Label>
                <Input id="hub-duration" type="number" value={form.duration} onChange={(event) => setForm((prev) => ({ ...prev, duration: event.target.value }))} />
              </div>
            )}
            {activeKind === "events" && (
              <div className="space-y-2">
                <Label htmlFor="hub-location">Location</Label>
                <Input id="hub-location" value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} />
              </div>
            )}
            {activeKind === "communities" && (
              <div className="space-y-2">
                <Label htmlFor="hub-platform">Platform</Label>
                <Input id="hub-platform" value={form.platform} placeholder="Discord, Slack, WhatsApp..." onChange={(event) => setForm((prev) => ({ ...prev, platform: event.target.value }))} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="hub-position">Position</Label>
              <Input id="hub-position" type="number" value={form.position} onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
              Active in course player
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !selectedCourseId}>
              {form.id ? "Update item" : "Create item"}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>Clear form</Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium">Existing {activeMeta.label}</p>
            <Badge variant="secondary">{items.length} records</Badge>
          </div>
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Loading records...</p>
          ) : items.length > 0 ? (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.title}</p>
                    {item.description && <p className="line-clamp-1 text-sm text-muted-foreground">{item.description}</p>}
                    <p className="text-xs text-muted-foreground">Position {String(item.position ?? 0)} · {item.is_active === false ? "Inactive" : "Active"}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => editItem(item)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(item.id)} disabled={deleteMutation.isPending}>
                    <Trash2 className="mr-1 h-4 w-4" /> Delete
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed py-8 text-center text-muted-foreground">No records yet for this course and section.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
