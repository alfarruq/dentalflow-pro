import { parse } from "date-fns";
import type { Doctor, DoctorColor } from "@/data/mockDoctors";
import { doctorColorPalette } from "@/data/mockDoctors";
import type { Patient, TreatmentType, GalleryImage } from "@/data/mockPatients";
import type { Treatment, TreatmentStatus } from "@/data/mockTreatments";
import type { Appointment, AppointmentStatus } from "@/data/mockAppointments";
import type {
  DoctorDto,
  PatientListDto,
  PatientDetailDto,
  AppointmentDto,
  TreatmentTypeDto,
} from "./dto";

// ─── Treatment type name ↔ frontend key ───────────────────────────────────────
// The backend stores treatment types as free-form rows; the frontend uses fixed
// keys for i18n/colors. Matching is by seeded names until the backend exposes
// stable keys (see BACKEND_SPEC.md).

const TYPE_NAME_TO_KEY: Record<string, TreatmentType> = {
  Implant: "implant",
  Plomba: "filling",
  Tozalash: "cleaning",
};

export function treatmentTypeKeyFromName(name: string | null): TreatmentType {
  return (name && TYPE_NAME_TO_KEY[name]) || "cleaning";
}

/** Resolve a frontend treatment-type key to the backend row id. */
export function treatmentTypeIdForKey(types: TreatmentTypeDto[], key: TreatmentType): number | undefined {
  const wanted = Object.entries(TYPE_NAME_TO_KEY).find(([, k]) => k === key)?.[0];
  return types.find((t) => t.name === wanted)?.id ?? types[0]?.id;
}

// ─── Doctors ──────────────────────────────────────────────────────────────────

export function mapDoctor(dto: DoctorDto): Doctor {
  const color: DoctorColor = doctorColorPalette[dto.id % doctorColorPalette.length];
  return {
    id: String(dto.id),
    name: dto.full_name,
    specialty: dto.specialty ?? "",
    phone: dto.phone_number,
    email: dto.email ?? "",
    color,
    isActive: true,
  };
}

/** The API returns doctor as a display name; resolve back to an id via the loaded list. */
export function doctorIdByName(doctors: Doctor[], name: string | null): string | undefined {
  if (!name) return undefined;
  return doctors.find((d) => d.name === name)?.id;
}

// ─── Patients ─────────────────────────────────────────────────────────────────

function mapListStatus(status: string | null): TreatmentStatus {
  return status === "completed" ? "completed" : "in_progress";
}

export function mapPatientFromList(dto: PatientListDto, doctors: Doctor[]): Patient {
  let appointmentDate = new Date(0).toISOString();
  if (dto.appointment_date) {
    const parsed = parse(dto.appointment_date, "dd.MM.yyyy HH:mm", new Date());
    if (!isNaN(parsed.getTime())) appointmentDate = parsed.toISOString();
  }
  return {
    id: String(dto.id),
    fullName: dto.full_name,
    phone: dto.phone_number,
    age: 0,
    allergies: [],
    medicalNotes: "",
    appointmentDate,
    galleryImages: [],
    assignedDoctorId: doctorIdByName(doctors, dto.doctor),
    remaining: dto.remaining ?? 0,
    treatmentStatus: mapListStatus(dto.status),
    latestTreatmentType: dto.treatment_type ? treatmentTypeKeyFromName(dto.treatment_type) : undefined,
  };
}

export interface PatientDetailResult {
  patient: Patient;
  treatments: Treatment[];
  balance: { totalCost: number; paid: number; remaining: number };
}

export function mapPatientDetail(dto: PatientDetailDto, doctors: Doctor[]): PatientDetailResult {
  const doctorId = doctorIdByName(doctors, dto.doctor);

  const galleryImages: GalleryImage[] = dto.gallery.map((g) => ({
    id: String(g.id),
    url: g.image ?? "",
    date: new Date().toISOString(),
  }));

  const patient: Patient = {
    id: String(dto.id),
    fullName: dto.full_name,
    phone: dto.phone_number,
    age: dto.age ?? 0,
    allergies: [],
    medicalNotes: "",
    appointmentDate: new Date().toISOString(),
    galleryImages,
    assignedDoctorId: doctorId,
    treatmentStatus: mapListStatus(dto.status),
  };

  // The detail endpoint returns treatment types + tooth numbers, and the
  // first treatment's financials only — per-treatment costs need a dedicated
  // list endpoint (see BACKEND_SPEC.md).
  const treatments: Treatment[] = dto.treatment_type.map((tt, index) => ({
    id: `detail-${dto.id}-${index}`,
    patientId: String(dto.id),
    date: new Date().toISOString(),
    teeth: tt.tooth_number > 0 ? [String(tt.tooth_number)] : [],
    treatmentType: treatmentTypeKeyFromName(tt.name),
    totalCost: index === 0 ? dto.total_treatment_cost : 0,
    amountPaid: index === 0 ? dto.total_paid : 0,
    status: index === 0 && dto.remaining <= 0 && dto.total_treatment_cost > 0 ? "completed" : "in_progress",
    doctorId,
  }));

  return {
    patient,
    treatments,
    balance: {
      totalCost: dto.total_treatment_cost,
      paid: dto.total_paid,
      remaining: dto.remaining,
    },
  };
}

// ─── Appointments ─────────────────────────────────────────────────────────────

function mapAppointmentStatus(status: string): AppointmentStatus {
  if (status === "completed") return "completed";
  if (status === "in_progress") return "confirmed";
  return "pending";
}

/** Frontend statuses → the backend's pending/in_progress/completed set. */
export function appointmentStatusToApi(status: AppointmentStatus): string {
  if (status === "completed") return "completed";
  if (status === "confirmed") return "in_progress";
  return "pending";
}

export function mapAppointment(dto: AppointmentDto, doctors: Doctor[]): Appointment {
  return {
    id: String(dto.id),
    patientId: "",
    patientName: dto.patient,
    phone: "",
    date: dto.date,
    time: dto.time.slice(0, 5),
    treatmentType: treatmentTypeKeyFromName(dto.treatment_type),
    toothNumber: dto.tooth_number ?? undefined,
    status: mapAppointmentStatus(dto.status),
    notes: dto.notes ?? "",
    assignedDoctorId: doctorIdByName(doctors, dto.doctor) ?? "",
  };
}
