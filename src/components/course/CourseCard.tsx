import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Clock, Star, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDuration, formatPrice, levelLabel } from "@/lib/api";

type CourseCardProps = {
  course: {
    slug: string;
    title: string;
    subtitle: string | null;
    cover_url: string | null;
    level: string;
    duration_minutes: number;
    students_count: number;
    rating: number;
    price_cents: number;
    currency: string;
    tags: string[];
  };
  index?: number;
};

export function CourseCard({ course, index = 0 }: CourseCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
    >
      <Link
        to="/courses/$slug"
        params={{ slug: course.slug }}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
      >
        <div className="aspect-video overflow-hidden bg-gradient-brand">
          {course.cover_url ? (
            <img
              src={course.cover_url}
              alt={course.title}
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-brand">
              <span className="font-display text-xl font-semibold text-primary-foreground/90">
                {course.title.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{levelLabel[course.level] ?? course.level}</Badge>
            {course.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>

          <h3 className="font-display text-lg leading-snug font-semibold">{course.title}</h3>
          {course.subtitle && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{course.subtitle}</p>
          )}

          <div className="mt-auto flex items-center gap-4 pt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" /> {formatDuration(course.duration_minutes)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3.5" /> {course.students_count}
            </span>
            <span className="flex items-center gap-1">
              <Star className="size-3.5" /> {course.rating || "—"}
            </span>
            <span className="ml-auto font-semibold text-foreground">
              {formatPrice(course.price_cents, course.currency)}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
