import { useTranslation } from "react-i18next";
import { UserPlus, CalendarPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  variant?: "primary" | "default";
}

function QuickAction({ icon: Icon, label, onClick, variant = "default" }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-3 sm:p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0",
        variant === "primary"
          ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
          : "border-border bg-card hover:bg-accent/40"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl",
          variant === "primary"
            ? "bg-primary text-primary-foreground"
            : "bg-primary/10 text-primary"
        )}
      >
        <Icon className="h-5 w-5 stroke-[1.6]" />
      </div>
      <span className="text-[13px] sm:text-sm font-medium leading-tight">{label}</span>
    </button>
  );
}

interface DashboardQuickActionsProps {
  onNewPatient: () => void;
  onNewAppointment: () => void;
}

export function DashboardQuickActions({ onNewPatient, onNewAppointment }: DashboardQuickActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-3 lg:h-full">
      <QuickAction icon={UserPlus} label={t("dashboard.qa_newPatient")} onClick={onNewPatient} />
      <QuickAction
        icon={CalendarPlus}
        label={t("dashboard.qa_newAppointment")}
        onClick={onNewAppointment}
        variant="primary"
      />
    </div>
  );
}
