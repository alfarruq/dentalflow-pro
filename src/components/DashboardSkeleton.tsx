import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors DashboardKpiGrid's 3-card row so there's no layout shift on load. */
export function DashboardKpiSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible">
      {[0, 1, 2].map((i) => (
        <div key={i} className="min-w-[46%] shrink-0 sm:min-w-0 sm:shrink">
          <Card className="shadow-md">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-12" />
                </div>
                <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

/** Mirrors DashboardSchedule's row shape (time · name · badge) so there's no layout shift on load. */
export function DashboardScheduleSkeleton() {
  return (
    <div className="space-y-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 p-2.5 sm:p-3">
          <Skeleton className="h-3 w-10 shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="hidden sm:block h-5 w-16 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}
