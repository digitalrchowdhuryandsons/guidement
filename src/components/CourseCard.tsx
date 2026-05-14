import { Link } from "react-router-dom";
import { Star, Users, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CourseCardProps {
  id: string;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  price: number;
  instructor_name: string;
  category_name?: string;
  rating?: number;
  review_count?: number;
  level?: string;
}

export function CourseCard({
  id,
  title,
  slug,
  thumbnail_url,
  price,
  instructor_name,
  category_name,
  rating = 0,
  review_count = 0,
  level,
}: CourseCardProps) {
  return (
    <Link to={`/course/${slug}`}>
      <Card className="group overflow-hidden border-0 shadow-sm hover:shadow-glow transition-all duration-300 hover:-translate-y-1">
        <div className="aspect-video overflow-hidden bg-muted">
          {thumbnail_url ? (
            <img
              src={thumbnail_url}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center gradient-primary">
              <span className="text-3xl font-display font-bold text-primary-foreground">
                {title.charAt(0)}
              </span>
            </div>
          )}
        </div>
        <CardContent className="p-4 space-y-2">
          <h3 className="font-display font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground">{instructor_name}</p>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-warning">{rating > 0 ? rating.toFixed(1) : "New"}</span>
            {rating > 0 && (
              <>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-3 w-3 ${s <= Math.round(rating) ? "fill-warning text-warning" : "text-muted-foreground"}`}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">({review_count})</span>
              </>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-lg">
              {price === 0 ? "Free" : `$${price.toFixed(2)}`}
            </span>
            {level && (
              <Badge variant="secondary" className="text-xs capitalize">
                {level}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
