import { mockPatients } from "./mockPatients";
import { mockDoctors } from "./mockDoctors";
import type { ServiceMaterial } from "./mockServiceTemplates";
export type { ServiceMaterial };

// ─── Types ────────────────────────────────────────────────────────────────────

export type TreatmentStatus = "planned" | "in_progress" | "completed" | "cancelled";
export type VisitStatus     = "scheduled" | "completed" | "missed";
export type PaymentMethod   = "cash" | "card" | "transfer";

export type DentalTreatmentType =
  | "implant"
  | "filling"
  | "crown"
  | "cleaning"
  | "extraction"
  | "whitening"
  | "other";

/**
 * One course of treatment for a specific tooth (or teeth).
 * Maps 1:1 to a DB row — no nested arrays.
 */
export interface Treatment {
  id: string;
  patientId: string;
  toothNumbers: string[];          // ["16"] or ["11", "12"] for multi-tooth
  type: DentalTreatmentType;
  title: string;                   // "Implant — #16"
  totalCost: number;               // agreed price
  status: TreatmentStatus;
  assignedDoctorId: string;
  startDate: string;               // "yyyy-MM-dd"
  endDate?: string;
  plannedVisits: number;
  notes: string;
  templateId?: string;                  // FK → ServiceTemplate.id
  plannedMaterials?: ServiceMaterial[]; // copied from template at creation
}

/**
 * A single visit tied to a Treatment.
 * patientId is denormalized for fast per-patient queries.
 */
export interface TreatmentVisit {
  id: string;
  treatmentId: string;
  patientId: string;               // denormalized
  assignedDoctorId: string;
  visitNumber: number;             // 1, 2, 3 …
  date: string;                    // "yyyy-MM-dd"
  time: string;                    // "HH:mm"
  status: VisitStatus;
  notes: string;
}

/**
 * A single payment tied to a Treatment (can be split across visits).
 * patientId is denormalized for fast per-patient queries.
 */
export interface TreatmentPayment {
  id: string;
  treatmentId: string;
  patientId: string;               // denormalized
  amount: number;
  date: string;                    // "yyyy-MM-dd"
  method: PaymentMethod;
  note: string;
}

// ─── Tooth → status mapping ───────────────────────────────────────────────────

export const treatmentToToothStatus: Record<DentalTreatmentType, string> = {
  implant:    "implant",
  filling:    "treated",
  crown:      "treated",
  cleaning:   "healthy",
  extraction: "missing",
  whitening:  "healthy",
  other:      "treated",
};

export const TREATMENT_TYPE_LABELS: Record<DentalTreatmentType, string> = {
  implant:    "Implant",
  filling:    "Plomba",
  crown:      "Toj",
  cleaning:   "Tozalash",
  extraction: "Tish sug'urish",
  whitening:  "Oqartirish",
  other:      "Boshqa",
};

/** Approximate base cost range per type (for mock generation) */
const COST_RANGE: Record<DentalTreatmentType, [number, number]> = {
  implant:    [3_000_000, 8_000_000],
  filling:    [300_000,   900_000],
  crown:      [1_200_000, 3_500_000],
  cleaning:   [150_000,   400_000],
  extraction: [200_000,   600_000],
  whitening:  [800_000,   2_500_000],
  other:      [200_000,   1_000_000],
};

const PLANNED_VISITS: Record<DentalTreatmentType, number[]> = {
  implant:    [3, 4],
  filling:    [1, 2],
  crown:      [2, 3],
  cleaning:   [1],
  extraction: [1],
  whitening:  [1, 2],
  other:      [1, 2],
};

const TOOTH_NUMBERS = [
  "11","12","13","14","15","16","17","18",
  "21","22","23","24","25","26","27","28",
  "31","32","33","34","35","36","37","38",
  "41","42","43","44","45","46","47","48",
];

const TREATMENT_NOTES = [
  "Birlamchi ko'rik o'tkazildi, davolash rejasi tuzildi.",
  "Bemor og'riqqa shikoyat qildi, rentgen tayin etildi.",
  "Muolaja muvaffaqiyatli yakunlandi.",
  "Keyingi uchrashuvga qadar kuzatish tavsiya etildi.",
  "Anesteziya yaxshi ta'sir ko'rsatdi.",
  "Davolash davom ettirildi, dinamika ijobiy.",
  "Bemor uyda parvarish qilish bo'yicha ko'rsatma oldi.",
  "",
];

// ─── Seeded random ────────────────────────────────────────────────────────────

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2_147_483_647;
    return s / 2_147_483_647;
  };
}

// ─── Generators ───────────────────────────────────────────────────────────────

