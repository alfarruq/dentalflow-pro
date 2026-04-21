import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  ArrowLeft, Phone, AlertTriangle, Calendar, CreditCard,
  Image as ImageIcon, CalendarPlus, Stethoscope,
  Banknote, Edit, Save, Bell, Plus,
  CheckCircle2, Clock, ChevronDown, ChevronUp, Package,
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
  type ServiceMaterial,
} from "@/data/mockTreatments";
import { useTreatments } from "@/contexts/TreatmentContext";
import { useInventory } from "@/contexts/InventoryContext";
import { useServiceTemplates } from "@/contexts/ServiceTemplatesContext";
import { useFinance } from "@/contexts/FinanceContext";
import { type IncomeCategory } from "@/data/mockFinance";
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

const treatmentToIncomeCategory: Record<DentalTreatmentType, IncomeCategory> = {
  implant:      "implant",
  filling:      "plomba",
  cleaning:     "tozalash",
  whitening:    "oqartirish",
  crown:        "toj",
  extraction:   "boshqa_daromad",
  orthodontics: "boshqa_daromad",
  other:        "boshqa_daromad",
};

// ─── Complete Treatment Dialog ────────────────────────────────────────────────

function CompleteTreatmentDialog({
  open,
  onOpenChange,
  treatment,
  patientName,
  allVisitsDone,
  completedVisits,
  plannedVisits,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  treatment: Treatment;
  patientName: string;
  allVisitsDone: boolean;
  completedVisits: number;
  plannedVisits: number;
}) {
  const { t } = useTranslation();
  const { getTreatmentBalance, addPayment, updateTreatment } = useTreatments();
  const { usages } = useInventory();
  const { addIncome } = useFinance();

  const balance = getTreatmentBalance(treatment.id);
  const treatmentUsages = useMemo(
    () => usages.filter((u) => u.treatmentId === treatment.id),
    [usages, treatment.id],
  );

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");

  useEffect(() => {
    if (open) { setPayAmount(""); setPayMethod("cash"); }
  }, [open]);

  // Same unified rows as TreatmentCard: planned + actual usages
  const materialRows = useMemo(() => {
    type Row = { itemId: string; itemName: string; unit: string; plannedQty: number | null; usedQty: number };
    const rows: Row[] = [];
    const seen = new Set<string>();
    (treatment.plannedMaterials ?? []).forEach((m) => {
      const used = treatmentUsages.filter((u) => u.itemId === m.itemId).reduce((s, u) => s + u.quantity, 0);
      rows.push({ itemId: m.itemId, itemName: m.itemName, unit: m.unit, plannedQty: m.plannedQty, usedQty: used });
      seen.add(m.itemId);
    });
    treatmentUsages.forEach((u) => {
      if (!seen.has(u.itemId)) {
        const total = treatmentUsages.filter((x) => x.itemId === u.itemId).reduce((s, x) => s + x.quantity, 0);
        rows.push({ itemId: u.itemId, itemName: u.itemName, unit: u.unit, plannedQty: null, usedQty: total });
        seen.add(u.itemId);
      }
    });
    return rows;
  }, [treatment.plannedMaterials, treatmentUsages]);

  function handleConfirm() {
    const today = new Date().toISOString().slice(0, 10);
    const extra = Number(payAmount) || 0;

    if (extra > 0) {
      addPayment({
        treatmentId: treatment.id,
        patientId: treatment.patientId,
        amount: extra,
        date: today,
        method: payMethod,
        note: t("treatments.finalPayment"),
      });
    }

    const totalPaid = balance.paid + extra;
    if (totalPaid > 0) {
      addIncome({
        date: today,
        category: treatmentToIncomeCategory[treatment.type],
        description: treatment.title,
        amount: totalPaid,
        patientName,
        assignedDoctorId: treatment.assignedDoctorId,
        isAutomatic: true,
      });
    }

    updateTreatment(treatment.id, { status: "completed", endDate: today });
    toast.success(t("treatments.treatmentCompleted"));
    onOpenChange(false);
  }

  const paymentMethods: { value: PaymentMethod; label: string }[] = [
    { value: "cash",     label: t("patientProfile.cash") },
    { value: "card",     label: t("patientProfile.card") },
    { value: "transfer", label: t("patientProfile.transfer") },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            {t("treatments.completeTreatment")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning: not all visits done */}
          {!allVisitsDone && (
            <div className="flex items-start gap-2 rounded-lg border border-orange-300 bg-orange-50 dark:bg-orange-950/20 px-3 py-2.5 text-sm text-orange-700 dark:text-orange-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Rejalashtirilgan tashriflardan {completedVisits}/{plannedVisits} tasi bajarildi.
                Muolajani shunga qaramay yakunlashni tasdiqlaysizmi?
              </span>
            </div>
          )}

          {/* Materials: planned vs actually used */}
          {materialRows.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Package className="h-4 w-4 text-primary" />
                {t("treatments.materialsUsed")}
              </p>
              <div className="rounded-lg border text-sm bg-background overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-3 py-1.5 text-[11px] font-medium text-muted-foreground bg-muted/50">
                  <span>Mahsulot</span>
                  <span className="text-center w-10">Birlik</span>
                  <span className="text-center w-12">Rej.</span>
                  <span className="text-center w-14">Sarflandi</span>
                </div>
                {materialRows.map((m) => (
                  <div
                    key={m.itemId}
                    className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-3 py-2 border-t border-border/30 items-center"
                  >
                    <span className="truncate">{m.itemName}</span>
                    <span className="text-center w-10 text-muted-foreground">{m.unit}</span>
                    <span className="text-center w-12 text-muted-foreground">{m.plannedQty ?? "—"}</span>
                    <span className={cn(
                      "text-center w-14 font-semibold",
                      m.usedQty === 0
                        ? "text-muted-foreground"
                        : m.plannedQty !== null && m.usedQty > m.plannedQty
                          ? "text-orange-600"
                          : "text-green-600",
                    )}>
                      {m.usedQty === 0 ? "—" : m.usedQty}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment summary */}
          <div className="rounded-lg border p-3 space-y-1.5 text-sm bg-muted/30">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("patients.totalCost")}</span>
              <span className="font-semibold">{fmt(balance.totalCost)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>{t("patients.paid")}</span>
              <span className="font-semibold">{fmt(balance.paid)}</span>
            </div>
            {balance.remaining > 0 ? (
              <div className="flex justify-between text-destructive font-semibold border-t border-border/50 pt-1.5 mt-1">
                <span>{t("patients.remaining")}</span>
                <span>{fmt(balance.remaining)}</span>
              </div>
            ) : balance.totalCost > 0 && (
              <div className="flex items-center gap-1 text-green-600 font-medium border-t border-border/50 pt-1.5 mt-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t("treatments.fullyPaid")}
              </div>
            )}
          </div>

          {/* Collect remaining payment */}
          {balance.remaining > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("treatments.collectPayment")}</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  className="flex-1"
                  placeholder={`${fmt(balance.remaining)} so'm`}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
                <Select value={payMethod} onValueChange={(v) => setPayMethod(v as PaymentMethod)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("patients.cancel")}
          </Button>
          <Button onClick={handleConfirm} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
            <CheckCircle2 className="h-4 w-4" />
            {t("treatments.confirmComplete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  const { getTreatmentVisits, getTreatmentBalance } = useTreatments();
  const { usages } = useInventory();
  const [expanded, setExpanded] = useState(treatment.status !== "completed");
  const [completeOpen, setCompleteOpen] = useState(false);
  const [markVisitDone, setMarkVisitDone] = useState<{ id: string; visitNumber: number; date: string; time: string } | null>(null);
  const [addMatOpen, setAddMatOpen] = useState(false);

  const patient = mockPatients.find((p) => p.id === treatment.patientId);

  const visits        = getTreatmentVisits(treatment.id);
  const balance       = getTreatmentBalance(treatment.id);
  const completedVisits = visits.filter((v) => v.status === "completed").length;
  const progressPct   = treatment.plannedVisits > 0
    ? Math.min(100, (completedVisits / treatment.plannedVisits) * 100)
    : 0;

  // Actual materials used from inventory, linked to this treatment
  const treatmentUsages = useMemo(
    () => usages.filter((u) => u.treatmentId === treatment.id),
    [usages, treatment.id],
  );

  // Unified material rows: planned (from template) + extra usages not in plan
  const materialRows = useMemo(() => {
    type Row = { itemId: string; itemName: string; unit: string; plannedQty: number | null; usedQty: number };
    const rows: Row[] = [];
    const seen = new Set<string>();

    (treatment.plannedMaterials ?? []).forEach((m) => {
      const used = treatmentUsages.filter((u) => u.itemId === m.itemId).reduce((s, u) => s + u.quantity, 0);
      rows.push({ itemId: m.itemId, itemName: m.itemName, unit: m.unit, plannedQty: m.plannedQty, usedQty: used });
      seen.add(m.itemId);
    });

    treatmentUsages.forEach((u) => {
      if (!seen.has(u.itemId)) {
        const total = treatmentUsages.filter((x) => x.itemId === u.itemId).reduce((s, x) => s + x.quantity, 0);
        rows.push({ itemId: u.itemId, itemName: u.itemName, unit: u.unit, plannedQty: null, usedQty: total });
        seen.add(u.itemId);
      }
    });

    return rows;
  }, [treatment.plannedMaterials, treatmentUsages]);

  const statusLabel: Record<string, string> = {
    planned:     "Rejalashtirilgan",
    in_progress: "Davom etmoqda",
    completed:   "Yakunlangan",
    cancelled:   "Bekor qilingan",
  };

  const canComplete = treatment.status === "in_progress";
  const allVisitsDone = completedVisits >= treatment.plannedVisits;
  const hasMaterials = (treatment.plannedMaterials?.length ?? 0) > 0;

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
            {hasMaterials && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                <Package className="h-2.5 w-2.5" />
                {treatment.plannedMaterials!.length}
              </Badge>
            )}
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
          {expanded
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
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
                  className="flex items-center gap-2 text-xs rounded-md bg-background/70 px-2.5 py-1.5 border border-border/40"
                >
                  <span className="flex-1 text-muted-foreground">
                    {t("treatments.visitNumber")}{v.visitNumber} · {format(new Date(v.date), "dd.MM")} {v.time}
                    {v.notes && <span className="ml-1 text-foreground/60">— {v.notes.slice(0, 40)}</span>}
                  </span>
                  {v.status === "scheduled" ? (
                    <button
                      onClick={() => setMarkVisitDone({ id: v.id, visitNumber: v.visitNumber, date: v.date, time: v.time })}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 border border-orange-300 transition-colors font-medium"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Keldi
                    </button>
                  ) : (
                    <span className={cn(
                      "font-bold",
                      v.status === "completed" && "text-green-600",
                      v.status === "missed"    && "text-destructive",
                    )}>
                      {v.status === "completed" ? "✓" : "✗"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Materials (always visible for active/completed) ────────── */}
          {treatment.status !== "cancelled" && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-primary" />
                  {t("treatments.materials")}
                  {materialRows.length > 0 && (
                    <span className="text-muted-foreground font-normal">
                      ({materialRows.reduce((s, m) => s + m.usedQty, 0)} {t("treatments.usedTotal")})
                    </span>
                  )}
                </p>
                {treatment.status !== "completed" && (
                  <button
                    onClick={() => setAddMatOpen(true)}
                    className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    {t("treatments.addMaterialUsage")}
                  </button>
                )}
              </div>

              {materialRows.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-1">
                  {t("treatments.noMaterialsYet")}
                </p>
              ) : (
                <div className="rounded-md border border-border/40 bg-background/50 text-xs overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-2.5 py-1 text-[10px] font-medium text-muted-foreground bg-muted/50">
                    <span>Mahsulot</span>
                    <span className="text-center w-8">Birlik</span>
                    <span className="text-center w-12">Rej.</span>
                    <span className="text-center w-14">Sarflandi</span>
                  </div>
                  {materialRows.map((m) => (
                    <div
                      key={m.itemId}
                      className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-2.5 py-1.5 border-t border-border/30 items-center"
                    >
                      <span className="truncate">{m.itemName}</span>
                      <span className="text-center w-8 text-muted-foreground">{m.unit}</span>
                      <span className="text-center w-12 text-muted-foreground">
                        {m.plannedQty ?? "—"}
                      </span>
                      <span className={cn(
                        "text-center w-14 font-semibold",
                        m.usedQty === 0
                          ? "text-muted-foreground"
                          : m.plannedQty !== null && m.usedQty > m.plannedQty
                            ? "text-orange-600"
                            : "text-green-600",
                      )}>
                        {m.usedQty === 0 ? "—" : `✓ ${m.usedQty}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
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

          {treatment.notes && (
            <p className="text-xs text-muted-foreground italic">{treatment.notes}</p>
          )}

          {/* Actions */}
          {treatment.status !== "completed" && treatment.status !== "cancelled" && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => onAddVisit(treatment)}>
                <Plus className="h-3 w-3" />
                {t("treatments.addVisit")}
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => onAddPayment(treatment)}>
                <Banknote className="h-3 w-3" />
                {t("patientProfile.acceptPayment")}
              </Button>
              {canComplete && (
                <Button
                  size="sm"
                  variant={allVisitsDone ? "default" : "outline"}
                  className={cn(
                    "h-7 gap-1 text-xs",
                    allVisitsDone
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "border-orange-400 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20",
                  )}
                  onClick={() => setCompleteOpen(true)}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {t("treatments.markCompleted")}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <MarkVisitDoneDialog
        visit={markVisitDone}
        treatment={treatment}
        open={!!markVisitDone}
        onOpenChange={(v) => { if (!v) setMarkVisitDone(null); }}
      />

      <CompleteTreatmentDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        treatment={treatment}
        patientName={patient?.fullName ?? ""}
        allVisitsDone={allVisitsDone}
        completedVisits={completedVisits}
        plannedVisits={treatment.plannedVisits}
      />

      <AddMaterialUsageDialog
        open={addMatOpen}
        onOpenChange={setAddMatOpen}
        treatment={treatment}
      />
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

// ─── New Treatment Dialog ─────────────────────────────────────────────────────

function NewTreatmentDialog({
  patientId, open, onOpenChange, onCreated,
}: {
  patientId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (t: Treatment) => void;
}) {
  const { t } = useTranslation();
  const { addTreatment } = useTreatments();
  const { getTemplatesForType } = useServiceTemplates();

  const [type, setType]               = useState<DentalTreatmentType>("filling");
  const [templateId, setTemplateId]   = useState("");
  const [tooth, setTooth]             = useState("11");
  const [cost, setCost]               = useState("");
  const [plannedVisits, setPlanned]   = useState("2");
  const [doctorId, setDoctorId]       = useState("");
  const [startDate, setStartDate]     = useState<Date>(new Date());
  const [notes, setNotes]             = useState("");
  const [materials, setMaterials]     = useState<ServiceMaterial[]>([]);

  const matchingTemplates = getTemplatesForType(type);

  // When type changes, reset template selection
  function handleTypeChange(v: DentalTreatmentType) {
    setType(v);
    setTemplateId("");
    setMaterials([]);
    setCost("");
  }

  // When template is selected, auto-fill cost + materials
  function handleTemplateSelect(id: string) {
    setTemplateId(id);
    const tpl = matchingTemplates.find((t) => t.id === id);
    if (tpl) {
      setCost(String(tpl.price));
      setPlanned(String(Math.max(1, tpl.duration > 60 ? 3 : tpl.duration > 45 ? 2 : 1)));
      setMaterials(tpl.materials.map((m) => ({ ...m })));
    }
  }

  function updateMaterialQty(itemId: string, qty: number) {
    setMaterials((prev) =>
      prev.map((m) => (m.itemId === itemId ? { ...m, plannedQty: Math.max(0.1, qty) } : m)),
    );
  }

  function reset() {
    setType("filling"); setTemplateId(""); setTooth("11");
    setCost(""); setPlanned("2"); setDoctorId("");
    setStartDate(new Date()); setNotes(""); setMaterials([]);
  }

  function handleSave() {
    const newT = addTreatment({
      patientId,
      toothNumbers:    [tooth],
      type,
      title:           `${TREATMENT_TYPE_LABELS[type]} — #${tooth}`,
      totalCost:       Number(cost) || 0,
      status:          "planned",
      assignedDoctorId: doctorId,
      startDate:       startDate.toISOString().slice(0, 10),
      plannedVisits:   Number(plannedVisits) || 1,
      notes,
      templateId:      templateId || undefined,
      plannedMaterials: materials.length > 0 ? materials : undefined,
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
            <Select value={type} onValueChange={(v) => handleTypeChange(v as DentalTreatmentType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(TREATMENT_TYPE_LABELS) as [DentalTreatmentType, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template picker — shown when matching templates exist */}
          {matchingTemplates.length > 0 && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-primary" />
                {t("treatments.serviceTemplate")}
              </Label>
              <Select value={templateId} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder={t("treatments.selectTemplate")} />
                </SelectTrigger>
                <SelectContent>
                  {matchingTemplates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {tpl.name}
                      <span className="ml-2 text-muted-foreground text-xs">
                        ({fmt(tpl.price)} so'm · {tpl.materials.length} material)
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tooth */}
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
                <CalendarPicker mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          {/* Doctor */}
          <DoctorSelect value={doctorId} onChange={setDoctorId} label={t("reminders.doctor")} hideIfSingle={false} />

          {/* Materials preview (from template) */}
          {materials.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-primary" />
                {t("treatments.materials")}
                <span className="text-xs font-normal text-muted-foreground">({t("treatments.adjustable")})</span>
              </Label>
              <div className="rounded-lg border border-border divide-y divide-border/50">
                {materials.map((m) => (
                  <div key={m.itemId} className="flex items-center gap-2 px-3 py-2">
                    <span className="flex-1 text-sm truncate">{m.itemName}</span>
                    <span className="text-xs text-muted-foreground w-12 shrink-0">{m.unit}</span>
                    <Input
                      type="number"
                      className="h-7 w-16 text-xs text-center"
                      value={m.plannedQty}
                      min={0.1}
                      step={0.5}
                      onChange={(e) => updateMaterialQty(m.itemId, Number(e.target.value))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

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

// ─── Add Material Usage Dialog ───────────────────────────────────────────────

function AddMaterialUsageDialog({
  open,
  onOpenChange,
  treatment,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  treatment: Treatment;
}) {
  const { t } = useTranslation();
  const { items: invItems, useItem } = useInventory();

  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("1");

  useEffect(() => {
    if (open) { setItemId(""); setQty("1"); }
  }, [open]);

  const selectedItem = invItems.find((i) => i.id === itemId);
  const maxQty = selectedItem?.quantity ?? 0;
  const qtyNum = Math.max(1, Number(qty) || 1);
  const canConfirm = !!itemId && qtyNum > 0 && qtyNum <= maxQty;

  function handleConfirm() {
    if (!canConfirm) return;
    useItem({
      itemId,
      quantity: qtyNum,
      usedByDoctorId: treatment.assignedDoctorId,
      treatmentId: treatment.id,
      note: "Qo'lda qo'shildi",
    });
    toast.success(t("treatments.materialAdded"));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            {t("treatments.addMaterialUsage")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm">{t("treatments.selectMaterial")}</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger>
                <SelectValue placeholder={t("treatments.selectMaterialPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {invItems
                  .filter((i) => i.quantity > 0)
                  .map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name} — {i.quantity} {i.unit}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">{t("treatments.quantity")}</Label>
            <Input
              type="number"
              min={1}
              max={maxQty}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
            {selectedItem && (
              <p className="text-xs text-muted-foreground">
                {t("treatments.inStock")}: {selectedItem.quantity} {selectedItem.unit}
              </p>
            )}
            {itemId && qtyNum > maxQty && (
              <p className="text-xs text-destructive">
                {t("treatments.notEnoughStock")}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("patients.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {t("treatments.addMaterialUsage")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Mark Visit Done Dialog ───────────────────────────────────────────────────

interface MaterialRow {
  itemId: string;
  itemName: string;
  unit: string;
  qty: number;
  stock: number;
}

function MarkVisitDoneDialog({
  visit, treatment, open, onOpenChange,
}: {
  visit: { id: string; visitNumber: number; date: string; time: string } | null;
  treatment: Treatment | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const { updateVisit } = useTreatments();
  const { useItem, items: invItems } = useInventory();

  const [notes, setNotes] = useState("");
  const [matRows, setMatRows] = useState<MaterialRow[]>([]);

  useEffect(() => {
    if (!open || !treatment?.plannedMaterials?.length) {
      setMatRows([]);
      return;
    }
    setMatRows(
      treatment.plannedMaterials.map((m) => {
        const inv = invItems.find((i) => i.id === m.itemId);
        return { itemId: m.itemId, itemName: m.itemName, unit: m.unit, qty: m.plannedQty, stock: inv?.quantity ?? 0 };
      }),
    );
  }, [open, treatment?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleConfirm() {
    if (!visit || !treatment) return;
    updateVisit(visit.id, { status: "completed", notes: notes || undefined });
    matRows.forEach((row) => {
      if (row.qty > 0) {
        useItem({
          itemId: row.itemId,
          quantity: row.qty,
          usedByDoctorId: treatment.assignedDoctorId,
          visitId: visit.id,
          treatmentId: treatment.id,
          note: `${treatment.title} — ${t("treatments.visitNumber")}${visit.visitNumber}`,
        });
      }
    });
    onOpenChange(false);
    toast.success(t("treatments.visitCompleted"));
  }

  if (!visit || !treatment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            {t("treatments.visitNumber")}{visit.visitNumber} — {t("treatments.markVisitDone")}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg bg-muted px-3 py-2 text-sm">
          <p className="font-medium">{treatment.title}</p>
          <p className="text-muted-foreground text-xs mt-0.5">{visit.date} {visit.time}</p>
        </div>

        <div className="space-y-4">
          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-sm">{t("treatments.notes")}</Label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
              placeholder={t("treatments.notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Material rows */}
          {matRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Package className="h-4 w-4 text-primary" />
                {t("treatments.materialsUsed")}
              </p>
              <div className="rounded-lg border divide-y text-sm bg-background">
                {matRows.map((row) => (
                  <div key={row.itemId} className="flex items-center gap-2 px-3 py-2">
                    <span className="flex-1 truncate">{row.itemName}</span>
                    <span className="text-xs text-muted-foreground w-10">{row.unit}</span>
                    <input
                      type="number"
                      className={cn(
                        "w-16 h-7 rounded border text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring",
                        row.qty > row.stock ? "border-destructive" : "border-input",
                      )}
                      min={0}
                      step={0.5}
                      value={row.qty}
                      onChange={(e) =>
                        setMatRows((prev) =>
                          prev.map((r) => r.itemId === row.itemId ? { ...r, qty: Number(e.target.value) } : r),
                        )
                      }
                    />
                    {row.qty > row.stock && (
                      <span className="text-xs text-destructive">({t("treatments.stock")}: {row.stock})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("patients.cancel")}</Button>
          <Button className="gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={handleConfirm}>
            <CheckCircle2 className="h-4 w-4" />
            {t("treatments.markVisitDone")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Visit Dialog (with materials deduction on complete) ──────────────────

function AddVisitDialog({
  treatment, open, onOpenChange,
}: {
  treatment: Treatment | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const { addVisit, getTreatmentVisits, updateTreatment } = useTreatments();
  const { useItem, items: invItems } = useInventory();

  const [visitDate, setVisitDate]   = useState<Date>(new Date());
  const [visitTime, setVisitTime]   = useState("09:00");
  const [visitStatus, setVStatus]   = useState<"scheduled" | "completed">("scheduled");
  const [notes, setNotes]           = useState("");

  // Material rows — initialised from treatment.plannedMaterials
  const [matRows, setMatRows] = useState<MaterialRow[]>([]);

  // Sync material rows when treatment changes or dialog opens
  useMemo(() => {
    if (!treatment?.plannedMaterials?.length) {
      setMatRows([]);
      return;
    }
    setMatRows(
      treatment.plannedMaterials.map((m) => {
        const inv = invItems.find((i) => i.id === m.itemId);
        return {
          itemId:   m.itemId,
          itemName: m.itemName,
          unit:     m.unit,
          qty:      m.plannedQty,
          stock:    inv?.quantity ?? 0,
        };
      }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treatment?.id, open]);

  function updateRowQty(itemId: string, qty: number) {
    setMatRows((prev) =>
      prev.map((r) => (r.itemId === itemId ? { ...r, qty: Math.max(0, qty) } : r)),
    );
  }

  function reset() {
    setVisitDate(new Date()); setVisitTime("09:00");
    setVStatus("scheduled"); setNotes(""); setMatRows([]);
  }

  function handleSave() {
    if (!treatment) return;
    const existing = getTreatmentVisits(treatment.id);
    const newVisit = addVisit({
      treatmentId:      treatment.id,
      patientId:        treatment.patientId,
      assignedDoctorId: treatment.assignedDoctorId,
      visitNumber:      existing.length + 1,
      date:             visitDate.toISOString().slice(0, 10),
      time:             visitTime,
      status:           visitStatus,
      notes,
    });

    // Deduct materials from inventory when visit is completed
    if (visitStatus === "completed") {
      matRows.forEach((row) => {
        if (row.qty > 0) {
          useItem({
            itemId:       row.itemId,
            quantity:     row.qty,
            usedByDoctorId: treatment.assignedDoctorId,
            visitId:      newVisit.id,
            treatmentId:  treatment.id,
            note:         `${treatment.title} — ${t("treatments.visitNumber")}${existing.length + 1}`,
          });
        }
      });
    }

    if (treatment.status === "planned") {
      updateTreatment(treatment.id, { status: "in_progress" });
    }
    reset();
    onOpenChange(false);
    toast.success(
      visitStatus === "completed"
        ? t("treatments.visitCompleted")
        : t("treatments.visitAdded"),
    );
  }

  if (!treatment) return null;

  const showMaterials = visitStatus === "completed" && matRows.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                <CalendarPicker mode="single" selected={visitDate} onSelect={(d) => d && setVisitDate(d)} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label>{t("appointments.time")}</Label>
            <Select value={visitTime} onValueChange={setVisitTime}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIME_SLOTS.map((ts) => <SelectItem key={ts} value={ts}>{ts}</SelectItem>)}</SelectContent>
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

          {/* ── Materials section (only when completing) ──────────────────── */}
          {showMaterials && (
            <div className="space-y-2 rounded-lg border border-orange-200 dark:border-orange-800/50 bg-orange-50/50 dark:bg-orange-950/20 p-3">
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                {t("treatments.materialsUsed")}
                <span className="font-normal text-muted-foreground">({t("treatments.adjustIfNeeded")})</span>
              </p>
              <div className="space-y-1">
                {matRows.map((row) => (
                  <div key={row.itemId} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate text-xs">{row.itemName}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {t("treatments.stock")}: {row.stock}
                    </span>
                    <span className="text-xs text-muted-foreground">{row.unit}</span>
                    <Input
                      type="number"
                      className={cn(
                        "h-7 w-16 text-xs text-center",
                        row.qty > row.stock && "border-destructive",
                      )}
                      value={row.qty}
                      min={0}
                      step={0.5}
                      onChange={(e) => updateRowQty(row.itemId, Number(e.target.value))}
                    />
                  </div>
                ))}
              </div>
              {matRows.some((r) => r.qty > r.stock) && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  ⚠ {t("treatments.stockWarning")}
                </p>
              )}
            </div>
          )}

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
  treatment, open, onOpenChange,
}: {
  treatment: Treatment | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const { addPayment, getTreatmentBalance } = useTreatments();

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [note, setNote]     = useState("");

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
    reset(); onOpenChange(false);
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
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(balance.remaining)} />
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
  patient, onAddAppointment, onAddTreatment, onAddReminder, onPayment,
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

  const { getPatientTreatments, getPatientBalance } = useTreatments();

  const [localPatient, setLocalPatient]           = useState<Patient | undefined>(() =>
    mockPatients.find((p) => p.id === id),
  );
  const [teethData, setTeethData]                 = useState<ToothData[]>(createDefaultTeeth);
  const [editOpen, setEditOpen]                   = useState(false);
  const [reminderOpen, setReminderOpen]           = useState(false);
  const [appointmentOpen, setAppointmentOpen]     = useState(false);
  const [newTreatmentOpen, setNewTreatmentOpen]   = useState(false);
  const [visitTreatment, setVisitTreatment]       = useState<Treatment | null>(null);
  const [paymentTreatment, setPaymentTreatment]   = useState<Treatment | null>(null);

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

  const patientId       = localPatient.id;
  const allTreatments   = getPatientTreatments(patientId);
  const inProgressList  = allTreatments.filter((t) => t.status === "in_progress");
  const plannedList     = allTreatments.filter((t) => t.status === "planned");
  const completedList   = allTreatments.filter((t) => t.status === "completed");
  const patientBalance  = getPatientBalance(patientId);

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
          : tooth,
      ),
    );
  };

  const handleHeaderPayment = () => {
    const firstActive = allTreatments.find(
      (t) => t.status !== "cancelled" && t.status !== "completed",
    );
    if (firstActive) setPaymentTreatment(firstActive);
    else if (allTreatments.length > 0) setPaymentTreatment(allTreatments[0]);
    else toast.info("Muolajalar mavjud emas");
  };

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

        {/* ── Overview ──────────────────────────────────────────────────── */}
        <TabsContent value="overview">
          <div className="mb-4">
            <DentalChart teeth={teethData} onUpdate={setTeethData} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      {t("patientProfile.financialSummary")}
                    </span>
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={handleHeaderPayment}>
                      <Banknote className="h-3.5 w-3.5" />{t("patientProfile.acceptPayment")}
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
                      <Clock className="h-4 w-4" />Faol muolajalar
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
                <span className="text-muted-foreground">{allTreatments.length} ta muolaja</span>
                {inProgressList.length > 0 && <span className="text-orange-600 font-medium">{inProgressList.length} faol</span>}
                {completedList.length > 0 && <span className="text-green-600">{completedList.length} yakunlangan</span>}
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => setNewTreatmentOpen(true)}>
                <Plus className="h-4 w-4" />{t("treatments.newTreatment")}
              </Button>
            </div>

            {allTreatments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                <Stethoscope className="h-14 w-14 opacity-15" />
                <p className="text-sm">{t("treatments.noTreatments")}</p>
                <Button size="sm" variant="outline" onClick={() => setNewTreatmentOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />{t("treatments.addFirst")}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {inProgressList.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-orange-600 flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />Davom etayotgan muolajalar ({inProgressList.length})
                    </h3>
                    <div className="space-y-3">
                      {inProgressList.map((tr) => (
                        <TreatmentCard key={tr.id} treatment={tr} onAddVisit={setVisitTreatment} onAddPayment={setPaymentTreatment} />
                      ))}
                    </div>
                  </section>
                )}
                {plannedList.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-blue-600 flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />Rejalashtirilgan ({plannedList.length})
                    </h3>
                    <div className="space-y-3">
                      {plannedList.map((tr) => (
                        <TreatmentCard key={tr.id} treatment={tr} onAddVisit={setVisitTreatment} onAddPayment={setPaymentTreatment} />
                      ))}
                    </div>
                  </section>
                )}
                {completedList.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-green-600 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />Yakunlangan ({completedList.length})
                    </h3>
                    <div className="space-y-3">
                      {completedList.map((tr) => (
                        <TreatmentCard key={tr.id} treatment={tr} onAddVisit={setVisitTreatment} onAddPayment={setPaymentTreatment} />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Gallery ───────────────────────────────────────────────────── */}
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
