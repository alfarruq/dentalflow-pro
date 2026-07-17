import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CalendarDays, UserPlus, CalendarPlus, Clock, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useAppointmentsQuery } from "@/hooks/useAppointments";

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  confirmed: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  cancelled: "bg-destructive/8 text-destructive",
};

interface QuickActionProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  variant?: "primary" | "default";
}

function QuickAction({ icon: Icon, label, onClick, variant = "default" }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-3 sm:p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0",
        variant === "primary"
          ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
          : "border-border bg-card hover:bg-accent/40"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl",
          variant === "primary"
            ? "bg-primary text-primary-foreground"
            : "bg-primary/10 text-primary"
        )}
      >
        <Icon className="h-5 w-5 stroke-[1.6]" />
      </div>
      <span className="text-[13px] sm:text-sm font-medium leading-tight">{label}</span>
    </button>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  tone?: "neutral" | "warning" | "destructive" | "success";
}

function KpiCard({ label, value, sub, icon: Icon, tone = "neutral" }: KpiCardProps) {
  const tones = {
    neutral: "bg-primary/10 text-primary",
    warning: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    destructive: "bg-destructive/15 text-destructive",
    success: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  };
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-normal text-muted-foreground tracking-wide truncate">{label}</p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight mt-1 tabular-nums">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
          </div>
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
            <Icon className="h-5 w-5 stroke-[1.6]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: appointments = [] } = useAppointmentsQuery();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayAppointments = appointments
    .filter((a) => a.date === todayStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  const completedCount = todayAppointments.filter((a) => a.status === "completed").length;
  const totalToday = todayAppointments.length;
  const progressPercent = totalToday > 0 ? Math.round((completedCount / totalToday) * 100) : 0;

  return (
    <div className="space-y-5 sm:space-y-6 max-w-6xl">
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <QuickAction
          icon={UserPlus}
          label={t("dashboard.qa_newPatient")}
          onClick={() => navigate("/patients")}
        />
        <QuickAction
          icon={CalendarPlus}
          label={t("dashboard.qa_newAppointment")}
          onClick={() => navigate("/appointments")}
          variant="primary"
        />
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label={t("dashboard.todayAppointments")}
          value={`${completedCount}/${totalToday}`}
          sub={t("dashboard.completedSub")}
          icon={CalendarDays}
        />
      </div>

      {/* Today's Schedule */}
      <Card className="flex flex-col shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-[15px] font-semibold">{t("dashboard.todaySchedule")}</CardTitle>
              {totalToday > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("dashboard.progressLabel", { done: completedCount, total: totalToday })}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => navigate("/appointments")}
            >
              {t("dashboard.viewAll")}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          {totalToday > 0 && <Progress value={progressPercent} className="h-1.5 mt-3" />}
        </CardHeader>
        <CardContent className="flex-1 px-4 sm:px-5 pb-4">
          {totalToday === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
              <CalendarDays className="h-8 w-8" />
              <p className="text-sm">{t("appointments.noAppointments")}</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
              {todayAppointments.slice(0, 10).map((apt) => (
                <button
                  key={apt.id}
                  onClick={() => navigate(`/patients/${apt.patientId}`)}
                  className="w-full flex items-center gap-3 p-2.5 sm:p-3 rounded-xl hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-1.5 w-14 shrink-0">
                    <Clock className="h-3 w-3 text-muted-foreground stroke-[1.4] hidden sm:block" />
                    <span className="font-mono text-xs font-medium">{apt.time}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium truncate block">{apt.patientName}</span>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {t(`patients.${apt.treatmentType}`)}
                      {apt.toothNumber && <span> · #{apt.toothNumber}</span>}
                    </p>
                  </div>
                  <Badge className={cn("text-[10px] border-0 shrink-0 px-2 py-0.5 hidden sm:inline-flex", statusColors[apt.status])}>
                    {t(`appointments.status_${apt.status}`)}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
