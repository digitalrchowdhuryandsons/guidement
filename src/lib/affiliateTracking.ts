import { supabase } from "@/integrations/supabase/client";

const COOKIE_KEY = "lv_ref_v1";
const VISITOR_KEY = "lv_visitor_id";

export type RefCookie = {
  affiliate_id: string;
  link_id: string | null;
  campaign_id: string | null;
  visitor_id: string;
  first_click_at: string;
  last_click_at: string;
  expires_at: string;
};

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getVisitorId(): string {
  let v = localStorage.getItem(VISITOR_KEY);
  if (!v) {
    v = uuid();
    localStorage.setItem(VISITOR_KEY, v);
  }
  return v;
}

export function readRefCookie(): RefCookie | null {
  try {
    const raw = localStorage.getItem(COOKIE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as RefCookie;
    if (new Date(c.expires_at) <= new Date()) {
      localStorage.removeItem(COOKIE_KEY);
      return null;
    }
    return c;
  } catch {
    return null;
  }
}

export function writeRefCookie(c: RefCookie) {
  localStorage.setItem(COOKIE_KEY, JSON.stringify(c));
}

export function clearRefCookie() {
  localStorage.removeItem(COOKIE_KEY);
}

export async function trackClick(opts: {
  code?: string;
  slug?: string;
  utm?: Partial<Record<"utm_source" | "utm_medium" | "utm_campaign" | "utm_content", string>>;
  landing_page?: string;
}) {
  const visitor_id = getVisitorId();
  const { data, error } = await supabase.functions.invoke("affiliate-track-click", {
    body: {
      code: opts.code,
      slug: opts.slug,
      visitor_id,
      session_id: sessionStorage.getItem("lv_sid") ?? null,
      landing_page: opts.landing_page ?? window.location.pathname,
      referrer: document.referrer || null,
      ...opts.utm,
    },
  });
  if (error) throw error;
  if (data?.cookie) writeRefCookie(data.cookie);
  return data;
}

export async function attributeSignupIfPossible() {
  const c = readRefCookie();
  if (!c) return;
  const { error } = await supabase.functions.invoke("affiliate-attribute-signup", {
    body: { cookie: c },
  });
  if (!error) clearRefCookie();
}
