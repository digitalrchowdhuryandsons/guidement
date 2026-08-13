import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tags, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function CategoriesManagement() {
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: courseCounts = {} } = useQuery({
    queryKey: ["categories-course-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("category_id");
      const counts: Record<string, number> = {};
      for (const c of data || []) {
        if (!c.category_id) continue;
        counts[c.category_id] = (counts[c.category_id] || 0) + 1;
      }
      return counts;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      const { error } = await supabase.from("categories").insert({ name: name.trim(), slug: slugify(name) });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category created");
      setName("");
      qc.invalidateQueries({ queryKey: ["categories-admin"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category deleted");
      qc.invalidateQueries({ queryKey: ["categories-admin"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="border-0">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2"><Tags className="h-5 w-5 text-primary" /> Categories</CardTitle>
        <div className="flex gap-2">
          <Input placeholder="New category name…" value={name} onChange={(e) => setName(e.target.value)} className="max-w-sm" />
          <Button size="sm" onClick={() => create.mutate()} disabled={create.isPending}><Plus className="mr-1 h-4 w-4" /> Add</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="py-8 text-center text-muted-foreground">Loading…</p>
        ) : categories.length > 0 ? (
          categories.map((c: any) => (
            <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex-1"><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">/{c.slug}</p></div>
              <Badge variant="secondary">{courseCounts[c.id] || 0} courses</Badge>
              <Button size="sm" variant="ghost" onClick={() => del.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-muted-foreground">No categories yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
