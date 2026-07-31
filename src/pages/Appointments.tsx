import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Plus, Search, Clock, User, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Appointment, AppointmentStatus } from "@/data/mockAppointments";
import { useDoctors } from "@/contexts/DoctorsContext";
import { useAppointmentsQuery, useDeleteAppointment, type AppointmentDateFilter } from "@/hooks/useAppointments";
import { useQuickCreate } from "@/contexts/QuickCreateContext";
import { DoctorFilterChips } from "@/components/DoctorFilterChips";
import { DoctorBadge } from "@/components/DoctorBadge";
import { NewAppointmentDialog } from "@/components/NewAppointmentDialog";
import { useToast } from "@/hooks/use-toast";

type Scope = "day" | "week" | "all";

const SCOPE_KEY = "dentaflow-appointments-scope";

const statusColors: Record<AppointmentStatus, string> = {
  pending: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  confirmed: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-destructive/10 text-destructive",
};

// Every map has a "none" entry — an appointment with no treatment type on
// file (the common case; the backend leaves it null until a treatment is
// actually recorded) must read as neutral, not silently default to a real
// colour/category it was never given.
const treatmentBorder: Record<string, string> = {
  implant: "border-l-4 border-l-blue-400",
  filling: "border-l-4 border-l-amber-400",
  cleaning: "border-l-4 border-l-emerald-400",
  none: "border-l-4 border-l-border",
};

const treatmentCardBg: Record<string, string> = {
  implant: "bg-blue-50 dark:bg-blue-950/30",
  filling: "bg-amber-50 dark:bg-amber-950/30",
  cleaning: "bg-emerald-50 dark:bg-emerald-950/30",
  none: "bg-muted/40",
};

const treatmentDot: Record<string, string> = {
  implant: "bg-blue-500",
  filling: "bg-amber-500",
  cleaning: "bg-emerald-500",
  none: "bg-muted-foreground/40",
};

/** Colour-map key for an appointment — "none" unless a real type is on file. */
function treatmentColorKey(apt: Appointment): string {
  return apt.treatmentTypeName ? apt.treatmentType : "none";
}

/** "Endo Pulpotek", "Endo Pulpotek · Tish #16", "Tish #16", or "" — never a guessed type. */
function treatmentSubtitle(apt: Appointment, toothLabel: string): string {
  const parts = [apt.treatmentTypeName, apt.toothNumber ? `${toothLabel} #${apt.toothNumber}` : null].filter(Boolean);
  return parts.join(" · ");
}

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

// ─── Edit / delete actions ─────────────────────────────────────────────────

