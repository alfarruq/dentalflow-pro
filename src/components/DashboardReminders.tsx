import { useTranslation } from "react-i18next";
import { Plus, AlertTriangle, Info, BellOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ReminderTone = "warning" | "info";

export interface Reminder {
  id: string;
  title: string;
  description: string;
  tone: ReminderTone;
}

const toneStyles: Record<ReminderTone, { wrap: string; icon: string; Icon: React.ElementType }> = {
  warning: {
    wrap: "border-amber-200/70 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10",
    icon: "text-amber-600 dark:text-amber-400",
    Icon: AlertTriangle,
  },
  info: {
    wrap: "border-primary/20 bg-primary/5",
    icon: "text-primary",
    Icon: Info,
  },
};

interface DashboardRemindersProps {
  reminders: Reminder[];
  onAdd?: () => void;
}

export function DashboardReminders({ reminders, onAdd }: DashboardRemindersProps) {
  const { t } = useTranslation();

  return (
    <Card className="shadow-md">
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold">{t("dashboard.quickReminders")}</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          aria-label={t("dashboard.addReminder")}
          onClick={onAdd}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {reminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
            <BellOff className="h-6 w-6" />
            <p className="text-sm">{t("dashboard.noReminders")}</p>
          </div>
        ) : (
          reminders.map((r) => {
            const { wrap, icon, Icon } = toneStyles[r.tone];
            return (
              <div key={r.id} className={cn("flex items-start gap-3 rounded-xl border p-3", wrap)}>
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", icon)} />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{r.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.description}</p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
