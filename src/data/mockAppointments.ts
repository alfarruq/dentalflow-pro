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

  const today = new Date(2026, 2, 30);

  // Generate appointments spanning -3 days to +35 days from today
  for (let i = 0; i < 60; i++) {
    const dayOffset = Math.floor(rng() * 38) - 3;
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);

    const hour = 9 + Math.floor(rng() * 9); // 9-17
    const minute = Math.floor(rng() * 4) * 15; // 0, 15, 30, 45

    const patient = pick(mockPatients);
    const status: AppointmentStatus = dayOffset < 0 ? "completed" : pick(appointmentStatuses);

    appointments.push({
      id: `apt-${String(i + 1).padStart(3, "0")}`,
      patientId: patient.id,
      patientName: patient.fullName,
      phone: patient.phone,
      date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      treatmentType: pick(treatments),
      status,
      notes: pick(noteOptions),
    });
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
