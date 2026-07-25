import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  ArrowLeft, Phone, AlertTriangle, Calendar, MapPin, Briefcase, Cake,
  Image as ImageIcon, CalendarPlus, Stethoscope,
  Edit, Save, Plus, CheckCircle2, Clock, Upload, Trash2,
  Pill, Printer, Pencil,
} from "lucide-react";
import { DentalChart, createDefaultTeeth, type ToothData } from "@/components/DentalChart";
import { DoctorBadge } from "@/components/DoctorBadge";
import { DoctorSelect } from "@/components/DoctorSelect";
import { PrescriptionDialog } from "@/components/PrescriptionDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { TREATMENT_TYPE_LABELS, type Patient, type TreatmentType, type GalleryImage } from "@/data/mockPatients";
import type { Treatment, TreatmentStatus } from "@/data/mockTreatments";
import type { Prescription } from "@/data/mockPrescriptions";
import { formatPrintDosage, formatPrintDuration, formatPrintSchedule } from "@/data/medicationCatalog";
import { loadClinicInfo } from "@/data/clinicInfo";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { formatUzPhone } from "@/lib/phone";
import { formatThousands, parseThousands } from "@/lib/number";
import { treatmentTypeKeyFromName, type PatientDetailResult } from "@/lib/api/mappers";
import { useTreatments } from "@/contexts/TreatmentContext";
import { useServiceTemplates } from "@/contexts/ServiceTemplatesContext";
import { usePatients, usePatientDetail, patientKeys } from "@/contexts/PatientsContext";
import { usePrescriptions } from "@/contexts/PrescriptionsContext";
import { useDoctors } from "@/contexts/DoctorsContext";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOOTH_NUMBERS = [
  "11","12","13","14","15","16","17","18",
  "21","22","23","24","25","26","27","28",
  "31","32","33","34","35","36","37","38",
  "41","42","43","44","45","46","47","48",
];

