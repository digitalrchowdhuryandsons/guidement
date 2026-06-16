import { useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { trackClick } from "@/lib/affiliateTracking";

export default function RefRedirect() {
  const { code } = useParams<{ code: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const utm = {
      utm_source: params.get("utm_source") ?? undefined,
      utm_medium: params.get("utm_medium") ?? undefined,
      utm_campaign: params.get("utm_campaign") ?? undefined,
      utm_content: params.get("utm_content") ?? undefined,
    };
    const isSlugFmt = code?.startsWith("L_");
    const to = params.get("to") ?? "/";
    trackClick({
      ...(isSlugFmt ? { slug: code!.slice(2) } : { code: code! }),
      utm,
      landing_page: to,
    })
      .catch(() => {})
      .finally(() => navigate(to, { replace: true }));
  }, [code, params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      Redirecting…
    </div>
  );
}
