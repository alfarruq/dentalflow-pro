import { useTranslation, Trans } from "react-i18next";
import { UserPlus, CalendarPlus, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  appointmentsToday: number;
  onNewPatient: () => void;
  onNewAppointment: () => void;
  onWritePrescription: () => void;
}

/**
 * Page greeting + primary actions. Actions collapse to full-width, stacked
 * buttons on phones and sit inline to the right of the greeting on ≥sm.
 */
export function DashboardHeader({
  appointmentsToday, onNewPatient, onNewAppointment, onWritePrescription,
}: DashboardHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("dashboard.goodDay")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <Trans
            i18nKey="dashboard.appointmentsWaiting"
            values={{ num: appointmentsToday }}
            components={{ 1: <span className="font-semibold text-primary" /> }}
          />
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
        <Button variant="outline" className="gap-2" onClick={onNewPatient}>
          <UserPlus className="h-4 w-4" />
          {t("dashboard.qa_newPatient")}
        </Button>
        <Button variant="outline" className="gap-2" onClick={onWritePrescription}>
          <Pill className="h-4 w-4" />
          {t("prescriptions.newPrescription")}
        </Button>
        <Button className="col-span-2 gap-2 sm:col-span-1" onClick={onNewAppointment}>
          <CalendarPlus className="h-4 w-4" />
          {t("dashboard.qa_newAppointment")}
        </Button>
      </div>
    </div>
  );
}
