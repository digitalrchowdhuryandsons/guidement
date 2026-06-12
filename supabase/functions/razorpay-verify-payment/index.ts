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

async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keySecret) {
      return json({ error: "RAZORPAY_KEY_SECRET not configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return json({ error: "Unauthorized" }, 401);
    }
    const user = userRes.user;

    const body = await req.json().catch(() => null);
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      course_id,
      amount,
      coupon_id,
    } = body ?? {};

    if (
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      typeof razorpay_signature !== "string" ||
      typeof course_id !== "string" ||
      typeof amount !== "number" ||
      amount < 0
    ) {
      return json({ error: "Invalid payload" }, 400);
    }

    const expected = await hmacSha256Hex(
      keySecret,
      `${razorpay_order_id}|${razorpay_payment_id}`,
    );
    if (!timingSafeEqual(expected, razorpay_signature)) {
      return json({ error: "Invalid signature" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Idempotency #1: same Razorpay payment already recorded
    const { data: byPayment } = await admin
      .from("purchases")
      .select("id")
      .eq("stripe_payment_id", razorpay_payment_id)
      .maybeSingle();
    if (byPayment) {
      return json({ success: true, purchase_id: byPayment.id, already: true });
    }

    // Idempotency #2: this user already owns this course
    const { data: byUserCourse } = await admin
      .from("purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", course_id)
      .eq("status", "completed")
      .maybeSingle();
    if (byUserCourse) {
      return json({ success: true, purchase_id: byUserCourse.id, already: true });
    }

    const { data: inserted, error: insertErr } = await admin
      .from("purchases")
      .insert({
        user_id: user.id,
        course_id,
        amount,
        status: "completed",
        stripe_payment_id: razorpay_payment_id,
        coupon_id: coupon_id ?? null,
      })
      .select("id")
      .single();

    if (insertErr) {
      // Race condition: a parallel call inserted first → unique violation
      if ((insertErr as any).code === "23505") {
        const { data: race } = await admin
          .from("purchases")
          .select("id")
          .eq("user_id", user.id)
          .eq("course_id", course_id)
          .eq("status", "completed")
          .maybeSingle();
        if (race) {
          return json({ success: true, purchase_id: race.id, already: true });
        }
      }
      return json({ error: insertErr.message }, 500);
    }

    // Clear the resumable pending order now that purchase is complete.
    await admin
      .from("pending_orders")
      .delete()
      .eq("user_id", user.id)
      .eq("course_id", course_id);

        // Record coupon redemption (atomic, re-validates the coupon)
    if (coupon_id) {
      await admin.rpc("increment_coupon_use", { _coupon_id: coupon_id });
    }

    return json({ success: true, purchase_id: inserted.id });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
