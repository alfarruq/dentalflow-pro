export type TreatmentType = "implant" | "filling" | "cleaning";
export type PatientStatus = "pending" | "in_progress" | "completed";

export interface Patient {
  id: string;
  fullName: string;
  phone: string;
  appointmentDate: string;
  treatmentType: TreatmentType;
  status: PatientStatus;
  totalCost: number;
  amountPaid: number;
}

export function getRemainingBalance(p: Patient) {
  return p.totalCost - p.amountPaid;
}

const firstNames = [
  "Aziz", "Bobur", "Doniyor", "Eldor", "Farxod", "Gulnora", "Hilola", "Iroda",
  "Jasur", "Kamola", "Laziz", "Malika", "Nodir", "Olim", "Parviz", "Qobil",
  "Ravshan", "Sarvar", "Tahir", "Ulugbek", "Valijon", "Xurshid", "Yulduz",
  "Zafar", "Anvar", "Barno", "Dilshod", "Feruza", "Gʻayrat", "Hamid",
  "Islom", "Javlon", "Komil", "Lola", "Mansur", "Nargiza", "Otabek", "Rano",
  "Sherzod", "Timur",
];

const lastNames = [
  "Karimov", "Toshmatov", "Abdullayev", "Raximov", "Saidov", "Mirzayev",
  "Xolmatov", "Yusupov", "Nazarov", "Ergashev", "Turgunov", "Sharipov",
  "Umarov", "Jumayev", "Ismoilov", "Bobojonov", "Axmedov", "Qodirov",
  "Salimov", "Hasanov",
];

const treatments: TreatmentType[] = ["implant", "filling", "cleaning"];
const statuses: PatientStatus[] = ["pending", "in_progress", "completed"];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePhone(): string {
  const prefixes = ["90", "91", "93", "94", "95", "97", "98", "99"];
  const p = rand(prefixes);
  const n = String(Math.floor(1000000 + Math.random() * 9000000));
  return `+998${p}${n}`;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

export function generateMockPatients(): Patient[] {
  const rng = seededRandom(42);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];

  return Array.from({ length: 40 }, (_, i) => {
    const treatment = pick(treatments);
    const status = pick(statuses);
    const totalCost =
      treatment === "implant"
        ? 2000000 + Math.floor(rng() * 3000000)
        : treatment === "filling"
          ? 300000 + Math.floor(rng() * 700000)
          : 150000 + Math.floor(rng() * 200000);

    const paidRatio = status === "completed" ? 1 : rng() * 0.9;
    const amountPaid = Math.floor(totalCost * paidRatio);

    const day = Math.floor(rng() * 60) - 30;
    const date = new Date(2026, 2, 15 + day, 9 + Math.floor(rng() * 9), Math.floor(rng() * 4) * 15);

    return {
      id: `p-${String(i + 1).padStart(3, "0")}`,
      fullName: `${pick(firstNames)} ${pick(lastNames)}`,
      phone: generatePhone(),
      appointmentDate: date.toISOString(),
      treatmentType: treatment,
      status,
      totalCost,
      amountPaid,
    };
  });
}

export const mockPatients = generateMockPatients();
