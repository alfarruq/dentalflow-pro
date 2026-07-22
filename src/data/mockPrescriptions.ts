// Domain types for prescriptions. This module is still frontend-only —
// the backend has no prescriptions API yet (see BACKEND_SPEC.md), so the
// PrescriptionsContext keeps records in memory during the session.

import type { DoseForm, DurationUnit, Frequency, MealRelation } from "./medicationCatalog";

export interface Medication {
  id: string;
  name: string;
  // Human-readable strings, composed from the structured fields below when the
  // prescription is saved. Everything that only displays a medication (the
  // treatment card, the prescriptions tab, the printable sheet) reads these.
  dosage: string;
  schedule: string;
  duration: string;
  // Structured values, kept so the editor can reopen a row exactly as it was
  // written. Optional: records created before the structured editor only carry
  // the strings above.
  doseAmount?: string;
  doseForm?: DoseForm;
  frequency?: Frequency;
  durationAmount?: string;
  durationUnit?: DurationUnit;
  mealRelation?: MealRelation;
  mealOffsetMinutes?: string;
}

// A prescription is a standalone record of the patient, filed under the
// patient's "Prescriptions" section and NOT tied to a treatment. There is no
// date field: the backend stamps one automatically on create.
export interface Prescription {
  id: string;
  /** Empty for records read back from the API, which return a name only. */
  patientId: string;
  /** Set when the record came from the API (matched by name until it returns an id). */
  patientName?: string;
  doctorId?: string;
  note?: string;
  medications: Medication[];
}

export const mockPrescriptions: Prescription[] = [];
