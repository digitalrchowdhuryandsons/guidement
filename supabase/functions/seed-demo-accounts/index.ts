import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Role = "admin" | "instructor" | "student";

const DEMO_ACCOUNTS: Array<{
  email: string;
  password: string;
  full_name: string;
  role: Role;
  headline?: string;
  bio?: string;
}> = [
  {
    email: "admin@guidement.demo",
    password: "Admin123!",
    full_name: "Demo Admin",
    role: "admin",
    headline: "Demo admin account",
    bio: "Use this account to explore the admin dashboard.",
  },
  {
    email: "instructor@guidement.demo",
    password: "Instructor123!",
    full_name: "Demo Instructor",
    role: "instructor",
    headline: "Demo instructor account for exploring Guidement",
    bio: "Use this account to explore the instructor dashboard and course creation flow.",
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: list } = await admin.auth.admin.listUsers();
    const results: Array<{ email: string; password: string; role: Role }> = [];

    for (const acct of DEMO_ACCOUNTS) {
      let user = list?.users?.find((u) => u.email === acct.email);

      if (!user) {
        const { data, error } = await admin.auth.admin.createUser({
          email: acct.email,
          password: acct.password,
          email_confirm: true,
          user_metadata: { full_name: acct.full_name },
        });
        if (error) throw error;
        user = data.user!;
      } else {
        // Ensure password is current demo password
        await admin.auth.admin.updateUserById(user.id, { password: acct.password });
      }

      // Ensure role
      const { data: existingRole } = await admin
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", acct.role)
        .maybeSingle();
      if (!existingRole) {
        await admin.from("user_roles").insert({ user_id: user.id, role: acct.role });
      }

      // Ensure profile fields
      await admin
        .from("profiles")
        .update({
          full_name: acct.full_name,
          headline: acct.headline ?? null,
          bio: acct.bio ?? null,
        })
        .eq("user_id", user.id);

      results.push({ email: acct.email, password: acct.password, role: acct.role });
    }

    return new Response(JSON.stringify({ success: true, accounts: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
