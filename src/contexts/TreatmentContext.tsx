import { createContext, useContext, useCallback, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Treatment } from "@/data/mockTreatments";
import type { TreatmentType } from "@/data/mockPatients";
import { apiFetch } from "@/lib/api/client";
import type { PaginatedDto, TreatmentListDto, TreatmentTypeDto, TreatmentWriteDto } from "@/lib/api/dto";
import { mapTreatmentFromList, treatmentTypeIdForKey, type PatientDetailResult } from "@/lib/api/mappers";
import { useAuth } from "@/contexts/AuthContext";
import { useDoctors } from "@/contexts/DoctorsContext";
import { patientKeys } from "@/contexts/PatientsContext";

export const treatmentKeys = {
  /** Prefix shared by every patient's treatments cache — used for broad patches by treatment id. */
  all: ["treatments", "patient"] as const,
  byPatient: (patientId: string) => ["treatments", "patient", patientId] as const,
};

/**
 * A patient's full treatment history from the dedicated list endpoint — richer
 * than the patient-detail endpoint's `treatments` (real per-visit cost/paid,
 * not just the first visit's). Follows pagination itself since a patient's
 * history is usually short but shouldn't silently truncate if it isn't.
 */
export function usePatientTreatments(patientId: string | undefined) {
  const { isAuthenticated } = useAuth();
  const { doctors } = useDoctors();

  return useQuery({
    queryKey: treatmentKeys.byPatient(patientId ?? ""),
    queryFn: async () => {
      const all: TreatmentListDto[] = [];
      let page = 1;
      for (;;) {
        const dto = await apiFetch<PaginatedDto<TreatmentListDto>>(
          `/clinic/treatments/?patient_id=${patientId}&page=${page}`,
        );
        all.push(...dto.results);
        if (!dto.next) break;
        page += 1;
      }
      return all.map((r) => mapTreatmentFromList(r, doctors));
    },
    enabled: isAuthenticated && Boolean(patientId),
  });
}

/**
 * Treatment creation input. Prefer `treatmentTypeId` (a real /clinic/treatment-types
 * row id); `treatmentType` (frontend key) is mapped to an id only as a fallback.
 */
export type NewTreatmentInput = Omit<Treatment, "id" | "treatmentType"> & {
  treatmentType?: TreatmentType;
  treatmentTypeId?: number;
};

/** One tooth's worth of a multi-tooth visit — see `NewTreatmentBatchInput`. */
export interface NewTreatmentRow {
  teeth: string[];
  treatmentType?: TreatmentType;
  treatmentTypeId?: number;
  totalCost: number;
  amountPaid: number;
}

/**
 * A single visit that can cover several teeth. `/clinic/treatments/` takes a
 * POST body that's an array of rows, so a 3-tooth visit becomes one request
 * with 3 array entries — patient/doctor/date/notes repeated on each, only the
 * per-tooth fields (type, cost, paid, tooth_number) differ row to row.
 */
export interface NewTreatmentBatchInput {
  patientId: string;
  doctorId?: string;
  date: string; // ISO
  note?: string;
  rows: NewTreatmentRow[];
}

/**
 * Partial edit of an existing treatment — field names mirror the frontend
 * `Treatment` shape (not the backend's), the mutation translates them.
 * `treatmentTypeId` (not the coerced 3-key `treatmentType`) is required to
 * actually change the type, since only the real numeric id can be PATCHed.
 */
export interface TreatmentPatch {
  date?: string; // ISO
  teeth?: string[];
  treatmentTypeId?: number;
  totalCost?: number;
  amountPaid?: number;
  doctorId?: string;
  note?: string;
  visitNumber?: number;
}

interface TreatmentContextType {
  addTreatment: (data: NewTreatmentInput) => Promise<void>;
  addTreatments: (batch: NewTreatmentBatchInput) => Promise<void>;
  /** Real `PATCH /clinic/treatments/<id>/` — only the given fields are sent. */
  updateTreatment: (id: string, patientId: string, patch: TreatmentPatch) => Promise<void>;
  /**
   * The backend has no status field on treatments (confirmed — absent from
   * both read and write shapes), so "completed" stays a local-cache-only
   * marker until it does. See BACKEND_SPEC.md §1.3.
   */
  completeTreatment: (id: string) => void;
  /** Real `DELETE /clinic/treatments/<id>/`. */
  deleteTreatment: (id: string, patientId: string) => Promise<void>;
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

