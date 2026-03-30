import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Users, CalendarDays, Package, DollarSign, Plus, Clock, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getTodayAppointments } from "@/data/mockAppointments";
import { cn } from "@/lib/utils";

const chartData = [
  { month: "Oct", revenue: 3200 },
  { month: "Nov", revenue: 4100 },
  { month: "Dec", revenue: 3800 },
  { month: "Jan", revenue: 5200 },
  { month: "Feb", revenue: 4700 },
  { month: "Mar", revenue: 5900 },
];

const statusColors: Record<string, string> = {
  pending: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
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
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
        <Icon className="h-4 w-4 text-accent-foreground" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const todayAppointments = getTodayAppointments();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("dashboard.title")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t("dashboard.totalPatients")} value="1,284" icon={Users} trend="+12%" />
        <StatCard title={t("dashboard.todayAppointments")} value={String(todayAppointments.length)} icon={CalendarDays} />
        <StatCard title={t("dashboard.lowStock")} value="5" icon={Package} trend="Reorder needed" />
        <StatCard title={t("dashboard.monthlyRevenue")} value="$5,900" icon={DollarSign} trend="+25.5%" />
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">{t("dashboard.todaySchedule")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {todayAppointments.length} {t("appointments.appointments")}
            </p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => navigate("/appointments")}>
            <Plus className="h-3.5 w-3.5" />
            {t("appointments.addAppointment")}
          </Button>
        </CardHeader>
        <CardContent>
          {todayAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("appointments.noAppointments")}</p>
          ) : (
            <div className="space-y-2">
              {todayAppointments.slice(0, 8).map((apt) => (
                <div key={apt.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-1.5 w-16 shrink-0">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono text-sm font-medium">{apt.time}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium truncate">{apt.patientName}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{t(`patients.${apt.treatmentType}`)}</Badge>
                  <Badge className={cn("text-xs border-0 shrink-0", statusColors[apt.status])}>
                    {t(`appointments.status_${apt.status}`)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dashboard.revenueOverview")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("dashboard.last6Months")}</p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                <YAxis className="text-xs fill-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Bar dataKey="revenue" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
