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

/** PATCH /authentication/update/<id>/ body (image is read-only, set via upload elsewhere). */
export interface UserUpdateDto {
  full_name: string;
  phone_number: string;
  specialty?: string | null;
  email?: string | null;
  experience?: number | null;
  biography?: string | null;
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

// ─── Pagination ───────────────────────────────────────────────────────────────

/** Standard DRF PageNumberPagination envelope (confirmed against the live API). */
export interface PaginatedDto<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
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
  /** "yyyy-MM-dd" */
  birth_date?: string;
  address?: string;
  /** Workplace / place of study. */
  office?: string;
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
  /** Not yet returned by the detail serializer — present once the backend adds it. */
  address?: string | null;
  /** Workplace / place of study; see `address`. */
  office?: string | null;
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
  price: number | null;
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
  /** Patient row id (FK), or null. */
  patient_id: number | null;
  /** Patient full name (display string). */
  patient: string;
  /** Patient phone number, or null. */
  phone_number: string | null;
  /** Doctor row id (FK), or null. */
  doctor_id: number | null;
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
  /** Backend enum — new appointments default to "in_progress". */
  status?: "in_progress" | "completed";
}

// ─── Recipes (prescriptions) ──────────────────────────────────────────────────

export interface MedicineWriteDto {
  name: string;
  /** Dose amount as a whole number (the unit lives in `type`). */
  dose: number;
  /** Dose form key — "tablet" | "capsule" | … */
  type: string;
  /** Frequency key — "od" | "bid" | "tid" | … */
  frequency: string;
  /** Total duration in DAYS (weeks are normalised before sending). */
  duration: number;
  /** Meal relation key — "before" | "after" | "with" | "none" */
  meal: string;
  /** Offset from the meal, in minutes (0 when not applicable). */
  minutes: number;
}

export interface RecipeWriteDto {
  patient?: number;
  doctor?: number;
  notes?: string;
  /** The only field the API marks required. */
  medicines: MedicineWriteDto[];
}

export interface RecipeDto {
  id: number;
  /** Display name, not an id (same shape quirk as appointments). */
  patient: string;
  doctor: string;
  notes: string | null;
  /** ISO 8601 with offset — stamped by the backend on create. */
  created_at: string;
  medicines: (MedicineWriteDto & { id: number })[];
}
