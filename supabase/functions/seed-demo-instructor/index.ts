import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const email = "instructor@guidement.demo";
    const password = "Instructor123!";

    // Check if user already exists
    const { data: list } = await admin.auth.admin.listUsers();
    let user = list?.users?.find((u) => u.email === email);

    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: "Demo Instructor" },
      });
      if (error) throw error;
      user = data.user;
    }

    if (!user) throw new Error("User creation failed");

    // Ensure instructor role
    const { data: existingRole } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "instructor")
      .maybeSingle();

    if (!existingRole) {
      await admin.from("user_roles").insert({ user_id: user.id, role: "instructor" });
    }

    // Ensure profile has headline/bio
    await admin
      .from("profiles")
      .update({
        full_name: "Demo Instructor",
        headline: "Demo instructor account for exploring Guidement",
        bio: "This is a demo instructor account. Use it to explore the instructor dashboard and course creation flow.",
      })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({ success: true, email, password, user_id: user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
