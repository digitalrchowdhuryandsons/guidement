import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { CourseCard } from "@/components/CourseCard";
import { Button } from "@/components/ui/button";
import { Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Wishlist() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  const { data: wishlist } = useQuery({
    queryKey: ["wishlist", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("wishlists")
        .select("*, courses(*, profiles!courses_instructor_profile_fkey(full_name), categories(name))")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const removeFromWishlist = async (wishlistId: string) => {
    const { error } = await supabase.from("wishlists").delete().eq("id", wishlistId);
    if (error) toast.error(error.message);
    else {
      toast.success("Removed from wishlist");
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    }
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">My Wishlist</h1>
        <p className="text-muted-foreground">Courses you've saved for later</p>
      </div>

      {wishlist && wishlist.length > 0 ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {wishlist.map((item: any) => (
            <div key={item.id} className="relative">
              <CourseCard
                id={item.courses.id}
                title={item.courses.title}
                slug={item.courses.slug}
                thumbnail_url={item.courses.thumbnail_url}
                price={item.courses.price}
                instructor_name={item.courses.profiles?.full_name || "Instructor"}
                level={item.courses.level}
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 rounded-full"
                onClick={(e) => { e.preventDefault(); removeFromWishlist(item.id); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-display text-lg font-bold mb-2">Your wishlist is empty</h3>
          <p className="text-muted-foreground">Browse courses and save the ones you love!</p>
        </div>
      )}
    </div>
  );
}