const TIME_SLOTS = Array.from({ length: 18 }, (_, i) => {
  const h = 9 + Math.floor(i / 2);
  const m = (i % 2) * 30;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

function fmt(n: number) { return n.toLocaleString("uz-UZ"); }

const patientStatusColors: Record<TreatmentStatus, string> = {
  in_progress: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  completed:   "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
};

const TREATMENT_STATUS_BORDER: Record<TreatmentStatus, string> = {
  in_progress: "border-l-orange-400",
  completed:   "border-l-green-500",
};

const TREATMENT_STATUS_BG: Record<TreatmentStatus, string> = {
  in_progress: "bg-orange-50/50 dark:bg-orange-950/20",
  completed:   "bg-green-50/30 dark:bg-green-950/10",
};

const TREATMENT_STATUS_BADGE: Record<TreatmentStatus, string> = {
  in_progress: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  completed:   "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
};

// ─── Tooth multi-select ───────────────────────────────────────────────────────

function ToothMultiSelect({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  function toggle(n: string) {
    onChange(selected.includes(n) ? selected.filter((x) => x !== n) : [...selected, n]);
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {TOOTH_NUMBERS.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => toggle(n)}
          className={cn(
            "h-8 w-9 rounded-md border text-xs font-medium transition-colors",
            selected.includes(n)
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border hover:bg-accent",
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

// ─── Treatment Dialog (create + edit) ─────────────────────────────────────────

function TreatmentDialog({
  patientId, treatment, open, onOpenChange,
}: {
  patientId: string;
  treatment: Treatment | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const { addTreatment, updateTreatment } = useTreatments();
  const { treatmentTypes } = useServiceTemplates();
  const isEditing = !!treatment;

  const [date, setDate]                 = useState<Date>(treatment ? new Date(treatment.date) : new Date());
  const [teeth, setTeeth]               = useState<string[]>(treatment?.teeth ?? []);
  const [treatmentTypeId, setTreatmentTypeId] = useState("");
  const [totalCost, setTotalCost]       = useState(treatment ? formatThousands(String(treatment.totalCost)) : "");
  const [amountPaid, setAmountPaid]     = useState(treatment ? formatThousands(String(treatment.amountPaid)) : "");
  const [doctorId, setDoctorId]         = useState(treatment?.doctorId ?? "");
  const [note, setNote]                 = useState(treatment?.note ?? "");

  // Default the treatment-type select once the list loads. When editing, match
  // the treatment's display key back to an API type; otherwise pick the first.
  useEffect(() => {
    if (treatmentTypeId || treatmentTypes.length === 0) return;
    const match = treatment
      ? treatmentTypes.find((tt) => treatmentTypeKeyFromName(tt.name) === treatment.treatmentType)
      : undefined;
    const chosen = match ?? treatmentTypes[0];
    setTreatmentTypeId(String(chosen.id));
    // Prefill cost only when adding; editing keeps the treatment's existing cost.
    if (!treatment && chosen.price != null) setTotalCost(formatThousands(String(chosen.price)));
  }, [treatment, treatmentTypes, treatmentTypeId]);

  // Picking a treatment type prefills its price as an editable default.
  function selectTreatmentType(id: string) {
    setTreatmentTypeId(id);
    const tt = treatmentTypes.find((t) => String(t.id) === id);
    if (tt?.price != null) setTotalCost(formatThousands(String(tt.price)));
  }

  function reset() {
    setDate(new Date()); setTeeth([]); setTreatmentTypeId("");
    setTotalCost(""); setAmountPaid(""); setDoctorId(""); setNote("");
  }

  function handleSave() {
    const selectedType = treatmentTypes.find((tt) => String(tt.id) === treatmentTypeId);
    const data = {
      date: date.toISOString(),
      teeth,
      // Display key for the local cache; the real id is sent separately on add.
      treatmentType: selectedType ? treatmentTypeKeyFromName(selectedType.name) : "cleaning",
      totalCost: Number(parseThousands(totalCost)) || 0,
      amountPaid: Number(parseThousands(amountPaid)) || 0,
      doctorId: doctorId || undefined,
      note: note.trim() || undefined,
    };
    if (treatment) {
      updateTreatment(treatment.id, data);
      toast.success(t("treatments.treatmentUpdated"));
    } else {
      addTreatment({
        patientId,
        status: "in_progress",
        ...data,
        treatmentTypeId: Number(treatmentTypeId) || undefined,
      });
      toast.success(t("treatments.treatmentAdded"));
    }
    if (!treatment) reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v && !treatment) reset(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            {isEditing ? t("treatments.editTreatment") : t("treatments.newTreatment")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date */}
          <div className="space-y-1.5">
            <Label>{t("treatments.date")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {format(date, "dd.MM.yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker mode="single" selected={date} onSelect={(d) => d && setDate(d)} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          {/* Teeth */}
          <div className="space-y-1.5">
            <Label>{t("treatments.teeth")}</Label>
            <ToothMultiSelect selected={teeth} onChange={setTeeth} />
          </div>

          {/* Treatment type */}
          <div className="space-y-1.5">
            <Label>{t("patients.treatmentType")}</Label>
            <Select value={treatmentTypeId} onValueChange={selectTreatmentType}>
              <SelectTrigger><SelectValue placeholder={t("appointments.selectTreatment")} /></SelectTrigger>
              <SelectContent>
                {treatmentTypes.map((tt) => (
                  <SelectItem key={tt.id} value={String(tt.id)}>{tt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cost + Paid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("patients.totalCost")}</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={totalCost}
                onChange={(e) => setTotalCost(formatThousands(e.target.value))}
                placeholder="500,000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("patients.paid")}</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={amountPaid}
                onChange={(e) => setAmountPaid(formatThousands(e.target.value))}
                placeholder="200,000"
              />
            </div>
          </div>

          {/* Doctor */}
          <DoctorSelect value={doctorId} onChange={setDoctorId} label={t("reminders.doctor")} hideIfSingle={false} />

          {/* Note */}
          <div className="space-y-1.5">
            <Label>{t("treatments.notes")}</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("patients.cancel")}</Button>
          <Button onClick={handleSave} disabled={!totalCost}>{t("patients.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Treatment Card ───────────────────────────────────────────────────────────

function TreatmentCard({
  treatment, onEdit,
}: {
  treatment: Treatment;
  onEdit: (t: Treatment) => void;
}) {
  const { t } = useTranslation();
  const { completeTreatment } = useTreatments();
  const remaining = treatment.totalCost - treatment.amountPaid;

  function handleComplete() {
    completeTreatment(treatment.id);
    toast.success(t("treatments.treatmentCompleted"));
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border border-l-4 shadow-sm p-4 space-y-3",
        TREATMENT_STATUS_BORDER[treatment.status],
        TREATMENT_STATUS_BG[treatment.status],
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-sm">{TREATMENT_TYPE_LABELS[treatment.treatmentType]}</span>
          {treatment.teeth.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {treatment.teeth.map((n) => (
                <Badge key={n} variant="outline" className="text-[10px] px-1.5 py-0">#{n}</Badge>
              ))}
            </div>
          )}
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0 border", TREATMENT_STATUS_BADGE[treatment.status])}
          >
            {t(`patients.${treatment.status}`)}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">{format(new Date(treatment.date), "dd.MM.yyyy")}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <DoctorBadge doctorId={treatment.doctorId} variant="compact" />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs rounded-md bg-background/70 px-3 py-2 border border-border/40">
        <span className="text-muted-foreground">
          {t("patients.totalCost")}: <strong className="text-foreground">{fmt(treatment.totalCost)}</strong>
        </span>
        <span className="text-green-600">
          {t("patients.paid")}: <strong>{fmt(treatment.amountPaid)}</strong>
        </span>
        {remaining > 0 && (
          <span className="text-destructive font-medium">
            {t("patients.remaining")}: <strong>{fmt(remaining)}</strong>
          </span>
        )}
        {remaining <= 0 && treatment.totalCost > 0 && (
          <span className="text-green-600 font-medium">✓ {t("treatments.fullyPaid")}</span>
        )}
      </div>

      {treatment.note && (
        <p className="text-xs text-muted-foreground italic">{treatment.note}</p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => onEdit(treatment)}>
          <Edit className="h-3 w-3" />
          {t("treatments.editTreatment")}
        </Button>
        {treatment.status === "in_progress" && (
          <Button
            size="sm"
            className="h-7 gap-1 text-xs bg-green-600 hover:bg-green-700 text-white"
            onClick={handleComplete}
          >
            <CheckCircle2 className="h-3 w-3" />
            {t("treatments.markCompleted")}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Printable Prescription ───────────────────────────────────────────────────

function PrintablePrescription({ prescription }: { prescription: Prescription }) {
  const clinic = loadClinicInfo();
  const { getDoctor } = useDoctors();
  const doctor = getDoctor(prescription.doctorId);

  return (
    <div className="print-area bg-white px-10 py-8 text-[13px] leading-relaxed text-black">
      <div className="mx-auto max-w-[760px]">
        {/* Letterhead */}
        <header className="flex items-center gap-4 border-b-2 border-black pb-4">
          {clinic.logo && (
            <img src={clinic.logo} alt={clinic.name} className="h-14 w-14 rounded-lg object-cover" />
          )}
          <div className="min-w-0">
            <p className="text-[20px] font-semibold leading-tight tracking-tight">{clinic.name}</p>
            <p className="mt-1 text-[11px] text-gray-600">{clinic.address}</p>
            <p className="text-[11px] text-gray-600">{clinic.phone}</p>
          </div>
        </header>

        {/* Title left, doctor right — no rule underneath. */}
        <div className="mt-6 flex items-baseline justify-between gap-6">
          <h2 className="text-[17px] font-semibold tracking-tight">
            {/* Dated by the backend's created_at; falls back to today for a
                record that has not been read back from the API yet. */}
            Retsept — {format(new Date(prescription.date ?? Date.now()), "dd.MM.yyyy")}
          </h2>
          <p className="shrink-0 text-gray-700">
            Doctor: <span className="font-medium text-black">{doctor?.name ?? "—"}</span>
          </p>
        </div>

        <table className="mt-5 w-full border-collapse text-left">
          <colgroup>
            <col className="w-7" />
            <col />
            <col className="w-24" />
            <col className="w-60" />
            <col className="w-20" />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-800">
              <th className="pb-2 pr-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">#</th>
              <th className="pb-2 pr-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Dori nomi</th>
              <th className="pb-2 pr-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Dozasi</th>
              <th className="pb-2 pr-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Qabul tartibi</th>
              <th className="pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Muddati</th>
            </tr>
          </thead>
          <tbody>
            {prescription.medications.map((m, i) => (
              <tr key={m.id} className="break-inside-avoid border-b border-gray-200 align-top">
                <td className="py-2.5 pr-2 tabular-nums text-gray-400">{i + 1}</td>
                <td className="py-2.5 pr-3 font-medium">{m.name}</td>
                <td className="py-2.5 pr-3 text-gray-700">{formatPrintDosage(m)}</td>
                <td className="py-2.5 pr-3 text-gray-700">{formatPrintSchedule(m)}</td>
                <td className="py-2.5 text-gray-700">{formatPrintDuration(m)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {prescription.note && (
          <div className="mt-5 border-l-2 border-gray-300 pl-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Izoh</p>
            <p className="mt-0.5 text-gray-800">{prescription.note}</p>
          </div>
        )}

        <div className="mt-16 flex items-end justify-between gap-10">
          <div className="w-48">
            <div className="h-px w-full bg-gray-400" />
            <p className="mt-1 text-[11px] text-gray-600">Shifokor imzosi</p>
          </div>
          <div className="w-40 text-right">
            <div className="h-px w-full bg-gray-400" />
            <p className="mt-1 text-[11px] text-gray-600">Muhr</p>
          </div>
        </div>

        <footer className="mt-10 border-t border-gray-200 pt-2 text-center text-[10px] text-gray-400">
          {clinic.name} · {clinic.phone}
        </footer>
      </div>
    </div>
  );
}

// ─── Prescriptions Tab (a patient's prescriptions, newest first) ─────────────

function PrescriptionsTab({
  patientId, patientName, onNew, onEdit, onPrint,
}: {
  patientId: string;
  /** API records come back with a name only, so matching needs both. */
  patientName?: string;
  onNew: () => void;
  onEdit: (rx: Prescription) => void;
  onPrint: (rx: Prescription) => void;
}) {
  const { t } = useTranslation();
  const { getPatientPrescriptions, deletePrescription } = usePrescriptions();
  const [deleteTarget, setDeleteTarget] = useState<Prescription | null>(null);

  const rows = getPatientPrescriptions(patientId, patientName);

  function confirmDelete() {
    if (!deleteTarget) return;
    deletePrescription(deleteTarget.id);
    setDeleteTarget(null);
    toast.success(t("prescriptions.prescriptionDeleted"));
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <Pill className="h-14 w-14 opacity-15" />
        <p className="text-sm">{t("prescriptions.noPrescriptions")}</p>
        <Button size="sm" onClick={onNew}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t("prescriptions.newPrescription")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={onNew}>
          <Plus className="h-4 w-4" />
          {t("prescriptions.newPrescription")}
        </Button>
      </div>
      {rows.map((rx) => (
        <div key={rx.id} className="rounded-xl border border-border shadow-sm p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-sm">
                {rx.date ? format(new Date(rx.date), "dd.MM.yyyy") : t("prescriptions.prescription")}
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {rx.medications.length} {t("prescriptions.medicationsCount")}
              </Badge>
            </div>
            <DoctorBadge doctorId={rx.doctorId} variant="compact" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {rx.medications.map((m) => (
              <span key={m.id} className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs">
                {m.name}
                {m.dosage && ` · ${m.dosage}`}
              </span>
            ))}
          </div>

          {rx.note && <p className="text-xs text-muted-foreground italic">{rx.note}</p>}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onEdit(rx)}>
              <Edit className="h-3.5 w-3.5" />
              {t("prescriptions.edit")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={() => setDeleteTarget(rx)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("prescriptions.delete")}
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => onPrint(rx)}>
              <Printer className="h-3.5 w-3.5" />
              {t("prescriptions.print")}
            </Button>
          </div>
        </div>
      ))}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("prescriptions.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("prescriptions.deleteConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("patients.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("prescriptions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Add Appointment Dialog ───────────────────────────────────────────────────

function AddAppointmentDialog({
  patient, open, onOpenChange,
}: {
  patient: Patient; open: boolean; onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const [aptDate, setAptDate]         = useState<Date | undefined>(new Date());
  const [aptTime, setAptTime]         = useState("09:00");
  const [aptDoctorId, setAptDoctorId] = useState("");
  const [aptNotes, setAptNotes]       = useState("");

  function reset() { setAptDate(new Date()); setAptTime("09:00"); setAptDoctorId(""); setAptNotes(""); }

  function handleSave() {
    if (!aptDate) return;
    reset(); onOpenChange(false);
    toast.success(t("patientProfile.appointmentScheduled"));
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4 text-primary" />
            {t("patientProfile.addAppointment")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
            {patient.fullName.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{patient.fullName}</p>
            <p className="text-xs text-muted-foreground">{patient.phone}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("appointments.date")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !aptDate && "text-muted-foreground")}>
                  <Calendar className="mr-2 h-4 w-4" />
                  {aptDate ? format(aptDate, "dd.MM.yyyy") : t("appointments.selectDate")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker mode="single" selected={aptDate} onSelect={setAptDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label>{t("appointments.time")}</Label>
            <Select value={aptTime} onValueChange={setAptTime}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIME_SLOTS.map((ts) => <SelectItem key={ts} value={ts}>{ts}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DoctorSelect value={aptDoctorId} onChange={setAptDoctorId} label={t("reminders.doctor")} hideIfSingle={false} />
          <div className="space-y-1.5">
            <Label>{t("appointments.notes")}</Label>
            <Textarea value={aptNotes} onChange={(e) => setAptNotes(e.target.value)} rows={2} placeholder="..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>{t("patients.cancel")}</Button>
          <Button onClick={handleSave}>{t("patients.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Patient Dialog ──────────────────────────────────────────────────────

export interface EditPatientData {
  fullName: string;
  phone: string;
  birthDate: string;
  address: string;
  workplace: string;
  assignedDoctorId: string;
  allergies: string;
  medicalNotes: string;
}

function EditPatientDialog({
  patient, onSave,
}: {
  patient: Patient;
  onSave: (data: EditPatientData) => void;
}) {
  const { t } = useTranslation();
  const [fullName, setFullName]   = useState(patient.fullName);
  const [phone, setPhone]         = useState(patient.phone);
  const [birthDate, setBirthDate] = useState(patient.birthDate ?? "");
  const [address, setAddress]     = useState(patient.address ?? "");
  const [workplace, setWorkplace] = useState(patient.workplace ?? "");
  const [doctorId, setDoctorId]   = useState(patient.assignedDoctorId ?? "");
  const [allergies, setAllergies] = useState(patient.allergies.join(", "));
  const [medNotes, setMedNotes]   = useState(patient.medicalNotes);

  const canSave = fullName.trim() !== "" && phone.trim() !== "";

  return (
    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
      <DialogHeader><DialogTitle>{t("patientProfile.editPatient")}</DialogTitle></DialogHeader>
      <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("patients.fullName")}</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("patients.phone")}</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998..." />
        </div>
        <div className="space-y-1.5">
          <Label>{t("patients.birthDate")}</Label>
          <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </div>
        <DoctorSelect value={doctorId} onChange={setDoctorId} label={t("finance.assignedDoctor")} className="space-y-1.5" hideIfSingle={false} />
        <div className="space-y-1.5">
          <Label>{t("patients.address")}</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("patients.workplace")}</Label>
          <Input value={workplace} onChange={(e) => setWorkplace(e.target.value)} />
        </div>
        {/* Local-only until the backend adds these columns. */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label>{t("patientProfile.allergiesLabel")}</Label>
          <Input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder={t("patientProfile.allergiesPlaceholder")} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>{t("patientProfile.medicalNotesLabel")}</Label>
          <Textarea value={medNotes} onChange={(e) => setMedNotes(e.target.value)} rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={!canSave}
          onClick={() =>
            onSave({
              fullName: fullName.trim(),
              phone: phone.trim(),
              birthDate,
              address: address.trim(),
              workplace: workplace.trim(),
              assignedDoctorId: doctorId,
              allergies,
              medicalNotes: medNotes,
            })
          }
        >
          <Save className="mr-2 h-4 w-4" />{t("patients.save")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ─── Patient Sidebar (left rail) ──────────────────────────────────────────────

function PatientSidebar({
  patient, status, balance,
}: {
  patient: Patient;
  status: TreatmentStatus;
  balance: { totalCost: number; paid: number; remaining: number };
}) {
  const { t } = useTranslation();
  const cur = t("common.currency");
  const paidPct = balance.totalCost > 0 ? Math.min(100, Math.round((balance.paid / balance.totalCost) * 100)) : 0;
  const info = [
    { Icon: Calendar, tip: t("patients.birthDate"), value: patient.birthDate ? format(new Date(patient.birthDate), "dd.MM.yyyy") : "—" },
    ...(patient.age ? [{ Icon: Cake, tip: t("patientProfile.age"), value: `${patient.age} ${t("patientProfile.yearsOld")}` }] : []),
    { Icon: MapPin, tip: t("patients.address"), value: patient.address || "—" },
    { Icon: Briefcase, tip: t("patients.workplace"), value: patient.workplace || "—" },
  ];

  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-5 p-5">
        {/* Identity + contact */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {patient.image ? (
              <img src={patient.image} alt={patient.fullName} className="h-16 w-16 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                {patient.fullName.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight tracking-tight">{patient.fullName}</h1>
              <div className="mt-1">
                <Badge className={patientStatusColors[status]}>{t(`patients.${status}`)}</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <a href={`tel:${patient.phone}`} className="flex items-center gap-2 font-medium text-primary hover:underline">
              <Phone className="h-4 w-4 shrink-0" />{formatUzPhone(patient.phone)}
            </a>
            <DoctorBadge doctorId={patient.assignedDoctorId} variant="line" />
          </div>
        </div>

        {/* Info — icon + value; the field name shows on hover */}
        <div className="space-y-3 border-t pt-4 text-sm">
          {info.map((r) => (
            <Tooltip key={r.tip}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2.5">
                  <r.Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 truncate font-medium">{r.value}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">{r.tip}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Balance */}
        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.remaining")}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {patient.visitNumber ?? 0} {t("patientProfile.visits").toLowerCase()}
            </span>
          </div>
          <p className={cn("text-2xl font-bold tabular-nums", balance.remaining > 0 ? "text-destructive" : "text-green-600")}>
            {fmt(balance.remaining)} <span className="text-sm font-normal text-muted-foreground">{cur}</span>
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${paidPct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("patients.paid")}: {fmt(balance.paid)} / {fmt(balance.totalCost)} {cur}
          </p>
        </div>

        {/* Allergies — only when present */}
        {patient.allergies.length > 0 && (
          <div className="space-y-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />{t("patientProfile.medicalNotesTitle")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {patient.allergies.map((a) => (
                <Badge key={a} variant="outline" className="border-destructive/30 text-[11px] text-destructive">{a}</Badge>
              ))}
            </div>
            {patient.medicalNotes && <p className="text-xs text-muted-foreground">{patient.medicalNotes}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

interface PendingUpload {
  dataUrl: string;
  name: string;
  file: File;
}

function readFilesAsDataUrls(files: FileList): Promise<PendingUpload[]> {
  const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
  return Promise.all(
    imageFiles.map(
      (file) =>
        new Promise<PendingUpload>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ dataUrl: String(reader.result), name: file.name, file });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }),
    ),
  );
}

function GalleryUploadDialog({
  files, open, onOpenChange, onConfirm,
}: {
  files: PendingUpload[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (images: { file: File; date: string }[]) => void;
}) {
  const { t } = useTranslation();
  const [date, setDate] = useState<Date>(new Date());

  function handleOpenChange(v: boolean) {
    if (v) setDate(new Date());
    onOpenChange(v);
  }

  function handleConfirm() {
    onConfirm(files.map((f) => ({ file: f.file, date: date.toISOString() })));
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            {t("patientProfile.addImage")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("patientProfile.imageDate")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {format(date, "dd.MM.yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker mode="single" selected={date} onSelect={(d) => d && setDate(d)} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {files.map((f, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-lg border bg-muted">
                <img src={f.dataUrl} alt={f.name} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("patients.cancel")}</Button>
          <Button onClick={handleConfirm} disabled={files.length === 0}>{t("patients.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImageLightbox({
  image, onOpenChange, onDelete,
}: {
  image: GalleryImage | null;
  onOpenChange: (v: boolean) => void;
  onDelete: (image: GalleryImage) => void;
}) {
  const { t } = useTranslation();
  const caption = image ? format(new Date(image.date), "dd.MM.yyyy") : "";
  return (
    <Dialog open={!!image} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl p-3">
        <DialogTitle className="sr-only">{caption}</DialogTitle>
        {image && (
          <div className="space-y-2">
            <img
              src={image.url}
              alt={caption}
              className="mx-auto max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
            />
            <div className="flex items-center justify-between px-1">
              <p className="text-sm text-muted-foreground">{caption}</p>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(image)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("patientProfile.deleteImage")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function GalleryTab({
  patient, onAddImages, onDeleteImage,
}: {
  patient: Patient;
  onAddImages: (images: { file: File; date: string }[]) => void | Promise<void>;
  onDeleteImage: (imageId: string) => void;
}) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingUpload[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GalleryImage | null>(null);

  function requestDelete(image: GalleryImage) {
    setDeleteTarget(image);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    onDeleteImage(deleteTarget.id);
    if (lightboxImage?.id === deleteTarget.id) setLightboxImage(null);
    setDeleteTarget(null);
    toast.success(t("patientProfile.imageDeleted"));
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const read = await readFilesAsDataUrls(fileList);
    if (read.length === 0) return;
    setPendingFiles(read);
    setUploadDialogOpen(true);
  }

  function handleConfirmUpload(images: { file: File; date: string }[]) {
    onAddImages(images);
    setUploadDialogOpen(false);
    setPendingFiles([]);
    toast.success(t("patientProfile.imageAdded"));
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ImageIcon className="h-5 w-5" />
          {t("patientProfile.gallery")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent/30",
          )}
        >
          <Upload className="h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">{t("patientProfile.dropImages")}</p>
          <p className="text-xs text-muted-foreground">{t("patientProfile.orBrowse")}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
          />
        </div>

        {/* Grid */}
        {patient.galleryImages.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {patient.galleryImages.map((img) => (
              <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                <button
                  type="button"
                  onClick={() => setLightboxImage(img)}
                  className="h-full w-full"
                >
                  <img src={img.url} alt={format(new Date(img.date), "dd.MM.yyyy")} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); requestDelete(img); }}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100"
                  aria-label={t("patientProfile.deleteImage")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                  <p className="truncate text-left text-xs font-medium text-white">
                    {format(new Date(img.date), "dd.MM.yyyy")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <GalleryUploadDialog
        files={pendingFiles}
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onConfirm={handleConfirmUpload}
      />
      <ImageLightbox
        image={lightboxImage}
        onOpenChange={(v) => { if (!v) setLightboxImage(null); }}
        onDelete={requestDelete}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("patientProfile.deleteImageConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("patientProfile.deleteImageConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("patients.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("patientProfile.deleteImage")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PatientProfile() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { t }     = useTranslation();

  const { updatePatient } = usePatients();
  const { getPatientPrescriptions } = usePrescriptions();
  const queryClient = useQueryClient();

  const { data: detail, isLoading: detailLoading } = usePatientDetail(id);
  const localPatient = detail?.patient;
  const [editOpen, setEditOpen]                   = useState(false);
  const [appointmentOpen, setAppointmentOpen]     = useState(false);
  const [treatmentDialogOpen, setTreatmentDialogOpen] = useState(false);
  const [editingTreatment, setEditingTreatment]   = useState<Treatment | null>(null);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);
  const [prescriptionDialogOpen, setPrescriptionDialogOpen] = useState(false);
  const [printingPrescription, setPrintingPrescription] = useState<Prescription | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Arriving from the global "Write prescription" dialog: show the prescriptions
  // tab and send the fresh record straight to the printer. The router state is
  // cleared right away so a reload or a back-navigation never reprints.
  const printRequestId = (location.state as { printPrescriptionId?: string } | null)?.printPrescriptionId;
  useEffect(() => {
    if (!printRequestId || !id) return;
    const rx = getPatientPrescriptions(id, localPatient?.fullName).find((p) => p.id === printRequestId);
    navigate(location.pathname, { replace: true, state: null });
    if (!rx) return;
    setActiveTab("prescriptions");
    setPrintingPrescription(rx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printRequestId, id]);

  useEffect(() => {
    if (!printingPrescription) return;
    const timer = setTimeout(() => window.print(), 50);
    const handleAfterPrint = () => setPrintingPrescription(null);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [printingPrescription]);

  const patientId       = localPatient?.id ?? "";
  const allTreatments   = detail?.treatments ?? [];
  const inProgressList  = allTreatments.filter((tr) => tr.status === "in_progress");
  const completedList   = allTreatments.filter((tr) => tr.status === "completed");
  const patientBalance  = detail?.balance ?? { totalCost: 0, paid: 0, remaining: 0 };
  const patientStatus   = localPatient?.treatmentStatus ?? "in_progress";

  const teethData = useMemo<ToothData[]>(() => {
    return createDefaultTeeth().map((tooth) => {
      const num = String(tooth.number);
      const match = allTreatments.find((tr) => tr.teeth.includes(num));
      if (!match) return tooth;
      const status: ToothData["status"] =
        match.status === "completed"
          ? (match.treatmentType === "implant" ? "implant" : "treated")
          : "decayed";
      return { ...tooth, status, note: match.note ?? "" };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTreatments]);

  // Rendered in every branch: the printable sheet needs no patient data, and a
  // print triggered right after navigation must not wait for the detail query.
  const printSheet = printingPrescription
    ? <PrintablePrescription prescription={printingPrescription} />
    : null;

  if (detailLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        {printSheet}
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!localPatient) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        {printSheet}
        <p className="text-muted-foreground">{t("patientProfile.notFound")}</p>
        <Button variant="outline" onClick={() => navigate("/patients")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("patientProfile.backToList")}
        </Button>
      </div>
    );
  }

  const handleEditSave = (data: EditPatientData) => {
    updatePatient(patientId, {
      fullName:         data.fullName,
      phone:            data.phone,
      birthDate:        data.birthDate || undefined,
      address:          data.address,
      workplace:        data.workplace,
      assignedDoctorId: data.assignedDoctorId || undefined,
      allergies:        data.allergies.split(",").map((a) => a.trim()).filter(Boolean),
      medicalNotes:     data.medicalNotes,
    });
    setEditOpen(false);
    toast.success(t("patientProfile.patientUpdated"));
  };

  const handleAddGalleryImages = async (items: { file: File; date: string }[]) => {
    try {
      for (const item of items) {
        const fd = new FormData();
        fd.append("user", patientId);
        fd.append("image", item.file);
        await apiFetch("/clinic/galleries/", { method: "POST", formData: fd });
      }
      queryClient.invalidateQueries({ queryKey: patientKeys.detail(patientId) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rasm yuklashda xatolik");
    }
  };

  // Cache-only removal until the backend exposes a gallery delete endpoint
  // (see BACKEND_SPEC.md).
  const handleDeleteGalleryImage = (imageId: string) => {
    queryClient.setQueryData<PatientDetailResult>(patientKeys.detail(patientId), (prev) =>
      prev
        ? {
            ...prev,
            patient: {
              ...prev.patient,
              galleryImages: prev.patient.galleryImages.filter((img) => img.id !== imageId),
            },
          }
        : prev,
    );
  };

  function openNewTreatment() {
    setEditingTreatment(null);
    setTreatmentDialogOpen(true);
  }

  function openEditTreatment(tr: Treatment) {
    setEditingTreatment(tr);
    setTreatmentDialogOpen(true);
  }

  function openNewPrescription() {
    setEditingPrescription(null);
    setPrescriptionDialogOpen(true);
  }

  function openEditPrescription(rx: Prescription) {
    setEditingPrescription(rx);
    setPrescriptionDialogOpen(true);
  }

  const prescriptionsCount = getPatientPrescriptions(patientId, localPatient?.fullName).length;

  return (
    <div className="space-y-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/patients")} className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />{t("patientProfile.backToList")}
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" className="gap-1.5" onClick={openNewTreatment}>
            <Stethoscope className="h-4 w-4" />{t("patientProfile.addTreatment")}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={openNewPrescription}>
            <Pill className="h-4 w-4" />{t("patientProfile.writePrescription")}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAppointmentOpen(true)}>
            <CalendarPlus className="h-4 w-4" />{t("patientProfile.addAppointment")}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" />{t("patientProfile.editPatient")}
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6">
          <PatientSidebar patient={localPatient} status={patientStatus} balance={patientBalance} />
        </aside>

        <div className="min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">{t("patientProfile.overview")}</TabsTrigger>
          <TabsTrigger value="treatments">
            {t("treatments.title")}
            {allTreatments.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                {allTreatments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="prescriptions">
            {t("prescriptions.title")}
            {prescriptionsCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                {prescriptionsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="gallery">{t("patientProfile.gallery")}</TabsTrigger>
        </TabsList>

        {/* ── Overview ──────────────────────────────────────────────────── */}
        <TabsContent value="overview">
          <DentalChart teeth={teethData} onUpdate={() => {}} readOnly />
        </TabsContent>

        {/* ── Muolajalar Tab ────────────────────────────────────────────── */}
        <TabsContent value="treatments">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="text-muted-foreground">{allTreatments.length} {t("treatments.title").toLowerCase()}</span>
                {inProgressList.length > 0 && <span className="text-orange-600 font-medium">{inProgressList.length} {t("patients.in_progress").toLowerCase()}</span>}
                {completedList.length > 0 && <span className="text-green-600">{completedList.length} {t("patients.completed").toLowerCase()}</span>}
              </div>
              <Button size="sm" className="gap-1.5" onClick={openNewTreatment}>
                <Plus className="h-4 w-4" />{t("treatments.newTreatment")}
              </Button>
            </div>

            {allTreatments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                <Stethoscope className="h-14 w-14 opacity-15" />
                <p className="text-sm">{t("treatments.noTreatments")}</p>
                <Button size="sm" variant="outline" onClick={openNewTreatment}>
                  <Plus className="mr-1.5 h-4 w-4" />{t("treatments.addFirst")}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {inProgressList.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-orange-600 flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />{t("treatments.activeTreatments")} ({inProgressList.length})
                    </h3>
                    <div className="space-y-3">
                      {inProgressList.map((tr) => (
                        <TreatmentCard
                          key={tr.id}
                          treatment={tr}
                          onEdit={openEditTreatment}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {completedList.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-green-600 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />{t("patients.completed")} ({completedList.length})
                    </h3>
                    <div className="space-y-3">
                      {completedList.map((tr) => (
                        <TreatmentCard
                          key={tr.id}
                          treatment={tr}
                          onEdit={openEditTreatment}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Retseptlar ────────────────────────────────────────────────── */}
        <TabsContent value="prescriptions">
          <PrescriptionsTab
            patientId={patientId}
            patientName={localPatient?.fullName}
            onNew={openNewPrescription}
            onEdit={openEditPrescription}
            onPrint={setPrintingPrescription}
          />
        </TabsContent>

        {/* ── Gallery ───────────────────────────────────────────────────── */}
        <TabsContent value="gallery">
          <GalleryTab patient={localPatient} onAddImages={handleAddGalleryImages} onDeleteImage={handleDeleteGalleryImage} />
        </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dialogs (portaled — position in the tree does not affect layout) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <EditPatientDialog patient={localPatient} onSave={handleEditSave} />
      </Dialog>
      <AddAppointmentDialog patient={localPatient} open={appointmentOpen} onOpenChange={setAppointmentOpen} />
      <TreatmentDialog
        patientId={patientId}
        treatment={editingTreatment}
        open={treatmentDialogOpen}
        onOpenChange={setTreatmentDialogOpen}
      />
      <PrescriptionDialog
        patientId={patientId}
        editing={editingPrescription}
        open={prescriptionDialogOpen}
        onOpenChange={(v) => { setPrescriptionDialogOpen(v); if (!v) setEditingPrescription(null); }}
      />
      {printSheet}
    </div>
  );
}
