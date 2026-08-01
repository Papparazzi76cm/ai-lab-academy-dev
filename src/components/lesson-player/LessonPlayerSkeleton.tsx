import { SiteHeader } from "@/components/layout/SiteHeader";
import { Skeleton } from "@/components/ui/skeleton";

export function LessonPlayerSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-2 w-full" />
          <div className="space-y-3 pt-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="aspect-video w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
