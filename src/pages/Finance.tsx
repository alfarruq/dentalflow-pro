import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, subDays, subMonths, subYears, isAfter, isBefore, startOfDay, endOfDay, parseISO } from "date-fns";
import {
  TrendingDown, TrendingUp, Plus, Pencil, Trash2,
  CalendarClock, Bell, Sparkles, ArrowUpRight, ArrowDownRight,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  mockExpenses, mockIncomes, mockRecurringExpenses,
  expenseCategories, incomeCategories,
  type Expense, type ExpenseCategory, type Income, type IncomeCategory, type RecurringExpense,
} from "@/data/mockFinance";

const categoryColors: Record<ExpenseCategory, string> = {
  ish_haqi: "hsl(var(--chart-1))",
  ijara: "hsl(var(--chart-2))",
  materiallar: "hsl(var(--chart-3))",
  marketing: "hsl(var(--chart-4))",
  kommunal: "hsl(var(--chart-5))",
  boshqa: "hsl(var(--muted-foreground))",
};

const categoryBadgeClass: Record<ExpenseCategory, string> = {
  ish_haqi: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  ijara: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
  materiallar: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  marketing: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  kommunal: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400",
  boshqa: "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400",
};

const incomeBadgeClass: Record<IncomeCategory, string> = {
  implant: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  plomba: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  tozalash: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400",
  oqartirish: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  toj: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  boshqa_daromad: "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400",
};

const formatUZS = (v: number) => v.toLocaleString("uz-UZ") + " so'm";

type TimeFilter = "today" | "week" | "month" | "year" | "custom";
type TransactionType = "all" | "income" | "expense";

const emptyExpenseForm = { description: "", category: "materiallar" as ExpenseCategory, amount: 0 };
const emptyIncomeForm = { description: "", category: "plomba" as IncomeCategory, amount: 0, patientName: "" };
const emptyRecurringForm = { description: "", category: "ijara" as ExpenseCategory, amount: 0, dayOfMonth: 1 };

