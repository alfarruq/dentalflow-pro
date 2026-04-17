import { cn } from "@/lib/utils";
import { useDoctors } from "@/contexts/DoctorsContext";
import { doctorColorMap } from "@/data/mockDoctors";

interface DoctorBadgeProps {
  doctorId: string | null | undefined;
  variant?: "full" | "compact" | "dot";
  className?: string;
}

export function DoctorBadge({ doctorId, variant = "full", className }: DoctorBadgeProps) {
  const { getDoctor, isMulti } = useDoctors();
  if (!isMulti) return null;
  const doctor = getDoctor(doctorId);
  if (!doctor) return null;

  const palette = doctorColorMap[doctor.color];
  const shortName = doctor.name.replace(/^Dr\.?\s*/i, "");

  if (variant === "dot") {
    return (
      <span
        className={cn("inline-block h-2 w-2 rounded-full shrink-0", palette.dot, className)}
        title={doctor.name}
        aria-label={doctor.name}
      />
    );
  }

  if (variant === "compact") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
          palette.bgSoft,
          palette.text,
          className
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", palette.dot)} />
        {shortName}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        palette.bgSoft,
        palette.text,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", palette.dot)} />
      {shortName}
    </span>
  );
}
