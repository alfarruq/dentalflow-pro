import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Package, Plus, Minus, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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

export default function Inventory() {
  const { t } = useTranslation();
  const [items, setItems] = useState<InventoryItem[]>(mockInventory);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", category: "anesteziya" as InventoryItem["category"], quantity: 0, unit: "dona" as InventoryItem["unit"] });

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

  const handleAdd = () => {
    if (!newItem.name.trim()) return;
    const item: InventoryItem = {
      id: `inv-${Date.now()}`,
      name: newItem.name.trim(),
      category: newItem.category,
      quantity: Math.max(0, newItem.quantity),
      unit: newItem.unit,
    };
    setItems((prev) => [item, ...prev]);
    setModalOpen(false);
    setNewItem({ name: "", category: "anesteziya", quantity: 0, unit: "dona" });
    toast.success(t("inventory.itemAdded"));
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
        <Button className="gap-1.5" onClick={() => setModalOpen(true)}>
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

      {/* Filters */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("inventory.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
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
                        <Badge variant="secondary" className="font-normal">
                          {t(`inventory.cat_${item.category}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => adjustQty(item.id, -1)}
                            disabled={item.quantity === 0}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-semibold tabular-nums">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => adjustQty(item.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t(`inventory.unit_${item.unit}`)}</TableCell>
                      <TableCell>
                        <Badge className={`border-0 ${cfg.className}`}>{t(cfg.label)}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Item Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("inventory.addItem")}</DialogTitle>
            <DialogDescription>{t("inventory.addItemDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>{t("inventory.productName")}</Label>
              <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("inventory.category")}</Label>
                <Select value={newItem.category} onValueChange={(v) => setNewItem({ ...newItem, category: v as InventoryItem["category"] })}>
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
                <Select value={newItem.unit} onValueChange={(v) => setNewItem({ ...newItem, unit: v as InventoryItem["unit"] })}>
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
              <Input type="number" min={0} value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>{t("patients.cancel")}</Button>
            <Button onClick={handleAdd}>{t("patients.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
