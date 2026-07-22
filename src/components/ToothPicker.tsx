import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// FDI (ISO 3950) adult dentition, ordered from each quadrant's midline outward
// so the two halves mirror around the centre line, like a real dental chart.
const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
const LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];

interface ToothPickerProps {
  value: number[];
  onChange: (teeth: number[]) => void;
  /** When provided, renders a close (X) button in the top-right corner. */
  onClose?: () => void;
}

function Tooth({ n, selected, onToggle }: { n: number; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        "flex h-8 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-semibold tabular-nums transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-accent",
      )}
    >
      {n}
    </button>
  );
}

/** Visual multi-select tooth picker (FDI numbering). */
export function ToothPicker({ value, onChange, onClose }: ToothPickerProps) {
  const { t } = useTranslation();
  const selected = new Set(value);

  const toggle = (n: number) => {
    const next = new Set(selected);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    onChange([...next].sort((a, b) => a - b));
    // Auto-close after each pick; the user reopens to add/remove another tooth.
    onClose?.();
  };

  const Row = ({ left, right }: { left: number[]; right: number[] }) => (
    <div className="flex items-center justify-center gap-1">
      <div className="flex gap-0.5">
        {left.map((n) => (
          <Tooth key={n} n={n} selected={selected.has(n)} onToggle={() => toggle(n)} />
        ))}
      </div>
      <div className="mx-0.5 h-8 w-px bg-border" aria-hidden />
      <div className="flex gap-0.5">
        {right.map((n) => (
          <Tooth key={n} n={n} selected={selected.has(n)} onToggle={() => toggle(n)} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-[calc(100vw-3rem)] space-y-3 overflow-x-auto">
      {onClose && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label={t("appointments.close")}
            className="-m-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="space-y-2">
        <p className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {t("appointments.upperJaw")}
        </p>
        <Row left={UPPER_RIGHT} right={UPPER_LEFT} />
        <div className="h-px bg-border/60" aria-hidden />
        <Row left={LOWER_RIGHT} right={LOWER_LEFT} />
        <p className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {t("appointments.lowerJaw")}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 border-t pt-2">
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {value.length > 0 ? value.join(", ") : t("appointments.noToothSelected")}
        </span>
        {value.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 text-xs"
            onClick={() => onChange([])}
          >
            {t("appointments.clear")}
          </Button>
        )}
      </div>
    </div>
  );
}
