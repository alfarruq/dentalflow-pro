import { useTranslation } from "react-i18next";
import { CalendarDays, Users, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DashboardKpiSkeleton } from "@/components/DashboardSkeleton";

interface KpiShellProps {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

/**
 * Shared card frame: uppercase label + accent icon chip, then card body.
 * `h-full` + flex column lets all cards in a row share one (compact) height,
 * with shorter cards vertically centering their body in the leftover space.
 */
function KpiShell({ label, icon: Icon, children }: KpiShellProps) {
  return (
    <Card className="h-full shadow-md">
      <CardContent className="flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-4 w-4 stroke-[1.6]" />
          </div>
        </div>
        <div className="mt-2 flex flex-1 flex-col justify-center">{children}</div>
      </CardContent>
    </Card>
  );
}

interface DashboardKpiGridProps {
  completedCount: number;
  totalToday: number;
  totalPatients: number;
  growthPercent: number;
  freeSlots: string[];
  isLoading: boolean;
}

export function DashboardKpiGrid({
  completedCount,
  totalToday,
  totalPatients,
  growthPercent,
  freeSlots,
  isLoading,
}: DashboardKpiGridProps) {
  const { t } = useTranslation();

  if (isLoading) return <DashboardKpiSkeleton />;

  const progressPercent = totalToday > 0 ? Math.round((completedCount / totalToday) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
      {/* Today's appointments — count + completion progress */}
      <KpiShell label={t("dashboard.todayAppointments")} icon={CalendarDays}>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight tabular-nums">{totalToday}</span>
          <span className="text-sm text-muted-foreground">{t("dashboard.planned")}</span>
        </div>
        <Progress value={progressPercent} className="mt-2 h-1.5" />
        <p className="mt-1.5 text-xs text-muted-foreground">{t("dashboard.completedN", { count: completedCount })}</p>
      </KpiShell>

      {/* Active patients — total + growth trend */}
      <KpiShell label={t("dashboard.activePatients")} icon={Users}>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight tabular-nums">
            {totalPatients.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">{t("dashboard.totalActive")}</span>
        </div>
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <TrendingUp className="h-3.5 w-3.5" />
          {t("dashboard.growthPositive", { value: growthPercent })}
        </p>
      </KpiShell>

      {/* Free time slots — full width on phones so chips don't cramp */}
      <div className="sm:col-span-2 xl:col-span-1">
        <KpiShell label={t("dashboard.freeTimeToday")} icon={Clock}>
          {freeSlots.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {freeSlots.map((slot) => (
                <span
                  key={slot}
                  className="rounded-lg border border-border bg-muted/40 px-2.5 py-1 font-mono text-xs font-medium text-foreground"
                >
                  {slot}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("dashboard.noFreeSlots")}</p>
          )}
        </KpiShell>
      </div>
    </div>
  );
}
