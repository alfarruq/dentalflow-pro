import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ResponsiveContainer,
} from "recharts";
import { Users, Stethoscope, Package, BadgeDollarSign, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type Period = "weekly" | "monthly" | "yearly";

const mockData: Record<
  Period,
  {
    patients: number;
    treatments: number;
    topMaterial: string;
    revenue: number;
    motivationPatients: number;
    motivationTreatments: number;
    revenueChart: { name: string; value: number }[];
    services: { name: string; count: number; key: string }[];
    pieData: { name: string; value: number; key: string }[];
    materials: { name: string; used: number }[];
  }
> = {
  weekly: {
    patients: 12,
    treatments: 38,
    topMaterial: "Lidokain 2%",
    revenue: 18_500_000,
    motivationPatients: 12,
    motivationTreatments: 38,
    revenueChart: [
      { name: "Dush", value: 2_100_000 },
      { name: "Sesh", value: 3_400_000 },
      { name: "Chor", value: 2_800_000 },
      { name: "Pay", value: 3_900_000 },
      { name: "Jum", value: 4_200_000 },
      { name: "Shan", value: 1_500_000 },
      { name: "Yak", value: 600_000 },
    ],
    services: [
      { name: "Plomba", count: 14, key: "filling" },
      { name: "Tozalash", count: 10, key: "cleaning" },
      { name: "Implant", count: 6, key: "implant" },
      { name: "Oqartirish", count: 5, key: "whitening" },
      { name: "Toj o'rnatish", count: 3, key: "crown" },
    ],
    pieData: [
      { name: "Plomba", value: 37, key: "filling" },
      { name: "Tozalash", value: 26, key: "cleaning" },
      { name: "Implant", value: 16, key: "implant" },
      { name: "Oqartirish", value: 13, key: "whitening" },
      { name: "Toj", value: 8, key: "crown" },
    ],
    materials: [
      { name: "Lidokain 2%", used: 24 },
      { name: "Composite A2", used: 18 },
      { name: "Latex qo'lqop", used: 36 },
      { name: "Niqob (maska)", used: 30 },
      { name: "Bondaj", used: 12 },
    ],
  },
  monthly: {
    patients: 30,
    treatments: 140,
    topMaterial: "Lidokain 2%",
    revenue: 176_675_204,
    motivationPatients: 30,
    motivationTreatments: 140,
    revenueChart: [
      { name: "1-haft", value: 38_000_000 },
      { name: "2-haft", value: 45_200_000 },
      { name: "3-haft", value: 52_475_204 },
      { name: "4-haft", value: 41_000_000 },
    ],
    services: [
      { name: "Plomba", count: 52, key: "filling" },
      { name: "Tozalash", count: 35, key: "cleaning" },
      { name: "Implant", count: 24, key: "implant" },
      { name: "Oqartirish", count: 18, key: "whitening" },
      { name: "Toj o'rnatish", count: 11, key: "crown" },
    ],
    pieData: [
      { name: "Plomba", value: 37, key: "filling" },
      { name: "Tozalash", value: 25, key: "cleaning" },
      { name: "Implant", value: 17, key: "implant" },
      { name: "Oqartirish", value: 13, key: "whitening" },
      { name: "Toj", value: 8, key: "crown" },
    ],
    materials: [
      { name: "Lidokain 2%", used: 96 },
      { name: "Composite A2", used: 72 },
      { name: "Latex qo'lqop", used: 140 },
      { name: "Niqob (maska)", used: 120 },
      { name: "Bondaj", used: 48 },
    ],
  },
  yearly: {
    patients: 342,
    treatments: 1580,
    topMaterial: "Composite A2",
    revenue: 2_145_000_000,
    motivationPatients: 342,
    motivationTreatments: 1580,
    revenueChart: [
      { name: "Yan", value: 145_000_000 },
      { name: "Fev", value: 162_000_000 },
      { name: "Mar", value: 188_000_000 },
      { name: "Apr", value: 195_000_000 },
      { name: "May", value: 178_000_000 },
      { name: "Iyn", value: 165_000_000 },
      { name: "Iyl", value: 142_000_000 },
      { name: "Avg", value: 158_000_000 },
      { name: "Sen", value: 198_000_000 },
      { name: "Okt", value: 210_000_000 },
      { name: "Noy", value: 205_000_000 },
      { name: "Dek", value: 199_000_000 },
    ],
    services: [
      { name: "Plomba", count: 580, key: "filling" },
      { name: "Tozalash", count: 420, key: "cleaning" },
      { name: "Implant", count: 260, key: "implant" },
      { name: "Oqartirish", count: 190, key: "whitening" },
      { name: "Toj o'rnatish", count: 130, key: "crown" },
    ],
    pieData: [
      { name: "Plomba", value: 37, key: "filling" },
      { name: "Tozalash", value: 27, key: "cleaning" },
      { name: "Implant", value: 16, key: "implant" },
      { name: "Oqartirish", value: 12, key: "whitening" },
      { name: "Toj", value: 8, key: "crown" },
    ],
    materials: [
      { name: "Composite A2", used: 820 },
      { name: "Lidokain 2%", used: 780 },
      { name: "Latex qo'lqop", used: 1560 },
      { name: "Niqob (maska)", used: 1400 },
      { name: "Bondaj", used: 520 },
    ],
  },
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const fmt = (n: number) =>
  new Intl.NumberFormat("uz-UZ").format(n);

export default function Analytics() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>("monthly");
  const d = mockData[period];

  const periodLabel =
    period === "weekly"
      ? t("analytics.weekly")
      : period === "monthly"
        ? t("analytics.monthly")
        : t("analytics.yearly");

  const maxService = Math.max(...d.services.map((s) => s.count));

  return (
    <div className="space-y-6">
      {/* Header + time filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">
          {t("analytics.title")}
        </h1>
        <Tabs
          value={period}
          onValueChange={(v) => setPeriod(v as Period)}
        >
          <TabsList>
            <TabsTrigger value="weekly">{t("analytics.weekly")}</TabsTrigger>
            <TabsTrigger value="monthly">{t("analytics.monthly")}</TabsTrigger>
            <TabsTrigger value="yearly">{t("analytics.yearly")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Motivation Card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-center gap-4 py-5">
          <span className="text-4xl">🏆</span>
          <div>
            <p className="font-semibold text-foreground text-lg">
              {t("analytics.motivationTitle")}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("analytics.motivationDesc", {
                period: periodLabel,
                patients: d.motivationPatients,
                treatments: d.motivationTreatments,
                revenue: fmt(d.revenue),
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Users,
            label: t("analytics.totalPatients"),
            value: d.patients,
          },
          {
            icon: Stethoscope,
            label: t("analytics.totalTreatments"),
            value: d.treatments,
          },
          {
            icon: Package,
            label: t("analytics.topMaterial"),
            value: d.topMaterial,
          },
          {
            icon: BadgeDollarSign,
            label: t("analytics.totalRevenue"),
            value: `${fmt(d.revenue)} ${t("common.currency")}`,
          },
        ].map((c, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="flex items-center gap-3 py-4">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <c.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">
                  {c.label}
                </p>
                <p className="text-lg font-bold text-foreground truncate">
                  {c.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row: Service Ranking + Pie */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Service ranking */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {t("analytics.serviceRanking")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {d.services.map((s, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground font-medium">
                    {t(`analytics.svc_${s.key}`)}
                  </span>
                  <span className="text-muted-foreground">
                    {s.count} {t("analytics.timesUnit")}
                  </span>
                </div>
                <Progress
                  value={(s.count / maxService) * 100}
                  className="h-2.5"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {t("analytics.serviceDistribution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                filling: { label: t("analytics.svc_filling"), color: PIE_COLORS[0] },
                cleaning: { label: t("analytics.svc_cleaning"), color: PIE_COLORS[1] },
                implant: { label: t("analytics.svc_implant"), color: PIE_COLORS[2] },
                whitening: { label: t("analytics.svc_whitening"), color: PIE_COLORS[3] },
                crown: { label: t("analytics.svc_crown"), color: PIE_COLORS[4] },
              }}
              className="mx-auto aspect-square max-h-[280px]"
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={d.pieData.map((p) => ({
                    ...p,
                    name: t(`analytics.svc_${p.key}`),
                  }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={100}
                  paddingAngle={3}
                  label={({ name, value }) => `${name} ${value}%`}
                  labelLine={false}
                >
                  {d.pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row: Revenue area + Materials bar */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue area chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {t("analytics.revenueTrend")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: { label: t("analytics.totalRevenue"), color: "hsl(var(--primary))" },
              }}
              className="h-[260px] w-full"
            >
              <AreaChart data={d.revenueChart}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis
                  tickFormatter={(v: number) =>
                    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : `${(v / 1_000).toFixed(0)}K`
                  }
                  className="text-xs"
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => [`${fmt(value)} ${t("common.currency")}`, t("analytics.totalRevenue")]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#revGrad)"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Materials bar chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {t("analytics.topMaterials")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                used: { label: t("analytics.usedCount"), color: "hsl(var(--primary))" },
              }}
              className="h-[260px] w-full"
            >
              <BarChart data={d.materials} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" width={110} className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="used"
                  fill="hsl(var(--primary))"
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
