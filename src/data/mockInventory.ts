export interface InventoryItem {
  id: string;
  name: string;
  category: "anesteziya" | "plomba" | "asboblar" | "gigiyena" | "ortopediya";
  quantity: number;
  unit: "dona" | "ml" | "pachka" | "quti" | "juft";
  unitPrice: number;
}

export const mockInventory: InventoryItem[] = [
  { id: "inv-1", name: "Lidokain 2%", category: "anesteziya", quantity: 25, unit: "dona", unitPrice: 20000 },
  { id: "inv-2", name: "Artikain 4%", category: "anesteziya", quantity: 8, unit: "dona", unitPrice: 35000 },
  { id: "inv-3", name: "Ultrakain D-S", category: "anesteziya", quantity: 0, unit: "dona", unitPrice: 45000 },
  { id: "inv-4", name: "Septanest", category: "anesteziya", quantity: 15, unit: "dona", unitPrice: 28000 },
  { id: "inv-5", name: "Kompozit plomba A2", category: "plomba", quantity: 12, unit: "dona", unitPrice: 80000 },
  { id: "inv-6", name: "Kompozit plomba A3", category: "plomba", quantity: 3, unit: "dona", unitPrice: 80000 },
  { id: "inv-7", name: "Vaqtinchalik plomba", category: "plomba", quantity: 20, unit: "dona", unitPrice: 15000 },
  { id: "inv-8", name: "Glass ionomer sement", category: "plomba", quantity: 6, unit: "dona", unitPrice: 120000 },
  { id: "inv-9", name: "Adgeziv sistema", category: "plomba", quantity: 4, unit: "ml", unitPrice: 250000 },
  { id: "inv-10", name: "Stomatologik bor to'plami", category: "asboblar", quantity: 10, unit: "dona", unitPrice: 95000 },
  { id: "inv-11", name: "Endodontik fayllar", category: "asboblar", quantity: 2, unit: "pachka", unitPrice: 180000 },
  { id: "inv-12", name: "Shtift metallar", category: "asboblar", quantity: 0, unit: "pachka", unitPrice: 150000 },
  { id: "inv-13", name: "Skaler uchlari", category: "asboblar", quantity: 7, unit: "dona", unitPrice: 65000 },
  { id: "inv-14", name: "Matritsalar", category: "asboblar", quantity: 14, unit: "pachka", unitPrice: 40000 },
  { id: "inv-15", name: "Profilaktik pasta", category: "gigiyena", quantity: 18, unit: "dona", unitPrice: 35000 },
  { id: "inv-16", name: "Ftorli lak", category: "gigiyena", quantity: 5, unit: "ml", unitPrice: 55000 },
  { id: "inv-17", name: "Og'iz yuvish vositasi", category: "gigiyena", quantity: 30, unit: "dona", unitPrice: 25000 },
  { id: "inv-18", name: "Lateks qo'lqop", category: "gigiyena", quantity: 9, unit: "quti", unitPrice: 50000 },
  { id: "inv-19", name: "Steril salfetkalar", category: "gigiyena", quantity: 0, unit: "pachka", unitPrice: 30000 },
  { id: "inv-20", name: "Qoplama (Vinir)", category: "ortopediya", quantity: 11, unit: "dona", unitPrice: 350000 },
  { id: "inv-21", name: "Toj (Koronka)", category: "ortopediya", quantity: 6, unit: "dona", unitPrice: 280000 },
  { id: "inv-22", name: "Quyma modeli gips", category: "ortopediya", quantity: 3, unit: "pachka", unitPrice: 90000 },
  { id: "inv-23", name: "Implant ti'lar", category: "ortopediya", quantity: 1, unit: "dona", unitPrice: 2500000 },
  { id: "inv-24", name: "Sement fiksatsiya", category: "ortopediya", quantity: 8, unit: "dona", unitPrice: 75000 },
  { id: "inv-25", name: "Nitril qo'lqop", category: "gigiyena", quantity: 22, unit: "quti", unitPrice: 50000 },
];

export const categories = ["anesteziya", "plomba", "asboblar", "gigiyena", "ortopediya"] as const;
