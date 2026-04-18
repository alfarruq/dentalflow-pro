import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  mockTreatments,
  mockTreatmentVisits,
  mockTreatmentPayments,
  Treatment,
  TreatmentVisit,
  TreatmentPayment,
} from "@/data/mockTreatments";

// ─── Context type ─────────────────────────────────────────────────────────────

interface TreatmentBalance {
  totalCost: number;
  paid: number;
  remaining: number;
}

interface TreatmentContextType {
  treatments: Treatment[];
  visits: TreatmentVisit[];
  payments: TreatmentPayment[];

  // ── Treatment CRUD ──────────────────────────────────────────────────────────
  addTreatment: (data: Omit<Treatment, "id">) => Treatment;
  updateTreatment: (id: string, data: Partial<Omit<Treatment, "id">>) => void;
  deleteTreatment: (id: string) => void;

  // ── Visit CRUD ──────────────────────────────────────────────────────────────
  addVisit: (data: Omit<TreatmentVisit, "id">) => TreatmentVisit;
  updateVisit: (id: string, data: Partial<Omit<TreatmentVisit, "id">>) => void;
  deleteVisit: (id: string) => void;

  // ── Payment CRUD ─────────────────────────────────────────────────────────────
  addPayment: (data: Omit<TreatmentPayment, "id">) => TreatmentPayment;
  deletePayment: (id: string) => void;

  // ── Selectors ───────────────────────────────────────────────────────────────
  getPatientTreatments: (patientId: string) => Treatment[];
  getTreatmentVisits: (treatmentId: string) => TreatmentVisit[];
  getTreatmentPayments: (treatmentId: string) => TreatmentPayment[];
  getPatientPayments: (patientId: string) => TreatmentPayment[];
  getTreatmentBalance: (treatmentId: string) => TreatmentBalance;
  getPatientBalance: (patientId: string) => TreatmentBalance;
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Context + Provider ───────────────────────────────────────────────────────

const TreatmentContext = createContext<TreatmentContextType | undefined>(undefined);

export function TreatmentProvider({ children }: { children: ReactNode }) {
  const [treatments, setTreatments] = useState<Treatment[]>(mockTreatments);
  const [visits, setVisits]         = useState<TreatmentVisit[]>(mockTreatmentVisits);
  const [payments, setPayments]     = useState<TreatmentPayment[]>(mockTreatmentPayments);

  // ── Treatment CRUD ──────────────────────────────────────────────────────────

  const addTreatment = useCallback((data: Omit<Treatment, "id">): Treatment => {
    const t: Treatment = { id: uid("t"), ...data };
    setTreatments((prev) => [t, ...prev]);
    return t;
  }, []);

  const updateTreatment = useCallback(
    (id: string, data: Partial<Omit<Treatment, "id">>) => {
      setTreatments((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...data } : t))
      );
    },
    []
  );

  const deleteTreatment = useCallback((id: string) => {
    setTreatments((prev) => prev.filter((t) => t.id !== id));
    setVisits((prev) => prev.filter((v) => v.treatmentId !== id));
    setPayments((prev) => prev.filter((p) => p.treatmentId !== id));
  }, []);

  // ── Visit CRUD ──────────────────────────────────────────────────────────────

  const addVisit = useCallback((data: Omit<TreatmentVisit, "id">): TreatmentVisit => {
    const v: TreatmentVisit = { id: uid("v"), ...data };
    setVisits((prev) => [...prev, v]);
    return v;
  }, []);

  const updateVisit = useCallback(
    (id: string, data: Partial<Omit<TreatmentVisit, "id">>) => {
      setVisits((prev) =>
        prev.map((v) => (v.id === id ? { ...v, ...data } : v))
      );
    },
    []
  );

  const deleteVisit = useCallback((id: string) => {
    setVisits((prev) => prev.filter((v) => v.id !== id));
  }, []);

  // ── Payment CRUD ─────────────────────────────────────────────────────────────

  const addPayment = useCallback((data: Omit<TreatmentPayment, "id">): TreatmentPayment => {
    const p: TreatmentPayment = { id: uid("pay"), ...data };
    setPayments((prev) => [p, ...prev]);
    return p;
  }, []);

  const deletePayment = useCallback((id: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ── Selectors ────────────────────────────────────────────────────────────────

  const getPatientTreatments = useCallback(
    (patientId: string) => treatments.filter((t) => t.patientId === patientId),
    [treatments]
  );

  const getTreatmentVisits = useCallback(
    (treatmentId: string) =>
      visits
        .filter((v) => v.treatmentId === treatmentId)
        .sort((a, b) => a.visitNumber - b.visitNumber),
    [visits]
  );

  const getTreatmentPayments = useCallback(
    (treatmentId: string) =>
      payments
        .filter((p) => p.treatmentId === treatmentId)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [payments]
  );

  const getPatientPayments = useCallback(
    (patientId: string) =>
      payments
        .filter((p) => p.patientId === patientId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [payments]
  );

  const getTreatmentBalance = useCallback(
    (treatmentId: string): TreatmentBalance => {
      const treatment = treatments.find((t) => t.id === treatmentId);
      const totalCost = treatment?.totalCost ?? 0;
      const paid = payments
        .filter((p) => p.treatmentId === treatmentId)
        .reduce((sum, p) => sum + p.amount, 0);
      return { totalCost, paid, remaining: totalCost - paid };
    },
    [treatments, payments]
  );

  const getPatientBalance = useCallback(
    (patientId: string): TreatmentBalance => {
      const patientTreatments = treatments.filter((t) => t.patientId === patientId);
      const totalCost = patientTreatments.reduce((sum, t) => sum + t.totalCost, 0);
      const paid = payments
        .filter((p) => p.patientId === patientId)
        .reduce((sum, p) => sum + p.amount, 0);
      return { totalCost, paid, remaining: totalCost - paid };
    },
    [treatments, payments]
  );

  return (
    <TreatmentContext.Provider
      value={{
        treatments,
        visits,
        payments,
        addTreatment,
        updateTreatment,
        deleteTreatment,
        addVisit,
        updateVisit,
        deleteVisit,
        addPayment,
        deletePayment,
        getPatientTreatments,
        getTreatmentVisits,
        getTreatmentPayments,
        getPatientPayments,
        getTreatmentBalance,
        getPatientBalance,
      }}
    >
      {children}
    </TreatmentContext.Provider>
  );
}

export function useTreatments() {
  const ctx = useContext(TreatmentContext);
  if (!ctx) throw new Error("useTreatments must be used within TreatmentProvider");
  return ctx;
}
