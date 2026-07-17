import { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Doctor } from "@/data/mockDoctors";
import { apiFetch } from "@/lib/api/client";
import type { DoctorDto, DoctorWriteDto } from "@/lib/api/dto";
import { mapDoctor } from "@/lib/api/mappers";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_FILTER = "dentaflow-doctor-filter";
const STORAGE_LAST_USED = "dentaflow-last-used-doctor";

export const doctorsQueryKey = ["doctors"] as const;

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

function toWriteDto(data: Partial<Omit<Doctor, "id">>): Partial<DoctorWriteDto> {
  const dto: Partial<DoctorWriteDto> = {};
  if (data.name !== undefined) dto.full_name = data.name;
  if (data.specialty !== undefined) dto.specialty = data.specialty;
  if (data.phone !== undefined) dto.phone_number = data.phone;
  if (data.email !== undefined) dto.email = data.email;
  return dto;
}

export function DoctorsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: doctors = [] } = useQuery({
    queryKey: doctorsQueryKey,
    queryFn: async () => {
      const dtos = await apiFetch<DoctorDto[]>("/clinic/doctors/");
      return dtos.map(mapDoctor);
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: doctorsQueryKey });

  const addMutation = useMutation({
    mutationFn: (data: Omit<Doctor, "id" | "isActive">) =>
      apiFetch<DoctorDto>("/clinic/doctors/", { method: "POST", body: toWriteDto(data) }),
    onSuccess: invalidate,
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Doctor, "id">> }) =>
      apiFetch<DoctorDto>(`/clinic/doctors/${id}/`, { method: "PATCH", body: toWriteDto(data) }),
    onSuccess: invalidate,
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/clinic/doctors/${id}/`, { method: "DELETE" }),
    onSuccess: invalidate,
    onError: (err: Error) => toast.error(err.message),
  });

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

  const addDoctor = useCallback(
    (data: Omit<Doctor, "id" | "isActive">) => addMutation.mutate(data),
    [addMutation],
  );

  const updateDoctor = useCallback(
    (id: string, data: Partial<Omit<Doctor, "id">>) => updateMutation.mutate({ id, data }),
    [updateMutation],
  );

  const deleteDoctor = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
      setFilterDoctorIdState((current) => (current === id ? null : current));
    },
    [deleteMutation],
  );

  // The backend deletes doctors permanently (no is_active toggle yet — see
  // BACKEND_SPEC.md), so there is nothing to restore.
  const restoreDoctor = useCallback((_id: string) => {}, []);

  const getDoctor = useCallback(
    (id: string | null | undefined) => {
      if (!id) return undefined;
      return doctors.find((d) => d.id === id);
    },
    [doctors],
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
