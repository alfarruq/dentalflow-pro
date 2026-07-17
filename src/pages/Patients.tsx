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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { TreatmentType } from "@/data/mockPatients";
import type { TreatmentStatus } from "@/data/mockTreatments";
import { useDoctors } from "@/contexts/DoctorsContext";
import { usePatients } from "@/contexts/PatientsContext";
import { useTreatments } from "@/contexts/TreatmentContext";
import { usePatientFormFields } from "@/contexts/PatientFormFieldsContext";
import { DoctorFilterChips } from "@/components/DoctorFilterChips";
import { DoctorBadge } from "@/components/DoctorBadge";
import { DoctorSelect } from "@/components/DoctorSelect";

const PAGE_SIZE = 10;

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
  const { filterDoctorId, setLastUsedDoctorId } = useDoctors();
  const { fields: formFields } = usePatientFormFields();
  const { patients, addPatient } = usePatients();
  const { addTreatment } = useTreatments();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [treatmentFilter, setTreatmentFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newBirthYear, setNewBirthYear] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newWorkplace, setNewWorkplace] = useState("");
  const [newTreatment, setNewTreatment] = useState<TreatmentType>("cleaning");
  const [newStatus, setNewStatus] = useState<TreatmentStatus>("in_progress");
  const [newTotalCost, setNewTotalCost] = useState("");
  const [newAmountPaid, setNewAmountPaid] = useState("");
  const [newDoctorId, setNewDoctorId] = useState("");

  // Doctor counts for filter chips
  const doctorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of patients) {
      if (p.assignedDoctorId) {
        counts[p.assignedDoctorId] = (counts[p.assignedDoctorId] ?? 0) + 1;
      }
    }
    return counts;
  }, [patients]);

  // Aggregates (remaining/status/latest type) come precomputed from the list API
  const enriched = useMemo(
    () =>
      patients.map((p) => ({
        patient: p,
        balance: { remaining: p.remaining ?? 0 },
        status: p.treatmentStatus ?? ("in_progress" as TreatmentStatus),
        treatmentType: p.latestTreatmentType,
      })),
    [patients],
  );

  const filtered = useMemo(() => {
    let result = [...enriched];
    if (filterDoctorId) result = result.filter((r) => r.patient.assignedDoctorId === filterDoctorId);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.patient.fullName.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") result = result.filter((r) => r.status === statusFilter);
    if (treatmentFilter !== "all") result = result.filter((r) => r.treatmentType === treatmentFilter);
    result.sort((a, b) => new Date(b.patient.appointmentDate).getTime() - new Date(a.patient.appointmentDate).getTime());
    return result;
  }, [enriched, search, statusFilter, treatmentFilter, filterDoctorId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function resetForm() {
    setNewName(""); setNewPhone(""); setNewBirthYear(""); setNewAddress(""); setNewWorkplace("");
    setNewTreatment("cleaning");
    setNewStatus("in_progress"); setNewTotalCost("");
    setNewAmountPaid("");
    setNewDoctorId("");
  }

  async function handleAddPatient() {
    if (!newName.trim() || !newPhone.trim()) {
      toast.error(t("patients.phoneRequired"));
      return;
    }
    try {
      const created = await addPatient({
        fullName: newName.trim(),
        phone: newPhone.trim(),
        doctorId: newDoctorId || undefined,
      });
      await addTreatment({
        patientId: created.id,
        date: new Date().toISOString(),
        teeth: [],
        treatmentType: newTreatment,
        totalCost: Number(newTotalCost) || 0,
        amountPaid: Number(newAmountPaid) || 0,
        status: newStatus,
        doctorId: newDoctorId || undefined,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi");
      return;
    }
    if (newDoctorId) setLastUsedDoctorId(newDoctorId);
    resetForm();
    setDialogOpen(false);
    setPage(1);
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{t("patients.title")}</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto"><Plus className="h-4 w-4" />{t("patients.addPatient")}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("patients.addPatientTitle")}</DialogTitle>
              <DialogDescription>{t("patients.addPatientDesc")}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <div className="grid gap-2">
                <Label className="text-[13px]">{t("patients.fullName")}</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Aziz Karimov" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[13px]">{t("patients.phone")}</Label>
                <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+998901234567" />
              </div>
              {formFields.birthYear && (
                <div className="grid gap-2">
                  <Label className="text-[13px]">{t("patients.birthYear")}</Label>
                  <Input type="number" value={newBirthYear} onChange={(e) => setNewBirthYear(e.target.value)} placeholder="1990" />
                </div>
              )}
              {formFields.address && (
                <div className="grid gap-2">
                  <Label className="text-[13px]">{t("patients.address")}</Label>
                  <Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder={t("patients.addressPlaceholder")} />
                </div>
              )}
              {formFields.workplace && (
                <div className="grid gap-2">
                  <Label className="text-[13px]">{t("patients.workplace")}</Label>
                  <Input value={newWorkplace} onChange={(e) => setNewWorkplace(e.target.value)} placeholder={t("patients.workplacePlaceholder")} />
                </div>
              )}
              <div className="grid gap-2">
                <Label className="text-[13px]">{t("patients.treatmentType")}</Label>
                <Select value={newTreatment} onValueChange={(v) => setNewTreatment(v as TreatmentType)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="implant">{t("patients.implant")}</SelectItem>
                    <SelectItem value="filling">{t("patients.filling")}</SelectItem>
                    <SelectItem value="cleaning">{t("patients.cleaning")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-[13px]">{t("patients.totalCost")}</Label>
                <Input type="number" value={newTotalCost} onChange={(e) => setNewTotalCost(e.target.value)} placeholder="500000" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[13px]">{t("patients.paid")}</Label>
                <Input type="number" value={newAmountPaid} onChange={(e) => setNewAmountPaid(e.target.value)} placeholder="200000" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[13px]">{t("patients.status")}</Label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as TreatmentStatus)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">{t("patients.in_progress")}</SelectItem>
                    <SelectItem value="completed">{t("patients.completed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Doctor selector — hidden when single-doctor clinic; spans full width, placed last */}
              <DoctorSelect
                value={newDoctorId}
                onChange={setNewDoctorId}
                label={t("finance.assignedDoctor")}
                className="sm:col-span-2"
              />
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }} className="w-full sm:w-auto">{t("patients.cancel")}</Button>
              <Button onClick={handleAddPatient} className="w-full sm:w-auto">{t("patients.save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search + status/treatment filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground stroke-[1.5]" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={t("patients.searchPlaceholder")} className="pl-10" />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[160px] rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("patients.allStatuses")}</SelectItem>
              <SelectItem value="in_progress">{t("patients.in_progress")}</SelectItem>
              <SelectItem value="completed">{t("patients.completed")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={treatmentFilter} onValueChange={(v) => { setTreatmentFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[160px] rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("patients.allTreatments")}</SelectItem>
              <SelectItem value="implant">{t("patients.implant")}</SelectItem>
              <SelectItem value="filling">{t("patients.filling")}</SelectItem>
              <SelectItem value="cleaning">{t("patients.cleaning")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Doctor filter chips — shown only for multi-doctor clinics */}
      <DoctorFilterChips counts={doctorCounts} totalCount={patients.length} />

      {/* Mobile card view */}
      <div className="block sm:hidden space-y-3">
        {paginated.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">{t("patients.noResults")}</p>
        ) : (
          paginated.map(({ patient, balance, status, treatmentType }) => (
            <Card key={patient.id} className="p-4 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => navigate(`/patients/${patient.id}`)}>
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <p className="font-medium text-[14px] truncate">{patient.fullName}</p>
                  <p className="text-xs text-muted-foreground">{patient.phone}</p>
                </div>
                <Badge className={`border-0 text-[11px] ml-2 shrink-0 ${statusColors[status]}`}>{t(`patients.${status}`)}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{treatmentType ? t(`patients.${treatmentType}`) : "—"}</span>
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
                paginated.map(({ patient, balance, status, treatmentType }) => {
                  const hasDebt = balance.remaining > 0;
                  return (
                    <TableRow key={patient.id} className="cursor-pointer transition-colors border-b border-border/30 hover:bg-accent/30" onClick={() => navigate(`/patients/${patient.id}`)}>
                      <TableCell className="font-medium text-[13px] whitespace-nowrap">{patient.fullName}</TableCell>
                      <TableCell className="text-muted-foreground text-[13px] hidden md:table-cell whitespace-nowrap">{patient.phone}</TableCell>
                      <TableCell className="text-muted-foreground text-[13px] hidden lg:table-cell whitespace-nowrap">{format(new Date(patient.appointmentDate), "dd.MM.yyyy HH:mm")}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[12px] rounded-lg whitespace-nowrap">{treatmentType ? t(`patients.${treatmentType}`) : "—"}</Badge></TableCell>
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
        <span>{t("patients.showing")} {filtered.length} {t("patients.patients")}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl">←</Button>
          <span>{t("patients.page")} {currentPage} {t("patients.of")} {totalPages}</span>
          <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-xl">→</Button>
        </div>
      </div>
    </div>
  );
}
