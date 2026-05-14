import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) {
      return json({ error: "Razorpay keys not configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);
    const user = userRes.user;

    const body = await req.json().catch(() => null);
    const { course_id, currency } = body ?? {};
    if (typeof course_id !== "string") {
      return json({ error: "Invalid course_id" }, 400);
    }
    const cur = typeof currency === "string" ? currency : "INR";

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: course, error: courseErr } = await admin
      .from("courses")
      .select("id, price, title, is_published, is_approved")
      .eq("id", course_id)
      .maybeSingle();
    if (courseErr || !course) return json({ error: "Course not found" }, 404);
    if (!course.is_published || !course.is_approved) {
      return json({ error: "Course not available" }, 400);
    }
    const price = Number(course.price);
    if (!(price > 0)) return json({ error: "Course is free" }, 400);

    // Idempotency: block if already purchased
    const { data: existingPurchase } = await admin
      .from("purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", course.id)
      .eq("status", "completed")
      .maybeSingle();
    if (existingPurchase) {
      return json({ error: "Course already purchased", already_purchased: true }, 409);
    }

    const amountMinor = Math.round(price * 100);

    // Reuse an in-progress order if one exists and hasn't expired.
    const { data: pending } = await admin
      .from("pending_orders")
      .select("*")
      .eq("user_id", user.id)
      .eq("course_id", course.id)
      .maybeSingle();

    if (pending && new Date(pending.expires_at) > new Date() && pending.amount === amountMinor) {
      await admin.from("payment_retries").insert({
        user_id: user.id,
        course_id: course.id,
        razorpay_order_id: pending.razorpay_order_id,
        event_type: "resume",
      });
      return json({
        order_id: pending.razorpay_order_id,
        amount: pending.amount,
        currency: pending.currency,
        key_id: pending.key_id,
        course_title: pending.course_title ?? course.title,
        price,
        resumed: true,
      });
    }

    // Stale or mismatched — clear before creating a new one.
    if (pending) {
      await admin.from("pending_orders").delete().eq("id", pending.id);
    }

    const receipt = `u_${user.id.slice(0, 8)}_c_${course.id.slice(0, 8)}_${Math.floor(Date.now() / 60000)}`;

    const auth = btoa(`${keyId}:${keySecret}`);
    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountMinor,
        currency: cur,
        receipt,
        notes: { course_id: course.id, user_id: user.id },
      }),
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok) {
      return json({ error: orderData?.error?.description || "Order failed" }, 500);
    }

    await admin.from("pending_orders").upsert({
      user_id: user.id,
      course_id: course.id,
      razorpay_order_id: orderData.id,
      amount: amountMinor,
      currency: cur,
      key_id: keyId,
      course_title: course.title,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }, { onConflict: "user_id,course_id" });

    await admin.from("payment_retries").insert({
      user_id: user.id,
      course_id: course.id,
      razorpay_order_id: orderData.id,
      event_type: "new_order",
    });

    return json({
      order_id: orderData.id,
      amount: amountMinor,
      currency: cur,
      key_id: keyId,
      course_title: course.title,
      price,
      resumed: false,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
