// Domain types for prescriptions. This module is still frontend-only —
// the backend has no prescriptions API yet (see BACKEND_SPEC.md), so the
// PrescriptionsContext keeps records in memory during the session.

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  schedule: string;
  duration: string;
}

export interface Prescription {
  id: string;
  treatmentId: string;
  date: string;
  doctorId?: string;
  note?: string;
  medications: Medication[];
}

export const mockPrescriptions: Prescription[] = [];
