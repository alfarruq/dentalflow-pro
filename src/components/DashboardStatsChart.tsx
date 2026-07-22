import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface DayStat {
  /** 0 = Monday … 6 = Sunday, matching dashboard.weekdaysShort order */
  weekdayIndex: number;
  value: number;
}

interface DashboardStatsChartProps {
  data: DayStat[];
  /** Index within `data` to highlight (today). */
  highlightIndex?: number;
  isLoading?: boolean;
}

const EMPTY_WEEK: DayStat[] = Array.from({ length: 7 }, (_, i) => ({ weekdayIndex: i, value: 0 }));

/**
 * Weekly appointment volume — one bar per weekday, single hue (magnitude), with
 * today emphasised. Per dataviz guidance: no legend for a single series, exact
 * values live in per-bar hover tooltips, only today carries a direct label, and
 * all text uses ink tokens (the bar colour alone carries "today").
 */
export function DashboardStatsChart({ data, highlightIndex, isLoading }: DashboardStatsChartProps) {
  const { t } = useTranslation();
  const short = t("dashboard.weekdaysShort", { returnObjects: true }) as string[];
  const full = t("dashboard.weekdaysFull", { returnObjects: true }) as string[];

  const days = data.length === 7 ? data : EMPTY_WEEK;
  const max = Math.max(1, ...days.map((d) => d.value));
  const total = days.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{t("dashboard.clinicStats")}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {t("dashboard.thisWeek")} · {t("dashboard.apptsCount", { count: total })}
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-40 items-end justify-between gap-2 sm:gap-3" aria-hidden>
            {EMPTY_WEEK.map((_, i) => (
              <div
                key={i}
                className="flex-1 animate-pulse rounded-t-md bg-muted"
                style={{ height: `${30 + ((i * 17) % 55)}%` }}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-40 items-end justify-between gap-2 border-b border-border/60 sm:gap-3">
            {days.map((d, i) => {
              const isToday = i === highlightIndex;
              // Scale to 90% so today's value label always has headroom above the tallest bar.
              const heightPct = d.value === 0 ? 0 : Math.max(8, Math.round((d.value / max) * 90));
              return (
                <Tooltip key={d.weekdayIndex}>
                  <TooltipTrigger asChild>
                    <div className="group flex h-full flex-1 cursor-default flex-col items-center justify-end gap-1.5">
                      {isToday && d.value > 0 && (
                        <span className="text-xs font-semibold tabular-nums text-foreground">{d.value}</span>
                      )}
                      <div
                        className={cn(
                          "w-full rounded-t-md transition-colors",
                          isToday ? "bg-primary" : "bg-primary/15 group-hover:bg-primary/30",
                        )}
                        style={{ height: d.value === 0 ? 3 : `${heightPct}%` }}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="font-medium">{full[i] ?? short[i]}</p>
                    <p className="text-muted-foreground">{t("dashboard.apptsCount", { count: d.value })}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}

        <div className="mt-2 flex justify-between gap-2 sm:gap-3">
          {days.map((d, i) => (
            <span
              key={d.weekdayIndex}
              className={cn(
                "flex-1 text-center text-[11px] font-medium uppercase",
                i === highlightIndex ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {short[i] ?? ""}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