  const addBatchMutation = useMutation({
    mutationFn: async (batch: NewTreatmentBatchInput) => {
      // The API always takes an array — even a single-tooth visit is a
      // 1-element array — so a multi-tooth visit is just more entries in the
      // same request, each sharing patient/doctor/date/notes.
      const body: TreatmentWriteDto[] = batch.rows.map((row) => ({
        patient: Number(batch.patientId),
        doctor: batch.doctorId ? Number(batch.doctorId) : null,
        treatment_type:
          row.treatmentTypeId ??
          (row.treatmentType ? treatmentTypeIdForKey(treatmentTypes, row.treatmentType) : undefined) ??
          0,
        total_treatment_cost: row.totalCost,
        total_paid: row.amountPaid,
        visit_number: 1,
        tooth_number: row.teeth.length > 0 ? Number(row.teeth[0]) : 0,
        start_date: batch.date.slice(0, 10),
        notes: batch.note ?? "",
      }));
      await apiFetch("/clinic/treatments/", { method: "POST", body });
      return batch.patientId;
    },
    onSuccess: (patientId) => {
      queryClient.invalidateQueries({ queryKey: patientKeys.list });
      queryClient.invalidateQueries({ queryKey: patientKeys.detail(patientId) });
      queryClient.invalidateQueries({ queryKey: treatmentKeys.byPatient(patientId) });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addTreatments = useCallback(
    async (batch: NewTreatmentBatchInput) => {
      await addBatchMutation.mutateAsync(batch);
    },
    [addBatchMutation],
  );

  const addTreatment = useCallback(
    async (data: NewTreatmentInput) => {
      await addTreatments({
        patientId: data.patientId,
        doctorId: data.doctorId,
        date: data.date,
        note: data.note,
        rows: [{
          teeth: data.teeth,
          treatmentType: data.treatmentType,
          treatmentTypeId: data.treatmentTypeId,
          totalCost: data.totalCost,
          amountPaid: data.amountPaid,
        }],
      });
    },
    [addTreatments],
  );

  const invalidateForPatient = useCallback(
    (patientId: string) => {
      queryClient.invalidateQueries({ queryKey: patientKeys.list });
      queryClient.invalidateQueries({ queryKey: patientKeys.detail(patientId) });
      queryClient.invalidateQueries({ queryKey: treatmentKeys.byPatient(patientId) });
    },
    [queryClient],
  );

  const updateMutation = useMutation({
    mutationFn: async ({ id, patientId, patch }: { id: string; patientId: string; patch: TreatmentPatch }) => {
      // Partial by design — confirmed live that the backend only touches the
      // fields actually sent, so a payment bump doesn't need to resend type/cost/etc.
      const body: Partial<TreatmentWriteDto> = {};
      if (patch.doctorId !== undefined) body.doctor = patch.doctorId ? Number(patch.doctorId) : null;
      if (patch.treatmentTypeId !== undefined) body.treatment_type = patch.treatmentTypeId;
      if (patch.totalCost !== undefined) body.total_treatment_cost = patch.totalCost;
      if (patch.amountPaid !== undefined) body.total_paid = patch.amountPaid;
      if (patch.teeth !== undefined) body.tooth_number = patch.teeth.length > 0 ? Number(patch.teeth[0]) : 0;
      if (patch.date !== undefined) body.start_date = patch.date.slice(0, 10);
      if (patch.note !== undefined) body.notes = patch.note;
      if (patch.visitNumber !== undefined) body.visit_number = patch.visitNumber;
      await apiFetch(`/clinic/treatments/${id}/`, { method: "PATCH", body });
      return patientId;
    },
    onSuccess: invalidateForPatient,
    onError: (err: Error) => toast.error(err.message),
  });

  const updateTreatment = useCallback(
    async (id: string, patientId: string, patch: TreatmentPatch) => {
      await updateMutation.mutateAsync({ id, patientId, patch });
    },
    [updateMutation],
  );

  /**
   * The backend has no status field, so this only ever touches the local
   * cache — it doesn't survive a refetch that re-derives status from
   * `remaining`, but there's nothing server-side to persist it to yet.
   */
  const completeTreatment = useCallback(
    (id: string) => {
      queryClient.setQueriesData<PatientDetailResult>(
        { queryKey: patientKeys.list },
        (prev) => {
          if (!prev || !("treatments" in prev)) return prev;
          if (!prev.treatments.some((t) => t.id === id)) return prev;
          return {
            ...prev,
            treatments: prev.treatments.map((t) => (t.id === id ? { ...t, status: "completed" as const } : t)),
          };
        },
      );
      queryClient.setQueriesData<Treatment[]>(
        { queryKey: treatmentKeys.all },
        (prev) => {
          if (!prev || !prev.some((t) => t.id === id)) return prev;
          return prev.map((t) => (t.id === id ? { ...t, status: "completed" as const } : t));
        },
      );
    },
    [queryClient],
  );

  const deleteMutation = useMutation({
    mutationFn: async ({ id, patientId }: { id: string; patientId: string }) => {
      await apiFetch(`/clinic/treatments/${id}/`, { method: "DELETE" });
      return patientId;
    },
    onSuccess: invalidateForPatient,
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteTreatment = useCallback(
    async (id: string, patientId: string) => {
      await deleteMutation.mutateAsync({ id, patientId });
    },
    [deleteMutation],
  );

  return (
    <TreatmentContext.Provider value={{ addTreatment, addTreatments, updateTreatment, completeTreatment, deleteTreatment }}>
      {children}
    </TreatmentContext.Provider>
  );
}

export function useTreatments() {
  const ctx = useContext(TreatmentContext);
  if (!ctx) throw new Error("useTreatments must be used within TreatmentProvider");
  return ctx;
}
