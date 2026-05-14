import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Role = "student" | "instructor" | "admin";

const DEMO_USERS: Record<string, { email: string; password: string; full_name: string; role: Role; headline?: string; bio?: string }> = {
  student: {
    email: "student@guidement.demo",
    password: "Student123!",
    full_name: "Demo Student",
    role: "student",
    headline: "Demo student account",
    bio: "Use this account to preview the student experience.",
  },
  instructor: {
    email: "instructor@guidement.demo",
    password: "Instructor123!",
    full_name: "Demo Instructor",
    role: "instructor",
    headline: "Demo instructor account for exploring Guidement",
    bio: "Use this account to explore the instructor dashboard and course creation flow.",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerErr } = await userClient.auth.getUser();
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: "invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify caller is admin or super_admin
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    const isAdmin = !!roles?.some((r: { role: string }) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const target = body?.target as string | undefined;
    if (!target || !DEMO_USERS[target]) {
      return new Response(JSON.stringify({ error: "invalid target" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const acct = DEMO_USERS[target];

    // Ensure user exists
    const { data: list } = await admin.auth.admin.listUsers();
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

    // Ensure profile
    await admin
      .from("profiles")
      .update({ full_name: acct.full_name, headline: acct.headline ?? null, bio: acct.bio ?? null })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({ success: true, email: acct.email, password: acct.password, role: acct.role }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
