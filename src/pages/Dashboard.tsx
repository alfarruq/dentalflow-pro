import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Users, CalendarDays, TrendingUp, Plus, Clock, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getTodayAppointments } from "@/data/mockAppointments";
import { cn } from "@/lib/utils";

const chartData = [
  { month: "Okt", revenue: 32000000 },
  { month: "Noy", revenue: 41000000 },
  { month: "Dek", revenue: 38000000 },
  { month: "Yan", revenue: 52000000 },
  { month: "Fev", revenue: 47000000 },
  { month: "Mar", revenue: 59000000 },
];

const formatUZS = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(0)} mln`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)} ming`;
  return String(value);
};

const statusColors: Record<string, string> = {
  pending: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  confirmed: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  completed: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  cancelled: "bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400",
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: string;
}) => (
  <Card>
    <CardContent className="flex items-center gap-4 p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8">
        <Icon className="h-5 w-5 text-primary stroke-[1.5]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-muted-foreground">{title}</p>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-xl font-semibold tracking-tight">{value}</span>
          {trend && <span className="text-xs font-medium text-emerald-500">{trend}</span>}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const todayAppointments = getTodayAppointments();

  return (
    <div className="space-y-8 max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight">{t("dashboard.title")}</h1>

      <div className="grid gap-5 sm:grid-cols-3">
        <StatCard title={t("dashboard.totalPatients")} value="1 284" icon={Users} trend="+12%" />
        <StatCard title={t("dashboard.todayAppointments")} value={String(todayAppointments.length)} icon={CalendarDays} />
        <StatCard title={t("dashboard.monthlyRevenue")} value="59 000 000 so'm" icon={TrendingUp} trend="+25.5%" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-semibold">{t("dashboard.monthlyRevenue")}</CardTitle>
            <p className="text-[13px] text-muted-foreground">{t("dashboard.last6Months")}</p>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={formatUZS} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString()} so'm`, t("dashboard.monthlyRevenue")]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      color: "hsl(var(--foreground))",
                      boxShadow: "0 4px 14px -2px rgb(0 0 0 / 0.08)",
                      fontSize: "13px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-[15px] font-semibold">{t("dashboard.todaySchedule")}</CardTitle>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {todayAppointments.length} {t("appointments.appointments")}
              </p>
            </div>
            <Button size="sm" className="gap-1.5 rounded-xl" onClick={() => navigate("/appointments")}>
              <Plus className="h-3.5 w-3.5" />
              {t("appointments.addAppointment")}
            </Button>
          </CardHeader>
          <CardContent className="px-5">
            {todayAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">{t("appointments.noAppointments")}</p>
            ) : (
              <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
                {todayAppointments.slice(0, 10).map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors duration-200"
                  >
                    <div className="flex items-center gap-1.5 w-14 shrink-0">
                      <Clock className="h-3 w-3 text-muted-foreground stroke-[1.5]" />
                      <span className="font-mono text-xs font-medium">{apt.time}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-muted-foreground stroke-[1.5] shrink-0" />
                        <span className="text-[13px] font-medium truncate">{apt.patientName}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t(`patients.${apt.treatmentType}`)}
                        {apt.toothNumber && ` - ${t("patientProfile.tooth")} #${apt.toothNumber}`}
                      </p>
                    </div>
                    <Badge className={cn("text-[10px] border-0 shrink-0 px-2 py-0.5", statusColors[apt.status])}>
                      {t(`appointments.status_${apt.status}`)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
