import { useTranslation } from "react-i18next";
import { Users, CalendarDays, Package, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const chartData = [
  { month: "Oct", revenue: 3200 },
  { month: "Nov", revenue: 4100 },
  { month: "Dec", revenue: 3800 },
  { month: "Jan", revenue: 5200 },
  { month: "Feb", revenue: 4700 },
  { month: "Mar", revenue: 5900 },
];

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("dashboard.title")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t("dashboard.totalPatients")} value="1,284" icon={Users} trend="+12%" />
        <StatCard title={t("dashboard.todayAppointments")} value="8" icon={CalendarDays} trend="3 remaining" />
        <StatCard title={t("dashboard.lowStock")} value="5" icon={Package} trend="Reorder needed" />
        <StatCard title={t("dashboard.monthlyRevenue")} value="$5,900" icon={DollarSign} trend="+25.5%" />
      </div>

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