function dateStr(base: Date, offsetDays: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function randomInt(rng: () => number, min: number, max: number) {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function generateMockData(): {
  treatments: Treatment[];
  visits: TreatmentVisit[];
  payments: TreatmentPayment[];
} {
  const rng = seededRandom(777);
  const now = new Date();

  const treatments: Treatment[] = [];
  const visits: TreatmentVisit[]  = [];
  const payments: TreatmentPayment[] = [];

  const allTypes: DentalTreatmentType[] = [
    "implant","filling","crown","cleaning","extraction","whitening","other",
  ];

  let tIdx = 1;
  let vIdx = 1;
  let pIdx = 1;

  for (const patient of mockPatients) {
    const doctor = pick(rng, mockDoctors.filter((d) => d.isActive));

    // 1-3 completed treatments (historical)
    const completedCount = randomInt(rng, 1, 3);
    for (let c = 0; c < completedCount; c++) {
      const type    = pick(rng, allTypes);
      const [lo, hi] = COST_RANGE[type];
      const totalCost = randomInt(rng, lo / 100_000, hi / 100_000) * 100_000;
      const planned   = pick(rng, PLANNED_VISITS[type]);
      const tooth     = pick(rng, TOOTH_NUMBERS);
      const startOff  = randomInt(rng, -365, -60);   // 2+ months ago
      const startDate = dateStr(now, startOff);
      const endDate   = dateStr(now, startOff + planned * 7 + randomInt(rng, 0, 7));

      const tId = `t-${String(tIdx++).padStart(4, "0")}`;
      treatments.push({
        id: tId,
        patientId: patient.id,
        toothNumbers: [tooth],
        type,
        title: `${TREATMENT_TYPE_LABELS[type]} — #${tooth}`,
        totalCost,
        status: "completed",
        assignedDoctorId: doctor.id,
        startDate,
        endDate,
        plannedVisits: planned,
        notes: pick(rng, TREATMENT_NOTES),
      });

      // visits — all completed
      for (let v = 1; v <= planned; v++) {
        visits.push({
          id: `v-${String(vIdx++).padStart(4, "0")}`,
          treatmentId: tId,
          patientId: patient.id,
          assignedDoctorId: doctor.id,
          visitNumber: v,
          date: dateStr(new Date(startDate), (v - 1) * 7),
          time: `${randomInt(rng, 9, 17).toString().padStart(2, "0")}:${pick(rng, ["00","30"])}`,
          status: "completed",
          notes: pick(rng, TREATMENT_NOTES),
        });
      }

      // payments — 1-3 instalments, totalling totalCost
      const pCount = Math.min(planned, randomInt(rng, 1, 3));
      const methods: PaymentMethod[] = ["cash", "card", "transfer"];
      let remaining = totalCost;
      for (let pi = 0; pi < pCount; pi++) {
        const amount = pi === pCount - 1
          ? remaining
          : Math.round(remaining * (0.3 + rng() * 0.4) / 100_000) * 100_000;
        remaining -= amount;
        payments.push({
          id: `pay-${String(pIdx++).padStart(4, "0")}`,
          treatmentId: tId,
          patientId: patient.id,
          amount,
          date: dateStr(new Date(startDate), pi * 7),
          method: pick(rng, methods),
          note: "",
        });
      }
    }

    // ~40% chance of 1 in_progress treatment
    if (rng() < 0.4) {
      const type     = pick(rng, ["implant","filling","crown"] as DentalTreatmentType[]);
      const [lo, hi] = COST_RANGE[type];
      const totalCost = randomInt(rng, lo / 100_000, hi / 100_000) * 100_000;
      const planned   = pick(rng, PLANNED_VISITS[type]);
      const tooth     = pick(rng, TOOTH_NUMBERS);
      const startOff  = randomInt(rng, -30, -7);
      const startDate = dateStr(now, startOff);
      const doneVisits = Math.max(1, planned - 1);

      const tId = `t-${String(tIdx++).padStart(4, "0")}`;
      treatments.push({
        id: tId,
        patientId: patient.id,
        toothNumbers: [tooth],
        type,
        title: `${TREATMENT_TYPE_LABELS[type]} — #${tooth}`,
        totalCost,
        status: "in_progress",
        assignedDoctorId: doctor.id,
        startDate,
        plannedVisits: planned,
        notes: pick(rng, TREATMENT_NOTES),
      });

      for (let v = 1; v <= planned; v++) {
        const done  = v <= doneVisits;
        const dOff  = (v - 1) * 7;
        visits.push({
          id: `v-${String(vIdx++).padStart(4, "0")}`,
          treatmentId: tId,
          patientId: patient.id,
          assignedDoctorId: doctor.id,
          visitNumber: v,
          date: dateStr(new Date(startDate), dOff),
          time: `${randomInt(rng, 9, 17).toString().padStart(2, "0")}:${pick(rng, ["00","30"])}`,
          status: done ? "completed" : "scheduled",
          notes: done ? pick(rng, TREATMENT_NOTES) : "",
        });
      }

      // partial payment
      const paidRatio = 0.3 + rng() * 0.4;
      payments.push({
        id: `pay-${String(pIdx++).padStart(4, "0")}`,
        treatmentId: tId,
        patientId: patient.id,
        amount: Math.round(totalCost * paidRatio / 100_000) * 100_000,
        date: startDate,
        method: pick(rng, ["cash","card"] as PaymentMethod[]),
        note: "Avans to'lov",
      });
    }
  }

  return { treatments, visits, payments };
}

const { treatments, visits, payments } = generateMockData();

export const mockTreatments: Treatment[]        = treatments;
export const mockTreatmentVisits: TreatmentVisit[] = visits;
export const mockTreatmentPayments: TreatmentPayment[] = payments;
