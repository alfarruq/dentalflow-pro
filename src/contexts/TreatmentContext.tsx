import { createContext, useContext, useCallback, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Treatment } from "@/data/mockTreatments";
import type { TreatmentType } from "@/data/mockPatients";
import { apiFetch } from "@/lib/api/client";
import type { TreatmentTypeDto, TreatmentWriteDto } from "@/lib/api/dto";
import { treatmentTypeIdForKey, type PatientDetailResult } from "@/lib/api/mappers";
import { useAuth } from "@/contexts/AuthContext";
import { patientKeys } from "@/contexts/PatientsContext";

/**
 * Treatment creation input. Prefer `treatmentTypeId` (a real /clinic/treatment-types
 * row id); `treatmentType` (frontend key) is mapped to an id only as a fallback.
 */
export type NewTreatmentInput = Omit<Treatment, "id" | "treatmentType"> & {
  treatmentType?: TreatmentType;
  treatmentTypeId?: number;
};

interface TreatmentContextType {
  addTreatment: (data: NewTreatmentInput) => Promise<void>;
  /**
   * Edit/complete update the local cache only until the backend exposes
   * treatment update endpoints (see BACKEND_SPEC.md).
   */
  updateTreatment: (id: string, data: Partial<Omit<Treatment, "id">>) => void;
  completeTreatment: (id: string) => void;
}

const TreatmentContext = createContext<TreatmentContextType | undefined>(undefined);

export function TreatmentProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: treatmentTypes = [] } = useQuery({
    queryKey: ["treatment-types"],
    queryFn: () => apiFetch<TreatmentTypeDto[]>("/clinic/treatment-types/"),
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: async (data: NewTreatmentInput) => {
      const body: TreatmentWriteDto = {
        patient: Number(data.patientId),
        doctor: data.doctorId ? Number(data.doctorId) : null,
        treatment_type:
          data.treatmentTypeId ??
          (data.treatmentType ? treatmentTypeIdForKey(treatmentTypes, data.treatmentType) : undefined) ??
          0,
        total_treatment_cost: data.totalCost,
        total_paid: data.amountPaid,
        visit_number: 1,
        tooth_number: data.teeth.length > 0 ? Number(data.teeth[0]) : 0,
        start_date: data.date.slice(0, 10),
        notes: data.note ?? "",
      };
      await apiFetch("/clinic/treatments/", { method: "POST", body });
      return data.patientId;
    },
    onSuccess: (patientId) => {
      queryClient.invalidateQueries({ queryKey: patientKeys.list });
      queryClient.invalidateQueries({ queryKey: patientKeys.detail(patientId) });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addTreatment = useCallback(
    async (data: NewTreatmentInput) => {
      await addMutation.mutateAsync(data);
    },
    [addMutation],
  );

  /** Apply an updater to every loaded patient-detail cache that contains the treatment. */
  const patchDetailCaches = useCallback(
    (treatmentId: string, patch: (t: Treatment) => Treatment) => {
      queryClient.setQueriesData<PatientDetailResult>(
        { queryKey: patientKeys.list },
        (prev) => {
          if (!prev || !("treatments" in prev)) return prev;
          if (!prev.treatments.some((t) => t.id === treatmentId)) return prev;
          return {
            ...prev,
            treatments: prev.treatments.map((t) => (t.id === treatmentId ? patch(t) : t)),
          };
        },
      );
    },
    [queryClient],
  );

  const updateTreatment = useCallback(
    (id: string, data: Partial<Omit<Treatment, "id">>) => {
      patchDetailCaches(id, (t) => ({ ...t, ...data }));
    },
    [patchDetailCaches],
  );

  const completeTreatment = useCallback(
    (id: string) => {
      patchDetailCaches(id, (t) => ({ ...t, status: "completed" }));
    },
    [patchDetailCaches],
  );

  return (
    <TreatmentContext.Provider value={{ addTreatment, updateTreatment, completeTreatment }}>
      {children}
    </TreatmentContext.Provider>
  );
}

export function useTreatments() {
  const ctx = useContext(TreatmentContext);
  if (!ctx) throw new Error("useTreatments must be used within TreatmentProvider");
  return ctx;
}
