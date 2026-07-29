import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  ArrowLeft, Phone, AlertTriangle, Calendar, MapPin, Briefcase, Cake,
  Image as ImageIcon, CalendarPlus, Stethoscope,
  Edit, Save, Plus, CheckCircle2, Upload, Trash2,
  Pill, Printer, Pencil, CreditCard, MoreVertical, Eye, User,
} from "lucide-react";
import { DentalChartV2, type ToothStatusDef } from "@/components/DentalChartV2";
import { DoctorBadge } from "@/components/DoctorBadge";
import { DoctorSelect } from "@/components/DoctorSelect";
import { PrescriptionDialog } from "@/components/PrescriptionDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { TREATMENT_TYPE_LABELS, type Patient, type TreatmentType, type GalleryImage } from "@/data/mockPatients";
import type { Treatment, TreatmentStatus } from "@/data/mockTreatments";
import type { TreatmentTypeDto } from "@/lib/api/dto";
import type { Prescription } from "@/data/mockPrescriptions";
import { formatPrintDosage, formatPrintDuration, formatPrintSchedule } from "@/data/medicationCatalog";
import { loadClinicInfo } from "@/data/clinicInfo";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { formatUzPhone } from "@/lib/phone";
import { formatThousands, parseThousands } from "@/lib/number";
import { treatmentTypeKeyFromName, type PatientDetailResult } from "@/lib/api/mappers";
import { useTreatments, usePatientTreatments } from "@/contexts/TreatmentContext";
import { useServiceTemplates } from "@/contexts/ServiceTemplatesContext";
import { usePatients, usePatientDetail, patientKeys } from "@/contexts/PatientsContext";
import { usePrescriptions } from "@/contexts/PrescriptionsContext";
import { useDoctors } from "@/contexts/DoctorsContext";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

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

/** Solid pill colours for the treatments table's status column. */
const treatmentStatusPillColors: Record<TreatmentStatus, string> = {
  in_progress: "bg-orange-500 text-white",
  completed:   "bg-green-600 text-white",
};

/** A tooth with any treatment on file is simply marked — one colour, no status split. */
const CHART_STATUSES: ToothStatusDef[] = [
  { id: "treated", color: "#22C55E", strokeColor: "#15803D", label: "Muolaja qilingan" },
];

// ─── Tooth chart + per-tooth treatment rows ────────────────────────────────────

/**
 * One tooth's draft treatment line. Each row is a distinct tooth × treatment
 * type × cost/paid — the backend only stores one tooth per treatment record
 * today (see BACKEND_SPEC.md §1.4), so on save these are aggregated into the
 * single record it currently supports; once it accepts multiple teeth this is
 * where per-row submission would plug in.
 */
interface TreatmentRowDraft {
  fdi: string;
  treatmentTypeId: string;
  totalCost: string;
  amountPaid: string;
}

