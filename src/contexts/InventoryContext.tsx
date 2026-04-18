import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  mockInventory,
  mockUsages,
  InventoryItem,
  InventoryUsage,
} from "@/data/mockInventory";

interface UseItemParams {
  itemId: string;
  quantity: number;
  usedByDoctorId: string;
  note?: string;
  visitId?: string;
  treatmentId?: string;
}

interface InventoryContextType {
  items: InventoryItem[];
  usages: InventoryUsage[];

  addItem: (item: Omit<InventoryItem, "id">) => void;
  updateItem: (id: string, data: Partial<Omit<InventoryItem, "id">>) => void;
  deleteItem: (id: string) => void;
  adjustQty: (id: string, delta: number) => void;

  /** Consume stock and write a usage log entry */
  useItem: (params: UseItemParams) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

function todayStr() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>(mockInventory);
  const [usages, setUsages] = useState<InventoryUsage[]>(mockUsages);

  const addItem = useCallback((data: Omit<InventoryItem, "id">) => {
    setItems((prev) => [{ id: `inv-${Date.now()}`, ...data }, ...prev]);
  }, []);

  const updateItem = useCallback((id: string, data: Partial<Omit<InventoryItem, "id">>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...data } : i)));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const adjustQty = useCallback((id: string, delta: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
    );
  }, []);

  const useItem = useCallback(({ itemId, quantity, usedByDoctorId, note = "", visitId, treatmentId }: UseItemParams) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity - quantity) } : i
      )
    );
    setUsages((prev) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return prev;
      const entry: InventoryUsage = {
        id: `usage-${Date.now()}`,
        itemId,
        itemName: item.name,
        category: item.category,
        unit: item.unit,
        quantity,
        unitPrice: item.unitPrice,
        usedByDoctorId,
        usedAt: todayStr(),
        note,
        ...(visitId ? { visitId } : {}),
        ...(treatmentId ? { treatmentId } : {}),
      };
      return [entry, ...prev];
    });
  }, [items]);

  return (
    <InventoryContext.Provider
      value={{ items, usages, addItem, updateItem, deleteItem, adjustQty, useItem }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}
