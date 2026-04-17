import { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from "react";
import { mockDoctors, Doctor, DoctorColor, doctorColorPalette } from "@/data/mockDoctors";

const STORAGE_FILTER = "dentaflow-doctor-filter";
const STORAGE_LAST_USED = "dentaflow-last-used-doctor";

interface DoctorsContextType {
  doctors: Doctor[];
  activeDoctors: Doctor[];
  addDoctor: (data: Omit<Doctor, "id" | "isActive">) => void;
  updateDoctor: (id: string, data: Partial<Omit<Doctor, "id">>) => void;
  deleteDoctor: (id: string) => void;
  restoreDoctor: (id: string) => void;
  getDoctor: (id: string | null | undefined) => Doctor | undefined;

  filterDoctorId: string | null;
  setFilterDoctorId: (id: string | null) => void;

  lastUsedDoctorId: string | null;
  setLastUsedDoctorId: (id: string) => void;

  isMulti: boolean;
}

const DoctorsContext = createContext<DoctorsContextType | undefined>(undefined);

export function DoctorsProvider({ children }: { children: ReactNode }) {
  const [doctors, setDoctors] = useState<Doctor[]>(mockDoctors);

  const [filterDoctorId, setFilterDoctorIdState] = useState<string | null>(() => {
    const stored = localStorage.getItem(STORAGE_FILTER);
    return stored && stored !== "null" ? stored : null;
  });

  const [lastUsedDoctorId, setLastUsedDoctorIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_LAST_USED);
  });

  useEffect(() => {
    if (filterDoctorId === null) {
      localStorage.removeItem(STORAGE_FILTER);
    } else {
      localStorage.setItem(STORAGE_FILTER, filterDoctorId);
    }
  }, [filterDoctorId]);

  useEffect(() => {
    if (lastUsedDoctorId) {
      localStorage.setItem(STORAGE_LAST_USED, lastUsedDoctorId);
    }
  }, [lastUsedDoctorId]);

  const activeDoctors = useMemo(() => doctors.filter((d) => d.isActive), [doctors]);

  const addDoctor = useCallback((data: Omit<Doctor, "id" | "isActive">) => {
    setDoctors((prev) => {
      const nextIndex = prev.length;
      const fallbackColor: DoctorColor = doctorColorPalette[nextIndex % doctorColorPalette.length];
      const newDoctor: Doctor = {
        ...data,
        color: data.color || fallbackColor,
        id: `doc-${Date.now()}`,
        isActive: true,
      };
      return [...prev, newDoctor];
    });
  }, []);

  const updateDoctor = useCallback((id: string, data: Partial<Omit<Doctor, "id">>) => {
    setDoctors((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d)));
  }, []);

  const deleteDoctor = useCallback((id: string) => {
    setDoctors((prev) => prev.map((d) => (d.id === id ? { ...d, isActive: false } : d)));
    setFilterDoctorIdState((current) => (current === id ? null : current));
  }, []);

  const restoreDoctor = useCallback((id: string) => {
    setDoctors((prev) => prev.map((d) => (d.id === id ? { ...d, isActive: true } : d)));
  }, []);

  const getDoctor = useCallback(
    (id: string | null | undefined) => {
      if (!id) return undefined;
      return doctors.find((d) => d.id === id);
    },
    [doctors]
  );

  const setFilterDoctorId = useCallback((id: string | null) => {
    setFilterDoctorIdState(id);
  }, []);

  const setLastUsedDoctorId = useCallback((id: string) => {
    setLastUsedDoctorIdState(id);
  }, []);

  const isMulti = activeDoctors.length > 1;

  return (
    <DoctorsContext.Provider
      value={{
        doctors,
        activeDoctors,
        addDoctor,
        updateDoctor,
        deleteDoctor,
        restoreDoctor,
        getDoctor,
        filterDoctorId,
        setFilterDoctorId,
        lastUsedDoctorId,
        setLastUsedDoctorId,
        isMulti,
      }}
    >
      {children}
    </DoctorsContext.Provider>
  );
}

export function useDoctors() {
  const ctx = useContext(DoctorsContext);
  if (!ctx) throw new Error("useDoctors must be used within DoctorsProvider");
  return ctx;
}
