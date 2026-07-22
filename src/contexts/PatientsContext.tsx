import { createContext, useContext, useCallback, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Patient } from "@/data/mockPatients";
import { apiFetch } from "@/lib/api/client";
import type { PaginatedDto, PatientListDto, PatientDetailDto, PatientWriteDto } from "@/lib/api/dto";
import { mapPatientFromList, mapPatientDetail, type PatientDetailResult } from "@/lib/api/mappers";
import { useAuth } from "@/contexts/AuthContext";
import { useDoctors } from "@/contexts/DoctorsContext";

/** Matches the backend's default PageNumberPagination page size (confirmed live). */
export const PATIENTS_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;

export const patientKeys = {
  list: ["patients"] as const,
  page: (params: { page: number; search: string; status: string; doctor: string }) =>
    ["patients", "page", params] as const,
  search: (query: string) => ["patients", "search", query] as const,
  detail: (id: string) => ["patients", id, "detail"] as const,
  total: ["patients", "total"] as const,
};

export interface NewPatientInput {
  fullName: string;
  phone: string;
  doctorId?: string;
  /** "yyyy-MM-dd" */
  birthDate?: string;
  address?: string;
  /** Workplace / place of study. */
  office?: string;
}

interface PatientsContextType {
  patients: Patient[];
  count: number;
  isLoading: boolean;
  isFetching: boolean;
  page: number;
  setPage: (page: number) => void;
  search: string;
  setSearch: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  addPatient: (data: NewPatientInput) => Promise<Patient>;
  updatePatient: (id: string, data: Partial<Omit<Patient, "id">>) => void;
}

const PatientsContext = createContext<PatientsContextType | undefined>(undefined);

function buildPatientsQuery(params: { page: number; search: string; status: string; doctorName: string | null }) {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page));
  if (params.search.trim()) qs.set("search", params.search.trim());
  if (params.status !== "all") qs.set("status", params.status);
  if (params.doctorName) qs.set("doctor", params.doctorName);
  return `/clinic/patients/?${qs.toString()}`;
}

export function PatientsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { doctors, filterDoctorId } = useDoctors();
  const queryClient = useQueryClient();

  const [page, setPageState] = useState(1);
  const [search, setSearchState] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilterState] = useState("all");

  // Debounce search input so every keystroke doesn't hit the backend — with
  // 2000+ patients, an un-debounced live search would fire a request per key.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // Any filter change invalidates the current page number — e.g. page 5 of an
  // unfiltered list may not exist once a search narrows the result set. Keyed
  // on the *immediate* `search` (not debouncedSearch): resetting page as soon
  // as typing starts, well before the debounced value settles, avoids a race
  // where an in-flight query briefly combines the old page with the new
  // search term (page 2 of a 1-result search doesn't exist -> backend 404s).
  useEffect(() => {
    setPageState(1);
  }, [search, statusFilter, filterDoctorId]);

  // The backend's `doctor` filter matches by display name, not id (confirmed
  // live) — same lookup already used elsewhere for the same reason (see
  // BACKEND_SPEC.md on doctor-by-name matching).
  const doctorName = filterDoctorId ? (doctors.find((d) => d.id === filterDoctorId)?.name ?? null) : null;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: patientKeys.page({ page, search: debouncedSearch, status: statusFilter, doctor: doctorName ?? "" }),
    queryFn: async () => {
      const dto = await apiFetch<PaginatedDto<PatientListDto>>(
        buildPatientsQuery({ page, search: debouncedSearch, status: statusFilter, doctorName }),
      );
      return { count: dto.count, results: dto.results.map((r) => mapPatientFromList(r, doctors)) };
    },
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  });

  const invalidateLists = () => queryClient.invalidateQueries({ queryKey: patientKeys.list });

  const addMutation = useMutation({
    mutationFn: async (data: NewPatientInput) => {
      const body: PatientWriteDto = {
        full_name: data.fullName,
        phone_number: data.phone,
        doctor: data.doctorId ? Number(data.doctorId) : null,
        // Optional — only sent when provided.
        ...(data.birthDate ? { birth_date: data.birthDate } : {}),
        ...(data.address ? { address: data.address } : {}),
        ...(data.office ? { office: data.office } : {}),
      };
      const dto = await apiFetch<PatientListDto>("/clinic/patients/", { method: "POST", body });
      return mapPatientFromList(dto, doctors);
    },
    onSuccess: invalidateLists,
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
      queryClient.setQueryData<PatientDetailResult>(patientKeys.detail(id), (prev) =>
        prev ? { ...prev, patient: { ...prev.patient, ...data } } : prev,
      );
      invalidateLists();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addPatient = useCallback((data: NewPatientInput) => addMutation.mutateAsync(data), [addMutation]);

  const updatePatient = useCallback(
    (id: string, data: Partial<Omit<Patient, "id">>) => updateMutation.mutate({ id, data }),
    [updateMutation],
  );

  const setPage = useCallback((p: number) => setPageState(p), []);
  const setSearch = useCallback((value: string) => setSearchState(value), []);
  const setStatusFilter = useCallback((value: string) => setStatusFilterState(value), []);

  return (
    <PatientsContext.Provider
      value={{
        patients: data?.results ?? [],
        count: data?.count ?? 0,
        isLoading,
        isFetching,
        page,
        setPage,
        search,
        setSearch,
        statusFilter,
        setStatusFilter,
        addPatient,
        updatePatient,
      }}
    >
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

/**
 * Ad-hoc "find a patient by name" search, independent of the main paginated
 * list's page/filter state. Used by pickers (e.g. the appointment-creation
 * form) that need a live top-N match against the full patient set rather than
 * whatever page happens to be loaded — with 2000+ patients, the two searches
 * are not interchangeable.
 */
export function usePatientSearch(query: string) {
  const { isAuthenticated } = useAuth();
  const { doctors } = useDoctors();
  const [debounced, setDebounced] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading } = useQuery({
    queryKey: patientKeys.search(debounced),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: "1" });
      if (debounced.trim()) qs.set("search", debounced.trim());
      const dto = await apiFetch<PaginatedDto<PatientListDto>>(`/clinic/patients/?${qs.toString()}`);
      return dto.results.map((r) => mapPatientFromList(r, doctors));
    },
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  });

  return { results: data ?? [], isLoading };
}

/**
 * True total patient count, independent of the main paginated list's
 * page/search/status/doctor filters (see usePatientSearch above for the same
 * reasoning) — used by widgets like the Dashboard KPI that need the whole
 * clinic's count regardless of whatever filter the Patients page last left set.
 */
export function useTotalPatientsCount() {
  const { isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: patientKeys.total,
    queryFn: async () => {
      const dto = await apiFetch<PaginatedDto<PatientListDto>>("/clinic/patients/?page=1");
      return dto.count;
    },
    enabled: isAuthenticated,
  });

  return { count: data ?? 0, isLoading };
}
