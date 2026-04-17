import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useDoctors } from "@/contexts/DoctorsContext";
import { doctorColorMap } from "@/data/mockDoctors";

interface DoctorFilterChipsProps {
  counts?: Record<string, number>;
  totalCount?: number;
  className?: string;
}

export function DoctorFilterChips({ counts, totalCount, className }: DoctorFilterChipsProps) {
  const { t } = useTranslation();
  const { activeDoctors, filterDoctorId, setFilterDoctorId, isMulti } = useDoctors();

  if (!isMulti) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <button
        type="button"
        onClick={() => setFilterDoctorId(null)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
          filterDoctorId === null
            ? "bg-foreground text-background border-foreground shadow-sm"
            : "bg-card text-muted-foreground border-border hover:bg-accent hover:text-foreground"
        )}
      >
        {t("doctors.allDoctors")}
        {typeof totalCount === "number" && (
          <span
            className={cn(
              "rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
              filterDoctorId === null ? "bg-background/20" : "bg-muted"
            )}
          >
            {totalCount}
          </span>
        )}
      </button>
      {activeDoctors.map((doc) => {
        const palette = doctorColorMap[doc.color];
        const isActive = filterDoctorId === doc.id;
        const count = counts?.[doc.id];
        const shortName = doc.name.replace(/^Dr\.?\s*/i, "");
        return (
          <button
            key={doc.id}
            type="button"
            onClick={() => setFilterDoctorId(isActive ? null : doc.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
              isActive ? palette.chipActive + " shadow-sm" : palette.chipInactive
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isActive ? "bg-white" : palette.dot
              )}
            />
            {shortName}
            {typeof count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
                  isActive ? "bg-white/20" : "bg-white/60 dark:bg-black/20"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
