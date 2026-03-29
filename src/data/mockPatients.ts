export type TreatmentType = "implant" | "filling" | "cleaning";
export type PatientStatus = "pending" | "in_progress" | "completed";

export interface TreatmentRecord {
  id: string;
  date: string;
  treatmentType: TreatmentType;
  tooth: string;
  cost: number;
  note: string;
}

export interface Patient {
  id: string;
  fullName: string;
  phone: string;
  age: number;
  allergies: string[];
  medicalNotes: string;
  appointmentDate: string;
  treatmentType: TreatmentType;
  status: PatientStatus;
  totalCost: number;
  amountPaid: number;
  treatmentHistory: TreatmentRecord[];
  galleryImages: string[];
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

const allergyOptions = [
  "Lidokain", "Penisilin", "Lateks", "Aspirin", "Ibuprofen", "Yod",
];

const doctorNotes = [
  "Davolash rejaga muvofiq davom ettirildi.",
  "Bemor og'riqqa shikoyat qildi, qo'shimcha tekshiruv kerak.",
  "Implant muvaffaqiyatli o'rnatildi.",
  "Plomba qo'yildi, keyingi uchrashuv 2 haftadan keyin.",
  "Professional tozalash amalga oshirildi.",
  "Rentgen surati olindi, kariyes aniqlandi.",
  "Tish nervi olib tashlandi.",
  "Bemor holatini kuzatish kerak.",
];

const toothNumbers = [
  "11", "12", "13", "14", "15", "16", "17", "18",
  "21", "22", "23", "24", "25", "26", "27", "28",
  "31", "32", "33", "34", "35", "36", "37", "38",
  "41", "42", "43", "44", "45", "46", "47", "48",
];

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

    const age = 18 + Math.floor(rng() * 50);

    const numAllergies = Math.floor(rng() * 3);
    const allergies: string[] = [];
    for (let a = 0; a < numAllergies; a++) {
      const allergy = pick(allergyOptions);
      if (!allergies.includes(allergy)) allergies.push(allergy);
    }

    const historyCount = 1 + Math.floor(rng() * 5);
    const treatmentHistory: TreatmentRecord[] = Array.from({ length: historyCount }, (_, j) => {
      const hDay = Math.floor(rng() * 365);
      const hDate = new Date(2025, 0, 1 + hDay, 9 + Math.floor(rng() * 8), 0);
      const hTreatment = pick(treatments);
      const hCost = hTreatment === "implant"
        ? 2000000 + Math.floor(rng() * 3000000)
        : hTreatment === "filling"
          ? 300000 + Math.floor(rng() * 700000)
          : 150000 + Math.floor(rng() * 200000);
      return {
        id: `tr-${i + 1}-${j + 1}`,
        date: hDate.toISOString(),
        treatmentType: hTreatment,
        tooth: pick(toothNumbers),
        cost: hCost,
        note: pick(doctorNotes),
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const galleryCount = 1 + Math.floor(rng() * 4);
    const galleryImages = Array.from({ length: galleryCount }, (_, g) =>
      `/placeholder.svg`
    );

    const prefixes = ["90", "91", "93", "94", "95", "97", "98", "99"];
    const phonePrefix = pick(prefixes);
    const phoneNum = String(1000000 + Math.floor(rng() * 9000000));

    return {
      id: `p-${String(i + 1).padStart(3, "0")}`,
      fullName: `${pick(firstNames)} ${pick(lastNames)}`,
      phone: `+998${phonePrefix}${phoneNum}`,
      age,
      allergies,
      medicalNotes: allergies.length > 0 ? `Allergiya: ${allergies.join(", ")}` : "",
      appointmentDate: date.toISOString(),
      treatmentType: treatment,
      status,
      totalCost,
      amountPaid,
      treatmentHistory,
      galleryImages,
    };
  });
}

export const mockPatients = generateMockPatients();
