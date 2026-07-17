// ─── Service template ─────────────────────────────────────────────────────────

export interface ServiceTemplate {
  id: string;
  name: string;
  price: number;          // default cost offered to patient
  duration: number;       // minutes per visit
  active: boolean;
}

// ─── Default templates ─────────────────────────────────────────────────────────

export const defaultServiceTemplates: ServiceTemplate[] = [
  {
    id: "svc-1",
    name: "Implant o'rnatish",
    price: 3_500_000,
    duration: 90,
    active: true,
  },
  {
    id: "svc-2",
    name: "Plomba (Kompozit A2)",
    price: 400_000,
    duration: 45,
    active: true,
  },
  {
    id: "svc-3",
    name: "Plomba (Glass Ionomer)",
    price: 280_000,
    duration: 40,
    active: true,
  },
  {
    id: "svc-4",
    name: "Professional tozalash",
    price: 250_000,
    duration: 40,
    active: true,
  },
];
