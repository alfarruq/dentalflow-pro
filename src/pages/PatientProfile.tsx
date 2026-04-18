import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  ArrowLeft, Phone, AlertTriangle, Calendar, CreditCard,
  Image as ImageIcon, CalendarPlus, Stethoscope,
  Banknote, Edit, Save, Bell, Plus,
  CheckCircle2, Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import { DentalChart, createDefaultTeeth, type ToothData } from "@/components/DentalChart";
import { AddReminderDialog } from "@/components/AddReminderDialog";
import { DoctorBadge } from "@/components/DoctorBadge";
import { DoctorSelect } from "@/components/DoctorSelect";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { mockPatients, type Patient } from "@/data/mockPatients";
import {
  TREATMENT_TYPE_LABELS,
  treatmentToToothStatus,
  type DentalTreatmentType,
  type Treatment,
  type PaymentMethod,
} from "@/data/mockTreatments";
import { useTreatments } from "@/contexts/TreatmentContext";
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

function fmt(n: number) {
  return n.toLocaleString("uz-UZ");
}

const patientStatusColors: Record<string, string> = {
  pending:     "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  in_progress: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  completed:   "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
};

const TREATMENT_STATUS_BORDER: Record<string, string> = {
  planned:     "border-l-blue-400",
  in_progress: "border-l-orange-400",
  completed:   "border-l-green-500",
  cancelled:   "border-l-gray-400",
};

const TREATMENT_STATUS_BG: Record<string, string> = {
  planned:     "bg-blue-50/50 dark:bg-blue-950/20",
  in_progress: "bg-orange-50/50 dark:bg-orange-950/20",
  completed:   "bg-green-50/30 dark:bg-green-950/10",
  cancelled:   "bg-gray-50/50 dark:bg-gray-900/20",
};

const TREATMENT_STATUS_BADGE: Record<string, string> = {
  planned:     "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  in_progress: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  completed:   "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  cancelled:   "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30",
};

// ─── Treatment Card ───────────────────────────────────────────────────────────

