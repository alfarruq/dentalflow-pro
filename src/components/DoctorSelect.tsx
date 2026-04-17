import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDoctors } from "@/contexts/DoctorsContext";
import { doctorColorMap } from "@/data/mockDoctors";

interface DoctorSelectProps {
  value: string;
  onChange: (id: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
  hideIfSingle?: boolean;
}

export function DoctorSelect({
  value,
  onChange,
  label,
  required,
  className,
  hideIfSingle = true,
}: DoctorSelectProps) {
  const { t } = useTranslation();
  const { activeDoctors, lastUsedDoctorId, isMulti } = useDoctors();

  useEffect(() => {
    if (value) return;
    if (activeDoctors.length === 0) return;
    if (lastUsedDoctorId && activeDoctors.some((d) => d.id === lastUsedDoctorId)) {
      onChange(lastUsedDoctorId);
    } else {
      onChange(activeDoctors[0].id);
    }
  }, [value, activeDoctors, lastUsedDoctorId, onChange]);

  if (!isMulti && hideIfSingle) return null;

  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={t("doctors.selectDoctor")} />
        </SelectTrigger>
        <SelectContent>
          {activeDoctors.map((doc) => {
            const palette = doctorColorMap[doc.color];
            return (
              <SelectItem key={doc.id} value={doc.id}>
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full shrink-0", palette.dot)} />
                  <span>{doc.name}</span>
                  <span className="text-xs text-muted-foreground">· {doc.specialty}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