/** Left-column piece: the chart itself plus the click-to-pick-a-type popover. */
function ToothChartPicker({
  rows, onRowsChange, treatmentTypes,
}: {
  rows: TreatmentRowDraft[];
  onRowsChange: (rows: TreatmentRowDraft[]) => void;
  treatmentTypes: TreatmentTypeDto[];
}) {
  const { t } = useTranslation();
  const [picker, setPicker] = useState<{ fdi: string; x: number; y: number } | null>(null);
  const selectedTeeth = rows.map((r) => r.fdi);
  // Rows already added stay marked green on the chart, same colour the
  // overview tab uses for "has a treatment on file".
  const chartValues = useMemo(
    () => Object.fromEntries(selectedTeeth.map((fdi) => [fdi, "treated"])),
    [selectedTeeth],
  );

  // Picking an unselected tooth opens a treatment-type picker anchored to it;
  // clicking an already-selected tooth just removes its row — no type to (re)pick.
  function handleToothClick(fdi: string, _event: React.MouseEvent | React.KeyboardEvent, element: SVGGElement) {
    if (selectedTeeth.includes(fdi)) {
      onRowsChange(rows.filter((r) => r.fdi !== fdi));
      return;
    }
    const rect = element.getBoundingClientRect();
    setPicker({ fdi, x: rect.left + rect.width / 2, y: rect.top });
  }

  function addRow(typeId: string) {
    if (!picker) return;
    const tt = treatmentTypes.find((x) => String(x.id) === typeId);
    onRowsChange([
      ...rows,
      {
        fdi: picker.fdi,
        treatmentTypeId: typeId,
        totalCost: tt?.price != null ? formatThousands(String(tt.price)) : "",
        amountPaid: "",
      },
    ]);
    setPicker(null);
  }

  return (
    <div className="space-y-2">
      <div className="relative mx-auto max-w-[420px] rounded-xl border border-muted-foreground/15 bg-muted/20 p-3">
        <DentalChartV2 values={chartValues} statuses={CHART_STATUSES} onToothClick={handleToothClick} maxWidth={380} />

        <Popover open={!!picker} onOpenChange={(v) => { if (!v) setPicker(null); }}>
          <PopoverAnchor asChild>
            <span
              className="pointer-events-none fixed h-px w-px"
              style={{ left: picker?.x ?? 0, top: picker?.y ?? 0 }}
            />
          </PopoverAnchor>
          <PopoverContent className="w-56 p-2" align="center" side="top" sideOffset={10}>
            <p className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {picker && `${t("patientProfile.tooth")} ${picker.fdi}`}
            </p>
            <Select onValueChange={addRow} defaultOpen>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={t("appointments.selectTreatment")} />
              </SelectTrigger>
              <SelectContent>
                {treatmentTypes.map((tt) => (
                  <SelectItem key={tt.id} value={String(tt.id)}>{tt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PopoverContent>
        </Popover>
      </div>

      {rows.length === 0 && (
        <p className="text-center text-xs text-muted-foreground">{t("treatments.selectTeethHint")}</p>
      )}
    </div>
  );
}

/** Full-width piece below both columns: one editable row per picked tooth. */
function TreatmentRowsTable({
  rows, onRowsChange, treatmentTypes,
}: {
  rows: TreatmentRowDraft[];
  onRowsChange: (rows: TreatmentRowDraft[]) => void;
  treatmentTypes: TreatmentTypeDto[];
}) {
  const { t } = useTranslation();

  if (rows.length === 0) return null;

  function updateRow(fdi: string, patch: Partial<TreatmentRowDraft>) {
    onRowsChange(rows.map((r) => (r.fdi === fdi ? { ...r, ...patch } : r)));
  }

  // Changing a row's type prefills its cost from the new type's price too —
  // same "auto but editable" behaviour as the chart-side picker.
  function changeRowType(fdi: string, typeId: string) {
    const tt = treatmentTypes.find((x) => String(x.id) === typeId);
    const current = rows.find((r) => r.fdi === fdi);
    updateRow(fdi, {
      treatmentTypeId: typeId,
      totalCost: tt?.price != null ? formatThousands(String(tt.price)) : current?.totalCost ?? "",
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("patientProfile.tooth")}</TableHead>
            <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.treatmentType")}</TableHead>
            <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.totalCost")}</TableHead>
            <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.paid")}</TableHead>
            <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.debt")}</TableHead>
            <TableHead className="text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const debt = Math.max(
              (Number(parseThousands(row.totalCost)) || 0) - (Number(parseThousands(row.amountPaid)) || 0),
              0,
            );
            return (
              <TableRow key={row.fdi}>
                <TableCell><ToothIcon number={row.fdi} /></TableCell>
                <TableCell>
                  <Select value={row.treatmentTypeId} onValueChange={(v) => changeRowType(row.fdi, v)}>
                    <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {treatmentTypes.map((tt) => (
                        <SelectItem key={tt.id} value={String(tt.id)}>{tt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="text"
                    inputMode="numeric"
                    className="h-8 w-24 text-xs"
                    value={row.totalCost}
                    onChange={(e) => updateRow(row.fdi, { totalCost: formatThousands(e.target.value) })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="text"
                    inputMode="numeric"
                    className="h-8 w-24 text-xs"
                    value={row.amountPaid}
                    onChange={(e) => updateRow(row.fdi, { amountPaid: formatThousands(e.target.value) })}
                  />
                </TableCell>
                <TableCell className={cn("whitespace-nowrap text-xs font-semibold", debt > 0 ? "text-red-600" : "text-foreground")}>
                  {fmt(debt)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onRowsChange(rows.filter((r) => r.fdi !== row.fdi))}
                    aria-label={t("treatments.removeRow")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
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
  const { addTreatments, updateTreatment, completeTreatment } = useTreatments();
  const { treatmentTypes } = useServiceTemplates();
  const isEditing = !!treatment;

  const [date, setDate]         = useState<Date>(treatment ? new Date(treatment.date) : new Date());
  const [status, setStatus]     = useState<TreatmentStatus>(treatment?.status ?? "in_progress");
  const [doctorId, setDoctorId] = useState(treatment?.doctorId ?? "");
  const [rows, setRows]         = useState<TreatmentRowDraft[]>([]);
  const [note, setNote]         = useState(treatment?.note ?? "");

  // Seed one row per existing tooth once the treatment-type list loads (need it
  // to map the treatment back to a real API type id). Prefer an exact match on
  // the real name (`treatmentTypeName`, e.g. "Endo Pulpotek") — the coerced
  // 3-key `treatmentType` is lossy and only a fallback for older/local data.
  useEffect(() => {
    if (!treatment || rows.length > 0 || treatmentTypes.length === 0 || treatment.teeth.length === 0) return;
    const match =
      treatmentTypes.find((tt) => tt.name === treatment.treatmentTypeName) ??
      treatmentTypes.find((tt) => treatmentTypeKeyFromName(tt.name) === treatment.treatmentType);
    const typeId = String((match ?? treatmentTypes[0]).id);
    setRows(treatment.teeth.map((fdi) => ({
      fdi,
      treatmentTypeId: typeId,
      totalCost: formatThousands(String(treatment.totalCost)),
      amountPaid: formatThousands(String(treatment.amountPaid)),
    })));
  }, [treatment, treatmentTypes, rows.length]);

  function reset() {
    setDate(new Date()); setStatus("in_progress"); setDoctorId(""); setRows([]); setNote("");
  }

  function handleSave() {
    if (treatment) {
      // Editing still targets exactly one existing record (one tooth). If the
      // user added more teeth while editing, those can't PATCH onto the same
      // id — they become new records via the same bulk-create the add flow uses.
      const [firstRow, ...extraRows] = rows;
      if (firstRow) {
        updateTreatment(treatment.id, treatment.patientId, {
          date: date.toISOString(),
          teeth: [firstRow.fdi],
          treatmentTypeId: Number(firstRow.treatmentTypeId) || undefined,
          totalCost: Number(parseThousands(firstRow.totalCost)) || 0,
          amountPaid: Number(parseThousands(firstRow.amountPaid)) || 0,
          doctorId: doctorId || undefined,
          note: note.trim() || undefined,
          visitNumber: treatment.visitNumber ?? 1,
        });
      }
      if (extraRows.length > 0) {
        addTreatments({
          patientId: treatment.patientId,
          doctorId: doctorId || undefined,
          date: date.toISOString(),
          note: note.trim() || undefined,
          rows: extraRows.map((r) => ({
            teeth: [r.fdi],
            treatmentTypeId: Number(r.treatmentTypeId) || undefined,
            totalCost: Number(parseThousands(r.totalCost)) || 0,
            amountPaid: Number(parseThousands(r.amountPaid)) || 0,
          })),
        });
      }
      // The backend has no status field (see TreatmentContext.tsx) — completing
      // is still a local-only marker, so only apply it on the "completed" edge.
      if (status === "completed") completeTreatment(treatment.id);
      toast.success(t("treatments.treatmentUpdated"));
    } else {
      // A new visit can cover several teeth — `/clinic/treatments/` takes one
      // row per tooth in a single request, each keeping its own type/cost/paid.
      addTreatments({
        patientId,
        doctorId: doctorId || undefined,
        date: date.toISOString(),
        note: note.trim() || undefined,
        rows: rows.map((r) => ({
          teeth: [r.fdi],
          treatmentTypeId: Number(r.treatmentTypeId) || undefined,
          totalCost: Number(parseThousands(r.totalCost)) || 0,
          amountPaid: Number(parseThousands(r.amountPaid)) || 0,
        })),
      });
      toast.success(t("treatments.treatmentAdded"));
      reset();
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v && !treatment) reset(); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            {isEditing ? t("treatments.editTreatment") : t("treatments.newTreatment")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Left: tooth chart. Right: doctor, status, notes — side by side so
              the dialog grows wide instead of tall (avoids a whole-modal
              vertical scroll on shorter screens). */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("treatments.teeth")}</Label>
              <ToothChartPicker rows={rows} onRowsChange={setRows} treatmentTypes={treatmentTypes} />
            </div>

            <div className="space-y-4">
              <DoctorSelect value={doctorId} onChange={setDoctorId} label={t("reminders.doctor")} hideIfSingle={false} />
              <div className="space-y-1.5">
                <Label>{t("patients.status")}</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TreatmentStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">{t("patients.in_progress")}</SelectItem>
                    <SelectItem value="completed">{t("patients.completed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("treatments.notes")}</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="..." />
              </div>
            </div>
          </div>

          {/* Per-tooth treatment rows — full width below both columns. */}
          <TreatmentRowsTable rows={rows} onRowsChange={setRows} treatmentTypes={treatmentTypes} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("patients.cancel")}</Button>
          <Button onClick={handleSave} disabled={rows.length === 0}>{t("patients.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Treatment Card ───────────────────────────────────────────────────────────

/** Small popover to add a payment against a treatment's remaining balance. */
function AcceptPaymentPopover({ treatment }: { treatment: Treatment }) {
  const { t } = useTranslation();
  const { updateTreatment } = useTreatments();
  const remaining = treatment.totalCost - treatment.amountPaid;
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setAmount(formatThousands(String(Math.max(remaining, 0))));
  }

  function handleConfirm() {
    const value = Number(parseThousands(amount));
    if (!value) return;
    updateTreatment(treatment.id, treatment.patientId, { amountPaid: treatment.amountPaid + value });
    toast.success(t("treatments.paymentAdded"));
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
          <CreditCard className="h-3.5 w-3.5" />
          {t("treatments.acceptPayment")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3" align="end">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("treatments.paymentAmount")}</Label>
          <Input
            type="text"
            inputMode="numeric"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(formatThousands(e.target.value))}
          />
        </div>
        <Button size="sm" className="w-full" onClick={handleConfirm}>{t("treatments.confirm")}</Button>
      </PopoverContent>
    </Popover>
  );
}

/** Tooth-shaped badge with the tooth number set inside it, per-row in the treatments table. */
function ToothIcon({ number }: { number: string }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-[11px] font-bold text-blue-700">
      {number}
    </div>
  );
}

function TreatmentTableRow({
  treatment, onEdit,
}: {
  treatment: Treatment;
  onEdit: (t: Treatment) => void;
}) {
  const { t } = useTranslation();
  const { completeTreatment } = useTreatments();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const remaining = treatment.totalCost - treatment.amountPaid;
  const isCompleted = treatment.status === "completed";

  function handleComplete() {
    completeTreatment(treatment.id);
    toast.success(t("treatments.treatmentCompleted"));
  }

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="flex flex-wrap gap-1.5">
            {treatment.teeth.length > 0 ? (
              treatment.teeth.map((n) => <ToothIcon key={n} number={n} />)
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-sm font-medium">
          {treatment.treatmentTypeName ?? TREATMENT_TYPE_LABELS[treatment.treatmentType]}
        </TableCell>
        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
          {format(new Date(treatment.date), "dd.MM.yyyy")}
        </TableCell>
        <TableCell>
          <Badge className={cn("rounded-full border-0 font-medium", treatmentStatusPillColors[treatment.status])}>
            {isCompleted ? t("patients.completed") : t("treatments.inProgressShort")}
          </Badge>
        </TableCell>
        <TableCell className="whitespace-nowrap text-sm">{fmt(treatment.totalCost)} so'm</TableCell>
        <TableCell className="whitespace-nowrap">
          <span className={cn("font-semibold", remaining > 0 ? "text-red-600" : "text-foreground")}>
            {fmt(Math.max(remaining, 0))} so'm
          </span>
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDetailsOpen(true)}>
                <Eye className="mr-2 h-3.5 w-3.5" />
                {t("treatments.details")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(treatment)}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                {t("treatments.editTreatment")}
              </DropdownMenuItem>
              {!isCompleted && (
                <DropdownMenuItem onClick={handleComplete}>
                  <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                  {t("treatments.markCompleted")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      <TreatmentDetailsDialog
        treatment={treatment}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onEdit={onEdit}
      />
    </>
  );
}

/** Tooth outline doodle used next to the treatment title in the details dialog. */
function ToothOutlineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 28" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1C7.5 1 4 3.8 4 8.2c0 2.6 1.1 4 1.6 6.6.5 2.7.3 6.6 1.7 10.7.3.9.9 1.5 1.7 1.5.9 0 1.4-.8 1.7-2 .4-1.6.5-3.7 1.3-3.7s.9 2.1 1.3 3.7c.3 1.2.8 2 1.7 2 .8 0 1.4-.6 1.7-1.5 1.4-4.1 1.2-8 1.7-10.7.5-2.6 1.6-4 1.6-6.6C20 3.8 16.5 1 12 1Z" />
    </svg>
  );
}

function TreatmentDetailsDialog({
  treatment, open, onOpenChange, onEdit,
}: {
  treatment: Treatment;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit: (t: Treatment) => void;
}) {
  const { t } = useTranslation();
  const { completeTreatment, deleteTreatment } = useTreatments();
  const { getDoctor } = useDoctors();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cur = t("common.currency");
  const doctor = getDoctor(treatment.doctorId);
  const remaining = treatment.totalCost - treatment.amountPaid;
  const isCompleted = treatment.status === "completed";

  function handleComplete() {
    completeTreatment(treatment.id);
    toast.success(t("treatments.treatmentCompleted"));
    onOpenChange(false);
  }

  function handleEdit() {
    onOpenChange(false);
    onEdit(treatment);
  }

  function handleDelete() {
    deleteTreatment(treatment.id, treatment.patientId);
    toast.success(t("treatments.treatmentDeleted"));
    setConfirmDelete(false);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("treatments.detailsTitle")}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <ToothOutlineIcon className="h-8 w-8 shrink-0 text-muted-foreground" />
              <h3 className="text-lg font-semibold">
                ({t("patientProfile.tooth")}: {treatment.teeth.join(", ") || "—"}) {treatment.treatmentTypeName ?? TREATMENT_TYPE_LABELS[treatment.treatmentType]}
              </h3>
            </div>
            <Badge className={cn("w-fit shrink-0 rounded-full font-medium", patientStatusColors[treatment.status])}>
              {isCompleted ? t("patients.completed") : t("patients.in_progress")}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="whitespace-nowrap text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("treatments.date")}</p>
              <p className="mt-1.5 flex items-center gap-1.5 whitespace-nowrap text-sm font-medium">
                <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                {format(new Date(treatment.date), "dd.MM.yyyy")}
              </p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="whitespace-nowrap text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("appointments.doctorLabel")}</p>
              <p className="mt-1.5 flex items-center gap-1.5 whitespace-nowrap text-sm font-medium">
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                {doctor?.name ?? "—"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border p-3">
              <p className="whitespace-nowrap text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.totalCost")}</p>
              <p className="mt-1.5 whitespace-nowrap text-lg font-bold">
                {fmt(treatment.totalCost)} <span className="text-xs font-normal text-muted-foreground">{cur}</span>
              </p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="whitespace-nowrap text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.paid")}</p>
              <p className="mt-1.5 whitespace-nowrap text-lg font-bold text-green-600">
                {fmt(treatment.amountPaid)} <span className="text-xs font-normal text-muted-foreground">{cur}</span>
              </p>
            </div>
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
              <p className="whitespace-nowrap text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.remaining")}</p>
              <p className={cn("mt-1.5 whitespace-nowrap text-lg font-bold", remaining > 0 ? "text-destructive" : "text-foreground")}>
                {fmt(Math.max(remaining, 0))} <span className="text-xs font-normal text-muted-foreground">{cur}</span>
              </p>
            </div>
          </div>

          {treatment.note && (
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("treatments.notes")}</p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">{treatment.note}</p>
            </div>
          )}

          <DialogFooter className="flex-row items-center !justify-between border-t pt-4">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-destructive hover:underline"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("treatments.deleteTreatment")}
            </button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleEdit}>
                <Pencil className="h-3.5 w-3.5" />
                {t("treatments.editTreatment")}
              </Button>
              {remaining > 0 && <AcceptPaymentPopover treatment={treatment} />}
              {!isCompleted && (
                <Button size="sm" className="gap-1.5 bg-green-600 text-white hover:bg-green-700" onClick={handleComplete}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("treatments.markCompleted")}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("treatments.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("treatments.deleteConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("patients.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("treatments.deleteTreatment")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
  const { data: patientTreatments, isLoading: treatmentsLoading } = usePatientTreatments(id);
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
  const allTreatments   = patientTreatments ?? [];
  const inProgressList  = allTreatments.filter((tr) => tr.status === "in_progress");
  const completedList   = allTreatments.filter((tr) => tr.status === "completed");
  const patientBalance  = detail?.balance ?? { totalCost: 0, paid: 0, remaining: 0 };
  const patientStatus   = localPatient?.treatmentStatus ?? "in_progress";

  // Teeth that have any treatment on file — untouched teeth are left out of
  // the map, which renders them neutral. A single "treated" mark (no
  // per-status colour split) is all this chart needs to show right now.
  const toothValues = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const tr of allTreatments) {
      for (const tooth of tr.teeth) out[tooth] = "treated";
    }
    return out;
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
          <Card className="border-muted-foreground/20 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">{t("patientProfile.dentalChart")}</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <DentalChartV2 values={toothValues} statuses={CHART_STATUSES} />
            </CardContent>
          </Card>
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

            {treatmentsLoading ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
              </div>
            ) : allTreatments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                <Stethoscope className="h-14 w-14 opacity-15" />
                <p className="text-sm">{t("treatments.noTreatments")}</p>
                <Button size="sm" variant="outline" onClick={openNewTreatment}>
                  <Plus className="mr-1.5 h-4 w-4" />{t("treatments.addFirst")}
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-muted-foreground/20 bg-card shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/40 hover:bg-transparent">
                      <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patientProfile.tooth")}</TableHead>
                      <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.treatmentType")}</TableHead>
                      <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("treatments.date")}</TableHead>
                      <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.status")}</TableHead>
                      <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("treatments.treatmentCost")}</TableHead>
                      <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.debt")}</TableHead>
                      <TableHead className="text-right text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Active treatments surface first — they're what needs attention. */}
                    {[...inProgressList, ...completedList].map((tr) => (
                      <TreatmentTableRow key={tr.id} treatment={tr} onEdit={openEditTreatment} />
                    ))}
                  </TableBody>
                </Table>
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
