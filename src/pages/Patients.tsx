import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";

export default function Patients() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-muted-foreground">
      <Users className="h-12 w-12" />
      <h1 className="text-2xl font-semibold text-foreground">{t("patients.title")}</h1>
      <p>{t("common.comingSoon")}</p>
    </div>
  );
}
