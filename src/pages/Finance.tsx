import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Wallet, TrendingDown, TrendingUp, Plus, Pencil, Trash2,
  CalendarClock, Bell, ArrowDownUp, Sparkles,
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import {
  mockExpenses, mockRecurringExpenses, mockGrossRevenue,
  expenseCategories, type Expense, type ExpenseCategory, type RecurringExpense,
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

const formatUZS = (v: number) => v.toLocaleString("uz-UZ") + " so'm";

const emptyExpenseForm = { description: "", category: "materiallar" as ExpenseCategory, amount: 0 };
const emptyRecurringForm = { description: "", category: "ijara" as ExpenseCategory, amount: 0, dayOfMonth: 1 };

export default function Finance() {
  const { t } = useTranslation();

  const [expenses, setExpenses] = useState<Expense[]>(mockExpenses);
  const [recurring, setRecurring] = useState<RecurringExpense[]>(mockRecurringExpenses);
  const [activeTab, setActiveTab] = useState("expenses");

  // Expense modal
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<Expense | null>(null);
  const [expForm, setExpForm] = useState(emptyExpenseForm);
  const [deleteExpTarget, setDeleteExpTarget] = useState<Expense | null>(null);

  // Recurring modal
  const [recModalOpen, setRecModalOpen] = useState(false);
  const [editingRec, setEditingRec] = useState<RecurringExpense | null>(null);
  const [recForm, setRecForm] = useState(emptyRecurringForm);
  const [deleteRecTarget, setDeleteRecTarget] = useState<RecurringExpense | null>(null);

  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const materialCosts = useMemo(() => expenses.filter((e) => e.category === "materiallar").reduce((s, e) => s + e.amount, 0), [expenses]);
  const operatingExpenses = totalExpenses - materialCosts;
  const netProfit = mockGrossRevenue - totalExpenses;

  const donutData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).map(([cat, value]) => ({ name: cat, value }));
  }, [expenses]);

  // Upcoming recurring (next 3 days)
  const today = new Date();
  const upcomingRecurring = useMemo(() => {
    const todayDay = today.getDate();
    return recurring.filter((r) => {
      if (!r.isActive) return false;
      let diff = r.dayOfMonth - todayDay;
      if (diff < 0) diff += 30;
      return diff >= 0 && diff <= 3;
    });
  }, [recurring, today]);

  // Expense CRUD
  const openAddExp = () => { setEditingExp(null); setExpForm(emptyExpenseForm); setExpModalOpen(true); };
  const openEditExp = (e: Expense) => { setEditingExp(e); setExpForm({ description: e.description, category: e.category, amount: e.amount }); setExpModalOpen(true); };
  const saveExp = () => {
    if (!expForm.description.trim() || expForm.amount <= 0) return;
    if (editingExp) {
      setExpenses((prev) => prev.map((e) => e.id === editingExp.id ? { ...e, ...expForm, description: expForm.description.trim() } : e));
      toast.success(t("finance.expenseUpdated"));
    } else {
      const newExp: Expense = { id: `exp-${Date.now()}`, date: new Date().toISOString().split("T")[0], ...expForm, description: expForm.description.trim() };
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

  const CustomTooltip = ({ active, payload }: any) => {
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
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("finance.title")}</h1>
      </div>

      {/* Net Profit Hero */}
      <Card className="relative overflow-hidden">
        <CardContent className="p-8 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-emerald-500/5 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary stroke-[1.5]" />
              <span className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">
                {t("finance.netProfit")}
              </span>
            </div>
            <p className={`text-4xl md:text-5xl font-bold tracking-tight ${netProfit >= 0 ? "text-emerald-500" : "text-destructive"}`}
              style={{ textShadow: netProfit >= 0 ? "0 0 40px rgba(16,185,129,0.15)" : "0 0 40px rgba(239,68,68,0.15)" }}>
              {formatUZS(netProfit)}
            </p>
            <p className="text-[13px] text-muted-foreground mt-3">
              {t("finance.profitFormula")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid gap-5 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8">
              <TrendingUp className="h-5 w-5 text-primary stroke-[1.5]" />
            </div>
            <div>
              <p className="text-[13px] text-muted-foreground">{t("finance.grossRevenue")}</p>
              <span className="text-xl font-semibold">{formatUZS(mockGrossRevenue)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/10">
              <TrendingDown className="h-5 w-5 text-red-500 stroke-[1.5]" />
            </div>
            <div>
              <p className="text-[13px] text-muted-foreground">{t("finance.totalExpenses")}</p>
              <span className="text-xl font-semibold">{formatUZS(totalExpenses)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-500/10">
              <ArrowDownUp className="h-5 w-5 text-amber-500 stroke-[1.5]" />
            </div>
            <div>
              <p className="text-[13px] text-muted-foreground">{t("finance.materialCosts")}</p>
              <span className="text-xl font-semibold">{formatUZS(materialCosts)}</span>
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

      {/* Main content tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/60 p-1 rounded-2xl">
          <TabsTrigger value="expenses" className="rounded-xl text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm px-6">
            {t("finance.expenses")}
          </TabsTrigger>
          <TabsTrigger value="recurring" className="rounded-xl text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm px-6">
            {t("finance.scheduledExpenses")}
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="rounded-xl text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm px-6">
            {t("finance.breakdown")}
          </TabsTrigger>
        </TabsList>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-[15px]">{t("finance.allExpenses")}</CardTitle>
              <Button className="gap-2" onClick={openAddExp}>
                <Plus className="h-4 w-4" />
                {t("finance.addExpense")}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/40 hover:bg-transparent">
                    <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("finance.date")}</TableHead>
                    <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("finance.description")}</TableHead>
                    <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("inventory.category")}</TableHead>
                    <TableHead className="text-right text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("finance.amount")}</TableHead>
                    <TableHead className="text-right text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">{t("finance.noExpenses")}</TableCell>
                    </TableRow>
                  ) : (
                    expenses.map((exp) => (
                      <TableRow key={exp.id} className="border-b border-border/30 hover:bg-accent/30 transition-colors">
                        <TableCell className="text-[13px] text-muted-foreground">{exp.date}</TableCell>
                        <TableCell className="font-medium text-[13px]">
                          {exp.description}
                          {exp.isAutomatic && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">{t("finance.auto")}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`border-0 text-[11px] ${categoryBadgeClass[exp.category]}`}>
                            {t(`finance.cat_${exp.category}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-[13px] tabular-nums">{formatUZS(exp.amount)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEditExp(exp)}>
                              <Pencil className="h-3.5 w-3.5 stroke-[1.5]" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive" onClick={() => setDeleteExpTarget(exp)}>
                              <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recurring Tab */}
        <TabsContent value="recurring" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-[15px]">{t("finance.scheduledExpenses")}</CardTitle>
                <p className="text-[13px] text-muted-foreground mt-1">{t("finance.scheduledDesc")}</p>
              </div>
              <Button className="gap-2" onClick={openAddRec}>
                <Plus className="h-4 w-4" />
                {t("finance.addRecurring")}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
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
                        <Badge className={`border-0 text-[11px] ${categoryBadgeClass[rec.category]}`}>
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Breakdown Tab */}
        <TabsContent value="breakdown" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-[15px]">{t("finance.expenseBreakdown")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {donutData.map((entry) => (
                          <Cell key={entry.name} fill={categoryColors[entry.name as ExpenseCategory]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
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
