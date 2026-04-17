import { mockPatients } from "./mockPatients";
import { mockDoctors } from "./mockDoctors";

export type ReminderPriority = "low" | "normal" | "high";

export interface Reminder {
  id: string;
  patientId: string;
  patientName: string;
  phone: string;
  title: string;
  note: string;
  dueDate: string;
  dueTime: string;
  priority: ReminderPriority;
  completed: boolean;
  createdAt: string;
  assignedDoctorId: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const titleTemplates = [
  "Qo'ng'iroq qilish",
  "Nazorat tekshiruvi",
  "Davomiy muolaja",
  "Rentgen natijasini aytish",
  "Plomba tekshiruvi",
  "To'lovni eslatish",
  "Implant holatini ko'rish",
];

const noteTemplates = [
  "Bemor bilan bog'lanib, keyingi uchrashuvni belgilash kerak",
  "Davolash natijasini tekshirish vaqti keldi",
  "Bemorga sms yoki qo'ng'iroq yuborish",
  "Qo'shimcha maslahat kerak",
  "Muolaja keyingi bosqichi uchun chaqiruv",
  "",
];

const priorities: ReminderPriority[] = ["low", "normal", "high"];

export function generateMockReminders(): Reminder[] {
  const rng = seededRandom(77);
  const reminders: Reminder[] = [];
  const now = new Date();
  const sample = mockPatients.slice(0, 20);

  const activeDocs = mockDoctors.filter((d) => d.isActive);

  sample.forEach((patient, idx) => {
    const offsetDays = Math.floor(rng() * 14) - 2;
    const due = new Date(now);
    due.setDate(now.getDate() + offsetDays);
    const hour = 9 + Math.floor(rng() * 9);
    const minute = Math.floor(rng() * 2) * 30;
    const doctor = activeDocs[Math.floor(rng() * activeDocs.length)];
    reminders.push({
      id: `rem-${idx}-${patient.id}`,
      patientId: patient.id,
      patientName: patient.fullName,
      phone: patient.phone,
      title: titleTemplates[Math.floor(rng() * titleTemplates.length)],
      note: noteTemplates[Math.floor(rng() * noteTemplates.length)],
      dueDate: formatDate(due),
      dueTime: `${pad(hour)}:${pad(minute)}`,
      priority: priorities[Math.floor(rng() * priorities.length)],
      completed: rng() < 0.2 && offsetDays < 0,
      createdAt: formatDate(new Date(now.getTime() - Math.floor(rng() * 10) * 86400000)),
      assignedDoctorId: doctor.id,
    });
  });

  return reminders.sort((a, b) =>
    `${a.dueDate} ${a.dueTime}`.localeCompare(`${b.dueDate} ${b.dueTime}`)
  );
}

export const mockReminders: Reminder[] = generateMockReminders();
