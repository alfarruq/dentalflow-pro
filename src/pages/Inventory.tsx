import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import {
  Package, Plus, Minus, Search, Pencil, Trash2,
  FlaskConical, ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { categories, type InventoryItem } from "@/data/mockInventory";
import { useInventory } from "@/contexts/InventoryContext";
import { useDoctors } from "@/contexts/DoctorsContext";
import { DoctorFilterChips } from "@/components/DoctorFilterChips";
import { DoctorBadge } from "@/components/DoctorBadge";
import { DoctorSelect } from "@/components/DoctorSelect";

// ── helpers ──────────────────────────────────────────────────────────────────
const getStatus = (qty: number) => {
  if (qty === 0) return "depleted";
  if (qty <= 10) return "low";
  return "sufficient";
};

const statusConfig: Record<string, { label: string; className: string }> = {
  sufficient: { label: "inventory.statusSufficient", className: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
  low:        { label: "inventory.statusLow",        className: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" },
  depleted:   { label: "inventory.statusDepleted",   className: "bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400" },
};

const emptyForm = {
  name: "", category: "anesteziya" as InventoryItem["category"],
  quantity: 0, unit: "dona" as InventoryItem["unit"], unitPrice: 0,
};

// ── component ─────────────────────────────────────────────────────────────────
export default function Inventory() {
  const { t } = useTranslation();
  const { items, usages, addItem, updateItem, deleteItem, adjustQty, useItem } = useInventory();
  const { filterDoctorId, setLastUsedDoctorId } = useDoctors();

  // ── tab ──
  const [mainTab, setMainTab] = useState<"stock" | "log">("stock");

  // ── stock tab state ──
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  // ── use-item dialog state ──
  const [useDialogOpen, setUseDialogOpen] = useState(false);
  const [useTarget, setUseTarget] = useState<InventoryItem | null>(null);
  const [useQty, setUseQty] = useState(1);
  const [useDoctorId, setUseDoctorId] = useState("");
  const [useNote, setUseNote] = useState("");

  // ── log tab state ──
  const [logSearch, setLogSearch] = useState("");

  // ── filtered stock ──
  const filteredItems = useMemo(() => items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || item.category === categoryFilter;
    return matchSearch && matchCat;
  }), [items, search, categoryFilter]);

  // ── filtered usage log (respect doctor filter chip) ──
  const filteredUsages = useMemo(() => {
    let list = filterDoctorId
      ? usages.filter((u) => u.usedByDoctorId === filterDoctorId)
      : usages;
    if (logSearch.trim()) {
      const q = logSearch.toLowerCase();
      list = list.filter((u) =>
        u.itemName.toLowerCase().includes(q) ||
        u.note.toLowerCase().includes(q)
      );
    }
    return list;
  }, [usages, filterDoctorId, logSearch]);

  // ── doctor counts for chips ──
  const doctorUsageCounts = useMemo(() => {
    const map: Record<string, number> = {};
    usages.forEach((u) => { map[u.usedByDoctorId] = (map[u.usedByDoctorId] ?? 0) + 1; });
    return map;
  }, [usages]);

  // ── stats ──
  const stats = {
    total: items.length,
    low: items.filter((i) => i.quantity > 0 && i.quantity <= 10).length,
    depleted: items.filter((i) => i.quantity === 0).length,
  };

  const logTotalCost = useMemo(
    () => filteredUsages.reduce((s, u) => s + u.quantity * u.unitPrice, 0),
    [filteredUsages]
  );

  // ── handlers: stock ──
  const openAdd  = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({ name: item.name, category: item.category, quantity: item.quantity, unit: item.unit, unitPrice: item.unitPrice });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingItem) {
      updateItem(editingItem.id, { ...form, quantity: Math.max(0, form.quantity), unitPrice: Math.max(0, form.unitPrice) });
      toast.success(t("inventory.itemUpdated"));
    } else {
      addItem({ ...form, quantity: Math.max(0, form.quantity), unitPrice: Math.max(0, form.unitPrice) });
      toast.success(t("inventory.itemAdded"));
    }
    setModalOpen(false); setEditingItem(null); setForm(emptyForm);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteItem(deleteTarget.id);
    setDeleteTarget(null);
    toast.success(t("inventory.itemDeleted"));
  };

  // ── handlers: use-item ──
  const openUseDialog = (item: InventoryItem) => {
    setUseTarget(item);
    setUseQty(1);
    setUseDoctorId("");
    setUseNote("");
    setUseDialogOpen(true);
  };

  const handleUseItem = () => {
    if (!useTarget || useQty < 1) { toast.error(t("inventory.qtyRequired")); return; }
    if (!useDoctorId) { toast.error(t("inventory.doctorRequired")); return; }
    if (useQty > useTarget.quantity) { toast.error(t("inventory.notEnoughStock")); return; }
    useItem({ itemId: useTarget.id, quantity: useQty, usedByDoctorId: useDoctorId, note: useNote });
    setLastUsedDoctorId(useDoctorId);
    setUseDialogOpen(false);
    toast.success(t("inventory.usageAdded"));
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{t("inventory.title")}</h1>
        {mainTab === "stock" && (
          <Button className="gap-2 w-full sm:w-auto" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            {t("inventory.addItem")}
          </Button>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {[
          { icon: Package, label: t("inventory.totalItems"),    value: stats.total,    bg: "bg-primary/8",                              color: "text-primary" },
          { icon: Package, label: t("inventory.statusLow"),     value: stats.low,      bg: "bg-amber-50 dark:bg-amber-500/10",           color: "text-amber-500" },
          { icon: Package, label: t("inventory.statusDepleted"),value: stats.depleted, bg: "bg-red-50 dark:bg-red-500/10",               color: "text-red-500" },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", s.bg)}>
                <s.icon className={cn("h-5 w-5 stroke-[1.5]", s.color)} />
              </div>
              <div>
                <p className="text-[13px] text-muted-foreground">{s.label}</p>
                <span className="text-lg font-semibold">{s.value}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main tabs */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "stock" | "log")}>
        <TabsList>
          <TabsTrigger value="stock" className="gap-1.5">
            <Package className="h-4 w-4" />
            {t("inventory.stockItems")}
          </TabsTrigger>
          <TabsTrigger value="log" className="gap-1.5">
            <ClipboardList className="h-4 w-4" />
            {t("inventory.usageLog")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ── STOCK TAB ── */}
      {mainTab === "stock" && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground stroke-[1.5]" />
                <Input
                  placeholder={t("inventory.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[200px] rounded-xl">
                  <SelectValue placeholder={t("inventory.allCategories")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("inventory.allCategories")}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{t(`inventory.cat_${cat}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          {/* Mobile */}
          <div className="block sm:hidden px-4 pb-4 space-y-2">
            {filteredItems.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">{t("inventory.noItems")}</p>
            ) : (
              filteredItems.map((item) => {
                const status = getStatus(item.quantity);
                const cfg = statusConfig[status];
                return (
                  <div key={item.id} className="border border-border/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-[14px]">{item.name}</p>
                        <Badge variant="secondary" className="font-normal text-[12px] rounded-lg mt-1">
                          {t(`inventory.cat_${item.category}`)}
                        </Badge>
                      </div>
                      <Badge className={cn("border-0 text-[11px]", cfg.className)}>{t(cfg.label)}</Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => adjustQty(item.id, -1)} disabled={item.quantity === 0}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-semibold tabular-nums">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => adjustQty(item.id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs text-muted-foreground">{t(`inventory.unit_${item.unit}`)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline" size="sm"
                          className="h-8 gap-1 text-xs"
                          onClick={() => openUseDialog(item)}
                          disabled={item.quantity === 0}
                        >
                          <FlaskConical className="h-3.5 w-3.5" />
                          {t("inventory.useItem")}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEdit(item)}>
                          <Pencil className="h-3.5 w-3.5 stroke-[1.5]" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive" onClick={() => setDeleteTarget(item)}>
                          <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop table */}
          <CardContent className="p-0 hidden sm:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/40 hover:bg-transparent">
                    <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("inventory.productName")}</TableHead>
                    <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("inventory.category")}</TableHead>
                    <TableHead className="text-center text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("inventory.quantity")}</TableHead>
                    <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">{t("inventory.unit")}</TableHead>
                    <TableHead className="text-right text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("inventory.unitPrice")}</TableHead>
                    <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.status")}</TableHead>
                    <TableHead className="text-right text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">{t("inventory.noItems")}</TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => {
                      const status = getStatus(item.quantity);
                      const cfg = statusConfig[status];
                      return (
                        <TableRow key={item.id} className="border-b border-border/30 hover:bg-accent/30 transition-colors">
                          <TableCell className="font-medium text-[13px]">{item.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-normal text-[12px] rounded-lg">
                              {t(`inventory.cat_${item.category}`)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => adjustQty(item.id, -1)} disabled={item.quantity === 0}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-semibold tabular-nums text-[13px]">{item.quantity}</span>
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => adjustQty(item.id, 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-[13px] hidden md:table-cell">
                            {t(`inventory.unit_${item.unit}`)}
                          </TableCell>
                          <TableCell className="text-right text-[13px] tabular-nums font-medium">
                            {item.unitPrice.toLocaleString("uz-UZ")} so'm
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("border-0 text-[11px]", cfg.className)}>{t(cfg.label)}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline" size="sm"
                                className="h-8 gap-1 text-xs mr-1"
                                onClick={() => openUseDialog(item)}
                                disabled={item.quantity === 0}
                              >
                                <FlaskConical className="h-3.5 w-3.5" />
                                {t("inventory.useItem")}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEdit(item)}>
                                <Pencil className="h-3.5 w-3.5 stroke-[1.5]" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive" onClick={() => setDeleteTarget(item)}>
                                <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── USAGE LOG TAB ── */}
      {mainTab === "log" && (
        <div className="space-y-4">
          {/* Doctor filter chips */}
          <DoctorFilterChips counts={doctorUsageCounts} totalCount={usages.length} />

          {/* Search + total cost */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground stroke-[1.5]" />
              <Input
                placeholder={t("inventory.searchPlaceholder")}
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-muted-foreground ml-auto shrink-0">
              {t("inventory.totalCost")}:&nbsp;
              <span className="font-semibold text-foreground tabular-nums">
                {logTotalCost.toLocaleString("uz-UZ")} so'm
              </span>
            </div>
          </div>

          <Card>
            {/* Mobile */}
            <div className="block sm:hidden px-4 py-4 space-y-2">
              {filteredUsages.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">{t("inventory.usageLogEmpty")}</p>
              ) : (
                filteredUsages.map((u) => (
                  <div key={u.id} className="border border-border/50 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{u.itemName}</span>
                      <DoctorBadge doctorId={u.usedByDoctorId} variant="compact" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="tabular-nums font-medium text-foreground">
                        {u.quantity} {t(`inventory.unit_${u.unit}`)}
                      </span>
                      <span>{format(parseISO(u.usedAt), "dd.MM.yyyy")}</span>
                      <span className="tabular-nums text-destructive font-medium">
                        -{(u.quantity * u.unitPrice).toLocaleString("uz-UZ")} so'm
                      </span>
                    </div>
                    {u.note && <p className="text-xs text-muted-foreground">{u.note}</p>}
                  </div>
                ))
              )}
            </div>

            {/* Desktop table */}
            <CardContent className="p-0 hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/40 hover:bg-transparent">
                    <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("inventory.productName")}</TableHead>
                    <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("inventory.usedBy")}</TableHead>
                    <TableHead className="text-center text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("inventory.usedQty")}</TableHead>
                    <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("inventory.usedAt")}</TableHead>
                    <TableHead className="text-right text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("inventory.totalCost")}</TableHead>
                    <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground hidden lg:table-cell">{t("inventory.usageNote")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                        {t("inventory.usageLogEmpty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsages.map((u) => (
                      <TableRow key={u.id} className="border-b border-border/30 hover:bg-accent/30 transition-colors">
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-[13px]">{u.itemName}</span>
                            <Badge variant="secondary" className="font-normal text-[11px] rounded-md w-fit">
                              {t(`inventory.cat_${u.category}`)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DoctorBadge doctorId={u.usedByDoctorId} variant="full" />
                        </TableCell>
                        <TableCell className="text-center tabular-nums text-[13px] font-medium">
                          {u.quantity} {t(`inventory.unit_${u.unit}`)}
                        </TableCell>
                        <TableCell className="text-[13px] text-muted-foreground">
                          {format(parseISO(u.usedAt), "dd.MM.yyyy")}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[13px] font-medium text-destructive">
                          -{(u.quantity * u.unitPrice).toLocaleString("uz-UZ")} so'm
                        </TableCell>
                        <TableCell className="text-[13px] text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">
                          {u.note || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Add/Edit Item Dialog ── */}
      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingItem(null); }}>
        <DialogContent className="rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? t("inventory.editItem") : t("inventory.addItem")}</DialogTitle>
            <DialogDescription>{editingItem ? t("inventory.editItemDesc") : t("inventory.addItemDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label className="text-[13px]">{t("inventory.productName")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-[13px]">{t("inventory.category")}</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as InventoryItem["category"] })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map((cat) => (<SelectItem key={cat} value={cat}>{t(`inventory.cat_${cat}`)}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-[13px]">{t("inventory.unit")}</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v as InventoryItem["unit"] })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{(["dona", "ml", "pachka", "quti", "juft"] as const).map((u) => (<SelectItem key={u} value={u}>{t(`inventory.unit_${u}`)}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label className="text-[13px]">{t("inventory.quantity")}</Label>
                <Input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label className="text-[13px]">{t("inventory.unitPrice")}</Label>
                <Input type="number" min={0} value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })} placeholder="so'm" />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="w-full sm:w-auto">{t("patients.cancel")}</Button>
            <Button onClick={handleSave} className="w-full sm:w-auto">{t("patients.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Use Item Dialog ── */}
      <Dialog open={useDialogOpen} onOpenChange={setUseDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("inventory.useItemTitle")}</DialogTitle>
            <DialogDescription>
              {useTarget?.name} · {t("inventory.quantity")}: {useTarget?.quantity} {useTarget ? t(`inventory.unit_${useTarget.unit}`) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>{t("inventory.usedQty")}</Label>
              <Input
                type="number"
                min={1}
                max={useTarget?.quantity ?? 1}
                value={useQty}
                onChange={(e) => setUseQty(Math.max(1, Number(e.target.value)))}
              />
            </div>
            <DoctorSelect
              value={useDoctorId}
              onChange={setUseDoctorId}
              label={t("inventory.usedBy")}
              required
              hideIfSingle={false}
            />
            <div className="grid gap-2">
              <Label>{t("inventory.usageNote")}</Label>
              <Textarea
                value={useNote}
                onChange={(e) => setUseNote(e.target.value)}
                placeholder={t("inventory.usageNotePlaceholder")}
                rows={2}
              />
            </div>
            {useTarget && useQty > 0 && (
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm flex justify-between">
                <span className="text-muted-foreground">{t("inventory.totalCost")}</span>
                <span className="font-semibold tabular-nums">
                  {(useQty * useTarget.unitPrice).toLocaleString("uz-UZ")} so'm
                </span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setUseDialogOpen(false)}>{t("patients.cancel")}</Button>
            <Button onClick={handleUseItem}>{t("inventory.useItem")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("inventory.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("inventory.deleteConfirmDesc", { name: deleteTarget?.name })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t("patients.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
              {t("inventory.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
