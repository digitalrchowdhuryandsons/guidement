import { ReactNode } from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Link2, BarChart3, Coins, Wallet } from "lucide-react";

const NAV = [
  { to: "/affiliate/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/affiliate/links", label: "Links", icon: Link2 },
  { to: "/affiliate/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/affiliate/commissions", label: "Commissions", icon: Coins },
  { to: "/affiliate/payouts", label: "Payouts", icon: Wallet },
];

export default function AffiliateShell({ children }: { children?: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  const { data: aff, isLoading } = useQuery({
    queryKey: ["my-affiliate", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("affiliates").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  if (loading || isLoading) return null;
  if (!user) return <Navigate to={`/auth?next=${loc.pathname}`} />;
  if (!aff) return <Navigate to="/affiliate" />;
  if (aff.status !== "approved") return <Navigate to="/affiliate" />;

  return (
    <div className="container py-8">
      <div className="grid lg:grid-cols-[220px_1fr] gap-8">
        <aside className="space-y-1">
          <div className="mb-4 px-3">
            <p className="text-xs uppercase text-muted-foreground">Affiliate</p>
            <p className="font-display font-semibold truncate">{aff.display_name}</p>
            <p className="text-xs text-muted-foreground"><code>{aff.code}</code></p>
          </div>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                  isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary/50"
                )
              }
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </NavLink>
          ))}
        </aside>
        <div className="min-w-0">{children ?? <Outlet />}</div>
      </div>
    </div>
  );
}
