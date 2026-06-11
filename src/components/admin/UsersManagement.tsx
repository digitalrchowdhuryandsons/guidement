import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, Trash2, Ban, ShieldCheck, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

type ManagedUser = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  banned_until: string | null;
  roles: string[];
};

const ROLES: Array<"student" | "instructor" | "admin"> = ["student", "instructor", "admin"];

export default function UsersManagement() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      return (data || []) as ManagedUser[];
    },
  });

  const action = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.functions.invoke("admin-user-management", { body: payload });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e.message || "Action failed"),
  });

  const filtered = (users || []).filter((u) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (u.email || "").toLowerCase().includes(s) || (u.full_name || "").toLowerCase().includes(s);
  });

  return (
    <Card className="border-0">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> User Management
        </CardTitle>
        <Input placeholder="Search by name or email…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading users…</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => {
              const banned = u.banned_until && new Date(u.banned_until) > new Date();
              return (
                <div key={u.user_id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-secondary/30">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={u.avatar_url || undefined} />
                    <AvatarFallback>{(u.full_name || u.email || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-medium text-sm">{u.full_name || "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {u.roles?.length ? (
                      u.roles.map((r) => (
                        <Badge key={r} variant={r === "admin" || r === "super_admin" ? "default" : "secondary"}>{r}</Badge>
                      ))
                    ) : (
                      <Badge variant="outline">no roles</Badge>
                    )}
                    {banned && <Badge variant="destructive">banned</Badge>}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {ROLES.map((r) => {
                        const has = u.roles?.includes(r);
                        return (
                          <DropdownMenuItem
                            key={r}
                            onClick={() => action.mutate({ type: "set_role", userId: u.user_id, role: r, grant: !has })}
                          >
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            {has ? `Remove ${r}` : `Grant ${r}`}
                          </DropdownMenuItem>
                        );
                      })}
                      {banned ? (
                        <DropdownMenuItem onClick={() => action.mutate({ type: "unban", userId: u.user_id })}>
                          <Ban className="h-4 w-4 mr-2" /> Unban
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => action.mutate({ type: "ban", userId: u.user_id, days: 365 })}>
                          <Ban className="h-4 w-4 mr-2" /> Ban (1 year)
                        </DropdownMenuItem>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" /> Delete user
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently removes <b>{u.email}</b>. Their courses and data may cascade.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => action.mutate({ type: "delete", userId: u.user_id })}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-center text-muted-foreground py-6">No users found.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
