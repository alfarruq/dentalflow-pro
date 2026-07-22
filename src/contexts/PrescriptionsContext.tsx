import { createContext, useContext, useCallback, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Prescription } from "@/data/mockPrescriptions";
import { apiFetch } from "@/lib/api/client";
import type { RecipeDto, RecipeWriteDto } from "@/lib/api/dto";
import { mapRecipe, toMedicineWriteDto } from "@/lib/api/mappers";
import { useAuth } from "@/contexts/AuthContext";
import { useDoctors } from "@/contexts/DoctorsContext";

/**
 * Prescriptions live in /core/recipes/ (list + create + delete; there is no
 * update route). The list endpoint returns the patient as a display name rather
 * than an id and offers no `?patient=` filter, so the whole list is fetched once
 * and narrowed per patient here — by id for records created in this session and
 * by name for everything read back from the API.
 */
const recipesQueryKey = ["recipes"] as const;

interface PrescriptionsContextType {
  addPrescription: (data: Omit<Prescription, "id">) => Promise<Prescription>;
  updatePrescription: (id: string, data: Omit<Prescription, "id">) => Promise<void>;
  deletePrescription: (id: string) => Promise<void>;
  getPatientPrescriptions: (patientId: string, patientName?: string) => Prescription[];
}

const PrescriptionsContext = createContext<PrescriptionsContextType | undefined>(undefined);

function toRecipeWriteDto(data: Omit<Prescription, "id">): RecipeWriteDto {
  return {
    ...(data.patientId ? { patient: Number(data.patientId) } : {}),
    ...(data.doctorId ? { doctor: Number(data.doctorId) } : {}),
    notes: data.note ?? "",
    medicines: data.medications.map(toMedicineWriteDto),
  };
}

export function PrescriptionsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { doctors } = useDoctors();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: prescriptions = [] } = useQuery({
    queryKey: recipesQueryKey,
    queryFn: async () => {
      const dtos = await apiFetch<RecipeDto[]>("/core/recipes/");
      return dtos.map((dto) => mapRecipe(dto, doctors, t));
    },
    enabled: isAuthenticated,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: recipesQueryKey });

  const addPrescription = useCallback(
    async (data: Omit<Prescription, "id">): Promise<Prescription> => {
      const created = await apiFetch<RecipeDto>("/core/recipes/", {
        method: "POST",
        body: toRecipeWriteDto(data),
      });
      await invalidate();
      // Return the caller's own shape (it drives the print view straight away);
      // the refetched list is what the screen renders.
      return { ...data, id: String(created.id) };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient],
  );

  /** No update route — replace by creating the new record, then dropping the old. */
  const updatePrescription = useCallback(
    async (id: string, data: Omit<Prescription, "id">) => {
      try {
        await apiFetch<RecipeDto>("/core/recipes/", { method: "POST", body: toRecipeWriteDto(data) });
        await apiFetch<void>(`/core/recipes/${id}/`, { method: "DELETE" });
        await invalidate();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Retseptni yangilab bo'lmadi");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient],
  );

  const deletePrescription = useCallback(
    async (id: string) => {
      try {
        await apiFetch<void>(`/core/recipes/${id}/`, { method: "DELETE" });
        await invalidate();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Retseptni o'chirib bo'lmadi");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient],
  );

  const getPatientPrescriptions = useCallback(
    (patientId: string, patientName?: string) =>
      prescriptions.filter(
        (p) =>
          (p.patientId && p.patientId === patientId) ||
          (Boolean(patientName) && p.patientName === patientName),
      ),
    [prescriptions],
  );

  return (
    <PrescriptionsContext.Provider
      value={{ addPrescription, updatePrescription, deletePrescription, getPatientPrescriptions }}
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
