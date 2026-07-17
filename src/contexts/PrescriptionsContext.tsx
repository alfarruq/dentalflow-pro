import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { mockPrescriptions, type Prescription } from "@/data/mockPrescriptions";

interface PrescriptionsContextType {
  addPrescription: (data: Omit<Prescription, "id">) => Prescription;
  updatePrescription: (id: string, data: Omit<Prescription, "id">) => void;
  deletePrescription: (id: string) => void;
  getTreatmentPrescriptions: (treatmentId: string) => Prescription[];
}

function uid() {
  return `rx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const PrescriptionsContext = createContext<PrescriptionsContextType | undefined>(undefined);

export function PrescriptionsProvider({ children }: { children: ReactNode }) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(mockPrescriptions);

  const addPrescription = useCallback((data: Omit<Prescription, "id">): Prescription => {
    const p: Prescription = { id: uid(), ...data };
    setPrescriptions((prev) => [p, ...prev]);
    return p;
  }, []);

  const updatePrescription = useCallback((id: string, data: Omit<Prescription, "id">) => {
    setPrescriptions((prev) => prev.map((p) => (p.id === id ? { id, ...data } : p)));
  }, []);

  const deletePrescription = useCallback((id: string) => {
    setPrescriptions((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const getTreatmentPrescriptions = useCallback(
    (treatmentId: string) =>
      prescriptions
        .filter((p) => p.treatmentId === treatmentId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [prescriptions],
  );

  return (
    <PrescriptionsContext.Provider
      value={{ addPrescription, updatePrescription, deletePrescription, getTreatmentPrescriptions }}
    >
      {children}
    </PrescriptionsContext.Provider>
  );
}

export function usePrescriptions() {
  const ctx = useContext(PrescriptionsContext);
  if (!ctx) throw new Error("usePrescriptions must be used within PrescriptionsProvider");
  return ctx;
}