export default function Finance() {
  const { t } = useTranslation();
  const today = new Date();

  const [expenses, setExpenses] = useState<Expense[]>(mockExpenses);
  const [incomes, setIncomes] = useState<Income[]>(mockIncomes);
  const [recurring, setRecurring] = useState<RecurringExpense[]>(mockRecurringExpenses);
  const [activeTab, setActiveTab] = useState("transactions");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("month");
  const [txFilter, setTxFilter] = useState<TransactionType>("all");

  // Custom date range
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  // Expense modal
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<Expense | null>(null);
  const [expForm, setExpForm] = useState(emptyExpenseForm);
  const [deleteExpTarget, setDeleteExpTarget] = useState<Expense | null>(null);

  // Income modal
  const [incModalOpen, setIncModalOpen] = useState(false);
  const [editingInc, setEditingInc] = useState<Income | null>(null);
  const [incForm, setIncForm] = useState(emptyIncomeForm);

  // Recurring modal
  const [recModalOpen, setRecModalOpen] = useState(false);
  const [editingRec, setEditingRec] = useState<RecurringExpense | null>(null);
  const [recForm, setRecForm] = useState(emptyRecurringForm);
  const [deleteRecTarget, setDeleteRecTarget] = useState<RecurringExpense | null>(null);

  // Date range
  const dateRange = useMemo(() => {
    const end = endOfDay(today);
    let start: Date;
    switch (timeFilter) {
      case "today": start = startOfDay(today); break;
      case "week": start = startOfDay(subDays(today, 7)); break;
      case "month": start = startOfDay(subMonths(today, 1)); break;
      case "year": start = startOfDay(subYears(today, 1)); break;
      case "custom":
        start = customFrom ? startOfDay(customFrom) : startOfDay(subMonths(today, 1));
        return { start, end: customTo ? endOfDay(customTo) : end };
      default: start = startOfDay(subMonths(today, 1)); break;
    }
    return { start, end };
  }, [timeFilter, customFrom, customTo]);

  const inRange = (dateStr: string) => {
    const d = parseISO(dateStr);
    return !isBefore(d, dateRange.start) && !isAfter(d, dateRange.end);
  };

  const filteredExpenses = useMemo(() => expenses.filter((e) => inRange(e.date)), [expenses, dateRange]);
  const filteredIncomes = useMemo(() => incomes.filter((i) => inRange(i.date)), [incomes, dateRange]);

  const totalIncome = useMemo(() => filteredIncomes.reduce((s, i) => s + i.amount, 0), [filteredIncomes]);
  const totalExpenses = useMemo(() => filteredExpenses.reduce((s, e) => s + e.amount, 0), [filteredExpenses]);
  const netProfit = totalIncome - totalExpenses;

  // Unified transactions
  const transactions = useMemo(() => {
    const all: Array<{ id: string; date: string; type: "income" | "expense"; category: string; description: string; amount: number; patientName?: string; isAutomatic?: boolean }> = [];
    if (txFilter !== "expense") filteredIncomes.forEach((i) => all.push({ ...i, type: "income" }));
    if (txFilter !== "income") filteredExpenses.forEach((e) => all.push({ ...e, type: "expense" }));
    return all.sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredIncomes, filteredExpenses, txFilter]);

  // Cashflow chart data
  const cashflowData = useMemo(() => {
    const map: Record<string, { date: string; income: number; expense: number }> = {};
    filteredIncomes.forEach((i) => {
      if (!map[i.date]) map[i.date] = { date: i.date, income: 0, expense: 0 };
      map[i.date].income += i.amount;
    });
    filteredExpenses.forEach((e) => {
      if (!map[e.date]) map[e.date] = { date: e.date, income: 0, expense: 0 };
      map[e.date].expense += e.amount;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredIncomes, filteredExpenses]);

  // Donut data for expenses
  const donutData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).map(([cat, value]) => ({ name: cat, value }));
  }, [filteredExpenses]);

  // Upcoming recurring
  const upcomingRecurring = useMemo(() => {
    const todayDay = today.getDate();
    return recurring.filter((r) => {
      if (!r.isActive) return false;
      let diff = r.dayOfMonth - todayDay;
      if (diff < 0) diff += 30;
      return diff >= 0 && diff <= 3;
    });
  }, [recurring]);

  // Expense CRUD
  const openAddExp = () => { setEditingExp(null); setExpForm(emptyExpenseForm); setExpModalOpen(true); };
  const openEditExp = (e: Expense) => { setEditingExp(e); setExpForm({ description: e.description, category: e.category, amount: e.amount }); setExpModalOpen(true); };
  const saveExp = () => {
    if (!expForm.description.trim() || expForm.amount <= 0) return;
    if (editingExp) {
      setExpenses((prev) => prev.map((e) => e.id === editingExp.id ? { ...e, ...expForm, description: expForm.description.trim() } : e));
      toast.success(t("finance.expenseUpdated"));
    } else {
      const newExp: Expense = { id: `exp-${Date.now()}`, date: format(today, "yyyy-MM-dd"), ...expForm, description: expForm.description.trim() };
      setExpenses((prev) => [newExp, ...prev]);
      toast.success(t("finance.expenseAdded"));
    }
    setExpModalOpen(false);
  };
  const deleteExp = () => {
    if (!deleteExpTarget) return;
    setExpenses((prev) => prev.filter((e) => e.id !== deleteExpTarget.id));
    setDeleteExpTarget(null);
    toast.success(t("finance.expenseDeleted"));
  };

  // Income CRUD
  const openAddInc = () => { setEditingInc(null); setIncForm(emptyIncomeForm); setIncModalOpen(true); };
  const saveInc = () => {
    if (!incForm.description.trim() || incForm.amount <= 0) return;
    if (editingInc) {
      setIncomes((prev) => prev.map((i) => i.id === editingInc.id ? { ...i, ...incForm, description: incForm.description.trim(), patientName: incForm.patientName || undefined } : i));
      toast.success(t("finance.incomeUpdated"));
    } else {
      const newInc: Income = { id: `inc-${Date.now()}`, date: format(today, "yyyy-MM-dd"), ...incForm, description: incForm.description.trim(), patientName: incForm.patientName || undefined };
      setIncomes((prev) => [newInc, ...prev]);
      toast.success(t("finance.incomeAdded"));
    }
    setIncModalOpen(false);
  };

  // Recurring CRUD
  const openAddRec = () => { setEditingRec(null); setRecForm(emptyRecurringForm); setRecModalOpen(true); };
  const openEditRec = (r: RecurringExpense) => { setEditingRec(r); setRecForm({ description: r.description, category: r.category, amount: r.amount, dayOfMonth: r.dayOfMonth }); setRecModalOpen(true); };
  const saveRec = () => {
    if (!recForm.description.trim() || recForm.amount <= 0) return;
    if (editingRec) {
      setRecurring((prev) => prev.map((r) => r.id === editingRec.id ? { ...r, ...recForm, description: recForm.description.trim() } : r));
      toast.success(t("finance.recurringUpdated"));
    } else {
      const newRec: RecurringExpense = { id: `rec-${Date.now()}`, ...recForm, description: recForm.description.trim(), isActive: true };
      setRecurring((prev) => [newRec, ...prev]);
      toast.success(t("finance.recurringAdded"));
    }
    setRecModalOpen(false);
  };
  const deleteRec = () => {
    if (!deleteRecTarget) return;
    setRecurring((prev) => prev.filter((r) => r.id !== deleteRecTarget.id));
    setDeleteRecTarget(null);
    toast.success(t("finance.recurringDeleted"));
  };
  const toggleRecActive = (id: string) => {
    setRecurring((prev) => prev.map((r) => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  const timeFilters: { key: TimeFilter; label: string }[] = [
    { key: "today", label: t("finance.filterToday") },
    { key: "week", label: t("finance.filterWeek") },
    { key: "month", label: t("finance.filterMonth") },
    { key: "year", label: t("finance.filterYear") },
    { key: "custom", label: t("finance.filterCustom") },
  ];

  const CashflowTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border/50 rounded-xl px-4 py-3 shadow-lg">
        <p className="text-[12px] text-muted-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} className="text-[13px] font-medium" style={{ color: p.fill }}>
            {p.dataKey === "income" ? t("finance.income") : t("finance.expenses")}: {formatUZS(p.value)}
          </p>
        ))}
      </div>
    );
  };

  const DonutTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
      <div className="bg-card border border-border/50 rounded-xl px-4 py-3 shadow-lg">
        <p className="text-[13px] font-medium">{t(`finance.cat_${d.name}`)}</p>
        <p className="text-[12px] text-muted-foreground">{formatUZS(d.value)}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{t("finance.title")}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 flex-1 sm:flex-none" onClick={openAddExp}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("finance.addExpense")}</span>
            <span className="sm:hidden">Xarajat</span>
          </Button>
          <Button className="gap-2 flex-1 sm:flex-none" onClick={openAddInc}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("finance.addIncome")}</span>
            <span className="sm:hidden">Daromad</span>
          </Button>
        </div>
      </div>

      {/* Time Filter Segmented Control */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        <div className="inline-flex items-center bg-secondary/60 rounded-2xl p-1 gap-0.5 overflow-x-auto w-full sm:w-auto">
          {timeFilters.map((tf) => (
            <button
              key={tf.key}
              onClick={() => setTimeFilter(tf.key)}
              className={cn(
                "px-3 sm:px-4 py-2 rounded-xl text-[12px] sm:text-[13px] font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0",
                timeFilter === tf.key
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>
        {timeFilter === "custom" && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("gap-2 text-[13px] flex-1 sm:flex-none", !customFrom && "text-muted-foreground")}>
                  <CalendarIcon className="h-4 w-4" />
                  {customFrom ? format(customFrom, "dd.MM.yyyy") : t("finance.fromDate")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-[13px]">—</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("gap-2 text-[13px] flex-1 sm:flex-none", !customTo && "text-muted-foreground")}>
                  <CalendarIcon className="h-4 w-4" />
                  {customTo ? format(customTo, "dd.MM.yyyy") : t("finance.toDate")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customTo} onSelect={setCustomTo} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* 3 Summary Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
        <Card className="border-emerald-200/40 dark:border-emerald-500/20">
          <CardContent className="flex items-center gap-5 p-7">
            <div className="flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10">
              <ArrowUpRight className="h-5 w-5 text-emerald-500 stroke-[1.4]" />
            </div>
            <div>
              <p className="text-xs font-normal text-muted-foreground tracking-wide">{t("finance.totalIncome")}</p>
              <span className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight mt-1 block">{formatUZS(totalIncome)}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200/40 dark:border-red-500/20">
          <CardContent className="flex items-center gap-5 p-7">
            <div className="flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/10">
              <ArrowDownRight className="h-5 w-5 text-red-500 stroke-[1.4]" />
            </div>
            <div>
              <p className="text-xs font-normal text-muted-foreground tracking-wide">{t("finance.totalExpenses")}</p>
              <span className="text-lg sm:text-2xl font-bold text-red-500 tracking-tight mt-1 block">{formatUZS(totalExpenses)}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-primary/20">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-emerald-500/5 pointer-events-none" />
          <CardContent className="flex items-center gap-5 p-7 relative">
            <div className="flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-2xl bg-primary/8">
              <Sparkles className="h-5 w-5 text-primary stroke-[1.4]" />
            </div>
            <div>
              <p className="text-xs font-normal text-muted-foreground tracking-wide">{t("finance.netProfit")}</p>
              <span className={cn("text-lg sm:text-2xl font-bold tracking-tight mt-1 block", netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}
                style={{ textShadow: netProfit >= 0 ? "0 0 40px rgba(16,185,129,0.2)" : "0 0 40px rgba(239,68,68,0.2)" }}>
                {formatUZS(netProfit)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming recurring alerts */}
      {upcomingRecurring.length > 0 && (
        <Card className="border-amber-200/60 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-amber-500 stroke-[1.5]" />
              <span className="text-[13px] font-semibold text-amber-600 dark:text-amber-400">{t("finance.upcomingExpenses")}</span>
            </div>
            <div className="space-y-2">
              {upcomingRecurring.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-card/80 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-[13px] font-medium">{r.description}</p>
                    <p className="text-[12px] text-muted-foreground">{t("finance.dueDay", { day: r.dayOfMonth })}</p>
                  </div>
                  <span className="text-[13px] font-semibold">{formatUZS(r.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/60 p-1 rounded-2xl w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="transactions" className="rounded-xl text-[12px] sm:text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm px-3 sm:px-6 flex-1 sm:flex-none">
            {t("finance.allTransactions")}
          </TabsTrigger>
          <TabsTrigger value="recurring" className="rounded-xl text-[12px] sm:text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm px-3 sm:px-6 flex-1 sm:flex-none">
            {t("finance.scheduledExpenses")}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-xl text-[12px] sm:text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm px-3 sm:px-6 flex-1 sm:flex-none">
            {t("finance.breakdown")}
          </TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="mt-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-3">
              <CardTitle className="text-[15px]">{t("finance.allTransactions")}</CardTitle>
              <div className="inline-flex items-center bg-secondary/60 rounded-xl p-0.5 gap-0.5">
                {(["all", "income", "expense"] as TransactionType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setTxFilter(type)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all",
                      txFilter === type ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t(`finance.filter_${type}`)}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <TableHeader>
                  <TableRow className="border-b border-border/40 hover:bg-transparent">
                    <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground w-10"></TableHead>
                    <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("finance.date")}</TableHead>
                    <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("finance.description")}</TableHead>
                    <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("inventory.category")}</TableHead>
                    <TableHead className="text-right text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("finance.amount")}</TableHead>
                    <TableHead className="text-right text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">{t("finance.noTransactions")}</TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx) => (
                      <TableRow key={tx.id} className="border-b border-border/30 hover:bg-accent/30 transition-colors">
                        <TableCell className="w-10">
                          <div className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-lg",
                            tx.type === "income" ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-red-50 dark:bg-red-500/10"
                          )}>
                            {tx.type === "income"
                              ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                              : <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                            }
                          </div>
                        </TableCell>
                        <TableCell className="text-[13px] text-muted-foreground">{tx.date}</TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium text-[13px]">{tx.description}</span>
                            {tx.patientName && (
                              <p className="text-[12px] text-muted-foreground">{tx.patientName}</p>
                            )}
                          </div>
                          {tx.isAutomatic && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">{t("finance.auto")}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "border-0 text-[11px]",
                            tx.type === "expense"
                              ? categoryBadgeClass[tx.category as ExpenseCategory] || ""
                              : incomeBadgeClass[tx.category as IncomeCategory] || ""
                          )}>
                            {tx.type === "expense" ? t(`finance.cat_${tx.category}`) : t(`finance.inc_${tx.category}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-semibold text-[13px] tabular-nums",
                          tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                        )}>
                          {tx.type === "income" ? "+" : "−"}{formatUZS(tx.amount)}
                        </TableCell>
                        <TableCell>
                          {tx.type === "expense" && (
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEditExp(expenses.find((e) => e.id === tx.id)!)}>
                                <Pencil className="h-3.5 w-3.5 stroke-[1.5]" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive" onClick={() => setDeleteExpTarget(expenses.find((e) => e.id === tx.id)!)}>
                                <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recurring Tab */}
        <TabsContent value="recurring" className="mt-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-3">
              <div>
                <CardTitle className="text-[15px]">{t("finance.scheduledExpenses")}</CardTitle>
                <p className="text-[13px] text-muted-foreground mt-1">{t("finance.scheduledDesc")}</p>
              </div>
              <Button className="gap-2 w-full sm:w-auto" onClick={openAddRec}>
                <Plus className="h-4 w-4" />
                {t("finance.addRecurring")}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <TableHeader>
                  <TableRow className="border-b border-border/40 hover:bg-transparent">
                    <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("finance.description")}</TableHead>
                    <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("inventory.category")}</TableHead>
                    <TableHead className="text-center text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("finance.dayOfMonth")}</TableHead>
                    <TableHead className="text-right text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("finance.amount")}</TableHead>
                    <TableHead className="text-center text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.status")}</TableHead>
                    <TableHead className="text-right text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recurring.map((rec) => (
                    <TableRow key={rec.id} className="border-b border-border/30 hover:bg-accent/30 transition-colors">
                      <TableCell className="font-medium text-[13px]">{rec.description}</TableCell>
                      <TableCell>
                        <Badge className={cn("border-0 text-[11px]", categoryBadgeClass[rec.category])}>
                          {t(`finance.cat_${rec.category}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-[13px]">
                        <Badge variant="outline" className="text-[12px]">{rec.dayOfMonth}-{t("finance.dayLabel")}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-[13px] tabular-nums">{formatUZS(rec.amount)}</TableCell>
                      <TableCell className="text-center">
                        <Switch checked={rec.isActive} onCheckedChange={() => toggleRecActive(rec.id)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEditRec(rec)}>
                            <Pencil className="h-3.5 w-3.5 stroke-[1.5]" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive" onClick={() => setDeleteRecTarget(rec)}>
                            <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Cashflow Bar Chart */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-[15px]">{t("finance.cashflowChart")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[220px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashflowData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                      <Tooltip content={<CashflowTooltip />} />
                      <Bar dataKey="income" fill="hsl(142, 71%, 45%)" radius={[6, 6, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="expense" fill="hsl(0, 84%, 60%)" radius={[6, 6, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[12px] text-muted-foreground">{t("finance.income")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span className="text-[12px] text-muted-foreground">{t("finance.expenses")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Donut Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-[15px]">{t("finance.expenseBreakdown")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={3} dataKey="value" strokeWidth={0}>
                        {donutData.map((entry) => (
                          <Cell key={entry.name} fill={categoryColors[entry.name as ExpenseCategory]} />
                        ))}
                      </Pie>
                      <Tooltip content={<DonutTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Category breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-[15px]">{t("finance.categoryBreakdown")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 pt-2">
                  {donutData.sort((a, b) => b.value - a.value).map((d) => {
                    const pct = totalExpenses > 0 ? ((d.value / totalExpenses) * 100).toFixed(1) : "0";
                    return (
                      <div key={d.name} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryColors[d.name as ExpenseCategory] }} />
                            <span className="text-[13px] font-medium">{t(`finance.cat_${d.name}`)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[12px] text-muted-foreground">{pct}%</span>
                            <span className="text-[13px] font-semibold tabular-nums">{formatUZS(d.value)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: categoryColors[d.name as ExpenseCategory] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Expense Dialog */}
      <Dialog open={expModalOpen} onOpenChange={(open) => { setExpModalOpen(open); if (!open) setEditingExp(null); }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingExp ? t("finance.editExpense") : t("finance.addExpense")}</DialogTitle>
            <DialogDescription>{t("finance.expenseFormDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label className="text-[13px]">{t("finance.description")}</Label>
              <Input value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-[13px]">{t("inventory.category")}</Label>
                <Select value={expForm.category} onValueChange={(v) => setExpForm({ ...expForm, category: v as ExpenseCategory })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{t(`finance.cat_${cat}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-[13px]">{t("finance.amount")}</Label>
                <Input type="number" min={0} value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpModalOpen(false)}>{t("patients.cancel")}</Button>
            <Button onClick={saveExp}>{t("patients.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Income Dialog */}
      <Dialog open={incModalOpen} onOpenChange={(open) => { setIncModalOpen(open); if (!open) setEditingInc(null); }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingInc ? t("finance.editIncome") : t("finance.addIncome")}</DialogTitle>
            <DialogDescription>{t("finance.incomeFormDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label className="text-[13px]">{t("finance.description")}</Label>
              <Input value={incForm.description} onChange={(e) => setIncForm({ ...incForm, description: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label className="text-[13px]">{t("finance.patientNameOptional")}</Label>
              <Input value={incForm.patientName} onChange={(e) => setIncForm({ ...incForm, patientName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-[13px]">{t("inventory.category")}</Label>
                <Select value={incForm.category} onValueChange={(v) => setIncForm({ ...incForm, category: v as IncomeCategory })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {incomeCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{t(`finance.inc_${cat}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-[13px]">{t("finance.amount")}</Label>
                <Input type="number" min={0} value={incForm.amount} onChange={(e) => setIncForm({ ...incForm, amount: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIncModalOpen(false)}>{t("patients.cancel")}</Button>
            <Button onClick={saveInc}>{t("patients.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recurring Dialog */}
      <Dialog open={recModalOpen} onOpenChange={(open) => { setRecModalOpen(open); if (!open) setEditingRec(null); }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingRec ? t("finance.editRecurring") : t("finance.addRecurring")}</DialogTitle>
            <DialogDescription>{t("finance.recurringFormDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label className="text-[13px]">{t("finance.description")}</Label>
              <Input value={recForm.description} onChange={(e) => setRecForm({ ...recForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label className="text-[13px]">{t("inventory.category")}</Label>
                <Select value={recForm.category} onValueChange={(v) => setRecForm({ ...recForm, category: v as ExpenseCategory })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{t(`finance.cat_${cat}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-[13px]">{t("finance.amount")}</Label>
                <Input type="number" min={0} value={recForm.amount} onChange={(e) => setRecForm({ ...recForm, amount: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label className="text-[13px]">{t("finance.dayOfMonth")}</Label>
                <Input type="number" min={1} max={31} value={recForm.dayOfMonth} onChange={(e) => setRecForm({ ...recForm, dayOfMonth: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecModalOpen(false)}>{t("patients.cancel")}</Button>
            <Button onClick={saveRec}>{t("patients.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Expense Confirm */}
      <AlertDialog open={!!deleteExpTarget} onOpenChange={(open) => { if (!open) setDeleteExpTarget(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("finance.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("finance.deleteConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t("patients.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={deleteExp} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">{t("inventory.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Recurring Confirm */}
      <AlertDialog open={!!deleteRecTarget} onOpenChange={(open) => { if (!open) setDeleteRecTarget(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("finance.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("finance.deleteRecurringDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t("patients.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={deleteRec} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">{t("inventory.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
