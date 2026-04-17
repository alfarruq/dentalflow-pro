import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, subDays, subMonths, subYears, parseISO, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Users, Stethoscope, Package, BadgeDollarSign, Trophy, CalendarIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useDoctors } from "@/contexts/DoctorsContext";
import { useInventory } from "@/contexts/InventoryContext";
import { doctorColorMap } from "@/data/mockDoctors";
import { mockAppointments } from "@/data/mockAppointments";
import { mockIncomes } from "@/data/mockFinance";
import { DoctorFilterChips } from "@/components/DoctorFilterChips";

type Period = "weekly" | "monthly" | "yearly" | "custom";

const mockData: Record<
  Exclude<Period, "custom">,
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
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const DOCTOR_HEX: Record<string, string> = {
  blue: "#3b82f6",
  emerald: "#10b981",
  amber: "#f59e0b",
  purple: "#8b5cf6",
  rose: "#f43f5e",
  cyan: "#06b6d4",
  orange: "#f97316",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("uz-UZ").format(n);

export default function Analytics() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>("monthly");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const { activeDoctors, isMulti } = useDoctors();
  const { usages } = useInventory();

  const effectivePeriod = period === "custom" ? "monthly" : period;
  const d = mockData[effectivePeriod];

  const periodLabel =
    period === "custom" && dateRange.from && dateRange.to
      ? `${format(dateRange.from, "dd.MM.yyyy")} — ${format(dateRange.to, "dd.MM.yyyy")}`
      : period === "weekly"
        ? t("analytics.weekly")
        : period === "monthly"
          ? t("analytics.monthly")
          : t("analytics.yearly");

  const maxService = Math.max(...d.services.map((s) => s.count));

  // Effective date range for doctor stats filtering
  const effectiveRange = useMemo(() => {
    const now = new Date();
    if (period === "custom" && dateRange.from && dateRange.to) {
      return { from: startOfDay(dateRange.from), to: endOfDay(dateRange.to) };
    }
    if (period === "weekly") return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) };
    if (period === "yearly") return { from: startOfDay(subYears(now, 1)), to: endOfDay(now) };
    // monthly default
    return { from: startOfDay(subMonths(now, 1)), to: endOfDay(now) };
  }, [period, dateRange]);

  const periodAppointments = useMemo(() =>
    mockAppointments.filter((apt) => {
      const dt = parseISO(apt.date);
      return isAfter(dt, effectiveRange.from) && isBefore(dt, effectiveRange.to);
    }),
    [effectiveRange]
  );

  const periodIncomes = useMemo(() =>
    mockIncomes.filter((inc) => {
      const dt = parseISO(inc.date);
      return isAfter(dt, effectiveRange.from) && isBefore(dt, effectiveRange.to);
    }),
    [effectiveRange]
  );

  const periodUsages = useMemo(() =>
    usages.filter((u) => {
      const dt = parseISO(u.usedAt);
      return isAfter(dt, effectiveRange.from) && isBefore(dt, effectiveRange.to);
    }),
    [effectiveRange, usages]
  );

  const doctorStats = useMemo(() =>
    activeDoctors.map((doc) => {
      const docApts = periodAppointments.filter((a) => a.assignedDoctorId === doc.id);
      const docIncomes = periodIncomes.filter((i) => i.assignedDoctorId === doc.id);
      const docUsages = periodUsages.filter((u) => u.usedByDoctorId === doc.id);

      const appointments = docApts.length;
      const completed = docApts.filter((a) => a.status === "completed").length;
      const cancelled = docApts.filter((a) => a.status === "cancelled").length;
      const revenue = docIncomes.reduce((sum, i) => sum + i.amount, 0);
      const materialCost = docUsages.reduce((sum, u) => sum + u.quantity * u.unitPrice, 0);
      const net = revenue - materialCost;

      return { doc, appointments, completed, cancelled, revenue, materialCost, net };
    }),
    [activeDoctors, periodAppointments, periodIncomes, periodUsages]
  );

  const bestDoctorId = useMemo(() => {
    if (!doctorStats.length) return null;
    return doctorStats.reduce(
      (best, s) => (s.revenue > best.revenue ? s : best),
      doctorStats[0]
    ).doc.id;
  }, [doctorStats]);

  const aptChartData = useMemo(() =>
    doctorStats.map((s) => ({
      name: s.doc.name.replace(/^Dr\.?\s*/i, ""),
      value: s.appointments,
      hexColor: DOCTOR_HEX[s.doc.color] ?? "#3b82f6",
    })),
    [doctorStats]
  );

  const revenueChartData = useMemo(() =>
    doctorStats.map((s) => ({
      name: s.doc.name.replace(/^Dr\.?\s*/i, ""),
      value: s.revenue,
      hexColor: DOCTOR_HEX[s.doc.color] ?? "#3b82f6",
    })),
    [doctorStats]
  );

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl">
      {/* Header + time filter */}
      <div className="flex flex-col gap-3 sm:flex-row items-start sm:items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
          {t("analytics.title")}
        </h1>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Tabs
            value={period}
            onValueChange={(v) => setPeriod(v as Period)}
            className="flex-1 sm:flex-none"
          >
            <TabsList className="h-9 rounded-xl w-full sm:w-auto">
              <TabsTrigger value="weekly" className="rounded-lg text-[12px] sm:text-[13px] flex-1 sm:flex-none">{t("analytics.weekly")}</TabsTrigger>
              <TabsTrigger value="monthly" className="rounded-lg text-[12px] sm:text-[13px] flex-1 sm:flex-none">{t("analytics.monthly")}</TabsTrigger>
              <TabsTrigger value="yearly" className="rounded-lg text-[12px] sm:text-[13px] flex-1 sm:flex-none">{t("analytics.yearly")}</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={period === "custom" ? "default" : "outline"}
                size="sm"
                className="gap-2 rounded-xl shrink-0"
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {period === "custom" && dateRange.from
                    ? `${format(dateRange.from, "dd.MM")} — ${dateRange.to ? format(dateRange.to, "dd.MM") : "..."}`
                    : t("analytics.customRange")}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl" align="end">
              <Calendar
                mode="range"
                selected={dateRange.from ? { from: dateRange.from, to: dateRange.to } : undefined}
                onSelect={(range) => {
                  setDateRange({ from: range?.from, to: range?.to });
                  if (range?.from && range?.to) {
                    setPeriod("custom");
                  }
                }}
                numberOfMonths={1}
                className={cn("p-4 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Doctor filter chips — shown only when isMulti */}
      <DoctorFilterChips />

      {/* Motivation Card */}
      <Card className="border-primary/10 bg-primary/[0.03] hidden sm:block">
        <CardContent className="flex items-center gap-5 py-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
            🏆
          </div>
          <div>
            <p className="font-semibold text-foreground text-[17px]">
              {t("analytics.motivationTitle")}
            </p>
            <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { icon: Users, label: t("analytics.totalPatients"), value: d.patients },
          { icon: Stethoscope, label: t("analytics.totalTreatments"), value: d.treatments },
          { icon: Package, label: t("analytics.topMaterial"), value: d.topMaterial },
          { icon: BadgeDollarSign, label: t("analytics.totalRevenue"), value: `${fmt(d.revenue)} ${t("common.currency")}` },
        ].map((c, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-2 sm:gap-3.5 py-4 sm:py-5 px-3 sm:px-5">
              <div className="rounded-2xl bg-primary/8 p-3">
                <c.icon className="h-5 w-5 text-primary stroke-[1.5]" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] sm:text-[12px] text-muted-foreground truncate">{c.label}</p>
                <p className="text-[14px] sm:text-[17px] font-semibold text-foreground truncate mt-0.5">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row: Service Ranking + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">{t("analytics.serviceRanking")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {d.services.map((s, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-[13px]">
                  <span className="text-foreground font-medium">{t(`analytics.svc_${s.key}`)}</span>
                  <span className="text-muted-foreground tabular-nums">{s.count} {t("analytics.timesUnit")}</span>
                </div>
                <Progress value={(s.count / maxService) * 100} className="h-2 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">{t("analytics.serviceDistribution")}</CardTitle>
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
                  data={d.pieData.map((p) => ({ ...p, name: t(`analytics.svc_${p.key}`) }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={100}
                  paddingAngle={4}
                  label={({ name, value }) => `${name} ${value}%`}
                  labelLine={false}
                  strokeWidth={0}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">{t("analytics.revenueTrend")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ value: { label: t("analytics.totalRevenue"), color: "hsl(var(--primary))" } }}
              className="h-[260px] w-full"
            >
              <AreaChart data={d.revenueChart}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="name" className="text-xs" axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(v: number) =>
                    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : `${(v / 1_000).toFixed(0)}K`
                  }
                  className="text-xs"
                  axisLine={false}
                  tickLine={false}
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">{t("analytics.topMaterials")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ used: { label: t("analytics.usedCount"), color: "hsl(var(--primary))" } }}
              className="h-[260px] w-full"
            >
              <BarChart data={d.materials} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis type="number" className="text-xs" axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={110} className="text-xs" axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="used"
                  fill="hsl(var(--primary))"
                  radius={[0, 6, 6, 0]}
                  barSize={18}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* ─── Doctor Performance Section (only for multi-doctor clinics) ─── */}
      {isMulti && (
        <div className="space-y-6">
          {/* Section header */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[16px] font-semibold tracking-tight">
                {t("analytics.doctorPerformance")}
              </h2>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {t("analytics.doctorPerformanceDesc")}
              </p>
            </div>
            {bestDoctorId && (
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground shrink-0">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                <span>{t("analytics.dpBestDoctor")}:</span>
                <span className="font-semibold text-foreground">
                  {doctorStats.find((s) => s.doc.id === bestDoctorId)?.doc.name.replace(/^Dr\.?\s*/i, "")}
                </span>
              </div>
            )}
          </div>

          {/* Per-doctor stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctorStats.map(({ doc, appointments, completed, cancelled, revenue, materialCost, net }) => {
              const palette = doctorColorMap[doc.color];
              const hex = DOCTOR_HEX[doc.color] ?? "#3b82f6";
              const isBest = doc.id === bestDoctorId;
              const shortName = doc.name.replace(/^Dr\.?\s*/i, "");
              const completionRate = appointments > 0 ? Math.round((completed / appointments) * 100) : 0;

              return (
                <Card
                  key={doc.id}
                  className={cn(
                    "overflow-hidden transition-shadow",
                    isBest && "ring-1 ring-amber-400/50 shadow-md"
                  )}
                >
                  {/* Color stripe */}
                  <div className="h-1" style={{ backgroundColor: hex }} />

                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
                          style={{ backgroundColor: hex }}
                        >
                          {shortName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold leading-tight truncate">
                            {doc.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">{doc.specialty}</p>
                        </div>
                      </div>
                      {isBest && (
                        <Badge className="shrink-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] gap-1 font-medium">
                          <Trophy className="h-3 w-3" />
                          Top
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="px-4 pb-4 space-y-3">
                    {/* Completion progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>{t("analytics.dpCompleted")}</span>
                        <span className="tabular-nums font-medium text-foreground">
                          {completed} / {appointments} ({completionRate}%)
                        </span>
                      </div>
                      <Progress value={completionRate} className="h-1.5 rounded-full" />
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className={cn("rounded-xl p-3", palette.bgSoft)}>
                        <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">
                          {t("analytics.dpAppointments")}
                        </p>
                        <p className={cn("text-[20px] font-bold tabular-nums leading-none", palette.text)}>
                          {appointments}
                        </p>
                        {cancelled > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {cancelled} {t("analytics.dpCancelled")}
                          </p>
                        )}
                      </div>

                      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3">
                        <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">
                          {t("analytics.dpRevenue")}
                        </p>
                        <p className="text-[14px] font-bold tabular-nums leading-none text-emerald-700 dark:text-emerald-300">
                          {fmt(revenue)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">{t("common.currency")}</p>
                      </div>

                      <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 p-3">
                        <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">
                          {t("analytics.dpMaterialCost")}
                        </p>
                        <p className="text-[14px] font-bold tabular-nums leading-none text-rose-600 dark:text-rose-400">
                          {fmt(materialCost)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">{t("common.currency")}</p>
                      </div>

                      <div className={cn(
                        "rounded-xl p-3",
                        net >= 0
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : "bg-rose-50 dark:bg-rose-900/20"
                      )}>
                        <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">
                          {t("analytics.dpNet")}
                        </p>
                        <p className={cn(
                          "text-[14px] font-bold tabular-nums leading-none",
                          net >= 0
                            ? "text-blue-700 dark:text-blue-300"
                            : "text-rose-600 dark:text-rose-400"
                        )}>
                          {net >= 0 ? "" : "-"}{fmt(Math.abs(net))}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          {net >= 0
                            ? <TrendingUp className="h-3 w-3 text-emerald-500" />
                            : <TrendingDown className="h-3 w-3 text-rose-500" />
                          }
                          <p className="text-[10px] text-muted-foreground">{t("common.currency")}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Comparative bar charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Appointments by doctor */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-[15px]">{t("analytics.dpAppointmentsChart")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={aptChartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--accent))" }}
                      formatter={(v: number) => [v, t("analytics.dpAppointments")]}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                      {aptChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.hexColor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue by doctor */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-[15px]">{t("analytics.dpRevenueChart")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={revenueChartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) =>
                        v >= 1_000_000
                          ? `${(v / 1_000_000).toFixed(0)}M`
                          : v >= 1_000
                          ? `${(v / 1_000).toFixed(0)}K`
                          : String(v)
                      }
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--accent))" }}
                      formatter={(v: number) => [`${fmt(v)} ${t("common.currency")}`, t("analytics.dpRevenue")]}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                      {revenueChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.hexColor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
