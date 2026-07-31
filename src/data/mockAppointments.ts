// Domain types for appointments. Data comes from the backend API
// (src/hooks/useAppointments.ts).

import type { TreatmentType } from "./mockPatients";

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  phone: string;
  /** "yyyy-MM-dd" */
  date: string;
  /** "HH:mm" */
  time: string;
  treatmentType: TreatmentType;
  /**
   * Backend's real treatment-type name (e.g. "Endo Pulpotek"), when the
   * appointment has one — `treatmentType` only has 3 fixed keys, so this is
   * what should be shown whenever it's available. Read-only: the backend
   * silently ignores `treatment_type` on both create and update (confirmed
   * live 2026-07-31), so it can't be set from this app yet.
   */
  treatmentTypeName?: string;
  toothNumber?: number;
  status: AppointmentStatus;
  notes: string;
  assignedDoctorId: string;
}
