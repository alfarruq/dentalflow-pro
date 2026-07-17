// Domain types for patients. Data itself now comes from the backend API
// (src/lib/api) — this module only defines the frontend model shapes.

export type TreatmentType = "implant" | "filling" | "cleaning";

export const TREATMENT_TYPE_LABELS: Record<TreatmentType, string> = {
  implant: "Implant",
  filling: "Plomba",
  cleaning: "Tozalash",
};

export interface GalleryImage {
  id: string;
  url: string;
  date: string;
}

export interface Patient {
  id: string;
  fullName: string;
  phone: string;
  age: number;
  allergies: string[];
  medicalNotes: string;
  appointmentDate: string;
  galleryImages: GalleryImage[];
  assignedDoctorId?: string;
  birthYear?: number;
  address?: string;
  workplace?: string;
  /** Server-side aggregates provided by the patient list/detail endpoints. */
  remaining?: number;
  treatmentStatus?: "in_progress" | "completed";
  latestTreatmentType?: TreatmentType;
}
