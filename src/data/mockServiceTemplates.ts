import type { DentalTreatmentType } from "./mockTreatments";

// ─── Shared material type ─────────────────────────────────────────────────────
// Used by both ServiceTemplate and Treatment.plannedMaterials

export interface ServiceMaterial {
  itemId: string;       // FK → InventoryItem.id
  itemName: string;     // denormalized for fast display
  unit: string;         // denormalized (dona / ml / pachka …)
  plannedQty: number;   // how many units consumed per service/visit
}

// ─── Service template ─────────────────────────────────────────────────────────

export interface ServiceTemplate {
  id: string;
  name: string;
  treatmentType: DentalTreatmentType;
  price: number;          // default cost offered to patient
  duration: number;       // minutes per visit
  active: boolean;
  materials: ServiceMaterial[];
}

// ─── Default templates (linked to mock inventory item IDs) ────────────────────

export const defaultServiceTemplates: ServiceTemplate[] = [
  {
    id: "svc-1",
    name: "Implant o'rnatish",
    treatmentType: "implant",
    price: 3_500_000,
    duration: 90,
    active: true,
    materials: [
      { itemId: "inv-23", itemName: "Implant ti'lar",       unit: "dona",   plannedQty: 1 },
      { itemId: "inv-2",  itemName: "Artikain 4%",           unit: "dona",   plannedQty: 2 },
      { itemId: "inv-24", itemName: "Sement fiksatsiya",    unit: "dona",   plannedQty: 1 },
      { itemId: "inv-18", itemName: "Lateks qo'lqop",        unit: "quti",   plannedQty: 1 },
      { itemId: "inv-19", itemName: "Steril salfetkalar",   unit: "pachka", plannedQty: 1 },
    ],
  },
  {
    id: "svc-2",
    name: "Plomba (Kompozit A2)",
    treatmentType: "filling",
    price: 400_000,
    duration: 45,
    active: true,
    materials: [
      { itemId: "inv-5",  itemName: "Kompozit plomba A2",   unit: "dona",   plannedQty: 1 },
      { itemId: "inv-9",  itemName: "Adgeziv sistema",      unit: "ml",     plannedQty: 2 },
      { itemId: "inv-1",  itemName: "Lidokain 2%",           unit: "dona",   plannedQty: 1 },
      { itemId: "inv-14", itemName: "Matritsalar",           unit: "pachka", plannedQty: 1 },
      { itemId: "inv-18", itemName: "Lateks qo'lqop",        unit: "quti",   plannedQty: 1 },
    ],
  },
  {
    id: "svc-3",
    name: "Plomba (Glass Ionomer)",
    treatmentType: "filling",
    price: 280_000,
    duration: 40,
    active: true,
    materials: [
      { itemId: "inv-8",  itemName: "Glass ionomer sement", unit: "dona",   plannedQty: 1 },
      { itemId: "inv-1",  itemName: "Lidokain 2%",           unit: "dona",   plannedQty: 1 },
      { itemId: "inv-18", itemName: "Lateks qo'lqop",        unit: "quti",   plannedQty: 1 },
    ],
  },
  {
    id: "svc-4",
    name: "Toj (Koronka) o'rnatish",
    treatmentType: "crown",
    price: 1_800_000,
    duration: 60,
    active: true,
    materials: [
      { itemId: "inv-21", itemName: "Toj (Koronka)",         unit: "dona",   plannedQty: 1 },
      { itemId: "inv-24", itemName: "Sement fiksatsiya",    unit: "dona",   plannedQty: 1 },
      { itemId: "inv-22", itemName: "Quyma modeli gips",    unit: "pachka", plannedQty: 1 },
      { itemId: "inv-1",  itemName: "Lidokain 2%",           unit: "dona",   plannedQty: 1 },
      { itemId: "inv-18", itemName: "Lateks qo'lqop",        unit: "quti",   plannedQty: 1 },
    ],
  },
  {
    id: "svc-5",
    name: "Professional tozalash",
    treatmentType: "cleaning",
    price: 250_000,
    duration: 40,
    active: true,
    materials: [
      { itemId: "inv-15", itemName: "Profilaktik pasta",       unit: "dona", plannedQty: 1 },
      { itemId: "inv-16", itemName: "Ftorli lak",              unit: "ml",   plannedQty: 2 },
      { itemId: "inv-13", itemName: "Skaler uchlari",          unit: "dona", plannedQty: 1 },
      { itemId: "inv-17", itemName: "Og'iz yuvish vositasi",   unit: "dona", plannedQty: 1 },
      { itemId: "inv-18", itemName: "Lateks qo'lqop",          unit: "quti", plannedQty: 1 },
    ],
  },
  {
    id: "svc-6",
    name: "Tish sug'urish",
    treatmentType: "extraction",
    price: 300_000,
    duration: 30,
    active: true,
    materials: [
      { itemId: "inv-2",  itemName: "Artikain 4%",           unit: "dona",   plannedQty: 2 },
      { itemId: "inv-18", itemName: "Lateks qo'lqop",        unit: "quti",   plannedQty: 1 },
      { itemId: "inv-19", itemName: "Steril salfetkalar",   unit: "pachka", plannedQty: 1 },
    ],
  },
  {
    id: "svc-7",
    name: "Tish oqartirish",
    treatmentType: "whitening",
    price: 1_200_000,
    duration: 60,
    active: true,
    materials: [
      { itemId: "inv-15", itemName: "Profilaktik pasta",      unit: "dona", plannedQty: 1 },
      { itemId: "inv-17", itemName: "Og'iz yuvish vositasi",  unit: "dona", plannedQty: 1 },
      { itemId: "inv-18", itemName: "Lateks qo'lqop",         unit: "quti", plannedQty: 1 },
    ],
  },
  {
    id: "svc-8",
    name: "Boshqa muolaja",
    treatmentType: "other",
    price: 300_000,
    duration: 30,
    active: true,
    materials: [
      { itemId: "inv-1",  itemName: "Lidokain 2%",      unit: "dona", plannedQty: 1 },
      { itemId: "inv-18", itemName: "Lateks qo'lqop",   unit: "quti", plannedQty: 1 },
    ],
  },
];
