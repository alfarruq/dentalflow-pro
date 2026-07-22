import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Plus, Search, Clock, User } from "lucide-react";
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Appointment, AppointmentStatus } from "@/data/mockAppointments";
import { useDoctors } from "@/contexts/DoctorsContext";
import { useAppointmentsQuery, type AppointmentDateFilter } from "@/hooks/useAppointments";
import { useQuickCreate } from "@/contexts/QuickCreateContext";
import { DoctorFilterChips } from "@/components/DoctorFilterChips";
import { DoctorBadge } from "@/components/DoctorBadge";

type Scope = "day" | "week" | "all";

const SCOPE_KEY = "dentaflow-appointments-scope";

const statusColors: Record<AppointmentStatus, string> = {
  pending: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  confirmed: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-destructive/10 text-destructive",
};

const treatmentBorder: Record<string, string> = {
  implant: "border-l-4 border-l-blue-400",
  filling: "border-l-4 border-l-amber-400",
  cleaning: "border-l-4 border-l-emerald-400",
};

const treatmentCardBg: Record<string, string> = {
  implant: "bg-blue-50 dark:bg-blue-950/30",
  filling: "bg-amber-50 dark:bg-amber-950/30",
  cleaning: "bg-emerald-50 dark:bg-emerald-950/30",
};

const treatmentDot: Record<string, string> = {
  implant: "bg-blue-500",
  filling: "bg-amber-500",
  cleaning: "bg-emerald-500",
};

const dayLabelsShort = ["Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya"];

/** Group appointments by their date string, preserving input (sorted) order. */
function groupByDate(appointments: Appointment[]): [string, Appointment[]][] {
  const groups = new Map<string, Appointment[]>();
  for (const a of appointments) {
    const bucket = groups.get(a.date);
    if (bucket) bucket.push(a);
    else groups.set(a.date, [a]);
  }
  return [...groups.entries()];
}

// ─── Row (list card) ────────────────────────────────────────────────────────

function AppointmentRow({ apt, onOpenPatient }: { apt: Appointment; onOpenPatient: (id: string) => void }) {
  const { t } = useTranslation();
  const linkable = !apt.patientId.startsWith("new-") && Boolean(apt.patientId);

  return (
    <Card className={cn("shadow-sm transition-shadow hover:shadow-md", treatmentBorder[apt.treatmentType])}>
      <CardContent className="flex items-center gap-4 px-4 py-3">
        <div className="flex w-20 shrink-0 items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm font-medium">{apt.time}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              type="button"
              onClick={() => linkable && onOpenPatient(apt.patientId)}
              className={cn(
                "truncate text-left text-sm font-medium",
                linkable && "cursor-pointer hover:text-primary hover:underline",
              )}
            >
              {apt.patientName}
            </button>
            <DoctorBadge doctorId={apt.assignedDoctorId} variant="compact" />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t(`patients.${apt.treatmentType}`)}
            {apt.toothNumber ? ` · ${t("patientProfile.tooth")} #${apt.toothNumber}` : null}
          </p>
        </div>
        <Badge className={cn("shrink-0 border-0 text-xs", statusColors[apt.status])}>
          {t(`appointments.status_${apt.status}`)}
        </Badge>
      </CardContent>
    </Card>
  );
}

// ─── Grouped list (day / all, and week on mobile) ─────────────────────────────

