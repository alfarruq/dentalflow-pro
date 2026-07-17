import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import type { AppointmentDto, AppointmentWriteDto } from "@/lib/api/dto";
import { mapAppointment } from "@/lib/api/mappers";
import { useAuth } from "@/contexts/AuthContext";
import { useDoctors } from "@/contexts/DoctorsContext";
import { patientKeys } from "@/contexts/PatientsContext";

export const appointmentsQueryKey = ["appointments"] as const;

export function useAppointmentsQuery() {
  const { isAuthenticated } = useAuth();
  const { doctors } = useDoctors();

  return useQuery({
    queryKey: appointmentsQueryKey,
    queryFn: async () => {
      const dtos = await apiFetch<AppointmentDto[]>("/calendars/appointments/");
      return dtos.map((dto) => mapAppointment(dto, doctors));
    },
    enabled: isAuthenticated,
  });
}

export interface NewAppointmentInput {
  /** Existing patient id — or leave empty and provide newPatient. */
  patientId?: string;
  newPatient?: { fullName: string; phone: string };
  doctorId: string;
  /** "yyyy-MM-dd" */
  date: string;
  /** "HH:mm" */
  time: string;
  notes?: string;
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NewAppointmentInput) => {
      const body: AppointmentWriteDto = {
        patient: input.patientId ? Number(input.patientId) : null,
        full_name: input.newPatient?.fullName ?? null,
        phone_number: input.newPatient?.phone ?? null,
        doctor: Number(input.doctorId),
        date: input.date,
        time: input.time,
        notes: input.notes ?? "",
        status: "pending",
      };
      return apiFetch<AppointmentDto>("/calendars/appointments/", { method: "POST", body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentsQueryKey });
      // Booking with a brand-new patient also creates that patient record.
      queryClient.invalidateQueries({ queryKey: patientKeys.list });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
