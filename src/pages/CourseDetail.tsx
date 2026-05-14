import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Clock, BookOpen, Users, PlayCircle, CheckCircle, Heart, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

declare global {
  interface Window { Razorpay?: any }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function CourseDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*, profiles!courses_instructor_profile_fkey(*), categories(name)")
        .eq("slug", slug!)
        .single();
      return data;
    },
    enabled: !!slug,
  });

  const { data: sections } = useQuery({
    queryKey: ["sections", course?.id],
    queryFn: async () => {
      const { data: secs } = await supabase
        .from("sections")
        .select("*")
        .eq("course_id", course!.id)
        .order("position");
      if (!secs || secs.length === 0) return [];
      const { data: lecs } = await supabase
        .from("lectures")
        .select("id, title, duration, position, is_preview, section_id, video_url")
        .in("section_id", secs.map((s) => s.id))
        .order("position");
      return secs.map((s) => ({
        ...s,
        lectures: (lecs || []).filter((l) => l.section_id === s.id),
      }));
    },
    enabled: !!course?.id,
  });

  const { data: reviews } = useQuery({
    queryKey: ["reviews", course?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*, profiles!reviews_user_profile_fkey(full_name, avatar_url)")
        .eq("course_id", course!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!course?.id,
  });

  const { data: purchased } = useQuery({
    queryKey: ["purchased", course?.id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("purchases")
        .select("id")
        .eq("course_id", course!.id)
        .eq("user_id", user.id)
        .eq("status", "completed")
        .maybeSingle();
      return !!data;
    },
    enabled: !!course?.id,
  });

  const { data: pendingOrder } = useQuery({
    queryKey: ["pending-order", course?.id, user?.id],
    queryFn: async () => {
      if (!user || !course) return null;
      const { data } = await (supabase as any)
        .from("pending_orders")
        .select("razorpay_order_id, expires_at")
        .eq("user_id", user.id)
        .eq("course_id", course.id)
        .maybeSingle();
      if (!data) return null;
      if (new Date(data.expires_at) <= new Date()) return null;
      return data as { razorpay_order_id: string; expires_at: string };
    },
    enabled: !!course?.id && !!user && !purchased,
  });

  const handleWishlist = async () => {
    if (!user) { toast.error("Please sign in first"); return; }
    const { error } = await supabase.from("wishlists").insert({ user_id: user.id, course_id: course!.id });
    if (error?.code === "23505") toast.info("Already in your wishlist");
    else if (error) toast.error(error.message);
    else toast.success("Added to wishlist!");
  };

  const handleBuyNow = async () => {
    if (!user || !course) return;
    if (Number(course.price) === 0) {
      toast.info("This course is free — start learning!");
      setBuyDialogOpen(false);
      return;
    }
    setCheckoutLoading(true);
    try {
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Failed to load Razorpay");

      const { data: orderData, error: orderErr } = await supabase.functions.invoke(
        "razorpay-create-order",
        { body: { course_id: course.id, currency: "INR" } },
      );
      if (orderErr || !orderData?.order_id) {
        throw new Error(orderErr?.message || orderData?.error || "Could not create order");
      }
      if (orderData.resumed) {
        toast.info("Resuming your previous checkout…");
      }

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "Guidement",
          description: orderData.course_title,
          order_id: orderData.order_id,
          prefill: {
            email: user.email ?? undefined,
            name: (user.user_metadata as any)?.full_name ?? undefined,
          },
          theme: { color: "#6366f1" },
          handler: async (resp: any) => {
            try {
              const { data: vData, error: vErr } = await supabase.functions.invoke(
                "razorpay-verify-payment",
                {
                  body: {
                    razorpay_order_id: resp.razorpay_order_id,
                    razorpay_payment_id: resp.razorpay_payment_id,
                    razorpay_signature: resp.razorpay_signature,
                    course_id: course.id,
                    amount: Number(course.price),
                  },
                },
              );
              if (vErr || !vData?.success) {
                throw new Error(vErr?.message || vData?.error || "Verification failed");
              }
              toast.success("Payment successful! Course unlocked.");
              setBuyDialogOpen(false);
              await queryClient.invalidateQueries({ queryKey: ["purchased", course.id, user.id] });
              await queryClient.invalidateQueries({ queryKey: ["pending-order", course.id, user.id] });
              resolve();
            } catch (e: any) {
              toast.error(e.message || "Verification failed");
              reject(e);
            }
          },
          modal: {
            ondismiss: () => resolve(),
          },
        });
        rzp.on("payment.failed", (resp: any) => {
          toast.error(resp?.error?.description || "Payment failed");
          reject(new Error("Payment failed"));
        });
        rzp.open();
      });
    } catch (e: any) {
      toast.error(e.message || "Checkout failed");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const logPurchaseAttempt = async (lectureId?: string) => {
    if (!course) return;
    await supabase.from("purchase_attempts").insert({
      user_id: user?.id ?? null,
      course_id: course.id,
      lecture_id: lectureId ?? null,
      source: "course_detail",
      is_guest: !user,
      user_agent: navigator.userAgent,
    });
  };

  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
    : 0;

  const totalLectures = sections?.reduce((sum, s: any) => sum + (s.lectures?.length || 0), 0) || 0;

  if (isLoading) return <div className="container py-16 text-center"><div className="animate-pulse h-64 bg-muted rounded-lg" /></div>;
  if (!course) return <div className="container py-16 text-center"><h1 className="text-2xl font-bold">Course not found</h1></div>;

  return (
    <div>
      {/* Hero */}
      <div className="gradient-hero text-primary-foreground">
        <div className="container py-12 md:py-16">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              {course.categories && (
                <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">
                  {(course.categories as any).name}
                </Badge>
              )}
              <h1 className="font-display text-3xl md:text-4xl font-bold">{course.title}</h1>
              <p className="text-lg opacity-90">{course.short_description}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {avgRating > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="font-bold">{avgRating.toFixed(1)}</span>
                    <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} className={`h-4 w-4 ${s <= Math.round(avgRating) ? "fill-current" : "opacity-40"}`} />)}</div>
                    <span>({reviews?.length} reviews)</span>
                  </div>
                )}
                <div className="flex items-center gap-1"><BookOpen className="h-4 w-4" />{totalLectures} lectures</div>
                <div className="flex items-center gap-1 capitalize"><Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">{course.level}</Badge></div>
              </div>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={(course.profiles as any)?.avatar_url || ""} />
                  <AvatarFallback>{(course.profiles as any)?.full_name?.charAt(0) || "I"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{(course.profiles as any)?.full_name}</p>
                  <p className="text-sm opacity-75">Instructor</p>
                </div>
              </div>
            </div>

            {/* Purchase card */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 space-y-4">
                {course.preview_video_url ? (
                  <video
                    src={course.preview_video_url}
                    poster={course.thumbnail_url || undefined}
                    controls
                    preload="metadata"
                    className="rounded-lg w-full aspect-video object-cover bg-black"
                  />
                ) : course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title} className="rounded-lg w-full aspect-video object-cover" />
                ) : null}
                <p className="font-display text-3xl font-bold text-card-foreground">
                  {course.price === 0 ? "Free" : `$${Number(course.price).toFixed(2)}`}
                </p>
                {purchased ? (
                  <Link to={`/learn/${course.slug}`}>
                    <Button className="w-full gradient-primary text-primary-foreground" size="lg">
                      <PlayCircle className="mr-2 h-5 w-5" /> Continue Learning
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Button
                      className="w-full gradient-primary text-primary-foreground"
                      size="lg"
                      onClick={() => {
                        logPurchaseAttempt();
                        setBuyDialogOpen(true);
                      }}
                    >
                      {course.price === 0 ? "Enroll for Free" : pendingOrder ? "Resume payment" : "Buy Now"}
                    </Button>
                    {pendingOrder && (
                      <p className="text-xs text-center text-muted-foreground">
                        You have an unfinished checkout — clicking again resumes it.
                      </p>
                    )}
                    <Link to={`/learn/${course.slug}`} className="block">
                      <Button variant="secondary" className="w-full" size="lg">
                        <PlayCircle className="mr-2 h-5 w-5" /> Start Learning (Free Preview)
                      </Button>
                    </Link>
                    <p className="text-xs text-muted-foreground text-center">
                      Watch Chapter 1 free. Purchase to unlock all lectures & PDFs.
                    </p>
                    <Button variant="outline" className="w-full" onClick={handleWishlist}>
                      <Heart className="mr-2 h-4 w-4" /> Add to Wishlist
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="container py-12 space-y-12">
        {/* What you'll learn */}
        {course.what_you_learn && course.what_you_learn.length > 0 && (
          <div>
            <h2 className="font-display text-2xl font-bold mb-4">What you'll learn</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {course.what_you_learn.map((item, i) => (
                <div key={i} className="flex gap-2"><CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" /><span className="text-sm">{item}</span></div>
              ))}
            </div>
          </div>
        )}

        {/* Curriculum */}
        {sections && sections.length > 0 && (
          <div>
            <h2 className="font-display text-2xl font-bold mb-4">Course Content</h2>
            <p className="text-sm text-muted-foreground mb-4">{sections.length} sections • {totalLectures} lectures</p>
            <Accordion type="multiple" className="space-y-2">
              {sections.map((section: any, sIdx: number) => {
                const sectionLocked = !purchased && sIdx > 0;
                return (
                  <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-4">
                    <AccordionTrigger className="font-medium">
                      <div className="flex items-center gap-2 flex-1">
                        {sectionLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                        <span>{section.title}</span>
                        {sIdx === 0 && !purchased && (
                          <Badge variant="secondary" className="ml-auto mr-2 text-xs">Free</Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2">
                        {section.lectures?.sort((a: any, b: any) => a.position - b.position).map((lecture: any) => {
                          const lectureLocked = !purchased && sIdx > 0 && !lecture.is_preview;
                          return (
                            <li
                              key={lecture.id}
                              className={`flex items-center gap-3 py-2 text-sm ${lectureLocked ? "cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2" : ""}`}
                              onClick={() => {
                                if (!lectureLocked) return;
                                logPurchaseAttempt(lecture.id);
                                setBuyDialogOpen(true);
                              }}
                            >
                              {lectureLocked ? (
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <PlayCircle className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className={`flex-1 ${lectureLocked ? "text-muted-foreground" : ""}`}>{lecture.title}</span>
                              {lecture.is_preview && <Badge variant="secondary" className="text-xs">Preview</Badge>}
                              {lecture.duration && <span className="text-xs text-muted-foreground">{Math.floor(lecture.duration / 60)}:{(lecture.duration % 60).toString().padStart(2, '0')}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        )}

        {/* Requirements */}
        {course.requirements && course.requirements.length > 0 && (
          <div>
            <h2 className="font-display text-2xl font-bold mb-4">Requirements</h2>
            <ul className="list-disc pl-5 space-y-1">{course.requirements.map((r, i) => <li key={i} className="text-sm">{r}</li>)}</ul>
          </div>
        )}

        {/* Description */}
        {course.description && (
          <div>
            <h2 className="font-display text-2xl font-bold mb-4">Description</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none">{course.description}</div>
          </div>
        )}

        {/* Reviews */}
        {reviews && reviews.length > 0 && (
          <div>
            <h2 className="font-display text-2xl font-bold mb-4">Reviews</h2>
            <div className="space-y-4">
              {reviews.map((review: any) => (
                <Card key={review.id} className="border-0 bg-secondary/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{review.profiles?.full_name?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{review.profiles?.full_name || "Student"}</p>
                        <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} className={`h-3 w-3 ${s <= review.rating ? "fill-warning text-warning" : "text-muted-foreground"}`} />)}</div>
                      </div>
                    </div>
                    {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              {user ? "Unlock this lecture" : "Sign in to continue"}
            </DialogTitle>
            <DialogDescription>
              {user
                ? "This lecture is part of the full course. Purchase to unlock all chapters, lectures, and downloadable resources."
                : "You need to sign in before you can purchase and unlock this course."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="font-display text-2xl font-bold">
              {course.price === 0 ? "Free" : `$${Number(course.price).toFixed(2)}`}
            </p>
            {pendingOrder && (
              <p className="text-xs text-muted-foreground">
                We found an unfinished checkout for this course. Continue where you left off — no duplicate charges.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyDialogOpen(false)}>Cancel</Button>
            {user ? (
              <Button
                className="gradient-primary text-primary-foreground"
                onClick={handleBuyNow}
                disabled={checkoutLoading}
              >
                {checkoutLoading
                  ? "Processing..."
                  : course.price === 0
                    ? "Enroll for Free"
                    : pendingOrder
                      ? "Resume payment"
                      : "Buy Now"}
              </Button>
            ) : (
              <Link to={`/auth?redirect=/course/${slug}`}>
                <Button className="gradient-primary text-primary-foreground">
                  Sign In to Continue
                </Button>
              </Link>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
