import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Check, ChevronsUpDown, Pill, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DoctorSelect } from "@/components/DoctorSelect";
import { cn } from "@/lib/utils";
import type { Patient } from "@/data/mockPatients";
import type { Medication, Prescription } from "@/data/mockPrescriptions";
import {
  DOSE_FORMS, DURATION_UNITS, FREQUENCIES, MEAL_RELATIONS, MEDICATION_CATALOG,
  MEDICATION_CATEGORIES, needsMealOffset,
  type CatalogMedicine, type DoseForm, type DurationUnit, type Frequency, type MealRelation,
} from "@/data/medicationCatalog";
import { usePrescriptions } from "@/contexts/PrescriptionsContext";
import { usePatientSearch } from "@/contexts/PatientsContext";
import { toast } from "sonner";

// ─── Row model ────────────────────────────────────────────────────────────────

interface MedicationDraft {
  rowId: string;
  name: string;
  doseAmount: string;
  doseForm: DoseForm;
  frequency: Frequency;
  durationAmount: string;
  durationUnit: DurationUnit;
  mealRelation: MealRelation;
  mealOffsetMinutes: string;
}

let rowCounter = 0;
function nextRowId() {
  rowCounter += 1;
  return `row-${rowCounter}`;
}

// The defaults cover the most common dental prescription, so a doctor who
// picks a medicine and stops there still saves a complete, sensible row.
function emptyRow(): MedicationDraft {
  return {
    rowId: nextRowId(),
    name: "",
    doseAmount: "1",
    doseForm: "tablet",
    frequency: "bid",
    durationAmount: "5",
    durationUnit: "days",
    mealRelation: "after",
    mealOffsetMinutes: "30",
  };
}

function rowFromMedication(m: Medication): MedicationDraft {
  const base = emptyRow();
  return {
    ...base,
    name: m.name,
    doseAmount: m.doseAmount ?? base.doseAmount,
    doseForm: m.doseForm ?? base.doseForm,
    frequency: m.frequency ?? base.frequency,
    durationAmount: m.durationAmount ?? base.durationAmount,
    durationUnit: m.durationUnit ?? base.durationUnit,
    mealRelation: m.mealRelation ?? base.mealRelation,
    mealOffsetMinutes: m.mealOffsetMinutes ?? base.mealOffsetMinutes,
  };
}

function rowFromCatalog(med: CatalogMedicine, rowId: string): MedicationDraft {
  return {
    rowId,
    name: med.name,
    doseAmount: med.dose,
    doseForm: med.form,
    frequency: med.frequency,
    durationAmount: med.durationAmount,
    durationUnit: med.durationUnit,
    mealRelation: med.mealRelation,
    mealOffsetMinutes: med.mealOffsetMinutes ?? "30",
  };
}

/**
 * Composes the display strings the rest of the app reads (treatment card,
 * prescriptions tab, printable sheet) from a structured row.
 */
function toMedication(row: MedicationDraft, index: number, t: TFunction): Medication {
  const formLabel = t(`prescriptions.forms.${row.doseForm}`);
  const freqLabel = t(`prescriptions.frequencies.${row.frequency}`);
  const unitLabel = t(`prescriptions.durationUnits.${row.durationUnit}`);
  const mealLabel = t(`prescriptions.mealRelations.${row.mealRelation}`);
  const offset = needsMealOffset(row.mealRelation) && row.mealOffsetMinutes.trim()
    ? ` ${row.mealOffsetMinutes.trim()} ${t("prescriptions.minutesShort")}`
    : "";

  return {
    id: `med-${Date.now()}-${index}`,
    name: row.name.trim(),
    dosage: [row.doseAmount.trim(), formLabel].filter(Boolean).join(" "),
    schedule: row.mealRelation === "none" ? freqLabel : `${freqLabel} · ${mealLabel}${offset}`,
    duration: row.durationAmount.trim() ? `${row.durationAmount.trim()} ${unitLabel}` : "",
    doseAmount: row.doseAmount.trim(),
    doseForm: row.doseForm,
    frequency: row.frequency,
    durationAmount: row.durationAmount.trim(),
    durationUnit: row.durationUnit,
    mealRelation: row.mealRelation,
    mealOffsetMinutes: needsMealOffset(row.mealRelation) ? row.mealOffsetMinutes.trim() : "",
  };
}

