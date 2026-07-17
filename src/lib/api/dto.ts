/**
 * Backend response/request shapes, verified against the live API (Swagger +
 * manual probes). Field names intentionally mirror the backend exactly —
 * conversion to frontend domain models happens only in mappers.ts.
 */

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginResponseDto {
  message: string;
  result: {
    access_token: string;
    refresh_token: string;
  };
}

export interface UserMeDto {
  full_name: string;
  specialty: string | null;
  phone_number: string;
  email: string | null;
  experience: number | null;
  biography: string | null;
  image: string | null;
}

// ─── Doctors ──────────────────────────────────────────────────────────────────

export interface DoctorDto {
  id: number;
  full_name: string;
  specialty: string | null;
  phone_number: string;
  email: string | null;
}

export interface DoctorWriteDto {
  full_name: string;
  specialty?: string;
  phone_number: string;
  email?: string;
}

// ─── Patients ─────────────────────────────────────────────────────────────────

export interface PatientListDto {
  id: number;
  full_name: string;
  phone_number: string;
  /** "dd.MM.yyyy HH:mm" of the latest appointment, or null. */
  appointment_date: string | null;
  /** Latest treatment's type name, or null. */
  treatment_type: string | null;
  /** Latest appointment status: pending | in_progress | completed, or null. */
  status: string | null;
  /** Assigned doctor's full name, or null. */
  doctor: string | null;
  remaining: number | null;
}

export interface PatientWriteDto {
  full_name: string;
  phone_number: string;
  /** Doctor user id. */
  doctor?: number | null;
}

export interface PatientDetailTreatmentDto {
  id: number;
  name: string;
  tooth_number: number;
}

export interface GalleryImageDto {
  id: number;
  image: string | null;
}

export interface PatientDetailDto {
  id: number;
  full_name: string;
  phone_number: string;
  doctor: string | null;
  image: string | null;
  age: number | null;
  status: string | null;
  total_treatment_cost: number;
  total_paid: number;
  remaining: number;
  visit_number: number;
  treatment_type: PatientDetailTreatmentDto[];
  gallery: GalleryImageDto[];
}

// ─── Treatments ───────────────────────────────────────────────────────────────

export interface TreatmentTypeDto {
  id: number;
  name: string;
}

export interface TreatmentWriteDto {
  patient: number;
  doctor?: number | null;
  treatment_type: number;
  total_treatment_cost: number;
  total_paid: number;
  visit_number: number;
  tooth_number: number;
  /** "yyyy-MM-dd" */
  start_date: string;
  notes?: string;
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export interface AppointmentDto {
  id: number;
  /** Patient full name (backend returns the display string, not an id). */
  patient: string;
  /** Doctor full name. */
  doctor: string;
  /** "yyyy-MM-dd" */
  date: string;
  /** "HH:mm:ss" */
  time: string;
  notes: string | null;
  status: string;
  treatment_type: string | null;
  tooth_number: number | null;
}

export interface AppointmentWriteDto {
  /** Existing patient id — or omit and pass full_name + phone_number instead. */
  patient?: number | null;
  full_name?: string | null;
  phone_number?: string | null;
  doctor: number;
  date: string;
  time: string;
  notes?: string;
  status?: string;
}
