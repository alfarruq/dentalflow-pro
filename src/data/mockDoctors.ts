export type DoctorColor = "blue" | "emerald" | "amber" | "purple" | "rose" | "cyan" | "orange";

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  email: string;
  color: DoctorColor;
  isActive: boolean;
}

export const doctorColorPalette: DoctorColor[] = [
  "blue", "emerald", "amber", "purple", "rose", "cyan", "orange",
];

export const doctorColorMap: Record<DoctorColor, {
  text: string;
  bgSoft: string;
  border: string;
  dot: string;
  chipActive: string;
  chipInactive: string;
}> = {
  blue: {
    text: "text-blue-700 dark:text-blue-300",
    bgSoft: "bg-blue-100 dark:bg-blue-900/30",
    border: "border-blue-500/40",
    dot: "bg-blue-500",
    chipActive: "bg-blue-500 text-white border-blue-500",
    chipInactive: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/60",
  },
  emerald: {
    text: "text-emerald-700 dark:text-emerald-300",
    bgSoft: "bg-emerald-100 dark:bg-emerald-900/30",
    border: "border-emerald-500/40",
    dot: "bg-emerald-500",
    chipActive: "bg-emerald-500 text-white border-emerald-500",
    chipInactive: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/60",
  },
  amber: {
    text: "text-amber-700 dark:text-amber-300",
    bgSoft: "bg-amber-100 dark:bg-amber-900/30",
    border: "border-amber-500/40",
    dot: "bg-amber-500",
    chipActive: "bg-amber-500 text-white border-amber-500",
    chipInactive: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/60",
  },
  purple: {
    text: "text-purple-700 dark:text-purple-300",
    bgSoft: "bg-purple-100 dark:bg-purple-900/30",
    border: "border-purple-500/40",
    dot: "bg-purple-500",
    chipActive: "bg-purple-500 text-white border-purple-500",
    chipInactive: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/60",
  },
  rose: {
    text: "text-rose-700 dark:text-rose-300",
    bgSoft: "bg-rose-100 dark:bg-rose-900/30",
    border: "border-rose-500/40",
    dot: "bg-rose-500",
    chipActive: "bg-rose-500 text-white border-rose-500",
    chipInactive: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/60",
  },
  cyan: {
    text: "text-cyan-700 dark:text-cyan-300",
    bgSoft: "bg-cyan-100 dark:bg-cyan-900/30",
    border: "border-cyan-500/40",
    dot: "bg-cyan-500",
    chipActive: "bg-cyan-500 text-white border-cyan-500",
    chipInactive: "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800/60",
  },
  orange: {
    text: "text-orange-700 dark:text-orange-300",
    bgSoft: "bg-orange-100 dark:bg-orange-900/30",
    border: "border-orange-500/40",
    dot: "bg-orange-500",
    chipActive: "bg-orange-500 text-white border-orange-500",
    chipInactive: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800/60",
  },
};

export const mockDoctors: Doctor[] = [
  {
    id: "doc-1",
    name: "Dr. Javohir Karimov",
    specialty: "Terapevt-stomatolog",
    phone: "+998 90 123 45 67",
    email: "javohir@dentaflow.uz",
    color: "blue",
    isActive: true,
  },
  {
    id: "doc-2",
    name: "Dr. Madina Toshmatova",
    specialty: "Ortodont",
    phone: "+998 90 234 56 78",
    email: "madina@dentaflow.uz",
    color: "emerald",
    isActive: true,
  },
  {
    id: "doc-3",
    name: "Dr. Umid Saidov",
    specialty: "Stomatolog-xirurg",
    phone: "+998 90 345 67 89",
    email: "umid@dentaflow.uz",
    color: "amber",
    isActive: true,
  },
];

export function getDoctorById(doctors: Doctor[], id: string | null | undefined): Doctor | undefined {
  if (!id) return undefined;
  return doctors.find((d) => d.id === id);
}

export function pickRandomDoctorId(rng: () => number): string {
  const active = mockDoctors.filter((d) => d.isActive);
  return active[Math.floor(rng() * active.length)].id;
}
