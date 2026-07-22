import { createContext, useContext, useCallback, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import type { TreatmentTypeDto } from "@/lib/api/dto";
import { useAuth } from "@/contexts/AuthContext";

// The clinic's "services" are the backend's treatment-types (name + price),
// exposed at /clinic/treatment-types/ with full list / create / update / delete.
const treatmentTypesQueryKey = ["treatment-types"] as const;

export interface TreatmentTypeInput {
  name: string;
  price: number;
}

interface ServiceTemplatesContextType {
  treatmentTypes: TreatmentTypeDto[];
  isLoading: boolean;
  addTreatmentType: (data: TreatmentTypeInput) => void;
  updateTreatmentType: (id: number, data: TreatmentTypeInput) => void;
  deleteTreatmentType: (id: number) => void;
}

const ServiceTemplatesContext = createContext<ServiceTemplatesContextType | undefined>(undefined);

export function ServiceTemplatesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: treatmentTypes = [], isLoading } = useQuery({
    queryKey: treatmentTypesQueryKey,
    queryFn: () => apiFetch<TreatmentTypeDto[]>("/clinic/treatment-types/"),
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });

  // Update the cached list directly on success so the UI reflects each mutation
  // immediately, without depending on a refetch. The list is small and the API
  // returns the full row, so the cache stays authoritative.
  const setCache = (updater: (rows: TreatmentTypeDto[]) => TreatmentTypeDto[]) =>
    queryClient.setQueryData<TreatmentTypeDto[]>(treatmentTypesQueryKey, (old) => updater(old ?? []));
  const onError = (err: Error) => toast.error(err.message);

  const addMutation = useMutation({
    mutationFn: (data: TreatmentTypeInput) =>
      apiFetch<TreatmentTypeDto>("/clinic/treatment-types/", { method: "POST", body: data }),
    onSuccess: (created) => setCache((rows) => [...rows, created]),
    onError,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TreatmentTypeInput }) =>
      apiFetch<TreatmentTypeDto>(`/clinic/treatment-types/${id}/`, { method: "PATCH", body: data }),
    onSuccess: (updated) => setCache((rows) => rows.map((r) => (r.id === updated.id ? updated : r))),
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/clinic/treatment-types/${id}/`, { method: "DELETE" }),
    onSuccess: (_result, id) => setCache((rows) => rows.filter((r) => r.id !== id)),
    onError,
  });

  const addTreatmentType = useCallback((data: TreatmentTypeInput) => addMutation.mutate(data), [addMutation]);
  const updateTreatmentType = useCallback(
    (id: number, data: TreatmentTypeInput) => updateMutation.mutate({ id, data }),
    [updateMutation],
  );
  const deleteTreatmentType = useCallback((id: number) => deleteMutation.mutate(id), [deleteMutation]);

  return (
    <ServiceTemplatesContext.Provider
      value={{ treatmentTypes, isLoading, addTreatmentType, updateTreatmentType, deleteTreatmentType }}
    >
      {children}
    </ServiceTemplatesContext.Provider>
  );
}

export function useServiceTemplates() {
  const ctx = useContext(ServiceTemplatesContext);
  if (!ctx) throw new Error("useServiceTemplates must be used within ServiceTemplatesProvider");
  return ctx;
}
