import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronRight, MoreVertical, Eye, CalendarClock, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/data/mockAppointments";
import { DoctorBadge } from "@/components/DoctorBadge";
import { DashboardScheduleSkeleton } from "@/components/DashboardSkeleton";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

interface RowActionsProps {
  onView: () => void;
}

function RowActions({ onView }: RowActionsProps) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onView}>
          <Eye className="h-4 w-4" />
          {t("dashboard.viewPatient")}
        </DropdownMenuItem>
        <DropdownMenuItem>
          <CalendarClock className="h-4 w-4" />
          {t("appointments.reschedule", "Reschedule")}
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          <XCircle className="h-4 w-4" />
          {t("appointments.cancel", "Cancel")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ScheduleRowProps {
  appointment: Appointment;
  onSelect: () => void;
}

function ScheduleRow({ appointment: apt, onSelect }: ScheduleRowProps) {
  const { t } = useTranslation();
  const isActive = apt.status === "pending" || apt.status === "confirmed";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect())}
      className={cn(
        "group grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border-l-2 px-3 py-3 transition-colors sm:grid-cols-[64px_1.4fr_1fr_auto_auto] sm:gap-4",
        isActive
          ? "border-l-primary bg-primary/5"
          : "border-l-transparent hover:border-l-border hover:bg-accent/50",
      )}
    >
      {/* Time */}
      <span className="font-mono text-sm font-semibold tabular-nums">{apt.time}</span>

      {/* Patient: avatar + name + phone */}
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="bg-muted text-[11px] font-semibold text-muted-foreground">
            {initials(apt.patientName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{apt.patientName}</p>
          {apt.phone ? <p className="truncate text-xs text-primary">{apt.phone}</p> : null}
        </div>
      </div>

      {/* Treatment — hidden on phones, shown as its own column on ≥sm */}
      <span className="hidden truncate text-sm text-muted-foreground sm:block">
        {t(`patients.${apt.treatmentType}`)}
        {apt.toothNumber ? <span> · #{apt.toothNumber}</span> : null}
      </span>

      {/* Doctor — hidden on phones */}
      <div className="hidden min-w-0 sm:block">
        <DoctorBadge doctorId={apt.assignedDoctorId} variant="compact" />
      </div>

      <RowActions onView={onSelect} />
    </div>
  );
}

interface DashboardScheduleProps {
  appointments: Appointment[];
  isLoading: boolean;
  onViewAll: () => void;
  onSelectPatient: (patientId: string) => void;
}

export function DashboardSchedule({
  appointments,
  isLoading,
  onViewAll,
  onSelectPatient,
}: DashboardScheduleProps) {
  const { t } = useTranslation();
  const totalToday = appointments.length;

  return (
    <Card className="flex h-full flex-col shadow-md">
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">{t("dashboard.todaySchedule")}</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 gap-1 text-xs font-medium text-primary hover:text-primary"
          onClick={onViewAll}
        >
          {t("dashboard.viewAll")}
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 px-3 pb-3 sm:px-4 sm:pb-4">
        {isLoading ? (
          <DashboardScheduleSkeleton />
        ) : totalToday === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-14 text-muted-foreground">
            <CalendarDays className="h-8 w-8" />
            <p className="text-sm">{t("appointments.noAppointments")}</p>
          </div>
        ) : (
          <>
            {/* Column headers — desktop only, matching the row grid */}
            <div className="hidden grid-cols-[64px_1.4fr_1fr_auto_auto] gap-4 border-b border-border/60 px-3 pb-2 sm:grid">
              {[t("dashboard.col_time"), t("dashboard.col_patient"), t("dashboard.col_treatment"), t("dashboard.col_doctor")].map((h) => (
                <span key={h} className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {h}
                </span>
              ))}
              <span aria-hidden />
            </div>

            <div className="mt-1 max-h-[520px] space-y-0.5 overflow-y-auto">
              {appointments.slice(0, 12).map((apt) => (
                <ScheduleRow key={apt.id} appointment={apt} onSelect={() => onSelectPatient(apt.patientId)} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
