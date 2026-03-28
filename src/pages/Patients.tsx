import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  mockPatients, getRemainingBalance,
  type Patient, type TreatmentType, type PatientStatus,
} from "@/data/mockPatients";

const PAGE_SIZE = 10;

const statusColors: Record<PatientStatus, string> = {
  pending: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  in_progress: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  completed: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
};

function formatCurrency(amount: number) {
  return amount.toLocaleString("uz-UZ");
}

export default function Patients() {
  const { t } = useTranslation();

  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [treatmentFilter, setTreatmentFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  // New patient form state
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newTreatment, setNewTreatment] = useState<TreatmentType>("cleaning");
  const [newStatus, setNewStatus] = useState<PatientStatus>("pending");
  const [newTotalCost, setNewTotalCost] = useState("");
  const [newAmountPaid, setNewAmountPaid] = useState("");

  const filtered = useMemo(() => {
    let result = [...patients];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.fullName.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (treatmentFilter !== "all") {
      result = result.filter((p) => p.treatmentType === treatmentFilter);
    }

    result.sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());
    return result;
  }, [patients, search, statusFilter, treatmentFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleAddPatient() {
    if (!newName.trim()) return;
    const patient: Patient = {
      id: `p-${Date.now()}`,
      fullName: newName.trim(),
      phone: newPhone.trim() || "+998901234567",
      appointmentDate: new Date().toISOString(),
      treatmentType: newTreatment,
      status: newStatus,
      totalCost: Number(newTotalCost) || 0,
      amountPaid: Number(newAmountPaid) || 0,
    };
    setPatients((prev) => [patient, ...prev]);
    setNewName("");
    setNewPhone("");
    setNewTreatment("cleaning");
    setNewStatus("pending");
    setNewTotalCost("");
    setNewAmountPaid("");
    setDialogOpen(false);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t("patients.title")}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t("patients.addPatient")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("patients.addPatientTitle")}</DialogTitle>
              <DialogDescription>{t("patients.addPatientDesc")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{t("patients.fullName")}</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Aziz Karimov" />
              </div>
              <div className="grid gap-2">
                <Label>{t("patients.phone")}</Label>
                <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+998901234567" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{t("patients.treatmentType")}</Label>
                  <Select value={newTreatment} onValueChange={(v) => setNewTreatment(v as TreatmentType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="implant">{t("patients.implant")}</SelectItem>
                      <SelectItem value="filling">{t("patients.filling")}</SelectItem>
                      <SelectItem value="cleaning">{t("patients.cleaning")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{t("patients.status")}</Label>
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as PatientStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t("patients.pending")}</SelectItem>
                      <SelectItem value="in_progress">{t("patients.in_progress")}</SelectItem>
                      <SelectItem value="completed">{t("patients.completed")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{t("patients.totalCost")}</Label>
                  <Input type="number" value={newTotalCost} onChange={(e) => setNewTotalCost(e.target.value)} placeholder="500000" />
                </div>
                <div className="grid gap-2">
                  <Label>{t("patients.paid")}</Label>
                  <Input type="number" value={newAmountPaid} onChange={(e) => setNewAmountPaid(e.target.value)} placeholder="200000" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("patients.cancel")}</Button>
              <Button onClick={handleAddPatient}>{t("patients.save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t("patients.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("patients.allStatuses")}</SelectItem>
            <SelectItem value="pending">{t("patients.pending")}</SelectItem>
            <SelectItem value="in_progress">{t("patients.in_progress")}</SelectItem>
            <SelectItem value="completed">{t("patients.completed")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={treatmentFilter} onValueChange={(v) => { setTreatmentFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("patients.allTreatments")}</SelectItem>
            <SelectItem value="implant">{t("patients.implant")}</SelectItem>
            <SelectItem value="filling">{t("patients.filling")}</SelectItem>
            <SelectItem value="cleaning">{t("patients.cleaning")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("patients.fullName")}</TableHead>
              <TableHead>{t("patients.phone")}</TableHead>
              <TableHead>{t("patients.appointmentDate")}</TableHead>
              <TableHead>{t("patients.treatmentType")}</TableHead>
              <TableHead>{t("patients.status")}</TableHead>
              <TableHead className="text-right">{t("patients.totalCost")}</TableHead>
              <TableHead className="text-right">{t("patients.paid")}</TableHead>
              <TableHead className="text-right">{t("patients.remaining")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  {t("patients.noResults")}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((patient) => {
                const remaining = getRemainingBalance(patient);
                const hasDebt = remaining > 0;
                return (
                  <TableRow key={patient.id} className={hasDebt ? "bg-destructive/5" : ""}>
                    <TableCell className="font-medium">{patient.fullName}</TableCell>
                    <TableCell className="text-muted-foreground">{patient.phone}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(patient.appointmentDate), "dd.MM.yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t(`patients.${patient.treatmentType}`)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[patient.status]}>
                        {t(`patients.${patient.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(patient.totalCost)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(patient.amountPaid)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="flex items-center justify-end gap-2">
                        {formatCurrency(remaining)}
                        {hasDebt && (
                          <Badge className="bg-destructive/15 text-destructive border-destructive/30">
                            {t("patients.debt")}
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {t("patients.showing")} {filtered.length} {t("patients.patients")}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ←
          </Button>
          <span>
            {t("patients.page")} {currentPage} {t("patients.of")} {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            →
          </Button>
        </div>
      </div>
    </div>
  );
}