function TreatmentCard({
  treatment,
  onAddVisit,
  onAddPayment,
}: {
  treatment: Treatment;
  onAddVisit: (t: Treatment) => void;
  onAddPayment: (t: Treatment) => void;
}) {
  const { t } = useTranslation();
  const { getTreatmentVisits, getTreatmentBalance, updateTreatment } = useTreatments();
  const [expanded, setExpanded] = useState(treatment.status !== "completed");

  const visits  = getTreatmentVisits(treatment.id);
  const balance = getTreatmentBalance(treatment.id);
  const completedVisits = visits.filter((v) => v.status === "completed").length;
  const progressPct = treatment.plannedVisits > 0
    ? Math.min(100, (completedVisits / treatment.plannedVisits) * 100)
    : 0;

  const statusLabel: Record<string, string> = {
    planned:     "Rejalashtirilgan",
    in_progress: "Davom etmoqda",
    completed:   "Yakunlangan",
    cancelled:   "Bekor qilingan",
  };

  function handleComplete() {
    updateTreatment(treatment.id, {
      status:  "completed",
      endDate: new Date().toISOString().slice(0, 10),
    });
    toast.success(t("treatments.treatmentCompleted"));
  }

  const canComplete =
    treatment.status === "in_progress" && completedVisits >= treatment.plannedVisits;

  return (
    <div
      className={cn(
        "rounded-xl border border-border border-l-4 shadow-sm",
        TREATMENT_STATUS_BORDER[treatment.status],
        TREATMENT_STATUS_BG[treatment.status],
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-sm">{treatment.title}</span>
            <Badge
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0 border", TREATMENT_STATUS_BADGE[treatment.status])}
            >
              {statusLabel[treatment.status]}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <DoctorBadge doctorId={treatment.assignedDoctorId} variant="compact" />
            <span>· {format(new Date(treatment.startDate), "dd.MM.yyyy")}</span>
            {treatment.endDate && (
              <span>— {format(new Date(treatment.endDate), "dd.MM.yyyy")}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          aria-label="toggle"
        >
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
          {/* Visit progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t("treatments.completedVisits")}: {completedVisits} / {treatment.plannedVisits}</span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>

          {/* Visit list */}
          {visits.length > 0 && (
            <div className="space-y-1">
              {visits.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between text-xs rounded-md bg-background/70 px-2.5 py-1.5 border border-border/40"
                >
                  <span className="text-muted-foreground">
                    {t("treatments.visitNumber")}{v.visitNumber} · {format(new Date(v.date), "dd.MM")} {v.time}
                    {v.notes && <span className="ml-1 text-foreground/60">— {v.notes.slice(0, 40)}</span>}
                  </span>
                  <span
                    className={cn(
                      "font-bold",
                      v.status === "completed" && "text-green-600",
                      v.status === "scheduled" && "text-orange-500",
                      v.status === "missed"    && "text-destructive",
                    )}
                  >
                    {v.status === "completed" ? "✓" : v.status === "missed" ? "✗" : "●"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Financial summary */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs rounded-md bg-background/70 px-3 py-2 border border-border/40">
            <span className="text-muted-foreground">
              {t("patients.totalCost")}: <strong className="text-foreground">{fmt(balance.totalCost)}</strong>
            </span>
            <span className="text-green-600">
              {t("patients.paid")}: <strong>{fmt(balance.paid)}</strong>
            </span>
            {balance.remaining > 0 && (
              <span className="text-destructive font-medium">
                {t("patients.remaining")}: <strong>{fmt(balance.remaining)}</strong>
              </span>
            )}
            {balance.remaining === 0 && balance.totalCost > 0 && (
              <span className="text-green-600 font-medium">✓ To'liq to'landi</span>
            )}
          </div>

          {/* Treatment notes */}
          {treatment.notes && (
            <p className="text-xs text-muted-foreground italic">{treatment.notes}</p>
          )}

          {/* Actions */}
          {treatment.status !== "completed" && treatment.status !== "cancelled" && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-xs"
                onClick={() => onAddVisit(treatment)}
              >
                <Plus className="h-3 w-3" />
                {t("treatments.addVisit")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-xs"
                onClick={() => onAddPayment(treatment)}
              >
                <Banknote className="h-3 w-3" />
                {t("patientProfile.acceptPayment")}
              </Button>
              {canComplete && (
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 gap-1 text-xs"
                  onClick={handleComplete}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {t("treatments.markCompleted")}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add Appointment Dialog (unchanged) ───────────────────────────────────────

function AddAppointmentDialog({
  patient,
  open,
  onOpenChange,
}: {
  patient: Patient;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const [aptDate, setAptDate]           = useState<Date | undefined>(new Date());
  const [aptTime, setAptTime]           = useState("09:00");
  const [aptDoctorId, setAptDoctorId]   = useState("");
  const [aptNotes, setAptNotes]         = useState("");

  function reset() {
    setAptDate(new Date()); setAptTime("09:00");
    setAptDoctorId(""); setAptNotes("");
  }

  function handleSave() {
    if (!aptDate) return;
    reset();
    onOpenChange(false);
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
              <SelectContent>
                {TIME_SLOTS.map((ts) => <SelectItem key={ts} value={ts}>{ts}</SelectItem>)}
              </SelectContent>
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

// ─── New Treatment Dialog ─────────────────────────────────────────────────────

function NewTreatmentDialog({
  patientId,
  open,
  onOpenChange,
  onCreated,
}: {
  patientId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (t: Treatment) => void;
}) {
  const { t } = useTranslation();
  const { addTreatment } = useTreatments();

  const [type, setType]               = useState<DentalTreatmentType>("filling");
  const [tooth, setTooth]             = useState("11");
  const [cost, setCost]               = useState("");
  const [plannedVisits, setPlanned]   = useState("2");
  const [doctorId, setDoctorId]       = useState("");
  const [startDate, setStartDate]     = useState<Date>(new Date());
  const [notes, setNotes]             = useState("");

  function reset() {
    setType("filling"); setTooth("11"); setCost(""); setPlanned("2");
    setDoctorId(""); setStartDate(new Date()); setNotes("");
  }

  function handleSave() {
    const newT = addTreatment({
      patientId,
      toothNumbers: [tooth],
      type,
      title: `${TREATMENT_TYPE_LABELS[type]} — #${tooth}`,
      totalCost: Number(cost) || 0,
      status: "planned",
      assignedDoctorId: doctorId,
      startDate: startDate.toISOString().slice(0, 10),
      plannedVisits: Number(plannedVisits) || 1,
      notes,
    });
    onCreated(newT);
    reset();
    onOpenChange(false);
    toast.success(t("treatments.treatmentAdded"));
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            {t("treatments.newTreatment")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Treatment type */}
          <div className="space-y-1.5">
            <Label>{t("patients.treatmentType")}</Label>
            <Select value={type} onValueChange={(v) => setType(v as DentalTreatmentType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(TREATMENT_TYPE_LABELS) as [DentalTreatmentType, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tooth number */}
          <div className="space-y-1.5">
            <Label>{t("patientProfile.toothNumber")}</Label>
            <Select value={tooth} onValueChange={setTooth}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-52">
                {TOOTH_NUMBERS.map((n) => <SelectItem key={n} value={n}>#{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Cost */}
          <div className="space-y-1.5">
            <Label>{t("patientProfile.cost")}</Label>
            <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="500 000" />
          </div>

          {/* Planned visits */}
          <div className="space-y-1.5">
            <Label>{t("treatments.plannedVisitsCount")}</Label>
            <Select value={plannedVisits} onValueChange={setPlanned}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["1","2","3","4","5","6"].map((n) => (
                  <SelectItem key={n} value={n}>{n} ta</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start date */}
          <div className="space-y-1.5">
            <Label>{t("treatments.startDate")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {format(startDate, "dd.MM.yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={startDate}
                  onSelect={(d) => d && setStartDate(d)}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Doctor */}
          <DoctorSelect value={doctorId} onChange={setDoctorId} label={t("reminders.doctor")} hideIfSingle={false} />

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>{t("appointments.notes")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>{t("patients.cancel")}</Button>
          <Button onClick={handleSave} disabled={!cost}>{t("patients.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Visit Dialog ─────────────────────────────────────────────────────────

function AddVisitDialog({
  treatment,
  open,
  onOpenChange,
}: {
  treatment: Treatment | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const { addVisit, getTreatmentVisits, updateTreatment } = useTreatments();

  const [visitDate, setVisitDate]   = useState<Date>(new Date());
  const [visitTime, setVisitTime]   = useState("09:00");
  const [visitStatus, setVStatus]   = useState<"scheduled" | "completed">("scheduled");
  const [notes, setNotes]           = useState("");

  function reset() {
    setVisitDate(new Date()); setVisitTime("09:00");
    setVStatus("scheduled"); setNotes("");
  }

  function handleSave() {
    if (!treatment) return;
    const existing = getTreatmentVisits(treatment.id);
    addVisit({
      treatmentId:      treatment.id,
      patientId:        treatment.patientId,
      assignedDoctorId: treatment.assignedDoctorId,
      visitNumber:      existing.length + 1,
      date:             visitDate.toISOString().slice(0, 10),
      time:             visitTime,
      status:           visitStatus,
      notes,
    });
    if (treatment.status === "planned") {
      updateTreatment(treatment.id, { status: "in_progress" });
    }
    reset();
    onOpenChange(false);
    toast.success(t("treatments.visitAdded"));
  }

  if (!treatment) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            {t("treatments.addVisit")}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg bg-muted px-3 py-2 text-sm space-y-0.5">
          <p className="font-medium">{treatment.title}</p>
          <DoctorBadge doctorId={treatment.assignedDoctorId} variant="compact" />
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("appointments.date")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {format(visitDate, "dd.MM.yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={visitDate}
                  onSelect={(d) => d && setVisitDate(d)}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label>{t("appointments.time")}</Label>
            <Select value={visitTime} onValueChange={setVisitTime}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((ts) => <SelectItem key={ts} value={ts}>{ts}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Holati</Label>
            <Select value={visitStatus} onValueChange={(v) => setVStatus(v as "scheduled" | "completed")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Rejalashtirilgan</SelectItem>
                <SelectItem value="completed">Bajarildi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("appointments.notes")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="..." />
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

// ─── Treatment Payment Dialog ─────────────────────────────────────────────────

function TreatmentPaymentDialog({
  treatment,
  open,
  onOpenChange,
}: {
  treatment: Treatment | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const { addPayment, getTreatmentBalance } = useTreatments();

  const [amount, setAmount]   = useState("");
  const [method, setMethod]   = useState<PaymentMethod>("cash");
  const [note, setNote]       = useState("");

  const balance = useMemo(
    () => treatment ? getTreatmentBalance(treatment.id) : { totalCost: 0, paid: 0, remaining: 0 },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [treatment?.id, getTreatmentBalance],
  );

  function reset() { setAmount(""); setMethod("cash"); setNote(""); }

  function handleSave() {
    if (!treatment || !amount) return;
    addPayment({
      treatmentId: treatment.id,
      patientId:   treatment.patientId,
      amount:      Number(amount),
      date:        new Date().toISOString().slice(0, 10),
      method,
      note,
    });
    reset();
    onOpenChange(false);
    toast.success(t("treatments.paymentRecorded"));
  }

  if (!treatment) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-primary" />
            {t("patientProfile.acceptPayment")}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg bg-muted px-3 py-2 text-sm space-y-1">
          <p className="font-medium">{treatment.title}</p>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="text-muted-foreground">Jami: <strong className="text-foreground">{fmt(balance.totalCost)}</strong></span>
            <span className="text-green-600">To'landi: <strong>{fmt(balance.paid)}</strong></span>
            <span className="text-destructive font-medium">Qarz: <strong>{fmt(balance.remaining)}</strong></span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("patientProfile.paymentAmount")}</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={String(balance.remaining)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("treatments.method")}</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t("treatments.cash")}</SelectItem>
                <SelectItem value="card">{t("treatments.card")}</SelectItem>
                <SelectItem value="transfer">{t("treatments.transfer")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("appointments.notes")}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>{t("patients.cancel")}</Button>
          <Button onClick={handleSave} disabled={!amount}>{t("patients.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Patient Dialog ──────────────────────────────────────────────────────

function EditPatientDialog({
  patient,
  onSave,
}: {
  patient: Patient;
  onSave: (data: { fullName: string; phone: string; allergies: string; medicalNotes: string }) => void;
}) {
  const { t } = useTranslation();
  const [fullName, setFullName]       = useState(patient.fullName);
  const [phone, setPhone]             = useState(patient.phone);
  const [allergies, setAllergies]     = useState(patient.allergies.join(", "));
  const [medicalNotes, setNotes]      = useState(patient.medicalNotes);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t("patientProfile.editPatient")}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label>{t("patients.fullName")}</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t("patients.phone")}</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t("patientProfile.allergiesLabel")}</Label>
          <Input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder={t("patientProfile.allergiesPlaceholder")} />
        </div>
        <div className="space-y-2">
          <Label>{t("patientProfile.medicalNotesLabel")}</Label>
          <Textarea value={medicalNotes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
        <Button className="w-full" onClick={() => onSave({ fullName, phone, allergies, medicalNotes })}>
          <Save className="mr-2 h-4 w-4" />
          {t("patients.save")}
        </Button>
      </div>
    </DialogContent>
  );
}

// ─── Patient Header ───────────────────────────────────────────────────────────

function PatientHeader({
  patient,
  onAddAppointment,
  onAddTreatment,
  onAddReminder,
  onPayment,
}: {
  patient: Patient;
  onAddAppointment: () => void;
  onAddTreatment: () => void;
  onAddReminder: () => void;
  onPayment: () => void;
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
                <Badge className={patientStatusColors[patient.status]}>{t(`patients.${patient.status}`)}</Badge>
                <DoctorBadge doctorId={patient.assignedDoctorId} variant="full" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={onAddAppointment}>
              <CalendarPlus className="h-4 w-4" />
              <span className="hidden sm:inline">{t("patientProfile.addAppointment")}</span>
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={onAddReminder}>
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">{t("reminders.addFromProfile")}</span>
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={onAddTreatment}>
              <Stethoscope className="h-4 w-4" />
              <span className="hidden sm:inline">{t("patientProfile.addTreatment")}</span>
            </Button>
            <Button size="sm" className="gap-1.5" onClick={onPayment}>
              <Banknote className="h-4 w-4" />
              <span className="hidden sm:inline">{t("patientProfile.acceptPayment")}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PatientProfile() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const { t }     = useTranslation();

  const {
    getPatientTreatments,
    getPatientBalance,
  } = useTreatments();

  const [localPatient, setLocalPatient] = useState<Patient | undefined>(() =>
    mockPatients.find((p) => p.id === id)
  );
  const [teethData, setTeethData]             = useState<ToothData[]>(createDefaultTeeth);
  const [editOpen, setEditOpen]               = useState(false);
  const [reminderOpen, setReminderOpen]       = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [newTreatmentOpen, setNewTreatmentOpen] = useState(false);
  const [visitTreatment, setVisitTreatment]   = useState<Treatment | null>(null);
  const [paymentTreatment, setPaymentTreatment] = useState<Treatment | null>(null);

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

  const patientId = localPatient.id;

  // ── Treatment data ──────────────────────────────────────────────────────────
  const allTreatments       = getPatientTreatments(patientId);
  const inProgressList      = allTreatments.filter((t) => t.status === "in_progress");
  const plannedList         = allTreatments.filter((t) => t.status === "planned");
  const completedList       = allTreatments.filter((t) => t.status === "completed");
  const patientBalance      = getPatientBalance(patientId);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleEditSave = (data: { fullName: string; phone: string; allergies: string; medicalNotes: string }) => {
    setLocalPatient((prev) => prev ? {
      ...prev,
      fullName:     data.fullName,
      phone:        data.phone,
      allergies:    data.allergies.split(",").map((a) => a.trim()).filter(Boolean),
      medicalNotes: data.medicalNotes,
    } : prev);
    setEditOpen(false);
    toast.success(t("patientProfile.patientUpdated"));
  };

  const handleTreatmentCreated = (treatment: Treatment) => {
    const newStatus = treatmentToToothStatus[treatment.type];
    setTeethData((prev) =>
      prev.map((tooth) =>
        treatment.toothNumbers.includes(tooth.id)
          ? { ...tooth, status: newStatus as ToothData["status"] }
          : tooth
      )
    );
  };

  // Header "To'lov" button — open payment for the first treatment with remaining balance
  const handleHeaderPayment = () => {
    const withDebt = allTreatments.filter(
      (t) => t.status !== "cancelled" && getPatientBalance(patientId).remaining > 0
    );
    const firstDebt = allTreatments.find((t) => {
      const b = getPatientBalance(patientId);
      return b.remaining > 0 && t.status !== "cancelled";
    });
    // Find first treatment with individual remaining > 0
    const firstWithBalance = allTreatments.find((t) => {
      const bal = patientBalance;
      void bal; // access patientBalance via getTreatmentBalance per-treatment
      return t.status !== "cancelled" && t.status !== "completed";
    });
    void withDebt; void firstDebt;
    if (firstWithBalance) {
      setPaymentTreatment(firstWithBalance);
    } else if (allTreatments.length > 0) {
      setPaymentTreatment(allTreatments[0]);
    } else {
      toast.info("Muolajalar mavjud emas");
    }
  };

  return (
    <div className="space-y-6">
      {/* Back + Edit */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/patients")}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("patientProfile.backToList")}
        </Button>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              {t("patientProfile.editPatient")}
            </Button>
          </DialogTrigger>
          <EditPatientDialog patient={localPatient} onSave={handleEditSave} />
        </Dialog>
      </div>

      {/* Header */}
      <PatientHeader
        patient={localPatient}
        onAddAppointment={() => setAppointmentOpen(true)}
        onAddTreatment={() => setNewTreatmentOpen(true)}
        onAddReminder={() => setReminderOpen(true)}
        onPayment={handleHeaderPayment}
      />

      {/* Dialogs */}
      <AddReminderDialog open={reminderOpen} onOpenChange={setReminderOpen} lockedPatientId={localPatient.id} />
      <AddAppointmentDialog patient={localPatient} open={appointmentOpen} onOpenChange={setAppointmentOpen} />
      <NewTreatmentDialog
        patientId={patientId}
        open={newTreatmentOpen}
        onOpenChange={setNewTreatmentOpen}
        onCreated={handleTreatmentCreated}
      />
      <AddVisitDialog
        treatment={visitTreatment}
        open={visitTreatment !== null}
        onOpenChange={(v) => { if (!v) setVisitTreatment(null); }}
      />
      <TreatmentPaymentDialog
        treatment={paymentTreatment}
        open={paymentTreatment !== null}
        onOpenChange={(v) => { if (!v) setPaymentTreatment(null); }}
      />

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
          <TabsTrigger value="gallery">{t("patientProfile.gallery")}</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="overview">
          <div className="mb-4">
            <DentalChart teeth={teethData} onUpdate={setTeethData} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              {/* Financial Summary — from TreatmentContext */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      {t("patientProfile.financialSummary")}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      onClick={handleHeaderPayment}
                    >
                      <Banknote className="h-3.5 w-3.5" />
                      {t("patientProfile.acceptPayment")}
                    </Button>
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

              {/* Medical Alerts */}
              <Card className="shadow-sm border-destructive/20">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    {t("patientProfile.medicalNotesTitle")}
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

            {/* Right: Stats */}
            <div className="space-y-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("patientProfile.totalSpent")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums">
                    {fmt(patientBalance.paid)} <span className="text-sm font-normal text-muted-foreground">{t("common.currency")}</span>
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("patientProfile.totalVisits")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums">{allTreatments.length}</p>
                </CardContent>
              </Card>
              {inProgressList.length > 0 && (
                <Card className="shadow-sm border-orange-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-orange-600 flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      Faol muolajalar
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

        {/* ── Muolajalar Tab ────────────────────────────────────────────────── */}
        <TabsContent value="treatments">
          <div className="space-y-5">
            {/* Tab header */}
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="text-muted-foreground">{allTreatments.length} ta muolaja</span>
                {inProgressList.length > 0 && (
                  <span className="text-orange-600 font-medium">{inProgressList.length} faol</span>
                )}
                {completedList.length > 0 && (
                  <span className="text-green-600">{completedList.length} yakunlangan</span>
                )}
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => setNewTreatmentOpen(true)}>
                <Plus className="h-4 w-4" />
                {t("treatments.newTreatment")}
              </Button>
            </div>

            {allTreatments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                <Stethoscope className="h-14 w-14 opacity-15" />
                <p className="text-sm">{t("treatments.noTreatments")}</p>
                <Button size="sm" variant="outline" onClick={() => setNewTreatmentOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  {t("treatments.addFirst")}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* In Progress */}
                {inProgressList.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-orange-600 flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      Davom etayotgan muolajalar ({inProgressList.length})
                    </h3>
                    <div className="space-y-3">
                      {inProgressList.map((tr) => (
                        <TreatmentCard
                          key={tr.id}
                          treatment={tr}
                          onAddVisit={setVisitTreatment}
                          onAddPayment={setPaymentTreatment}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Planned */}
                {plannedList.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-blue-600 flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      Rejalashtirilgan ({plannedList.length})
                    </h3>
                    <div className="space-y-3">
                      {plannedList.map((tr) => (
                        <TreatmentCard
                          key={tr.id}
                          treatment={tr}
                          onAddVisit={setVisitTreatment}
                          onAddPayment={setPaymentTreatment}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Completed */}
                {completedList.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-green-600 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      Yakunlangan ({completedList.length})
                    </h3>
                    <div className="space-y-3">
                      {completedList.map((tr) => (
                        <TreatmentCard
                          key={tr.id}
                          treatment={tr}
                          onAddVisit={setVisitTreatment}
                          onAddPayment={setPaymentTreatment}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Gallery Tab ───────────────────────────────────────────────────── */}
        <TabsContent value="gallery">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ImageIcon className="h-5 w-5" />
                {t("patientProfile.gallery")} ({t("patientProfile.xray")})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {localPatient.galleryImages.map((_, idx) => (
                  <div key={idx} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="text-center">
                        <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground/40" />
                        <p className="mt-2 text-xs text-muted-foreground">{t("patientProfile.xray")} {idx + 1}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