/** Dropdown (Edit/Delete) + delete confirmation, shared by both list layouts. */
function AppointmentActionsMenu({
  apt, onEdit, compact,
}: {
  apt: Appointment;
  onEdit: (apt: Appointment) => void;
  /** Smaller trigger button for the tight week-grid cards. */
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const deleteAppointment = useDeleteAppointment();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDelete() {
    try {
      await deleteAppointment.mutateAsync(apt.id);
    } catch {
      return; // error toast handled by the mutation
    }
    setConfirmOpen(false);
    toast({ title: t("appointments.appointmentDeleted") });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={compact ? "h-5 w-5 shrink-0" : "h-8 w-8 shrink-0"}
          >
            <MoreVertical className={compact ? "h-3 w-3" : "h-4 w-4"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(apt)}>
            <Pencil className="mr-2 h-3.5 w-3.5" />
            {t("treatments.editTreatment")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setConfirmOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            {t("appointments.deleteConfirmTitle")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("appointments.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("appointments.deleteConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("patients.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("appointments.deleteConfirmTitle")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Details modal (opened by clicking an appointment) ─────────────────────

/** Full-info modal opened by clicking an appointment; hosts Edit/Delete itself. */
function AppointmentDetailsDialog({
  appointment, open, onOpenChange, onEdit, onOpenPatient,
}: {
  appointment: Appointment;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit: (apt: Appointment) => void;
  onOpenPatient: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const deleteAppointment = useDeleteAppointment();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const linkable = !appointment.patientId.startsWith("new-") && Boolean(appointment.patientId);
  const subtitle = treatmentSubtitle(appointment, t("patientProfile.tooth"));

  function handleEdit() {
    onOpenChange(false);
    onEdit(appointment);
  }

  async function handleDelete() {
    try {
      await deleteAppointment.mutateAsync(appointment.id);
    } catch {
      return; // error toast handled by the mutation
    }
    setConfirmDelete(false);
    onOpenChange(false);
    toast({ title: t("appointments.appointmentDeleted") });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("appointments.detailsTitle")}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => { if (linkable) { onOpenChange(false); onOpenPatient(appointment.patientId); } }}
                className={cn(
                  "truncate text-left text-lg font-semibold",
                  linkable && "cursor-pointer hover:text-primary hover:underline",
                )}
              >
                {appointment.patientName}
              </button>
              {appointment.phone && <p className="text-sm text-muted-foreground">{appointment.phone}</p>}
            </div>
            <Badge className={cn("shrink-0 border-0 text-xs", statusColors[appointment.status])}>
              {t(`appointments.status_${appointment.status}`)}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("appointments.date")}</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium">
                <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                {format(parseISO(appointment.date), "dd.MM.yyyy")} · {appointment.time}
              </p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("appointments.doctorLabel")}</p>
              <div className="mt-1.5">
                <DoctorBadge doctorId={appointment.assignedDoctorId} />
              </div>
            </div>
          </div>

          {subtitle && (
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.treatmentType")}</p>
              <p className="mt-1.5 text-sm font-medium">{subtitle}</p>
            </div>
          )}

          {appointment.notes && (
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("appointments.notes")}</p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">{appointment.notes}</p>
            </div>
          )}

          <DialogFooter className="flex-row items-center !justify-between border-t pt-4">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-destructive hover:underline"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("appointments.deleteConfirmTitle")}
            </button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleEdit}>
              <Pencil className="h-3.5 w-3.5" />
              {t("treatments.editTreatment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("appointments.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("appointments.deleteConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("patients.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("appointments.deleteConfirmTitle")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Row (list card) ────────────────────────────────────────────────────────

function AppointmentRow({
  apt, onOpenPatient, onEdit, onView,
}: {
  apt: Appointment;
  onOpenPatient: (id: string) => void;
  onEdit: (apt: Appointment) => void;
  onView: (apt: Appointment) => void;
}) {
  const { t } = useTranslation();
  const linkable = !apt.patientId.startsWith("new-") && Boolean(apt.patientId);
  const subtitle = treatmentSubtitle(apt, t("patientProfile.tooth"));

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onView(apt)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onView(apt); } }}
      className={cn(
        "cursor-pointer shadow-sm transition-shadow hover:shadow-md",
        treatmentBorder[treatmentColorKey(apt)],
      )}
    >
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
              onClick={(e) => { e.stopPropagation(); if (linkable) onOpenPatient(apt.patientId); }}
              className={cn(
                "truncate text-left text-sm font-medium",
                linkable && "cursor-pointer hover:text-primary hover:underline",
              )}
            >
              {apt.patientName}
            </button>
            <DoctorBadge doctorId={apt.assignedDoctorId} variant="compact" />
          </div>
          {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <Badge className={cn("shrink-0 border-0 text-xs", statusColors[apt.status])}>
          {t(`appointments.status_${apt.status}`)}
        </Badge>
        <div onClick={(e) => e.stopPropagation()}>
          <AppointmentActionsMenu apt={apt} onEdit={onEdit} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Grouped list (day / all, and week on mobile) ─────────────────────────────

function GroupedList({
  appointments,
  todayStr,
  onOpenPatient,
  onEdit,
  onView,
}: {
  appointments: Appointment[];
  todayStr: string;
  onOpenPatient: (id: string) => void;
  onEdit: (apt: Appointment) => void;
  onView: (apt: Appointment) => void;
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
              <AppointmentRow key={apt.id} apt={apt} onOpenPatient={onOpenPatient} onEdit={onEdit} onView={onView} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Week calendar grid (desktop) ─────────────────────────────────────────────

function WeekGrid({
  appointments, onOpenPatient, onEdit, onView,
}: {
  appointments: Appointment[];
  onOpenPatient: (id: string) => void;
  onEdit: (apt: Appointment) => void;
  onView: (apt: Appointment) => void;
}) {
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
                const subtitle = treatmentSubtitle(apt, t("patientProfile.tooth"));
                return (
                  <div
                    key={apt.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onView(apt)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onView(apt); } }}
                    className={cn(
                      "cursor-pointer rounded-xl p-2.5 text-xs transition-all hover:shadow-sm",
                      treatmentCardBg[treatmentColorKey(apt)],
                    )}
                  >
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", treatmentDot[treatmentColorKey(apt)])} />
                      <span className="font-mono font-semibold text-primary">{apt.time}</span>
                      <div className="ml-auto flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <DoctorBadge doctorId={apt.assignedDoctorId} variant="dot" />
                        <AppointmentActionsMenu apt={apt} onEdit={onEdit} compact />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); if (linkable) onOpenPatient(apt.patientId); }}
                      className={cn(
                        "w-full truncate text-left font-semibold leading-tight text-foreground",
                        linkable && "cursor-pointer hover:text-primary hover:underline",
                      )}
                    >
                      {apt.patientName}
                    </button>
                    {subtitle && <p className="mt-0.5 truncate leading-tight text-muted-foreground">{subtitle}</p>}
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
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [viewingAppointment, setViewingAppointment] = useState<Appointment | null>(null);

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
            <WeekGrid appointments={visible} onOpenPatient={openPatient} onEdit={setEditingAppointment} onView={setViewingAppointment} />
          </div>
          <div className="sm:hidden">
            <GroupedList appointments={visible} todayStr={todayStr} onOpenPatient={openPatient} onEdit={setEditingAppointment} onView={setViewingAppointment} />
          </div>
        </>
      ) : (
        <GroupedList appointments={visible} todayStr={todayStr} onOpenPatient={openPatient} onEdit={setEditingAppointment} onView={setViewingAppointment} />
      )}

      <NewAppointmentDialog
        open={!!editingAppointment}
        onOpenChange={(v) => { if (!v) setEditingAppointment(null); }}
        appointment={editingAppointment}
      />

      {viewingAppointment && (
        <AppointmentDetailsDialog
          appointment={viewingAppointment}
          open={!!viewingAppointment}
          onOpenChange={(v) => { if (!v) setViewingAppointment(null); }}
          onEdit={(apt) => { setViewingAppointment(null); setEditingAppointment(apt); }}
          onOpenPatient={openPatient}
        />
      )}
    </div>
  );
}
