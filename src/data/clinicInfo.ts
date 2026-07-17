const STORAGE_KEY = "clinic_info";

export interface ClinicInfo {
  name: string;
  address: string;
  phone: string;
  logo?: string;
  workingHours: { [key: string]: { start: string; end: string; active: boolean } };
}

export const defaultClinicInfo: ClinicInfo = {
  name: "DentaFlow Klinikasi",
  address: "Toshkent sh., Chilonzor tumani, 12-kvartal",
  phone: "+998 71 200 00 01",
  workingHours: {
    monday:    { start: "09:00", end: "18:00", active: true  },
    tuesday:   { start: "09:00", end: "18:00", active: true  },
    wednesday: { start: "09:00", end: "18:00", active: true  },
    thursday:  { start: "09:00", end: "18:00", active: true  },
    friday:    { start: "09:00", end: "18:00", active: true  },
    saturday:  { start: "09:00", end: "14:00", active: true  },
    sunday:    { start: "09:00", end: "14:00", active: false },
  },
};

export function loadClinicInfo(): ClinicInfo {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...defaultClinicInfo, ...JSON.parse(saved) };
  } catch {
    // ignore parse errors
  }
  return defaultClinicInfo;
}

export function saveClinicInfo(clinic: ClinicInfo) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clinic));
}
