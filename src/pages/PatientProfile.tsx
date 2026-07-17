import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  ArrowLeft, Phone, AlertTriangle, Calendar, CreditCard,
  Image as ImageIcon, CalendarPlus, Stethoscope,
  Edit, Save, Plus, CheckCircle2, Clock, Upload, Trash2,
  Pill, Printer, X,
} from "lucide-react";
import { DentalChart, createDefaultTeeth, type ToothData } from "@/components/DentalChart";
import { DoctorBadge } from "@/components/DoctorBadge";
import { DoctorSelect } from "@/components/DoctorSelect";
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
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
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
import { loadClinicInfo } from "@/data/clinicInfo";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { type PatientDetailResult } from "@/lib/api/mappers";
import { useTreatments } from "@/contexts/TreatmentContext";
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
  const isEditing = !!treatment;

  const [date, setDate]                 = useState<Date>(treatment ? new Date(treatment.date) : new Date());
  const [teeth, setTeeth]               = useState<string[]>(treatment?.teeth ?? []);
  const [type, setType]                 = useState<TreatmentType>(treatment?.treatmentType ?? "filling");
  const [totalCost, setTotalCost]       = useState(treatment ? String(treatment.totalCost) : "");
  const [amountPaid, setAmountPaid]     = useState(treatment ? String(treatment.amountPaid) : "");
  const [doctorId, setDoctorId]         = useState(treatment?.doctorId ?? "");
  const [note, setNote]                 = useState(treatment?.note ?? "");

  function reset() {
    setDate(new Date()); setTeeth([]); setType("filling");
    setTotalCost(""); setAmountPaid(""); setDoctorId(""); setNote("");
  }

  function handleSave() {
    const data = {
      date: date.toISOString(),
      teeth,
      treatmentType: type,
      totalCost: Number(totalCost) || 0,
      amountPaid: Number(amountPaid) || 0,
      doctorId: doctorId || undefined,
      note: note.trim() || undefined,
    };
    if (treatment) {
      updateTreatment(treatment.id, data);
      toast.success(t("treatments.treatmentUpdated"));
    } else {
      addTreatment({ patientId, status: "in_progress", ...data });
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
            <Select value={type} onValueChange={(v) => setType(v as TreatmentType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(TREATMENT_TYPE_LABELS) as [TreatmentType, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cost + Paid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("patients.totalCost")}</Label>
              <Input type="number" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} placeholder="500 000" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("patients.paid")}</Label>
              <Input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="200 000" />
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
  treatment, onEdit, onWritePrescription, onPrintPrescription,
}: {
  treatment: Treatment;
  onEdit: (t: Treatment) => void;
  onWritePrescription: (t: Treatment) => void;
  onPrintPrescription: (p: Prescription, t: Treatment) => void;
}) {
  const { t } = useTranslation();
  const { completeTreatment } = useTreatments();
  const { getTreatmentPrescriptions } = usePrescriptions();
  const prescriptions = getTreatmentPrescriptions(treatment.id);
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

      {prescriptions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{t("prescriptions.title")}</p>
          <div className="space-y-1">
            {prescriptions.map((rx) => (
              <div
                key={rx.id}
                className="flex items-center justify-between gap-2 rounded-md bg-background/70 px-2.5 py-1.5 border border-border/40 text-xs"
              >
                <span className="text-muted-foreground">
                  {format(new Date(rx.date), "dd.MM.yyyy")} · {rx.medications.length} {t("prescriptions.medicationsCount")}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 px-2.5 text-xs"
                  onClick={() => onPrintPrescription(rx, treatment)}
                >
                  <Printer className="h-3.5 w-3.5" />
                  {t("prescriptions.print")}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => onEdit(treatment)}>
          <Edit className="h-3 w-3" />
          {t("treatments.editTreatment")}
        </Button>
        <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => onWritePrescription(treatment)}>
          <Pill className="h-3 w-3" />
          {t("prescriptions.newPrescription")}
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

// ─── Prescription Dialog ──────────────────────────────────────────────────────

interface MedicationDraft {
  name: string;
  dosage: string;
  schedule: string;
  duration: string;
}

function emptyMedication(): MedicationDraft {
  return { name: "", dosage: "", schedule: "", duration: "" };
}

function PrescriptionDialog({
  treatment, treatments, editing, open, onOpenChange,
}: {
  treatment: Treatment | null;
  treatments: Treatment[];
  editing: Prescription | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const { addPrescription, updatePrescription } = usePrescriptions();

  const showTreatmentSelect = !treatment && !editing;

  const [selectedTreatmentId, setSelectedTreatmentId] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [doctorId, setDoctorId] = useState("");
  const [note, setNote] = useState("");
  const [medications, setMedications] = useState<MedicationDraft[]>([emptyMedication()]);

  useEffect(() => {
    if (open) {
      const initialTreatmentId = editing?.treatmentId ?? treatment?.id ?? treatments[0]?.id ?? "";
      setSelectedTreatmentId(initialTreatmentId);
      setDate(editing ? new Date(editing.date) : new Date());
      const initialTreatment = treatment ?? treatments.find((tr) => tr.id === initialTreatmentId);
      setDoctorId(editing?.doctorId ?? initialTreatment?.doctorId ?? "");
      setNote(editing?.note ?? "");
      setMedications(
        editing
          ? editing.medications.map((m) => ({ name: m.name, dosage: m.dosage, schedule: m.schedule, duration: m.duration }))
          : [emptyMedication()],
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, treatment, editing, treatments]);

  function handleTreatmentSelectChange(value: string) {
    setSelectedTreatmentId(value);
    const tr = treatments.find((t) => t.id === value);
    setDoctorId(tr?.doctorId ?? "");
  }

  function updateMedication(index: number, field: keyof MedicationDraft, value: string) {
    setMedications((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }

  function addMedicationRow() {
    setMedications((prev) => [...prev, emptyMedication()]);
  }

  function removeMedicationRow(index: number) {
    setMedications((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    const targetTreatmentId = editing?.treatmentId ?? treatment?.id ?? selectedTreatmentId;
    if (!targetTreatmentId) return;
    const valid = medications.filter((m) => m.name.trim());
    if (valid.length === 0) return;
    const data = {
      treatmentId: targetTreatmentId,
      date: date.toISOString(),
      doctorId: doctorId || undefined,
      note: note.trim() || undefined,
      medications: valid.map((m, i) => ({
        id: `med-${Date.now()}-${i}`,
        name: m.name.trim(),
        dosage: m.dosage.trim(),
        schedule: m.schedule.trim(),
        duration: m.duration.trim(),
      })),
    };
    if (editing) {
      updatePrescription(editing.id, data);
      toast.success(t("prescriptions.prescriptionUpdated"));
    } else {
      addPrescription(data);
      toast.success(t("prescriptions.prescriptionAdded"));
    }
    onOpenChange(false);
  }

  const canSave = medications.some((m) => m.name.trim()) && Boolean(editing?.treatmentId ?? treatment?.id ?? selectedTreatmentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-primary" />
            {editing ? t("prescriptions.editPrescription") : t("prescriptions.newPrescription")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {showTreatmentSelect && (
            <div className="space-y-1.5">
              <Label>{t("prescriptions.treatment")}</Label>
              <Select value={selectedTreatmentId} onValueChange={handleTreatmentSelectChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {treatments.map((tr) => (
                    <SelectItem key={tr.id} value={tr.id}>
                      {TREATMENT_TYPE_LABELS[tr.treatmentType]}
                      {tr.teeth.length > 0 && ` #${tr.teeth.join(", #")}`}
                      {" — "}{format(new Date(tr.date), "dd.MM.yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
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
            <DoctorSelect value={doctorId} onChange={setDoctorId} label={t("reminders.doctor")} hideIfSingle={false} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("prescriptions.medications")}</Label>
              <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={addMedicationRow}>
                <Plus className="h-3 w-3" />
                {t("prescriptions.addMedication")}
              </Button>
            </div>
            <div className="space-y-3">
              {medications.map((med, i) => (
                <div key={i} className="relative rounded-lg border border-border p-3 space-y-2">
                  {medications.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMedicationRow(i)}
                      className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
                      aria-label={t("prescriptions.removeMedication")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <Input
                    className="h-8 text-sm pr-7"
                    placeholder={t("prescriptions.medicationName")}
                    value={med.name}
                    onChange={(e) => updateMedication(i, "name", e.target.value)}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      className="h-8 text-xs"
                      placeholder={t("prescriptions.dosage")}
                      value={med.dosage}
                      onChange={(e) => updateMedication(i, "dosage", e.target.value)}
                    />
                    <Input
                      className="h-8 text-xs"
                      placeholder={t("prescriptions.schedule")}
                      value={med.schedule}
                      onChange={(e) => updateMedication(i, "schedule", e.target.value)}
                    />
                    <Input
                      className="h-8 text-xs"
                      placeholder={t("prescriptions.duration")}
                      value={med.duration}
                      onChange={(e) => updateMedication(i, "duration", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("prescriptions.note")}</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("patients.cancel")}</Button>
          <Button onClick={handleSave} disabled={!canSave}>{t("patients.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Printable Prescription ───────────────────────────────────────────────────

function PrintablePrescription({
  prescription, treatment, patient,
}: {
  prescription: Prescription;
  treatment: Treatment;
  patient: Patient;
}) {
  const clinic = loadClinicInfo();
  const { getDoctor } = useDoctors();
  const doctor = getDoctor(prescription.doctorId ?? treatment.doctorId);

  return (
    <div className="print-area p-10 text-black bg-white">
      <div className="flex items-center gap-4 border-b-2 border-black pb-4 mb-6">
        {clinic.logo && (
          <img src={clinic.logo} alt={clinic.name} className="h-16 w-16 rounded object-cover" />
        )}
        <div>
          <h1 className="text-xl font-bold">{clinic.name}</h1>
          <p className="text-sm text-gray-600">{clinic.address}</p>
          <p className="text-sm text-gray-600">{clinic.phone}</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-4">
        Retsept — {format(new Date(prescription.date), "dd.MM.yyyy")}
      </h2>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <p className="text-gray-500">Bemor</p>
          <p className="font-medium">{patient.fullName}{patient.age ? `, ${patient.age} yosh` : ""}</p>
          <p>{patient.phone}</p>
        </div>
        <div>
          <p className="text-gray-500">Shifokor</p>
          <p className="font-medium">{doctor?.name ?? "—"}</p>
          {doctor?.specialty && <p>{doctor.specialty}</p>}
        </div>
      </div>

      {prescription.note && (
        <p className="mb-4 text-sm"><strong>Izoh:</strong> {prescription.note}</p>
      )}

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-2 pr-2 w-8">#</th>
            <th className="py-2 pr-2">Dori nomi</th>
            <th className="py-2 pr-2">Dozasi</th>
            <th className="py-2 pr-2">Qabul tartibi</th>
            <th className="py-2">Muddati</th>
          </tr>
        </thead>
        <tbody>
          {prescription.medications.map((m, i) => (
            <tr key={m.id} className="border-b border-gray-300">
              <td className="py-2 pr-2">{i + 1}</td>
              <td className="py-2 pr-2 font-medium">{m.name}</td>
              <td className="py-2 pr-2">{m.dosage}</td>
              <td className="py-2 pr-2">{m.schedule}</td>
              <td className="py-2">{m.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-20 flex justify-between text-sm">
        <p className="border-t border-black pt-1 w-40">Shifokor imzosi</p>
        <p className="border-t border-black pt-1 w-40">Muhr</p>
      </div>
    </div>
  );
}

// ─── Prescriptions Tab (all of a patient's prescriptions, across treatments) ──

function PrescriptionsTab({
  treatments, onNew, onEdit, onPrint,
}: {
  treatments: Treatment[];
  onNew: () => void;
  onEdit: (rx: Prescription, treatment: Treatment) => void;
  onPrint: (rx: Prescription, treatment: Treatment) => void;
}) {
  const { t } = useTranslation();
  const { getTreatmentPrescriptions, deletePrescription } = usePrescriptions();
  const [deleteTarget, setDeleteTarget] = useState<Prescription | null>(null);

  const rows = useMemo(
    () =>
      treatments
        .flatMap((tr) => getTreatmentPrescriptions(tr.id).map((rx) => ({ rx, treatment: tr })))
        .sort((a, b) => new Date(b.rx.date).getTime() - new Date(a.rx.date).getTime()),
    [treatments, getTreatmentPrescriptions],
  );

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
        {treatments.length > 0 && (
          <Button size="sm" onClick={onNew}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("prescriptions.newPrescription")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {treatments.length > 0 && (
        <div className="flex justify-end">
          <Button size="sm" className="gap-1.5" onClick={onNew}>
            <Plus className="h-4 w-4" />
            {t("prescriptions.newPrescription")}
          </Button>
        </div>
      )}
      {rows.map(({ rx, treatment }) => (
        <div key={rx.id} className="rounded-xl border border-border shadow-sm p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-sm">{format(new Date(rx.date), "dd.MM.yyyy")}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {TREATMENT_TYPE_LABELS[treatment.treatmentType]}
                {treatment.teeth.length > 0 && ` #${treatment.teeth.join(", #")}`}
              </Badge>
            </div>
            <DoctorBadge doctorId={rx.doctorId ?? treatment.doctorId} variant="compact" />
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
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onEdit(rx, treatment)}>
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
            <Button size="sm" className="gap-1.5" onClick={() => onPrint(rx, treatment)}>
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

function EditPatientDialog({
  patient, onSave,
}: {
  patient: Patient;
  onSave: (data: { fullName: string; phone: string; allergies: string; medicalNotes: string }) => void;
}) {
  const { t } = useTranslation();
  const [fullName, setFullName]   = useState(patient.fullName);
  const [phone, setPhone]         = useState(patient.phone);
  const [allergies, setAllergies] = useState(patient.allergies.join(", "));
  const [medNotes, setMedNotes]   = useState(patient.medicalNotes);

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{t("patientProfile.editPatient")}</DialogTitle></DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="space-y-2"><Label>{t("patients.fullName")}</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
        <div className="space-y-2"><Label>{t("patients.phone")}</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div className="space-y-2"><Label>{t("patientProfile.allergiesLabel")}</Label><Input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder={t("patientProfile.allergiesPlaceholder")} /></div>
        <div className="space-y-2"><Label>{t("patientProfile.medicalNotesLabel")}</Label><Textarea value={medNotes} onChange={(e) => setMedNotes(e.target.value)} rows={3} /></div>
        <Button className="w-full" onClick={() => onSave({ fullName, phone, allergies, medicalNotes: medNotes })}>
          <Save className="mr-2 h-4 w-4" />{t("patients.save")}
        </Button>
      </div>
    </DialogContent>
  );
}

// ─── Patient Header ───────────────────────────────────────────────────────────

function PatientHeader({
  patient, status, onAddAppointment, onAddTreatment,
}: {
  patient: Patient;
  status: TreatmentStatus;
  onAddAppointment: () => void;
  onAddTreatment: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
              {patient.fullName.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{patient.fullName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>{patient.age} {t("patientProfile.yearsOld")}</span>
                <a href={`tel:${patient.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                  <Phone className="h-3.5 w-3.5" />{patient.phone}
                </a>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge className={patientStatusColors[status]}>{t(`patients.${status}`)}</Badge>
                <DoctorBadge doctorId={patient.assignedDoctorId} variant="full" />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={onAddAppointment}>
              <CalendarPlus className="h-4 w-4" />
              <span className="hidden sm:inline">{t("patientProfile.addAppointment")}</span>
            </Button>
            <Button size="sm" className="gap-1.5" onClick={onAddTreatment}>
              <Stethoscope className="h-4 w-4" />
              <span className="hidden sm:inline">{t("patientProfile.addTreatment")}</span>
            </Button>
          </div>
        </div>
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
  const { t }     = useTranslation();

  const { updatePatient } = usePatients();
  const { getTreatmentPrescriptions } = usePrescriptions();
  const queryClient = useQueryClient();

  const { data: detail, isLoading: detailLoading } = usePatientDetail(id);
  const localPatient = detail?.patient;
  const [editOpen, setEditOpen]                   = useState(false);
  const [appointmentOpen, setAppointmentOpen]     = useState(false);
  const [treatmentDialogOpen, setTreatmentDialogOpen] = useState(false);
  const [editingTreatment, setEditingTreatment]   = useState<Treatment | null>(null);
  const [prescriptionTreatment, setPrescriptionTreatment] = useState<Treatment | null>(null);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);
  const [prescriptionDialogOpen, setPrescriptionDialogOpen] = useState(false);
  const [printingPrescription, setPrintingPrescription] = useState<{ prescription: Prescription; treatment: Treatment } | null>(null);

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

  if (detailLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!localPatient) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">{t("patientProfile.notFound")}</p>
        <Button variant="outline" onClick={() => navigate("/patients")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("patientProfile.backToList")}
        </Button>
      </div>
    );
  }

  const handleEditSave = (data: { fullName: string; phone: string; allergies: string; medicalNotes: string }) => {
    updatePatient(patientId, {
      fullName:     data.fullName,
      phone:        data.phone,
      allergies:    data.allergies.split(",").map((a) => a.trim()).filter(Boolean),
      medicalNotes: data.medicalNotes,
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

  function openWritePrescription(tr: Treatment) {
    setPrescriptionTreatment(tr);
    setEditingPrescription(null);
    setPrescriptionDialogOpen(true);
  }

  function openNewPrescriptionFromTab() {
    setPrescriptionTreatment(null);
    setEditingPrescription(null);
    setPrescriptionDialogOpen(true);
  }

  function openEditPrescription(rx: Prescription, tr: Treatment) {
    setPrescriptionTreatment(tr);
    setEditingPrescription(rx);
    setPrescriptionDialogOpen(true);
  }

  function handlePrintPrescription(prescription: Prescription, treatment: Treatment) {
    setPrintingPrescription({ prescription, treatment });
  }

  const prescriptionsCount = allTreatments.reduce(
    (sum, tr) => sum + getTreatmentPrescriptions(tr.id).length,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Back + Edit */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/patients")} className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />{t("patientProfile.backToList")}
        </Button>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Edit className="h-4 w-4" />{t("patientProfile.editPatient")}
            </Button>
          </DialogTrigger>
          <EditPatientDialog patient={localPatient} onSave={handleEditSave} />
        </Dialog>
      </div>

      <PatientHeader
        patient={localPatient}
        status={patientStatus}
        onAddAppointment={() => setAppointmentOpen(true)}
        onAddTreatment={openNewTreatment}
      />

      {/* Dialogs */}
      <AddAppointmentDialog patient={localPatient} open={appointmentOpen} onOpenChange={setAppointmentOpen} />
      <TreatmentDialog
        patientId={patientId}
        treatment={editingTreatment}
        open={treatmentDialogOpen}
        onOpenChange={setTreatmentDialogOpen}
      />
      <PrescriptionDialog
        treatment={prescriptionTreatment}
        treatments={allTreatments}
        editing={editingPrescription}
        open={prescriptionDialogOpen}
        onOpenChange={(v) => { setPrescriptionDialogOpen(v); if (!v) setEditingPrescription(null); }}
      />
      {printingPrescription && (
        <PrintablePrescription
          prescription={printingPrescription.prescription}
          treatment={printingPrescription.treatment}
          patient={localPatient}
        />
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
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
          <div className="mb-4">
            <DentalChart teeth={teethData} onUpdate={() => {}} readOnly />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    {t("patientProfile.financialSummary")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("patients.totalCost")}</span>
                    <span className="font-semibold tabular-nums">{fmt(patientBalance.totalCost)} {t("common.currency")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("patients.paid")}</span>
                    <span className="font-semibold tabular-nums text-green-600">{fmt(patientBalance.paid)} {t("common.currency")}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("patients.remaining")}</span>
                    <span className={cn("font-bold tabular-nums", patientBalance.remaining > 0 ? "text-destructive" : "text-green-600")}>
                      {fmt(patientBalance.remaining)} {t("common.currency")}
                      {patientBalance.remaining > 0 && (
                        <Badge className="ml-2 bg-destructive/15 text-destructive border-destructive/30 text-xs">{t("patients.debt")}</Badge>
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-destructive/20">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base text-destructive">
                    <AlertTriangle className="h-4 w-4" />{t("patientProfile.medicalNotesTitle")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {localPatient.allergies.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {localPatient.allergies.map((a) => (
                          <Badge key={a} variant="outline" className="border-destructive/30 text-destructive text-xs">{a}</Badge>
                        ))}
                      </div>
                      {localPatient.medicalNotes && (
                        <p className="text-sm text-muted-foreground">{localPatient.medicalNotes}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("patientProfile.noAlerts")}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("patientProfile.totalSpent")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums">{fmt(patientBalance.paid)} <span className="text-sm font-normal text-muted-foreground">{t("common.currency")}</span></p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("treatments.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums">{allTreatments.length}</p>
                </CardContent>
              </Card>
              {inProgressList.length > 0 && (
                <Card className="shadow-sm border-orange-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-orange-600 flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />{t("treatments.activeTreatments")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums text-orange-600">{inProgressList.length}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
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
                          onWritePrescription={openWritePrescription}
                          onPrintPrescription={handlePrintPrescription}
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
                          onWritePrescription={openWritePrescription}
                          onPrintPrescription={handlePrintPrescription}
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
            treatments={allTreatments}
            onNew={openNewPrescriptionFromTab}
            onEdit={openEditPrescription}
            onPrint={handlePrintPrescription}
          />
        </TabsContent>

        {/* ── Gallery ───────────────────────────────────────────────────── */}
        <TabsContent value="gallery">
          <GalleryTab patient={localPatient} onAddImages={handleAddGalleryImages} onDeleteImage={handleDeleteGalleryImage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