// ─── Medicine picker (searchable, accepts free text) ──────────────────────────

/**
 * Medicine name field: a plain, always-editable text input for typing any
 * name by hand, plus a separate compact picker select for filling a row from
 * the catalog in one click. Two independent affordances — typing never
 * requires going through the picker, and the picker never requires typing.
 * The picker resets to its placeholder after each pick (it doesn't hold a
 * persistent value of its own; the input is the single source of truth).
 */
function MedicineNameField({
  value, onChange, onPickCatalog, autoFocus,
}: {
  value: string;
  onChange: (name: string) => void;
  onPickCatalog: (med: CatalogMedicine) => void;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  // Bumped after every pick to remount the Select, snapping its trigger back
  // to the placeholder instead of showing the just-picked name.
  const [pickerKey, setPickerKey] = useState(0);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <div className="flex items-center gap-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("prescriptions.medicineNamePlaceholder")}
        className="h-9 min-w-0 flex-1 rounded-md border-input bg-background px-2.5 text-xs font-normal"
      />
      <Select
        key={pickerKey}
        onValueChange={(name) => {
          const med = MEDICATION_CATALOG.find((m) => m.name === name);
          if (med) onPickCatalog(med);
          setPickerKey((k) => k + 1);
        }}
      >
        <SelectTrigger
          aria-label={t("prescriptions.pickFromList")}
          className="h-9 w-[92px] shrink-0 rounded-md px-2 text-xs [&>span]:truncate"
        >
          <SelectValue placeholder={t("prescriptions.pickFromList")} />
        </SelectTrigger>
        <SelectContent>
          {MEDICATION_CATEGORIES.map((category) => {
            const items = MEDICATION_CATALOG.filter((m) => m.category === category);
            if (items.length === 0) return null;
            return (
              <SelectGroup key={category}>
                <SelectLabel>{t(`prescriptions.categories.${category}`)}</SelectLabel>
                {items.map((med) => (
                  <SelectItem key={med.name} value={med.name} className="text-xs">
                    {med.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Table primitives ─────────────────────────────────────────────────────────

// One shared column template keeps the header and every row perfectly aligned.
const GRID_COLS =
  "grid items-center gap-2 grid-cols-[24px_minmax(160px,1fr)_168px_146px_142px_150px_72px_32px]";

const CELL_INPUT = "h-9 rounded-md px-2 text-center text-xs md:text-xs " +
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

const CELL_TRIGGER = "h-9 rounded-md px-2 text-xs [&>span]:truncate";

// ─── Patient picker (dashboard / global entry points) ─────────────────────────

function PatientCombobox({
  value, onChange,
}: {
  value: Patient | null;
  onChange: (p: Patient) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { results: patients } = usePatientSearch(query);

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(""); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between gap-1 px-2.5 text-sm font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value ? value.fullName : t("appointments.searchPatient")}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[260px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t("appointments.searchPatient")}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>{t("appointments.noPatientsFound")}</CommandEmpty>
            <CommandGroup>
              {patients.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.id}
                  onSelect={() => { onChange(p); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5 shrink-0", value?.id === p.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm">{p.fullName}</span>
                    <span className="truncate text-xs text-muted-foreground">{p.phone}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

export function PrescriptionDialog({
  patientId, editing = null, open, onOpenChange, onCreated,
}: {
  /** Omitted when the dialog is opened globally — the doctor then picks the patient. */
  patientId?: string;
  editing?: Prescription | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Fired with the new record after a successful create (not on edit). */
  onCreated?: (prescription: Prescription) => void;
}) {
  const { t } = useTranslation();
  const { addPrescription, updatePrescription } = usePrescriptions();

  const [pickedPatient, setPickedPatient] = useState<Patient | null>(null);
  const [doctorId, setDoctorId] = useState("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<MedicationDraft[]>([emptyRow()]);
  const [focusRowId, setFocusRowId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDoctorId(editing?.doctorId ?? "");
      setNote(editing?.note ?? "");
      setRows(editing ? editing.medications.map(rowFromMedication) : [emptyRow()]);
      setFocusRowId(null);
      setPickedPatient(null);
    }
  }, [open, editing]);

  const patchRow = useCallback((rowId: string, patch: Partial<MedicationDraft>) => {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  }, []);

  function addRow() {
    const row = emptyRow();
    setRows((prev) => [...prev, row]);
    setFocusRowId(row.rowId);
  }

  function removeRow(rowId: string) {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  }

  const targetPatientId = editing?.patientId ?? patientId ?? pickedPatient?.id ?? "";
  const namedRows = rows.filter((r) => r.name.trim());
  const canSave = namedRows.length > 0 && Boolean(targetPatientId);

  async function handleSave() {
    if (!canSave || saving) return;
    const data = {
      patientId: targetPatientId,
      doctorId: doctorId || undefined,
      note: note.trim() || undefined,
      medications: namedRows.map((row, i) => toMedication(row, i, t)),
    };
    if (editing) {
      updatePrescription(editing.id, data);
      toast.success(t("prescriptions.prescriptionUpdated"));
      onOpenChange(false);
      return;
    }
    setSaving(true);
    const created = await addPrescription(data);
    setSaving(false);
    toast.success(t("prescriptions.prescriptionAdded"));
    // Close before handing over: onCreated may navigate away, and the dialog
    // should be gone by then (a closing overlay can swallow the print view).
    onOpenChange(false);
    onCreated?.(created);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            handleSave();
          }
        }}
      >
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Pill className="h-4 w-4 text-primary" />
            {editing ? t("prescriptions.editPrescription") : t("prescriptions.newPrescription")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* ── Header fields ── */}
          <div className={cn("grid gap-3", patientId ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
            {!patientId && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("appointments.selectPatient")}</Label>
                <PatientCombobox value={pickedPatient} onChange={setPickedPatient} />
              </div>
            )}

            <DoctorSelect
              value={doctorId}
              onChange={setDoctorId}
              label={t("reminders.doctor")}
              hideIfSingle={false}
              className="[&>label]:text-xs [&>label]:text-muted-foreground [&_button]:h-9 [&_button]:text-sm"
            />
          </div>

          {/* ── Medication table ── */}
          <div className="mt-4">
            <div className="mb-2 flex items-baseline justify-between">
              <Label className="text-xs font-medium">{t("prescriptions.medications")}</Label>
              <span className="text-xs text-muted-foreground">
                {namedRows.length} {t("prescriptions.medicationsCount")}
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <div className="min-w-[950px]">
                <div className={cn(
                  GRID_COLS,
                  "border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
                )}>
                  <span className="text-center">#</span>
                  <span>{t("prescriptions.medicine")}</span>
                  <span>{t("prescriptions.dose")}</span>
                  <span>{t("prescriptions.frequency")}</span>
                  <span>{t("prescriptions.duration")}</span>
                  <span>{t("prescriptions.meal")}</span>
                  <span className="text-center">{t("prescriptions.minutes")}</span>
                  <span className="sr-only">{t("prescriptions.removeMedication")}</span>
                </div>

                {rows.length === 0 && (
                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                    {t("prescriptions.noMedicinesYet")}
                  </p>
                )}

                {rows.map((row, index) => {
                  const showMinutes = needsMealOffset(row.mealRelation);
                  return (
                    <div
                      key={row.rowId}
                      className={cn(
                        GRID_COLS,
                        "border-b border-border/60 px-3 py-1.5 last:border-b-0 hover:bg-muted/20",
                      )}
                    >
                      <span className="text-center text-xs tabular-nums text-muted-foreground">
                        {index + 1}
                      </span>

                      <MedicineNameField
                        value={row.name}
                        autoFocus={focusRowId === row.rowId}
                        onChange={(name) => patchRow(row.rowId, { name })}
                        onPickCatalog={(med) => {
                          setRows((prev) => prev.map((r) => (
                            r.rowId === row.rowId ? rowFromCatalog(med, r.rowId) : r
                          )));
                        }}
                      />

                      <div className="flex gap-1">
                        <Input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          aria-label={t("prescriptions.dose")}
                          value={row.doseAmount}
                          onChange={(e) => patchRow(row.rowId, { doseAmount: e.target.value })}
                          className={cn(CELL_INPUT, "w-[46px] shrink-0")}
                        />
                        <Select
                          value={row.doseForm}
                          onValueChange={(v: DoseForm) => patchRow(row.rowId, { doseForm: v })}
                        >
                          <SelectTrigger className={CELL_TRIGGER}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DOSE_FORMS.map((f) => (
                              <SelectItem key={f} value={f} className="text-xs">
                                {t(`prescriptions.forms.${f}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Select
                        value={row.frequency}
                        onValueChange={(v: Frequency) => patchRow(row.rowId, { frequency: v })}
                      >
                        <SelectTrigger className={CELL_TRIGGER}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FREQUENCIES.map((f) => (
                            <SelectItem key={f} value={f} className="text-xs">
                              {t(`prescriptions.frequencies.${f}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex gap-1">
                        <Input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          aria-label={t("prescriptions.duration")}
                          value={row.durationAmount}
                          onChange={(e) => patchRow(row.rowId, { durationAmount: e.target.value })}
                          className={cn(CELL_INPUT, "w-[46px] shrink-0")}
                        />
                        <Select
                          value={row.durationUnit}
                          onValueChange={(v: DurationUnit) => patchRow(row.rowId, { durationUnit: v })}
                        >
                          <SelectTrigger className={CELL_TRIGGER}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DURATION_UNITS.map((u) => (
                              <SelectItem key={u} value={u} className="text-xs">
                                {t(`prescriptions.durationUnits.${u}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Select
                        value={row.mealRelation}
                        onValueChange={(v: MealRelation) => patchRow(row.rowId, { mealRelation: v })}
                      >
                        <SelectTrigger className={CELL_TRIGGER}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MEAL_RELATIONS.map((m) => (
                            <SelectItem key={m} value={m} className="text-xs">
                              {t(`prescriptions.mealRelations.${m}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {showMinutes ? (
                        <Input
                          type="number"
                          min={0}
                          step={5}
                          inputMode="numeric"
                          aria-label={t("prescriptions.minutes")}
                          value={row.mealOffsetMinutes}
                          onChange={(e) => patchRow(row.rowId, { mealOffsetMinutes: e.target.value })}
                          className={CELL_INPUT}
                        />
                      ) : (
                        <span className="text-center text-xs text-muted-foreground/50">—</span>
                      )}

                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={t("prescriptions.removeMedication")}
                        onClick={() => removeRow(row.rowId)}
                        className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addRow}
              className="mt-2 h-9 w-full gap-1.5 border-dashed text-xs font-normal text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("prescriptions.addMedication")}
            </Button>
          </div>

          {/* ── Notes (below the medications) ── */}
          <div className="mt-4 space-y-1">
            <Label className="text-xs text-muted-foreground">{t("prescriptions.note")}</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={t("prescriptions.notePlaceholder")}
              className="min-h-0 resize-none py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("patients.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {t("prescriptions.savePrescription")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
