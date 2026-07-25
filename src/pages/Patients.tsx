import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import type { TreatmentStatus } from "@/data/mockTreatments";
import { usePatients, PATIENTS_PAGE_SIZE } from "@/contexts/PatientsContext";
import { useQuickCreate } from "@/contexts/QuickCreateContext";
import { DoctorFilterChips } from "@/components/DoctorFilterChips";
import { DoctorBadge } from "@/components/DoctorBadge";

const statusColors: Record<TreatmentStatus, string> = {
  in_progress: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  completed: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
};

function formatCurrency(amount: number) {
  return amount.toLocaleString("uz-UZ");
}

export default function Patients() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { openNewPatient } = useQuickCreate();
  const {
    patients, count, isFetching,
    page, setPage, search, setSearch, statusFilter, setStatusFilter,
  } = usePatients();

  // Treatment-type has no server-side filter (the API only supports filtering
  // by a specific treatment id, not by type) — kept as a current-page-only
  // refinement, clearly labelled, per product decision.
  const [treatmentFilter, setTreatmentFilter] = useState<string>("all");

  // Search, status and doctor filters are applied server-side (see
  // PatientsContext) — `patients` here is already just the current page.
  // Treatment-type has no server-side filter, so it only narrows what's
  // visible on this page (see the note next to the filter control below).
  const enriched = useMemo(
    () =>
      patients
        .map((p) => ({
          patient: p,
          balance: { remaining: p.remaining ?? 0 },
          status: p.treatmentStatus ?? ("in_progress" as TreatmentStatus),
          treatmentType: p.latestTreatmentType,
          treatmentTypeName: p.latestTreatmentTypeName,
        }))
        .filter((r) => treatmentFilter === "all" || r.treatmentType === treatmentFilter)
        .sort((a, b) => new Date(b.patient.appointmentDate).getTime() - new Date(a.patient.appointmentDate).getTime()),
    [patients, treatmentFilter],
  );

  const totalPages = Math.max(1, Math.ceil(count / PATIENTS_PAGE_SIZE));
  const currentPage = page;
  const paginated = enriched;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{t("patients.title")}</h1>
        <Button className="gap-2 w-full sm:w-auto" onClick={openNewPatient}>
          <Plus className="h-4 w-4" />{t("patients.addPatient")}
        </Button>
      </div>

      {/* Search + status/treatment filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground stroke-[1.5]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("patients.searchPlaceholder")} className="pl-10" />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px] rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("patients.allStatuses")}</SelectItem>
              <SelectItem value="in_progress">{t("patients.in_progress")}</SelectItem>
              <SelectItem value="completed">{t("patients.completed")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={treatmentFilter} onValueChange={setTreatmentFilter}>
            <SelectTrigger className="w-full sm:w-[160px] rounded-xl" title={t("patients.currentPageOnlyNote")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("patients.allTreatments")}</SelectItem>
              <SelectItem value="implant">{t("patients.implant")}</SelectItem>
              <SelectItem value="filling">{t("patients.filling")}</SelectItem>
              <SelectItem value="cleaning">{t("patients.cleaning")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {treatmentFilter !== "all" && (
        <p className="text-xs text-muted-foreground -mt-2">{t("patients.currentPageOnlyNote")}</p>
      )}

      {/* Doctor filter chips — shown only for multi-doctor clinics. Per-doctor
          counts aren't shown: computing them would require a full-dataset
          scan the paginated API doesn't offer in one call. */}
      <DoctorFilterChips />

      {/* Mobile card view */}
      <div className="block sm:hidden space-y-3">
        {paginated.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">{t("patients.noResults")}</p>
        ) : (
          paginated.map(({ patient, balance, status, treatmentTypeName }) => (
            <Card key={patient.id} className="p-4 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => navigate(`/patients/${patient.id}`)}>
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <p className="font-medium text-[14px] truncate">{patient.fullName}</p>
                  <p className="text-xs text-muted-foreground">{patient.phone}</p>
                </div>
                <Badge className={`border-0 text-[11px] ml-2 shrink-0 ${statusColors[status]}`}>{t(`patients.${status}`)}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{treatmentTypeName || "—"}</span>
                <span>{format(new Date(patient.appointmentDate), "dd.MM.yyyy")}</span>
              </div>
              {/* Doctor badge */}
              <DoctorBadge doctorId={patient.assignedDoctorId} variant="compact" className="mt-1.5" />
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-muted-foreground">{t("patients.remaining")}:</span>
                <span className={balance.remaining > 0 ? "font-semibold text-destructive" : "font-semibold text-emerald-600"}>
                  {formatCurrency(balance.remaining)} so'm
                </span>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Desktop table view */}
      <Card className="hidden sm:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/40 hover:bg-transparent">
                <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.fullName")}</TableHead>
                <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">{t("patients.phone")}</TableHead>
                <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground hidden lg:table-cell">{t("patients.appointmentDate")}</TableHead>
                <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.treatmentType")}</TableHead>
                <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.status")}</TableHead>
                <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground hidden xl:table-cell">{t("doctors.title")}</TableHead>
                <TableHead className="text-right text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.remaining")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">{t("patients.noResults")}</TableCell></TableRow>
              ) : (
                paginated.map(({ patient, balance, status, treatmentTypeName }) => {
                  const hasDebt = balance.remaining > 0;
                  return (
                    <TableRow key={patient.id} className="cursor-pointer transition-colors border-b border-border/30 hover:bg-accent/30" onClick={() => navigate(`/patients/${patient.id}`)}>
                      <TableCell className="font-medium text-[13px] whitespace-nowrap">{patient.fullName}</TableCell>
                      <TableCell className="text-muted-foreground text-[13px] hidden md:table-cell whitespace-nowrap">{patient.phone}</TableCell>
                      <TableCell className="text-muted-foreground text-[13px] hidden lg:table-cell whitespace-nowrap">{format(new Date(patient.appointmentDate), "dd.MM.yyyy HH:mm")}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[12px] rounded-lg whitespace-nowrap">{treatmentTypeName || "—"}</Badge></TableCell>
                      <TableCell><Badge className={`border-0 text-[11px] whitespace-nowrap ${statusColors[status]}`}>{t(`patients.${status}`)}</Badge></TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <DoctorBadge doctorId={patient.assignedDoctorId} variant="compact" />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-[13px]">
                        <span className="flex items-center justify-end gap-2">
                          {formatCurrency(balance.remaining)}
                          {hasDebt && <Badge className="bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400 border-0 text-[10px]">{t("patients.debt")}</Badge>}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="flex items-center justify-between text-[13px] text-muted-foreground">
        <span>
          {t("patients.showing")} {count} {t("patients.patients")}
          {isFetching && <span className="ml-2">{t("common.loading")}</span>}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="rounded-xl">←</Button>
          <span>{t("patients.page")} {currentPage} {t("patients.of")} {totalPages}</span>
          <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} className="rounded-xl">→</Button>
        </div>
      </div>
    </div>
  );
}
