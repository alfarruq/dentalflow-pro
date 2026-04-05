import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Package, Plus, Minus, Search, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { mockInventory, categories, type InventoryItem } from "@/data/mockInventory";

const getStatus = (qty: number) => {
  if (qty === 0) return "depleted";
  if (qty <= 10) return "low";
  return "sufficient";
};

const statusConfig: Record<string, { label: string; className: string }> = {
  sufficient: { label: "inventory.statusSufficient", className: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
  low: { label: "inventory.statusLow", className: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" },
  depleted: { label: "inventory.statusDepleted", className: "bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400" },
};

const emptyForm = { name: "", category: "anesteziya" as InventoryItem["category"], quantity: 0, unit: "dona" as InventoryItem["unit"], unitPrice: 0 };

export default function Inventory() {
  const { t } = useTranslation();
  const [items, setItems] = useState<InventoryItem[]>(mockInventory);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  const filtered = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const adjustQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
      )
    );
  };

  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (item: InventoryItem) => { setEditingItem(item); setForm({ name: item.name, category: item.category, quantity: item.quantity, unit: item.unit, unitPrice: item.unitPrice }); setModalOpen(true); };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingItem) {
      setItems((prev) => prev.map((item) => item.id === editingItem.id ? { ...item, name: form.name.trim(), category: form.category, quantity: Math.max(0, form.quantity), unit: form.unit, unitPrice: Math.max(0, form.unitPrice) } : item));
      toast.success(t("inventory.itemUpdated"));
    } else {
      const item: InventoryItem = { id: `inv-${Date.now()}`, name: form.name.trim(), category: form.category, quantity: Math.max(0, form.quantity), unit: form.unit, unitPrice: Math.max(0, form.unitPrice) };
      setItems((prev) => [item, ...prev]);
      toast.success(t("inventory.itemAdded"));
    }
    setModalOpen(false); setEditingItem(null); setForm(emptyForm);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast.success(t("inventory.itemDeleted"));
  };

  const stats = {
    total: items.length,
    low: items.filter((i) => i.quantity > 0 && i.quantity <= 10).length,
    depleted: items.filter((i) => i.quantity === 0).length,
  };

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("inventory.title")}</h1>
        <Button className="gap-2" onClick={openAdd}>
          <Plus className="h-4 w-4" />
          {t("inventory.addItem")}
        </Button>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        {[
          { icon: Package, label: t("inventory.totalItems"), value: stats.total, bg: "bg-primary/8", color: "text-primary" },
          { icon: Package, label: t("inventory.statusLow"), value: stats.low, bg: "bg-amber-50 dark:bg-amber-500/10", color: "text-amber-500" },
          { icon: Package, label: t("inventory.statusDepleted"), value: stats.depleted, bg: "bg-red-50 dark:bg-red-500/10", color: "text-red-500" },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${s.bg}`}>
                <s.icon className={`h-5 w-5 ${s.color} stroke-[1.5]`} />
              </div>
              <div>
                <p className="text-[13px] text-muted-foreground">{s.label}</p>
                <span className="text-xl font-semibold">{s.value}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground stroke-[1.5]" />
              <Input placeholder={t("inventory.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
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
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/40 hover:bg-transparent">
                <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("inventory.productName")}</TableHead>
                <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("inventory.category")}</TableHead>
                <TableHead className="text-center text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("inventory.quantity")}</TableHead>
                <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("inventory.unit")}</TableHead>
                <TableHead className="text-right text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("inventory.unitPrice")}</TableHead>
                <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.status")}</TableHead>
                <TableHead className="text-right text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">{t("inventory.noItems")}</TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  const status = getStatus(item.quantity);
                  const cfg = statusConfig[status];
                  return (
                    <TableRow key={item.id} className="border-b border-border/30 hover:bg-accent/30 transition-colors">
                      <TableCell className="font-medium text-[13px]">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal text-[12px] rounded-lg">{t(`inventory.cat_${item.category}`)}</Badge>
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
                      <TableCell className="text-muted-foreground text-[13px]">{t(`inventory.unit_${item.unit}`)}</TableCell>
                      <TableCell className="text-right text-[13px] tabular-nums font-medium">{item.unitPrice.toLocaleString("uz-UZ")} so'm</TableCell>
                      <TableCell>
                        <Badge className={`border-0 text-[11px] ${cfg.className}`}>{t(cfg.label)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
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
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingItem(null); }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? t("inventory.editItem") : t("inventory.addItem")}</DialogTitle>
            <DialogDescription>{editingItem ? t("inventory.editItemDesc") : t("inventory.addItemDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label className="text-[13px]">{t("inventory.productName")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label className="text-[13px]">{t("inventory.quantity")}</Label>
                <Input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2 col-span-2">
                <Label className="text-[13px]">{t("inventory.unitPrice")}</Label>
                <Input type="number" min={0} value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })} placeholder="so'm" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>{t("patients.cancel")}</Button>
            <Button onClick={handleSave}>{t("patients.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("inventory.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("inventory.deleteConfirmDesc", { name: deleteTarget?.name })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t("patients.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">{t("inventory.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
