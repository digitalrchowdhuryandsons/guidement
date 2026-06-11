import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Megaphone, LayoutTemplate, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type HeroData = {
  eyebrow?: string;
  title: string;
  highlight: string;
  subtitle: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  imageUrl?: string;
};

type PopupData = {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  dismissId: string;
};

export default function SiteContentEditor() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: rows } = useQuery({
    queryKey: ["site-content-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_content").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const hero = rows?.find((r: any) => r.key === "hero");
  const popup = rows?.find((r: any) => r.key === "popup");

  const [heroData, setHeroData] = useState<HeroData | null>(null);
  const [heroEnabled, setHeroEnabled] = useState(true);
  const [popupData, setPopupData] = useState<PopupData | null>(null);
  const [popupEnabled, setPopupEnabled] = useState(false);

  useEffect(() => {
    if (hero) { setHeroData(hero.data as HeroData); setHeroEnabled(hero.enabled); }
    if (popup) { setPopupData(popup.data as PopupData); setPopupEnabled(popup.enabled); }
  }, [hero?.updated_at, popup?.updated_at]);

  const save = useMutation({
    mutationFn: async (payload: { key: string; data: any; enabled: boolean }) => {
      const { error } = await supabase
        .from("site_content")
        .upsert({ key: payload.key, data: payload.data, enabled: payload.enabled, updated_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["site-content-admin"] });
      qc.invalidateQueries({ queryKey: ["site-content"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="border-0">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <LayoutTemplate className="h-5 w-5 text-primary" /> Site Content
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="hero">
          <TabsList>
            <TabsTrigger value="hero"><LayoutTemplate className="h-4 w-4 mr-1" /> Landing Hero</TabsTrigger>
            <TabsTrigger value="popup"><Megaphone className="h-4 w-4 mr-1" /> Announcement Popup</TabsTrigger>
          </TabsList>

          <TabsContent value="hero" className="space-y-4 pt-4">
            {heroData && (
              <>
                <div className="flex items-center gap-3">
                  <Switch checked={heroEnabled} onCheckedChange={setHeroEnabled} id="hero-enabled" />
                  <Label htmlFor="hero-enabled">Show custom hero on Landing</Label>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label>Eyebrow</Label><Input value={heroData.eyebrow || ""} onChange={(e) => setHeroData({ ...heroData, eyebrow: e.target.value })} /></div>
                  <div><Label>Title</Label><Input value={heroData.title} onChange={(e) => setHeroData({ ...heroData, title: e.target.value })} /></div>
                  <div><Label>Highlighted word (must appear in title)</Label><Input value={heroData.highlight} onChange={(e) => setHeroData({ ...heroData, highlight: e.target.value })} /></div>
                  <div><Label>Hero image URL (optional)</Label><Input value={heroData.imageUrl || ""} onChange={(e) => setHeroData({ ...heroData, imageUrl: e.target.value })} /></div>
                </div>
                <div><Label>Subtitle</Label><Textarea value={heroData.subtitle} onChange={(e) => setHeroData({ ...heroData, subtitle: e.target.value })} /></div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label>Primary CTA label</Label><Input value={heroData.primaryCtaLabel} onChange={(e) => setHeroData({ ...heroData, primaryCtaLabel: e.target.value })} /></div>
                  <div><Label>Primary CTA href</Label><Input value={heroData.primaryCtaHref} onChange={(e) => setHeroData({ ...heroData, primaryCtaHref: e.target.value })} /></div>
                  <div><Label>Secondary CTA label</Label><Input value={heroData.secondaryCtaLabel} onChange={(e) => setHeroData({ ...heroData, secondaryCtaLabel: e.target.value })} /></div>
                  <div><Label>Secondary CTA href</Label><Input value={heroData.secondaryCtaHref} onChange={(e) => setHeroData({ ...heroData, secondaryCtaHref: e.target.value })} /></div>
                </div>
                <Button onClick={() => save.mutate({ key: "hero", data: heroData, enabled: heroEnabled })} disabled={save.isPending}>
                  <Save className="h-4 w-4 mr-1" /> Save Hero
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="popup" className="space-y-4 pt-4">
            {popupData && (
              <>
                <div className="flex items-center gap-3">
                  <Switch checked={popupEnabled} onCheckedChange={setPopupEnabled} id="popup-enabled" />
                  <Label htmlFor="popup-enabled">Show announcement to all visitors</Label>
                </div>
                <div><Label>Title</Label><Input value={popupData.title} onChange={(e) => setPopupData({ ...popupData, title: e.target.value })} /></div>
                <div><Label>Body</Label><Textarea value={popupData.body} onChange={(e) => setPopupData({ ...popupData, body: e.target.value })} /></div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label>CTA label</Label><Input value={popupData.ctaLabel} onChange={(e) => setPopupData({ ...popupData, ctaLabel: e.target.value })} /></div>
                  <div><Label>CTA href</Label><Input value={popupData.ctaHref} onChange={(e) => setPopupData({ ...popupData, ctaHref: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Dismiss version (bump to re-show after edits)</Label>
                  <Input value={popupData.dismissId} onChange={(e) => setPopupData({ ...popupData, dismissId: e.target.value })} />
                </div>
                <Button onClick={() => save.mutate({ key: "popup", data: popupData, enabled: popupEnabled })} disabled={save.isPending}>
                  <Save className="h-4 w-4 mr-1" /> Save Popup
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
