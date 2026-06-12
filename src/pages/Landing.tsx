import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Users, Award, TrendingUp, Code, Briefcase, Palette, Camera, Music, Heart, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CourseCard } from "@/components/CourseCard";
import { SiteAnnouncement } from "@/components/SiteAnnouncement";

const iconMap: Record<string, any> = {
  Code, Briefcase, Palette, TrendingUp, Camera, Music, Heart, Target,
};


const DEFAULT_HERO = {
  eyebrow: "",
  title: "Learn Without Limits",
  highlight: "Limits",
  subtitle: "Access thousands of courses from world-class instructors. Build skills that matter, at your own pace.",
  primaryCtaLabel: "Explore Courses",
  primaryCtaHref: "/courses",
  secondaryCtaLabel: "Become an Instructor",
  secondaryCtaHref: "/become-instructor",
  imageUrl: "",
};



export default function Landing() {
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*");
      return data || [];
    },
  });

   const { data: heroRow } = useQuery({
    queryKey: ["site-content", "hero"],
    queryFn: async () => {
      const { data } = await supabase.from("site_content").select("*").eq("key", "hero").maybeSingle();
      return data;
    },
    staleTime: 60_000,
  });
  const hero = (heroRow?.enabled ? { ...DEFAULT_HERO, ...(heroRow.data as any) } : DEFAULT_HERO);
  const titleParts = hero.highlight && hero.title.includes(hero.highlight)
    ? hero.title.split(hero.highlight)
    : null;


  const { data: featuredCourses } = useQuery({
    queryKey: ["featured-courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*, profiles!courses_instructor_profile_fkey(full_name), categories(name)")
        .eq("is_published", true)
        .eq("is_approved", true)
        .limit(8);
      return data || [];
    },
  });

  return (
    <div className="min-h-screen">
            <SiteAnnouncement />
    
      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 gradient-hero opacity-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(262_83%_58%/0.08),transparent_70%)]" />
         {hero.imageUrl && (
          <div className="absolute inset-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: `url(${hero.imageUrl})` }} />
        )}
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center space-y-6 animate-fade-in">
             {hero.eyebrow && <p className="text-sm uppercase tracking-widest text-primary">{hero.eyebrow}</p>}
            <h1 className="font-display text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
             {titleParts ? (
                <>
                  {titleParts[0]}
                  <span className="bg-gradient-to-r from-primary to-[hsl(280,90%,65%)] bg-clip-text text-transparent">
                    {hero.highlight}
                  </span>
                  {titleParts[1]}
                </>
              ) : (
                hero.title
              )}
            </h1>
            <p className="text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto">
            {hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to={hero.primaryCtaHref}>
                <Button size="lg" className="gradient-primary text-primary-foreground rounded-full px-8 shadow-glow">
                  {hero.primaryCtaLabel} <ArrowRight className="ml-2 h-4 w-4" /> 
                </Button>
              </Link>
              <Link to={hero.secondaryCtaHref}>
                <Button size="lg" variant="outline" className="rounded-full px-8">
                  {hero.secondaryCtaLabel}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-card/50">
        <div className="container py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: BookOpen, label: "Courses", value: "10,000+" },
              { icon: Users, label: "Students", value: "500K+" },
              { icon: Award, label: "Certificates", value: "100K+" },
              { icon: TrendingUp, label: "Instructors", value: "2,000+" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center space-y-2">
                <Icon className="h-8 w-8 mx-auto text-primary" />
                <p className="font-display text-2xl font-bold">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold mb-3">Explore Categories</h2>
            <p className="text-muted-foreground">Find the perfect course for your learning journey</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories?.map((cat) => {
              const Icon = iconMap[cat.icon || "Code"] || Code;
              return (
                <Link key={cat.id} to={`/courses?category=${cat.slug}`}>
                  <Card className="group border-0 bg-secondary/50 hover:bg-accent hover:shadow-glow transition-all duration-300 cursor-pointer">
                    <CardContent className="flex flex-col items-center gap-3 p-6">
                      <div className="rounded-xl p-3 bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <span className="font-display font-medium text-sm">{cat.name}</span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      {featuredCourses && featuredCourses.length > 0 && (
        <section className="py-16 md:py-24 bg-secondary/30">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-display text-3xl font-bold mb-2">Featured Courses</h2>
                <p className="text-muted-foreground">Handpicked by our team</p>
              </div>
              <Link to="/courses">
                <Button variant="ghost">View All <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {featuredCourses.map((course: any) => (
                <CourseCard
                  key={course.id}
                  id={course.id}
                  title={course.title}
                  slug={course.slug}
                  thumbnail_url={course.thumbnail_url}
                  price={course.price}
                  instructor_name={course.profiles?.full_name || "Instructor"}
                  category_name={course.categories?.name}
                  level={course.level}
                />
              ))}
            </div>
          </div>
        </section>
      )}
<section className="py-16 md:py-24">

  </section>
      {/* CTA */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="rounded-2xl gradient-hero p-8 md:p-16 text-center text-primary-foreground relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,hsl(0_0%_100%/0.1),transparent_50%)]" />
            <div className="relative space-y-6">
              <h2 className="font-display text-3xl md:text-4xl font-bold">
                Start Teaching Today
              </h2>
              <p className="text-lg opacity-90 max-w-xl mx-auto">
                Share your expertise with millions of students worldwide. Create courses and earn revenue.
              </p>
              <Link to="/become-instructor">
                <Button size="lg" variant="secondary" className="rounded-full px-8">
                  Become an Instructor <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-card/50">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold mb-4">
                     <img src="/logo.png" alt="" className="w-30 h-20" />
              </Link>
              <p className="text-sm text-muted-foreground">
                The best place to learn new skills and advance your career.
              </p>
            </div>
            {[
              { title: "Platform", links: [["Browse Courses", "/courses"], ["Become Instructor", "/become-instructor"], ["Pricing", "/pricing"]] },
              { title: "Support", links: [["Help Center", "#"], ["Contact Us", "#"], ["FAQ", "#"]] },
              { title: "Legal", links: [["Privacy Policy", "#"], ["Terms of Service", "#"], ["Cookie Policy", "#"]] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="font-display font-semibold mb-4">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <Link to={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Guidement. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
