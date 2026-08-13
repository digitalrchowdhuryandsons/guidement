import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function NotificationsPanel() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications-panel", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications-panel"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("notifications").update({ is_read: true }).eq("user_id", user!.id).eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All caught up");
      qc.invalidateQueries({ queryKey: ["notifications-panel"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  return (
    <Card className="border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" /> Notifications {unreadCount > 0 && <Badge variant="destructive">{unreadCount} unread</Badge>}
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => markAllRead.mutate()} disabled={unreadCount === 0 || markAllRead.isPending}>
          <Check className="mr-1 h-4 w-4" /> Mark all read
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="py-8 text-center text-muted-foreground">Loading…</p>
        ) : notifications.length > 0 ? (
          notifications.map((n: any) => (
            <div key={n.id} className={`flex items-start justify-between gap-3 rounded-lg border p-3 ${n.is_read ? "bg-secondary/10" : "bg-secondary/40"}`}>
              <div>
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {!n.is_read && <Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)}>Mark read</Button>}
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-muted-foreground">No notifications yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
