import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { DentalChartV2, type ToothStatusDef } from "@/components/DentalChartV2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TreatmentTypeDto } from "@/lib/api/dto";
import type { NewTreatmentRow } from "@/contexts/TreatmentContext";
import { formatThousands, parseThousands } from "@/lib/number";
import { cn } from "@/lib/utils";

/**
 * Shared "pick teeth on a chart, then price each one" composer, used by both
 * the patient profile's treatment dialog and the new-patient dialog. It is
 * deliberately uncontrolled about *what* the rows mean — the caller owns the
 * `rows` state and decides whether they become a create or an edit.
 */

/** A tooth with any treatment on file — one colour, no per-status split. */
export const CHART_STATUSES: ToothStatusDef[] = [
  { id: "treated", color: "#22C55E", strokeColor: "#15803D", label: "Muolaja qilingan" },
];

/**
 * One tooth's draft treatment line: a distinct tooth × treatment type ×
 * cost/paid. The backend stores one tooth per treatment record, so each row
 * becomes its own record in the bulk-create array.
 */
export interface TreatmentRowDraft {
  fdi: string;
  treatmentTypeId: string;
  totalCost: string;
  amountPaid: string;
}

/** Numeric formatting shared with the treatments table. */
function fmt(n: number) {
  return n.toLocaleString("uz-UZ");
}

/** Square badge holding a tooth number — used in tables and row lists. */
export function ToothIcon({ number }: { number: string }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-[11px] font-bold text-blue-700">
      {number}
    </div>
  );
}

/** Draft rows → the per-row payload `addTreatments` expects. */
export function treatmentRowsToBatchRows(rows: TreatmentRowDraft[]): NewTreatmentRow[] {
  return rows.map((r) => ({
    teeth: [r.fdi],
    treatmentTypeId: Number(r.treatmentTypeId) || undefined,
    totalCost: Number(parseThousands(r.totalCost)) || 0,
    amountPaid: Number(parseThousands(r.amountPaid)) || 0,
  }));
}

/** The chart itself plus the click-to-pick-a-type popover. */
export function ToothChartPicker({
  rows, onRowsChange, treatmentTypes, maxWidth = 380,
}: {
  rows: TreatmentRowDraft[];
  onRowsChange: (rows: TreatmentRowDraft[]) => void;
  treatmentTypes: TreatmentTypeDto[];
  maxWidth?: number;
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
        <DentalChartV2 values={chartValues} statuses={CHART_STATUSES} onToothClick={handleToothClick} maxWidth={maxWidth} />

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

/** One editable row per picked tooth. Renders nothing while no tooth is picked. */
export function TreatmentRowsTable({
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
    <div className="overflow-x-auto rounded-xl border">
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

/** Totals strip — what the visit as a whole costs, was paid, and still owes. */
export function TreatmentRowsSummary({ rows }: { rows: TreatmentRowDraft[] }) {
  const { t } = useTranslation();
  if (rows.length === 0) return null;

  const cost = rows.reduce((sum, r) => sum + (Number(parseThousands(r.totalCost)) || 0), 0);
  const paid = rows.reduce((sum, r) => sum + (Number(parseThousands(r.amountPaid)) || 0), 0);
  const debt = Math.max(cost - paid, 0);

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 rounded-xl bg-muted/50 px-3 py-2 text-[13px]">
      <span className="text-muted-foreground">
        {t("patients.totalCost")}: <span className="font-semibold text-foreground">{fmt(cost)}</span>
      </span>
      <span className="text-muted-foreground">
        {t("patients.paid")}: <span className="font-semibold text-foreground">{fmt(paid)}</span>
      </span>
      <span className="text-muted-foreground">
        {t("patients.debt")}: <span className={cn("font-semibold", debt > 0 ? "text-red-600" : "text-green-600")}>{fmt(debt)}</span>
      </span>
    </div>
  );
}
