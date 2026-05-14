import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { GraduationCap, BookOpen, UserCog, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TARGETS = [
  {
    key: "student",
    label: "Demo Student",
    description: "Preview the learner experience: courses, player, progress, certificates.",
    icon: GraduationCap,
    landing: "/dashboard",
  },
  {
    key: "instructor",
    label: "Demo Instructor",
    description: "Preview the instructor flow: course creation, analytics, payouts.",
    icon: BookOpen,
    landing: "/instructor",
  },
] as const;

export default function ImpersonationPanel() {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const navigate = useNavigate();

  const impersonate = async (target: typeof TARGETS[number]) => {
    setLoadingKey(target.key);
    try {
      const { data, error } = await supabase.functions.invoke("impersonate-demo-user", {
        body: { target: target.key },
      });
      if (error) throw error;
      const { email, password } = data as { email: string; password: string };

      // Sign out current admin then sign in as demo user
      await supabase.auth.signOut();
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;

      toast.success(`Signed in as ${target.label}`);
      navigate(target.landing);
    } catch (e) {
      toast.error((e as Error).message || "Failed to impersonate");
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5" /> Impersonate Demo User
        </CardTitle>
        <CardDescription>
          Quickly switch into a demo Student or Instructor account to preview their flows.
          Your current admin session will be signed out — log back in with your admin
          credentials when you're done.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span className="text-muted-foreground">
            Demo accounts only — this never grants access to a real user's session.
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {TARGETS.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.key} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="font-semibold">{t.label}</span>
                  <Badge variant="secondary" className="ml-auto">{t.key}</Badge>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">{t.description}</p>
                <Button
                  className="w-full"
                  onClick={() => impersonate(t)}
                  disabled={loadingKey !== null}
                >
                  {loadingKey === t.key ? "Switching..." : `Sign in as ${t.label}`}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
