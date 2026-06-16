import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const empty = {
  name: "", slug: "", description: "",
  bonus_percent: "", bonus_flat_cents: "",
  starts_at: "", ends_at: "", is_active: true,
};

export default function CampaignManagerPanel() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);

  const { data: rules = [] } = useQuery({
    queryKey: ["admin-commission-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("commission_rules").select("*, courses(title)").order("scope");
      return data || [];
    },
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: async () => {
      const { data } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      const payload: any = {
        name: form.name,
        slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: form.description || null,
        bonus_percent: form.bonus_percent ? Number(form.bonus_percent) : null,
        bonus_flat_cents: form.bonus_flat_cents ? Number(form.bonus_flat_cents) : null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        is_active: form.is_active,
        created_by: uid,
      };
      const { error } = await supabase.from("campaigns").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campaign created");
      qc.invalidateQueries({ queryKey: ["admin-campaigns"] });
      setOpen(false);
      setForm(empty);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("campaigns").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-campaigns"] }),
  });

  return (
    <div className="space-y-6">
      <Card className="border-0">
        <CardHeader>
          <CardTitle className="font-display">Commission Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scope</TableHead>
                <TableHead>Course</TableHead>
                <TableHead className="text-right">Percent</TableHead>
                <TableHead className="text-right">Flat (cents)</TableHead>
                <TableHead className="text-right">Cookie days</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell><Badge variant="outline">{r.scope}</Badge></TableCell>
                  <TableCell>{r.courses?.title || "—"}</TableCell>
                  <TableCell className="text-right">{r.percent ?? "—"}</TableCell>
                  <TableCell className="text-right">{r.flat_cents ?? "—"}</TableCell>
                  <TableCell className="text-right">{r.cookie_days}</TableCell>
                  <TableCell>{r.is_active ? <Badge>active</Badge> : <Badge variant="secondary">off</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground mt-3">
            Per-course overrides can be added directly via instructors in a future iteration, or via the database.
          </p>
        </CardContent>
      </Card>

      <Card className="border-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display">Campaigns</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New campaign</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Campaign</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto from name" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Bonus %</Label>
                    <Input type="number" step="0.01" value={form.bonus_percent} onChange={(e) => setForm({ ...form, bonus_percent: e.target.value })} />
                  </div>
                  <div>
                    <Label>Bonus flat (cents)</Label>
                    <Input type="number" value={form.bonus_flat_cents} onChange={(e) => setForm({ ...form, bonus_flat_cents: e.target.value })} />
                  </div>
                  <div>
                    <Label>Starts</Label>
                    <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
                  </div>
                  <div>
                    <Label>Ends</Label>
                    <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => create.mutate()} disabled={create.isPending || !form.name}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No campaigns yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-right">Bonus %</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell><code className="text-xs">{c.slug}</code></TableCell>
                    <TableCell className="text-right">{c.bonus_percent ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {c.starts_at ? new Date(c.starts_at).toLocaleDateString() : "—"} → {c.ends_at ? new Date(c.ends_at).toLocaleDateString() : "∞"}
                    </TableCell>
                    <TableCell>
                      <Switch checked={c.is_active} onCheckedChange={(v) => toggle.mutate({ id: c.id, is_active: v })} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
