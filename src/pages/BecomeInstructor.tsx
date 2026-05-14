import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  GraduationCap,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  Users,
  DollarSign,
  BarChart3,
  Sparkles,
} from "lucide-react";

export default function BecomeInstructor() {
  const { user, loading, hasRole } = useAuth();
  const queryClient = useQueryClient();

  const [expertise, setExpertise] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [experience, setExperience] = useState("");

  const { data: application, isLoading: appLoading } = useQuery({
    queryKey: ["instructor-application", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("instructor_applications")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("instructor_applications").insert({
        user_id: user!.id,
        expertise,
        bio,
        website: website || null,
        experience,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application submitted! We'll review it shortly.");
      queryClient.invalidateQueries({ queryKey: ["instructor-application"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (loading || appLoading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );

  if (!user) return <Navigate to="/auth" />;
  if (hasRole("instructor")) return <Navigate to="/instructor/dashboard" />;

  const statusConfig: Record<string, { icon: any; color: string; label: string; description: string }> = {
    pending: {
      icon: Clock,
      color: "text-warning",
      label: "Under Review",
      description: "Your application is being reviewed by our team. We'll notify you once a decision is made.",
    },
    approved: {
      icon: CheckCircle2,
      color: "text-success",
      label: "Approved",
      description: "Congratulations! Your instructor role is being activated.",
    },
    rejected: {
      icon: XCircle,
      color: "text-destructive",
      label: "Not Approved",
      description: "Unfortunately your application wasn't approved at this time.",
    },
  };

  // Show application status
  if (application) {
    const status = statusConfig[application.status] || statusConfig.pending;
    const StatusIcon = status.icon;
    return (
      <div className="container max-w-2xl py-16 space-y-6">
        <Card className="border-0 bg-secondary/50">
          <CardContent className="p-8 text-center space-y-4">
            <StatusIcon className={`h-16 w-16 mx-auto ${status.color}`} />
            <Badge variant="secondary" className="text-sm">
              {status.label}
            </Badge>
            <h1 className="font-display text-2xl font-bold">Application Status</h1>
            <p className="text-muted-foreground max-w-md mx-auto">{status.description}</p>
            {application.admin_notes && (
              <div className="mt-4 p-4 rounded-lg bg-muted text-sm text-left">
                <p className="font-medium mb-1">Feedback:</p>
                <p className="text-muted-foreground">{application.admin_notes}</p>
              </div>
            )}
            <Link to="/dashboard">
              <Button variant="outline" className="mt-4">
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Application form
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0 gradient-hero opacity-10" />
        <div className="container relative text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Become an Instructor
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold max-w-2xl mx-auto">
            Share Your Knowledge,{" "}
            <span className="bg-gradient-to-r from-primary to-[hsl(280,90%,65%)] bg-clip-text text-transparent">
              Earn Revenue
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Join thousands of instructors on Guidement. Create courses, reach students worldwide, and build your brand.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="container py-12">
        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          {[
            { icon: Users, title: "Reach Millions", desc: "Access our global student community and grow your audience." },
            { icon: DollarSign, title: "Earn Revenue", desc: "Set your own prices and earn money every time a student enrolls." },
            { icon: BarChart3, title: "Track Analytics", desc: "Get detailed insights into student engagement and revenue." },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="border-0 bg-secondary/50 text-center">
              <CardContent className="p-6 space-y-3">
                <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Form */}
        <Card className="max-w-2xl mx-auto border-0 shadow-glow">
          <CardHeader>
            <CardTitle className="font-display text-xl flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Instructor Application
            </CardTitle>
            <CardDescription>Tell us about yourself and your teaching expertise</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitMutation.mutate();
              }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="expertise">Area of Expertise *</Label>
                <Input
                  id="expertise"
                  placeholder="e.g. Web Development, Data Science, Design..."
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience">Teaching Experience *</Label>
                <Textarea
                  id="experience"
                  placeholder="Describe your professional and teaching experience..."
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  rows={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Short Bio *</Label>
                <Textarea
                  id="bio"
                  placeholder="A brief introduction about yourself for students..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Portfolio / Website (optional)</Label>
                <Input
                  id="website"
                  placeholder="https://yoursite.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground"
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Application"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
