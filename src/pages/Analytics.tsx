import { useTranslation } from "react-i18next";
import { BarChart3 } from "lucide-react";

export default function Analytics() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-muted-foreground">
      <BarChart3 className="h-12 w-12" />
      <h1 className="text-2xl font-semibold text-foreground">{t("analytics.title")}</h1>
      <p>{t("common.comingSoon")}</p>
    </div>
  );
}
