import { mockPatients, TreatmentType } from "./mockPatients";

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  phone: string;
  date: string;
  time: string;
  treatmentType: TreatmentType;
  toothNumber?: number;
  status: AppointmentStatus;
  notes: string;
}

const treatments: TreatmentType[] = ["implant", "filling", "cleaning"];
const appointmentStatuses: AppointmentStatus[] = ["pending", "confirmed", "completed"];

const noteOptions = [
  "Birinchi tashrif",
  "Davomiy davolash",
  "Nazorat tekshiruvi",
  "Rentgen surati kerak",
  "Plomba almashtirish",
  "Implant tekshiruvi",
  "",
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

export function generateMockAppointments(): Appointment[] {
  const rng = seededRandom(99);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
  const appointments: Appointment[] = [];

  const today = new Date();
  // Generate for current week + surrounding days
  const timeSlots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00"];

  let id = 1;
  for (let dayOffset = -7; dayOffset <= 30; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);

    // 6-10 appointments per day
    const aptsPerDay = 6 + Math.floor(rng() * 5);
    const usedSlots = new Set<string>();

    for (let j = 0; j < aptsPerDay; j++) {
      let slot = pick(timeSlots);
      // avoid exact duplicates
      let attempts = 0;
      while (usedSlots.has(slot) && attempts < 20) {
        slot = pick(timeSlots);
        attempts++;
      }
      if (usedSlots.has(slot)) continue;
      usedSlots.add(slot);

      const patient = pick(mockPatients);
      const status: AppointmentStatus = dayOffset < 0 ? "completed" : pick(appointmentStatuses);
      const treatment = pick(treatments);
      const toothNumber = treatment !== "cleaning" ? Math.floor(rng() * 32) + 1 : undefined;

      appointments.push({
        id: `apt-${String(id++).padStart(3, "0")}`,
        patientId: patient.id,
        patientName: patient.fullName,
        phone: patient.phone,
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
        time: slot,
        treatmentType: treatment,
        toothNumber,
        status,
        notes: pick(noteOptions),
      });
    }
  }

  return appointments.sort((a, b) => {
    const da = `${a.date} ${a.time}`;
    const db = `${b.date} ${b.time}`;
    return da.localeCompare(db);
  });
}

export const mockAppointments = generateMockAppointments();

export function getTodayAppointments(): Appointment[] {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return mockAppointments.filter((a) => a.date === todayStr).sort((a, b) => a.time.localeCompare(b.time));
}
