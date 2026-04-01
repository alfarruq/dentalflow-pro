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
import { mockPatients, getRemainingBalance, type Patient, type TreatmentType, type PatientStatus } from "@/data/mockPatients";

const PAGE_SIZE = 10;

const statusColors: Record<PatientStatus, string> = {
  pending: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  in_progress: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  completed: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
};

function formatCurrency(amount: number) {
  return amount.toLocaleString("uz-UZ");
}

export default function Patients() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [treatmentFilter, setTreatmentFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newTreatment, setNewTreatment] = useState<TreatmentType>("cleaning");
  const [newStatus, setNewStatus] = useState<PatientStatus>("pending");
  const [newTotalCost, setNewTotalCost] = useState("");
  const [newAmountPaid, setNewAmountPaid] = useState("");

  const filtered = useMemo(() => {
    let result = [...patients];
    if (search) { const q = search.toLowerCase(); result = result.filter((p) => p.fullName.toLowerCase().includes(q)); }
    if (statusFilter !== "all") result = result.filter((p) => p.status === statusFilter);
    if (treatmentFilter !== "all") result = result.filter((p) => p.treatmentType === treatmentFilter);
    result.sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());
    return result;
  }, [patients, search, statusFilter, treatmentFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleAddPatient() {
    if (!newName.trim()) return;
    const patient: Patient = {
      id: `p-${Date.now()}`, fullName: newName.trim(), phone: newPhone.trim() || "+998901234567",
      age: 30, allergies: [], medicalNotes: "", appointmentDate: new Date().toISOString(),
      treatmentType: newTreatment, status: newStatus, totalCost: Number(newTotalCost) || 0,
      amountPaid: Number(newAmountPaid) || 0, treatmentHistory: [], galleryImages: [],
    };
    setPatients((prev) => [patient, ...prev]);
    setNewName(""); setNewPhone(""); setNewTreatment("cleaning"); setNewStatus("pending"); setNewTotalCost(""); setNewAmountPaid("");
    setDialogOpen(false); setPage(1);
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("patients.title")}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />{t("patients.addPatient")}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>{t("patients.addPatientTitle")}</DialogTitle>
              <DialogDescription>{t("patients.addPatientDesc")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2"><Label className="text-[13px]">{t("patients.fullName")}</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Aziz Karimov" /></div>
              <div className="grid gap-2"><Label className="text-[13px]">{t("patients.phone")}</Label><Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+998901234567" /></div>
              <div className="grid grid-cols-2 gap-4">
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
                  <Label className="text-[13px]">{t("patients.status")}</Label>
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as PatientStatus)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t("patients.pending")}</SelectItem>
                      <SelectItem value="in_progress">{t("patients.in_progress")}</SelectItem>
                      <SelectItem value="completed">{t("patients.completed")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label className="text-[13px]">{t("patients.totalCost")}</Label><Input type="number" value={newTotalCost} onChange={(e) => setNewTotalCost(e.target.value)} placeholder="500000" /></div>
                <div className="grid gap-2"><Label className="text-[13px]">{t("patients.paid")}</Label><Input type="number" value={newAmountPaid} onChange={(e) => setNewAmountPaid(e.target.value)} placeholder="200000" /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("patients.cancel")}</Button>
              <Button onClick={handleAddPatient}>{t("patients.save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground stroke-[1.5]" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={t("patients.searchPlaceholder")} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px] rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("patients.allStatuses")}</SelectItem>
            <SelectItem value="pending">{t("patients.pending")}</SelectItem>
            <SelectItem value="in_progress">{t("patients.in_progress")}</SelectItem>
            <SelectItem value="completed">{t("patients.completed")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={treatmentFilter} onValueChange={(v) => { setTreatmentFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px] rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("patients.allTreatments")}</SelectItem>
            <SelectItem value="implant">{t("patients.implant")}</SelectItem>
            <SelectItem value="filling">{t("patients.filling")}</SelectItem>
            <SelectItem value="cleaning">{t("patients.cleaning")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/40 hover:bg-transparent">
              <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.fullName")}</TableHead>
              <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.phone")}</TableHead>
              <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.appointmentDate")}</TableHead>
              <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.treatmentType")}</TableHead>
              <TableHead className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.status")}</TableHead>
              <TableHead className="text-right text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.totalCost")}</TableHead>
              <TableHead className="text-right text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.paid")}</TableHead>
              <TableHead className="text-right text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t("patients.remaining")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">{t("patients.noResults")}</TableCell></TableRow>
            ) : (
              paginated.map((patient) => {
                const remaining = getRemainingBalance(patient);
                const hasDebt = remaining > 0;
                return (
                  <TableRow key={patient.id} className="cursor-pointer transition-colors border-b border-border/30 hover:bg-accent/30" onClick={() => navigate(`/patients/${patient.id}`)}>
                    <TableCell className="font-medium text-[13px]">{patient.fullName}</TableCell>
                    <TableCell className="text-muted-foreground text-[13px]">{patient.phone}</TableCell>
                    <TableCell className="text-muted-foreground text-[13px]">{format(new Date(patient.appointmentDate), "dd.MM.yyyy HH:mm")}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[12px] rounded-lg">{t(`patients.${patient.treatmentType}`)}</Badge></TableCell>
                    <TableCell><Badge className={`border-0 text-[11px] ${statusColors[patient.status]}`}>{t(`patients.${patient.status}`)}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums text-[13px]">{formatCurrency(patient.totalCost)}</TableCell>
                    <TableCell className="text-right tabular-nums text-[13px]">{formatCurrency(patient.amountPaid)}</TableCell>
                    <TableCell className="text-right tabular-nums text-[13px]">
                      <span className="flex items-center justify-end gap-2">
                        {formatCurrency(remaining)}
                        {hasDebt && <Badge className="bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400 border-0 text-[10px]">{t("patients.debt")}</Badge>}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
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
