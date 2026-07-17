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
  toothNumber?: number;
  status: AppointmentStatus;
  notes: string;
  assignedDoctorId: string;
}
