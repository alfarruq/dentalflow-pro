import { createContext, useContext, useCallback, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Patient } from "@/data/mockPatients";
import { apiFetch } from "@/lib/api/client";
import type { PatientListDto, PatientDetailDto, PatientWriteDto } from "@/lib/api/dto";
import { mapPatientFromList, mapPatientDetail, type PatientDetailResult } from "@/lib/api/mappers";
import { useAuth } from "@/contexts/AuthContext";
import { useDoctors } from "@/contexts/DoctorsContext";

export const patientKeys = {
  list: ["patients"] as const,
  detail: (id: string) => ["patients", id, "detail"] as const,
};

export interface NewPatientInput {
  fullName: string;
  phone: string;
  doctorId?: string;
}

interface PatientsContextType {
  patients: Patient[];
  isLoading: boolean;
  addPatient: (data: NewPatientInput) => Promise<Patient>;
  updatePatient: (id: string, data: Partial<Omit<Patient, "id">>) => void;
  getPatient: (id: string) => Patient | undefined;
}

const PatientsContext = createContext<PatientsContextType | undefined>(undefined);

export function PatientsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { doctors } = useDoctors();
  const queryClient = useQueryClient();

  const { data: patients = [], isLoading } = useQuery({
    queryKey: patientKeys.list,
    queryFn: async () => {
      const dtos = await apiFetch<PatientListDto[]>("/clinic/patients/");
      return dtos.map((dto) => mapPatientFromList(dto, doctors));
    },
    enabled: isAuthenticated,
  });

  const addMutation = useMutation({
    mutationFn: async (data: NewPatientInput) => {
      const body: PatientWriteDto = {
        full_name: data.fullName,
        phone_number: data.phone,
        doctor: data.doctorId ? Number(data.doctorId) : null,
      };
      const dto = await apiFetch<PatientListDto>("/clinic/patients/", { method: "POST", body });
      return mapPatientFromList(dto, doctors);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: patientKeys.list }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Patient, "id">> }) => {
      // Only name/phone exist on the backend user-update endpoint today; the
      // remaining fields are merged into the local cache below (BACKEND_SPEC.md).
      const body: Record<string, unknown> = {};
      if (data.fullName !== undefined) body.full_name = data.fullName;
      if (data.phone !== undefined) body.phone_number = data.phone;
      if (Object.keys(body).length > 0) {
        await apiFetch(`/authentication/update/${id}/`, { method: "PATCH", body });
      }
      return { id, data };
    },
    onSuccess: ({ id, data }) => {
      queryClient.setQueryData<Patient[]>(patientKeys.list, (prev) =>
        prev?.map((p) => (p.id === id ? { ...p, ...data } : p)),
      );
      queryClient.setQueryData<PatientDetailResult>(patientKeys.detail(id), (prev) =>
        prev ? { ...prev, patient: { ...prev.patient, ...data } } : prev,
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addPatient = useCallback(
    (data: NewPatientInput) => addMutation.mutateAsync(data),
    [addMutation],
  );

  const updatePatient = useCallback(
    (id: string, data: Partial<Omit<Patient, "id">>) => updateMutation.mutate({ id, data }),
    [updateMutation],
  );

  const getPatient = useCallback(
    (id: string) => patients.find((p) => p.id === id),
    [patients],
  );

  return (
    <PatientsContext.Provider value={{ patients, isLoading, addPatient, updatePatient, getPatient }}>
      {children}
    </PatientsContext.Provider>
  );
}

export function usePatients() {
  const ctx = useContext(PatientsContext);
  if (!ctx) throw new Error("usePatients must be used within PatientsProvider");
  return ctx;
}

/** Full patient profile: gallery, treatments and balance from the detail endpoint. */
export function usePatientDetail(id: string | undefined) {
  const { isAuthenticated } = useAuth();
  const { doctors } = useDoctors();

  return useQuery({
    queryKey: patientKeys.detail(id ?? ""),
    queryFn: async () => {
      const dto = await apiFetch<PatientDetailDto>(`/clinic/patients/${id}/`);
      return mapPatientDetail(dto, doctors);
    },
    enabled: isAuthenticated && Boolean(id),
  });
}
