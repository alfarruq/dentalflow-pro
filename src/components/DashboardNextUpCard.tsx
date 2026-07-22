import { useTranslation } from "react-i18next";
import { Clock, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Appointment } from "@/data/mockAppointments";

interface DashboardNextUpCardProps {
  appointment: Appointment | null;
  onViewPatient: (patientId: string) => void;
}

/**
 * Desktop-only elaboration of the same "next appointment" KPI shown in
 * DashboardKpiGrid — richer detail (full name, treatment, tooth, a direct
 * link) justified by the extra width a wide screen has to spare.
 */
export function DashboardNextUpCard({ appointment, onViewPatient }: DashboardNextUpCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-[15px] font-semibold">{t("dashboard.nextAppointment")}</CardTitle>
      </CardHeader>
      <CardContent>
        {appointment ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-2xl font-bold tracking-tight tabular-nums">
              <Clock className="h-5 w-5 text-primary stroke-[1.6]" />
              {appointment.time}
            </div>
            <div>
              <p className="text-sm font-medium">{appointment.patientName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t(`patients.${appointment.treatmentType}`)}
                {appointment.toothNumber && <span> · #{appointment.toothNumber}</span>}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1"
              onClick={() => onViewPatient(appointment.patientId)}
            >
              {t("dashboard.viewPatient")}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-6 text-center">{t("dashboard.noUpcoming")}</p>
        )}
      </CardContent>
    </Card>
  );
}
