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
  sufficient: { label: "inventory.statusSufficient", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  low: { label: "inventory.statusLow", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  depleted: { label: "inventory.statusDepleted", className: "bg-destructive/10 text-destructive" },
};

const emptyForm = { name: "", category: "anesteziya" as InventoryItem["category"], quantity: 0, unit: "dona" as InventoryItem["unit"] };

export default function Inventory() {
  const { t } = useTranslation();
  const [items, setItems] = useState<InventoryItem[]>(mockInventory);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Add/Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Delete confirmation
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

  const openAdd = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({ name: item.name, category: item.category, quantity: item.quantity, unit: item.unit });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingItem) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? { ...item, name: form.name.trim(), category: form.category, quantity: Math.max(0, form.quantity), unit: form.unit }
            : item
        )
      );
      toast.success(t("inventory.itemUpdated"));
    } else {
      const item: InventoryItem = {
        id: `inv-${Date.now()}`,
        name: form.name.trim(),
        category: form.category,
        quantity: Math.max(0, form.quantity),
        unit: form.unit,
      };
      setItems((prev) => [item, ...prev]);
      toast.success(t("inventory.itemAdded"));
    }
    setModalOpen(false);
    setEditingItem(null);
    setForm(emptyForm);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("inventory.title")}</h1>
        <Button className="gap-1.5" onClick={openAdd}>
          <Plus className="h-4 w-4" />
          {t("inventory.addItem")}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("inventory.totalItems")}</p>
              <span className="text-xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Package className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("inventory.statusLow")}</p>
              <span className="text-xl font-bold">{stats.low}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10">
              <Package className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("inventory.statusDepleted")}</p>
              <span className="text-xl font-bold">{stats.depleted}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("inventory.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
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
              <TableRow>
                <TableHead>{t("inventory.productName")}</TableHead>
                <TableHead>{t("inventory.category")}</TableHead>
                <TableHead className="text-center">{t("inventory.quantity")}</TableHead>
                <TableHead>{t("inventory.unit")}</TableHead>
                <TableHead>{t("patients.status")}</TableHead>
                <TableHead className="text-right">{t("patients.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    {t("inventory.noItems")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  const status = getStatus(item.quantity);
                  const cfg = statusConfig[status];
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">{t(`inventory.cat_${item.category}`)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1.5">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => adjustQty(item.id, -1)} disabled={item.quantity === 0}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-semibold tabular-nums">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => adjustQty(item.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t(`inventory.unit_${item.unit}`)}</TableCell>
                      <TableCell>
                        <Badge className={`border-0 ${cfg.className}`}>{t(cfg.label)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(item)}>
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Add / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? t("inventory.editItem") : t("inventory.addItem")}</DialogTitle>
            <DialogDescription>{editingItem ? t("inventory.editItemDesc") : t("inventory.addItemDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>{t("inventory.productName")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("inventory.category")}</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as InventoryItem["category"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{t(`inventory.cat_${cat}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t("inventory.unit")}</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v as InventoryItem["unit"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["dona", "ml", "pachka", "quti", "juft"] as const).map((u) => (
                      <SelectItem key={u} value={u}>{t(`inventory.unit_${u}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t("inventory.quantity")}</Label>
              <Input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>{t("patients.cancel")}</Button>
            <Button onClick={handleSave}>{t("patients.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("inventory.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("inventory.deleteConfirmDesc", { name: deleteTarget?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("patients.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("inventory.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
