import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Globe2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Tier = {
  id: string;
  course_id: string;
  region_code: string;
  label: string;
  currency: string;
  price: number;
  is_active: boolean;
};

type FormState = {
  course_id: string;
  region_code: string;
  label: string;
  currency: string;
  price: string;
  is_active: boolean;
};

const emptyForm: FormState = { course_id: "", region_code: "", label: "", currency: "USD", price: "", is_active: true };

export default function PricingTiersManagement() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tier | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [courseFilter, setCourseFilter] = useState("all");

  const { data: courses = [] } = useQuery({
    queryKey: ["pricing-tiers-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title, price").order("title");
      return data || [];
    },
  });

  const { data: tiers } = useQuery({
    queryKey: ["course-price-tiers"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("course_price_tiers")
        .select("*")
        .order("region_code");
      if (error) throw error;
      return (data ?? []) as Tier[];
    },
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (t: Tier) => {
    setEditing(t);
    setForm({ course_id: t.course_id, region_code: t.region_code, label: t.label, currency: t.currency, price: String(t.price), is_active: t.is_active });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.course_id) throw new Error("Choose a course");
      if (!form.region_code.trim()) throw new Error("Region code is required (e.g. US, IN, BR)");
      const priceNum = Number(form.price);
      if (!Number.isFinite(priceNum) || priceNum < 0) throw new Error("Enter a valid price");

      const payload = {
        course_id: form.course_id,
        region_code: form.region_code.trim().toUpperCase(),
        label: form.label.trim() || form.region_code.trim().toUpperCase(),
        currency: form.currency.trim().toUpperCase() || "USD",
        price: priceNum,
        is_active: form.is_active,
      };

      const result = editing
        ? await (supabase as any).from("course_price_tiers").update(payload).eq("id", editing.id)
        : await (supabase as any).from("course_price_tiers").insert(payload);
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      toast.success(editing ? "Tier updated" : "Tier created");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["course-price-tiers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("course_price_tiers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tier deleted");
      qc.invalidateQueries({ queryKey: ["course-price-tiers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (t: Tier) => {
      const { error } = await (supabase as any).from("course_price_tiers").update({ is_active: !t.is_active }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["course-price-tiers"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const filteredTiers = (tiers || []).filter((t) => courseFilter === "all" || t.course_id === courseFilter);
  const courseTitle = (id: string) => courses.find((c: any) => c.id === id)?.title || "Unknown course";

  return (
    <Card className="border-0">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="font-display flex items-center gap-2">
          <Globe2 className="h-5 w-5 text-primary" /> Regional / PPP Pricing Tiers
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by course" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={openCreate}><Plus className="mr-1 h-4 w-4" /> New Tier</Button>
        </div>
      </CardHeader>
      <CardContent>
        {filteredTiers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTiers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{courseTitle(t.course_id)}</TableCell>
                  <TableCell><Badge variant="outline">{t.region_code}</Badge></TableCell>
                  <TableCell>{t.label}</TableCell>
                  <TableCell className="font-semibold">{t.currency} {Number(t.price).toFixed(2)}</TableCell>
                  <TableCell><Switch checked={t.is_active} onCheckedChange={() => toggleActive.mutate(t)} /></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this tier?</AlertDialogTitle>
                          <AlertDialogDescription>Students in {t.region_code} will fall back to the course's base price.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => del.mutate(t.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="py-8 text-center text-muted-foreground">No regional pricing tiers yet — courses use their base price everywhere.</p>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit tier" : "Create tier"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Course</Label>
              <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose a course" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title} (${Number(c.price).toFixed(2)})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Region code</Label><Input value={form.region_code} onChange={(e) => setForm({ ...form, region_code: e.target.value })} placeholder="IN, BR, NG…" /></div>
              <div><Label>Display label</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Tier 3" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Currency</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="USD" /></div>
              <div><Label>Price</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : editing ? "Save changes" : "Create tier"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
