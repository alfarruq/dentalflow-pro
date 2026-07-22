// ─── Service template ─────────────────────────────────────────────────────────

export interface ServiceTemplate {
  id: string;
  name: string;
  price: number;          // default cost offered to patient
  duration: number;       // minutes per visit
  active: boolean;
  treatmentTypeId: number;
  treatmentTypeName: string;
}
