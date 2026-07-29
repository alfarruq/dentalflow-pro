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
  /**
   * Backend's real treatment-type name (e.g. "Endo Pulpotek"), when known.
   * `treatmentType` only has 3 fixed keys, so the real name — not the coerced
   * key's label — is what should be shown whenever it's available.
   */
  treatmentTypeName?: string;
  totalCost: number;
  amountPaid: number;
  status: TreatmentStatus;
  doctorId?: string;
  note?: string;
  /** Backend's visit_number — round-tripped so editing never silently resets it to 1. */
  visitNumber?: number;
}
