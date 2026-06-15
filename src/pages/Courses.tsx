import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CourseCard } from "@/components/CourseCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal, Lock, PlayCircle, Info } from "lucide-react";

export default function Courses() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const categorySlug = searchParams.get("category") || "";
  const [search, setSearch] = useState(q);
  const [priceFilter, setPriceFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*");
      return data || [];
    },
  });

 const { data: courses, isLoading } = useQuery({
  queryKey: ["courses", q, categorySlug, priceFilter, levelFilter, sortBy],
  queryFn: async () => {
    let query = supabase
      .from("courses")
      .select("*, profiles!courses_instructor_profile_fkey(full_name), categories(name, slug)")
      .eq("is_published", true)
      .eq("is_approved", true);

    if (q) query = query.ilike("title", `%${q}%`);

    // Fix: resolve slug → id first, then filter on category_id
    if (categorySlug) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", categorySlug)
        .single();
      if (cat) query = query.eq("category_id", cat.id);
    }

    if (priceFilter === "free") query = query.eq("price", 0);
    if (priceFilter === "paid") query = query.gt("price", 0);
    if (levelFilter !== "all") query = query.eq("level", levelFilter);

    if (sortBy === "newest") query = query.order("created_at", { ascending: false });
    else if (sortBy === "price-low") query = query.order("price", { ascending: true });
    else if (sortBy === "price-high") query = query.order("price", { ascending: false });

    const { data } = await query;
    return data || [];
  },
});

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams((prev) => {
      if (search) prev.set("q", search);
      else prev.delete("q");
      return prev;
    });
  };

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-2">Explore Courses</h1>
        <p className="text-muted-foreground">Discover courses that match your goals</p>
      </div>

      {/* Free preview info banner */}
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
        <div className="flex items-start gap-4">
          <div className="shrink-0 rounded-lg bg-primary/15 p-2.5">
            <Info className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <h2 className="font-display text-base font-semibold">
              How free previews work
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sign up free to watch <span className="font-medium text-foreground">Chapter 1 of every course</span> — including our
              Digital Marketing with AI course. Remaining chapters, downloadable PDFs, and course materials unlock after purchase.
            </p>
            <div className="flex flex-wrap gap-3 pt-1 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/60 px-2.5 py-1 border border-border">
                <PlayCircle className="h-3.5 w-3.5 text-primary" />
                Chapter 1 free
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/60 px-2.5 py-1 border border-border">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                Chapters 2+ after purchase
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/60 px-2.5 py-1 border border-border">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                PDFs & resources unlocked with purchase
              </span>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={!categorySlug ? "default" : "secondary"}
          className="cursor-pointer"
          onClick={() => setSearchParams((p) => { p.delete("category"); return p; })}
        >
          All
        </Badge>
        {categories?.map((cat) => (
          <Badge
            key={cat.id}
            variant={categorySlug === cat.slug ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => setSearchParams((p) => { p.set("category", cat.slug); return p; })}
          >
            {cat.name}
          </Badge>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={priceFilter} onValueChange={setPriceFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Price" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Prices</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price-low">Price: Low</SelectItem>
            <SelectItem value="price-high">Price: High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-lg bg-muted animate-pulse aspect-[4/5]" />
          ))}
        </div>
      ) : courses && courses.length > 0 ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {courses.map((course: any) => (
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
      ) : (
        <div className="text-center py-16">
          <p className="text-lg text-muted-foreground">No courses found. Try a different search.</p>
        </div>
      )}
    </div>
  );
}
