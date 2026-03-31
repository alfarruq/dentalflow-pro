import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity } from "lucide-react";

export type ToothStatus = "healthy" | "treated" | "decayed" | "missing" | "implant";

export interface ToothData {
  number: number;
  status: ToothStatus;
  note: string;
}

interface DentalChartProps {
  teeth: ToothData[];
  onUpdate: (teeth: ToothData[]) => void;
  readOnly?: boolean;
}

const statusColors: Record<ToothStatus, string> = {
  healthy: "bg-emerald-500",
  treated: "bg-blue-500",
  decayed: "bg-amber-500",
  missing: "bg-muted-foreground/30",
  implant: "bg-violet-500",
};

const statusBorder: Record<ToothStatus, string> = {
  healthy: "border-emerald-500/50 hover:border-emerald-500",
  treated: "border-blue-500/50 hover:border-blue-500",
  decayed: "border-amber-500/50 hover:border-amber-500",
  missing: "border-muted-foreground/20 hover:border-muted-foreground/40",
  implant: "border-violet-500/50 hover:border-violet-500",
};

// Adult dentition: upper right (18-11), upper left (21-28), lower left (38-31), lower right (41-48)
const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

function ToothIcon({ tooth, onClick, readOnly }: { tooth: ToothData; onClick: () => void; readOnly?: boolean }) {
  const isMissing = tooth.status === "missing";
  return (
    <button
      onClick={onClick}
      disabled={readOnly}
      className={cn(
        "relative flex flex-col items-center gap-0.5 group transition-all",
        !readOnly && "cursor-pointer"
      )}
      title={`#${tooth.number}`}
    >
      <div
        className={cn(
          "w-7 h-8 rounded-sm border-2 flex items-center justify-center text-[10px] font-bold transition-all",
          statusBorder[tooth.status],
          isMissing && "opacity-40",
          !readOnly && "group-hover:scale-110",
          tooth.note && "ring-1 ring-primary/40"
        )}
      >
        <div className={cn("w-3 h-3 rounded-full", statusColors[tooth.status])} />
      </div>
      <span className="text-[9px] text-muted-foreground font-mono">{tooth.number}</span>
    </button>
  );
}

export function DentalChart({ teeth, onUpdate, readOnly = false }: DentalChartProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<ToothData | null>(null);
  const [editStatus, setEditStatus] = useState<ToothStatus>("healthy");
  const [editNote, setEditNote] = useState("");

  const getTooth = (num: number) => teeth.find((t) => t.number === num) || { number: num, status: "healthy" as ToothStatus, note: "" };

  const handleClick = (num: number) => {
    if (readOnly) return;
    const tooth = getTooth(num);
    setSelected(tooth);
    setEditStatus(tooth.status);
    setEditNote(tooth.note);
  };

  const handleSave = () => {
    if (!selected) return;
    const updated = teeth.map((t) =>
      t.number === selected.number ? { ...t, status: editStatus, note: editNote } : t
    );
    // If tooth didn't exist yet, add it
    if (!teeth.find((t) => t.number === selected.number)) {
      updated.push({ number: selected.number, status: editStatus, note: editNote });
    }
    onUpdate(updated);
    setSelected(null);
  };

  const statuses: ToothStatus[] = ["healthy", "treated", "decayed", "missing", "implant"];

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            {t("dentalChart.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Legend */}
          <div className="flex flex-wrap gap-3">
            {statuses.map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={cn("w-2.5 h-2.5 rounded-full", statusColors[s])} />
                <span className="text-xs text-muted-foreground">{t(`dentalChart.status_${s}`)}</span>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="space-y-2">
            {/* Upper jaw label */}
            <p className="text-xs text-muted-foreground text-center font-medium">{t("dentalChart.upperJaw")}</p>
            <div className="flex justify-center gap-0.5 sm:gap-1">
              {upperTeeth.map((num) => (
                <ToothIcon key={num} tooth={getTooth(num)} onClick={() => handleClick(num)} readOnly={readOnly} />
              ))}
            </div>
            {/* Midline */}
            <div className="border-t border-dashed border-muted-foreground/25 mx-4" />
            <div className="flex justify-center gap-0.5 sm:gap-1">
              {lowerTeeth.map((num) => (
                <ToothIcon key={num} tooth={getTooth(num)} onClick={() => handleClick(num)} readOnly={readOnly} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center font-medium">{t("dentalChart.lowerJaw")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("dentalChart.tooth")} #{selected?.number}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>{t("dentalChart.statusLabel")}</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as ToothStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2.5 h-2.5 rounded-full", statusColors[s])} />
                        {t(`dentalChart.status_${s}`)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("dentalChart.note")}</Label>
              <Textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder={t("dentalChart.notePlaceholder")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>{t("patients.cancel")}</Button>
            <Button onClick={handleSave}>{t("patients.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function createDefaultTeeth(): ToothData[] {
  const allNums = [...upperTeeth, ...lowerTeeth];
  return allNums.map((num) => ({ number: num, status: "healthy" as ToothStatus, note: "" }));
}