function GroupedList({
  appointments,
  todayStr,
  onOpenPatient,
}: {
  appointments: Appointment[];
  todayStr: string;
  onOpenPatient: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      {groupByDate(appointments).map(([date, apts]) => (
        <div key={date}>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            {date === todayStr ? t("appointments.today") : format(parseISO(date), "dd.MM.yyyy, EEEE")}
            <Badge variant="secondary" className="ml-2">{apts.length}</Badge>
          </h3>
          <div className="grid gap-2">
            {apts.map((apt) => (
              <AppointmentRow key={apt.id} apt={apt} onOpenPatient={onOpenPatient} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Week calendar grid (desktop) ─────────────────────────────────────────────

function WeekGrid({ appointments, onOpenPatient }: { appointments: Appointment[]; onOpenPatient: (id: string) => void }) {
  const { t } = useTranslation();
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(today, { weekStartsOn: 1 }) });

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
      <div className="grid grid-cols-7 border-b border-border/60">
        {weekDays.map((day, i) => (
          <div key={i} className={cn("px-2 py-3 text-center", i < 6 && "border-r border-border/40")}>
            <p className="mb-1 text-xs font-medium text-muted-foreground">{dayLabelsShort[i]}</p>
            <span
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold",
                isSameDay(day, today) && "bg-primary text-primary-foreground",
              )}
            >
              {format(day, "d")}
            </span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 min-h-[500px]">
        {weekDays.map((day, i) => {
          const dayStr = format(day, "yyyy-MM-dd");
          const dayApts = appointments.filter((a) => a.date === dayStr);
          return (
            <div
              key={i}
              className={cn(
                "space-y-1.5 overflow-y-auto p-2",
                i < 6 && "border-r border-border/40",
                isSameDay(day, today) && "bg-primary/[0.03]",
              )}
              style={{ maxHeight: 600 }}
            >
              {dayApts.map((apt) => {
                const linkable = !apt.patientId.startsWith("new-") && Boolean(apt.patientId);
                return (
                  <div
                    key={apt.id}
                    className={cn(
                      "rounded-xl p-2.5 text-xs transition-all hover:scale-[1.02] hover:shadow-sm",
                      treatmentCardBg[apt.treatmentType],
                    )}
                  >
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", treatmentDot[apt.treatmentType])} />
                      <span className="font-mono font-semibold text-primary">{apt.time}</span>
                      <DoctorBadge doctorId={apt.assignedDoctorId} variant="dot" className="ml-auto" />
                    </div>
                    <button
                      type="button"
                      onClick={() => linkable && onOpenPatient(apt.patientId)}
                      className={cn(
                        "w-full truncate text-left font-semibold leading-tight text-foreground",
                        linkable && "cursor-pointer hover:text-primary hover:underline",
                      )}
                    >
                      {apt.patientName}
                    </button>
                    <p className="mt-0.5 truncate leading-tight text-muted-foreground">
                      {t(`patients.${apt.treatmentType}`)}
                      {apt.toothNumber ? ` · #${apt.toothNumber}` : null}
                    </p>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const scopeTabs: { value: Scope; labelKey: string }[] = [
  { value: "day", labelKey: "appointments.daily" },
  { value: "week", labelKey: "appointments.weekly" },
  { value: "all", labelKey: "appointments.all" },
];

export default function Appointments() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { filterDoctorId } = useDoctors();
  const { openNewAppointment } = useQuickCreate();

  const [scope, setScope] = useState<Scope>(() => (localStorage.getItem(SCOPE_KEY) as Scope) || "day");
  const [search, setSearch] = useState("");

  useEffect(() => {
    localStorage.setItem(SCOPE_KEY, scope);
  }, [scope]);

  // Each scope hits the API with its own server-side filter and caches
  // independently — "all" sends no param (whole list).
  const dateFilter: AppointmentDateFilter | undefined = scope === "all" ? undefined : scope;
  const { data: appointments = [], isLoading } = useAppointmentsQuery(dateFilter);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const openPatient = (id: string) => navigate(`/patients/${id}`);

  const doctorCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of appointments) map[a.assignedDoctorId] = (map[a.assignedDoctorId] ?? 0) + 1;
    return map;
  }, [appointments]);

  // Doctor + search narrowing happens client-side on the already-scoped slice.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return appointments
      .filter((a) => (filterDoctorId ? a.assignedDoctorId === filterDoctorId : true))
      .filter((a) => (q ? a.patientName.toLowerCase().includes(q) : true))
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }, [appointments, filterDoctorId, search]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("appointments.title")}</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-full bg-muted p-1">
            {scopeTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setScope(tab.value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-all sm:px-4",
                  scope === tab.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
          <Button onClick={openNewAppointment} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("appointments.addAppointment")}</span>
          </Button>
        </div>
      </div>

      <DoctorFilterChips counts={doctorCounts} totalCount={appointments.length} />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("appointments.searchPatient")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <CalendarDays className="h-10 w-10" />
            <p>{t("appointments.noAppointments")}</p>
          </CardContent>
        </Card>
      ) : scope === "week" ? (
        <>
          <div className="hidden sm:block">
            <WeekGrid appointments={visible} onOpenPatient={openPatient} />
          </div>
          <div className="sm:hidden">
            <GroupedList appointments={visible} todayStr={todayStr} onOpenPatient={openPatient} />
          </div>
        </>
      ) : (
        <GroupedList appointments={visible} todayStr={todayStr} onOpenPatient={openPatient} />
      )}
    </div>
  );
}
