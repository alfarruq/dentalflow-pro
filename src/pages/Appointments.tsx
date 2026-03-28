import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";

export default function Appointments() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-muted-foreground">
      <CalendarDays className="h-12 w-12" />
      <h1 className="text-2xl font-semibold text-foreground">{t("appointments.title")}</h1>
      <p>{t("common.comingSoon")}</p>
    </div>
  );
}
