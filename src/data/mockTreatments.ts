// Domain types for treatments. Data comes from the backend API — the patient
// detail endpoint supplies per-patient treatment info (see src/lib/api).

import type { TreatmentType } from "./mockPatients";

export type TreatmentStatus = "in_progress" | "completed";

/**
 * One course of treatment for a patient — the single source of truth for
 * a patient's treatment history, cost and payment status.
 */
export interface Treatment {
  id: string;
  patientId: string;
  date: string;            // ISO string — when the patient came in
  teeth: string[];         // e.g. ["16"] or ["11", "12"]
  treatmentType: TreatmentType;
  totalCost: number;
  amountPaid: number;
  status: TreatmentStatus;
  doctorId?: string;
  note?: string;
}
