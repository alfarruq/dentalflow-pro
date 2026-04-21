import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { parseISO, isToday, isPast } from "date-fns";
import {
  Users, CalendarDays, Bell, UserPlus, CalendarPlus, Banknote,
  Clock, AlertCircle, TrendingDown, Package, ChevronRight, CheckCircle2,
  Phone, Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useReminders } from "@/contexts/RemindersContext";
import { getTodayAppointments } from "@/data/mockAppointments";
import { mockPatients, getRemainingBalance } from "@/data/mockPatients";
import { mockRecurringExpenses } from "@/data/mockFinance";
import { mockInventory } from "@/data/mockInventory";
import { AddReminderDialog } from "@/components/AddReminderDialog";

const fmt = (n: number) => n.toLocaleString("uz-UZ");

const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} mln`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} ming`;
  return String(n);
};

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  confirmed: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  cancelled: "bg-destructive/8 text-destructive",
};

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

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  tone?: "neutral" | "warning" | "destructive" | "success";
}

function KpiCard({ label, value, sub, icon: Icon, tone = "neutral" }: KpiCardProps) {
  const tones = {
    neutral: "bg-primary/10 text-primary",
    warning: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    destructive: "bg-destructive/15 text-destructive",
    success: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  };
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-normal text-muted-foreground tracking-wide truncate">{label}</p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight mt-1 tabular-nums">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
          </div>
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
            <Icon className="h-5 w-5 stroke-[1.6]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { reminders } = useReminders();
  const [reminderOpen, setReminderOpen] = useState(false);

  const today = new Date();
  const todayAppointments = getTodayAppointments();

  const completedCount = todayAppointments.filter((a) => a.status === "completed").length;
  const totalToday = todayAppointments.length;
  const progressPercent = totalToday > 0 ? Math.round((completedCount / totalToday) * 100) : 0;

  // Reminders data
  const todayReminders = useMemo(
    () =>
      reminders
        .filter((r) => !r.completed && isToday(parseISO(r.dueDate)))
        .sort((a, b) => a.dueTime.localeCompare(b.dueTime)),
    [reminders]
  );
  const overdueCount = useMemo(
    () => reminders.filter((r) => !r.completed && isPast(parseISO(r.dueDate)) && !isToday(parseISO(r.dueDate))).length,
    [reminders]
  );

  // Debtors
  const debtors = useMemo(() => {
    return mockPatients
      .map((p) => ({ ...p, remaining: getRemainingBalance(p) }))
      .filter((p) => p.remaining > 0)
      .sort((a, b) => b.remaining - a.remaining);
  }, []);

  const totalDebt = debtors.reduce((s, p) => s + p.remaining, 0);
  const topDebtors = debtors.slice(0, 5);

  // Low stock
  const lowStock = useMemo(
    () => mockInventory.filter((i) => i.quantity <= 5).sort((a, b) => a.quantity - b.quantity).slice(0, 6),
    []
  );

  // Upcoming recurring payments
  const upcomingPayments = useMemo(() => {
    const todayDay = today.getDate();
    return mockRecurringExpenses.filter((r) => {
      if (!r.isActive) return false;
      let diff = r.dayOfMonth - todayDay;
      if (diff < 0) diff += 30;
      return diff >= 0 && diff <= 3;
    });
  }, [today]);



  return (
    <div className="space-y-5 sm:space-y-6 max-w-6xl">
      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickAction
          icon={UserPlus}
          label={t("dashboard.qa_newPatient")}
          onClick={() => navigate("/patients")}
        />
        <QuickAction
          icon={CalendarPlus}
          label={t("dashboard.qa_newAppointment")}
          onClick={() => navigate("/appointments")}
        />
        <QuickAction
          icon={Bell}
          label={t("dashboard.qa_newReminder")}
          onClick={() => setReminderOpen(true)}
          variant="primary"
        />
        <QuickAction
          icon={Banknote}
          label={t("dashboard.qa_acceptPayment")}
          onClick={() => navigate("/patients")}
        />
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label={t("dashboard.todayAppointments")}
          value={`${completedCount}/${totalToday}`}
          sub={t("dashboard.completedSub")}
          icon={CalendarDays}
        />
        <KpiCard
          label={t("dashboard.todayReminders")}
          value={String(todayReminders.length)}
          sub={t("dashboard.active")}
          icon={Bell}
          tone="success"
        />
        <KpiCard
          label={t("dashboard.overdueReminders")}
          value={String(overdueCount)}
          sub={overdueCount > 0 ? t("dashboard.needsAttention") : t("dashboard.allGood")}
          icon={AlertCircle}
          tone={overdueCount > 0 ? "destructive" : "success"}
        />
        <KpiCard
          label={t("dashboard.totalDebt")}
          value={`${fmtShort(totalDebt)} ${t("common.currency")}`}
          sub={t("dashboard.debtorsCount", { count: debtors.length })}
          icon={Wallet}
          tone={totalDebt > 0 ? "warning" : "success"}
        />
      </div>

      {/* Main grid: Schedule + Reminders */}
      <div className="grid gap-4 sm:gap-5 grid-cols-1 lg:grid-cols-5">
        {/* Today's Schedule */}
        <Card className="lg:col-span-3 flex flex-col shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-[15px] font-semibold">{t("dashboard.todaySchedule")}</CardTitle>
                {totalToday > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("dashboard.progressLabel", { done: completedCount, total: totalToday })}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => navigate("/appointments")}
              >
                {t("dashboard.viewAll")}
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            {totalToday > 0 && <Progress value={progressPercent} className="h-1.5 mt-3" />}
          </CardHeader>
          <CardContent className="flex-1 px-4 sm:px-5 pb-4">
            {totalToday === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <CalendarDays className="h-8 w-8" />
                <p className="text-sm">{t("appointments.noAppointments")}</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-[340px] overflow-y-auto pr-1">
                {todayAppointments.slice(0, 10).map((apt) => (
                  <button
                    key={apt.id}
                    onClick={() => navigate(`/patients/${apt.patientId}`)}
                    className="w-full flex items-center gap-3 p-2.5 sm:p-3 rounded-xl hover:bg-accent/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-1.5 w-14 shrink-0">
                      <Clock className="h-3 w-3 text-muted-foreground stroke-[1.4] hidden sm:block" />
                      <span className="font-mono text-xs font-medium">{apt.time}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-medium truncate block">{apt.patientName}</span>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {t(`patients.${apt.treatmentType}`)}
                        {apt.toothNumber && <span> · #{apt.toothNumber}</span>}
                      </p>
                    </div>
                    <Badge className={cn("text-[10px] border-0 shrink-0 px-2 py-0.5 hidden sm:inline-flex", statusColors[apt.status])}>
                      {t(`appointments.status_${apt.status}`)}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Reminders */}
        <Card className="lg:col-span-2 flex flex-col shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                  {t("dashboard.todayReminders")}
                  {todayReminders.length > 0 && (
                    <Badge variant="secondary" className="h-5 text-[10px]">{todayReminders.length}</Badge>
                  )}
                </CardTitle>
                {overdueCount > 0 && (
                  <p className="text-xs text-destructive mt-0.5 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {t("dashboard.overdueBadge", { count: overdueCount })}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => navigate("/reminders")}
              >
                {t("dashboard.viewAll")}
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 px-4 sm:px-5 pb-4">
            {todayReminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p className="text-sm">{t("dashboard.noRemindersToday")}</p>
                <Button size="sm" variant="outline" className="mt-2 gap-1.5" onClick={() => setReminderOpen(true)}>
                  <Bell className="h-3.5 w-3.5" />
                  {t("reminders.addReminder")}
                </Button>
              </div>
            ) : (
              <div className="space-y-1 max-h-[340px] overflow-y-auto pr-1">
                {todayReminders.slice(0, 6).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => navigate(`/patients/${r.patientId}`)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent/50 transition-colors text-left"
                  >
                    <div className="w-12 shrink-0 font-mono text-xs font-medium">{r.dueTime}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">{r.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{r.patientName}</p>
                    </div>
                    {r.priority === "high" && (
                      <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary grid: Debtors + Low stock */}
      <div className="grid gap-4 sm:gap-5 grid-cols-1 lg:grid-cols-2">
        {/* Top Debtors */}
        {topDebtors.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-destructive" />
                    {t("dashboard.topDebtors")}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("dashboard.topDebtorsSub", { total: fmtShort(totalDebt) })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => navigate("/patients")}
                >
                  {t("dashboard.viewAll")}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-5 pb-4">
              <div className="space-y-1">
                {topDebtors.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive text-sm font-semibold">
                      {p.fullName.charAt(0)}
                    </div>
                    <button
                      onClick={() => navigate(`/patients/${p.id}`)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-[13px] font-medium truncate">{p.fullName}</p>
                      <p className="text-[11px] text-muted-foreground">{p.phone}</p>
                    </button>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-semibold text-destructive tabular-nums">
                        {fmt(p.remaining)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{t("common.currency")}</p>
                    </div>
                    <a
                      href={`tel:${p.phone}`}
                      className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-accent transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100"
                      aria-label={t("reminders.call")}
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Low Stock */}
        {lowStock.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4 text-amber-500" />
                    {t("dashboard.lowStock")}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("dashboard.reorderNeeded")}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => navigate("/inventory")}
                >
                  {t("dashboard.viewAll")}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-5 pb-4">
              <div className="space-y-1">
                {lowStock.map((item) => {
                  const depleted = item.quantity === 0;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent/50 transition-colors"
                    >
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full shrink-0",
                          depleted ? "bg-destructive" : "bg-amber-500"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {t(`inventory.cat_${item.category}`)}
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          "text-[10px] border-0 shrink-0 tabular-nums",
                          depleted
                            ? "bg-destructive/15 text-destructive"
                            : "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
                        )}
                      >
                        {item.quantity} {t(`inventory.unit_${item.unit}`)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upcoming recurring payments */}
      {upcomingPayments.length > 0 && (
        <Card className="border-amber-200/60 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/5 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-500 stroke-[1.6]" />
                <span className="text-[13px] font-semibold text-amber-600 dark:text-amber-400">
                  {t("finance.dashboardUpcoming")}
                </span>
                <Badge className="bg-amber-100 text-amber-600 border-0 text-[10px] dark:bg-amber-500/20 dark:text-amber-400">
                  {upcomingPayments.length}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-[12px] text-amber-600 dark:text-amber-400"
                onClick={() => navigate("/finance")}
              >
                {t("finance.title")} →
              </Button>
            </div>
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
              {upcomingPayments.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between bg-card/80 rounded-xl px-3 sm:px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate">{r.description}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t("finance.dueDay", { day: r.dayOfMonth })}
                    </p>
                  </div>
                  <span className="text-[13px] font-semibold tabular-nums shrink-0 ml-2">
                    {fmtShort(r.amount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <AddReminderDialog open={reminderOpen} onOpenChange={setReminderOpen} />
    </div>
  );
}
