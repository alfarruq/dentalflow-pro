import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import type { AppointmentDto, AppointmentWriteDto, PaginatedDto } from "@/lib/api/dto";
import { mapAppointment } from "@/lib/api/mappers";
import { useAuth } from "@/contexts/AuthContext";
import { useDoctors } from "@/contexts/DoctorsContext";
import { patientKeys } from "@/contexts/PatientsContext";

export const appointmentsQueryKey = ["appointments"] as const;

/**
 * Server-side scope for the appointments list:
 *   "day"  → today only        (?date=day)
 *   "week" → current Mon–Sun    (?date=week)
 *   undefined → all appointments (no param)
 * `start_date`/`end_date` are NOT supported by the backend (ignored) — this
 * `date` param is the only working server-side filter.
 */
export type AppointmentDateFilter = "day" | "week";

export function useAppointmentsQuery(dateFilter?: AppointmentDateFilter) {
  const { isAuthenticated } = useAuth();
  const { doctors } = useDoctors();

  return useQuery({
    // Keyed by scope so each view caches independently; invalidating the base
    // ["appointments"] key (on create) still refetches every scope by prefix.
    queryKey: dateFilter ? [...appointmentsQueryKey, dateFilter] : appointmentsQueryKey,
    queryFn: async () => {
      // The endpoint is paginated ({ count, next, results }); follow every page.
      // The cap guards against a runaway loop if `next` is ever non-null forever.
      const dateParam = dateFilter ? `date=${dateFilter}&` : "";
      const all: AppointmentDto[] = [];
      for (let page = 1; page <= 100; page += 1) {
        const res = await apiFetch<PaginatedDto<AppointmentDto>>(
          `/calendars/appointments/?${dateParam}page=${page}`,
        );
        all.push(...res.results);
        if (!res.next) break;
      }
      return all.map((dto) => mapAppointment(dto, doctors));
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
        status: "in_progress",
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
