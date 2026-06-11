import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function SiteAnnouncement() {
  const { data } = useQuery({
    queryKey: ["site-content", "popup"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_content")
        .select("*")
        .eq("key", "popup")
        .maybeSingle();
      return data;
    },
    staleTime: 60_000,
  });

  const [open, setOpen] = useState(false);
  const popup = (data?.data || {}) as { title: string; body: string; ctaLabel: string; ctaHref: string; dismissId: string };
  const dismissKey = popup.dismissId ? `site-popup-dismissed-${popup.dismissId}` : "";

  useEffect(() => {
    if (!data?.enabled || !dismissKey) return;
    if (localStorage.getItem(dismissKey)) return;
    const t = setTimeout(() => setOpen(true), 800);
    return () => clearTimeout(t);
  }, [data?.enabled, dismissKey]);

  const dismiss = () => {
    if (dismissKey) localStorage.setItem(dismissKey, "1");
    setOpen(false);
  };

  if (!data?.enabled) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : dismiss())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">{popup.title}</DialogTitle>
          <DialogDescription>{popup.body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={dismiss}>Dismiss</Button>
          {popup.ctaHref && (
            <Link to={popup.ctaHref} onClick={dismiss}>
              <Button>{popup.ctaLabel || "Learn more"}</Button>
            </Link>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
