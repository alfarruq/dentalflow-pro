import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DoctorSelect } from "@/components/DoctorSelect";
import type { TreatmentStatus } from "@/data/mockTreatments";
import { useDoctors } from "@/contexts/DoctorsContext";
import { usePatients } from "@/contexts/PatientsContext";
import { useTreatments } from "@/contexts/TreatmentContext";
import { useServiceTemplates } from "@/contexts/ServiceTemplatesContext";
import { usePatientFormFields } from "@/contexts/PatientFormFieldsContext";
import { formatUzPhone, phoneToE164, isUzPhoneComplete } from "@/lib/phone";
import { formatThousands, parseThousands } from "@/lib/number";

interface NewPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Globally-mounted "add patient" dialog — reachable from any route (Dashboard
 * quick action, ⌘K palette, ⌘N) rather than only from the Patients list page.
 * On success it navigates to the new patient's profile instead of resetting a
 * page-local pagination page, since that page state doesn't exist here.
 */
export function NewPatientDialog({ open, onOpenChange }: NewPatientDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setLastUsedDoctorId } = useDoctors();
  const { fields: formFields } = usePatientFormFields();
  const { addPatient } = usePatients();
  const { addTreatment } = useTreatments();
  const { treatmentTypes } = useServiceTemplates();

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("+998");
  const [newBirthDate, setNewBirthDate] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newWorkplace, setNewWorkplace] = useState("");
  const [newTreatmentTypeId, setNewTreatmentTypeId] = useState("");
  const [newStatus, setNewStatus] = useState<TreatmentStatus>("in_progress");
  const [newTotalCost, setNewTotalCost] = useState("");
  const [newAmountPaid, setNewAmountPaid] = useState("");
  const [newDoctorId, setNewDoctorId] = useState("");

  // Default the treatment-type select (and its price) once the list loads.
  useEffect(() => {
    if (!open || newTreatmentTypeId || treatmentTypes.length === 0) return;
    const first = treatmentTypes[0];
    setNewTreatmentTypeId(String(first.id));
    if (first.price != null) setNewTotalCost(formatThousands(String(first.price)));
  }, [open, newTreatmentTypeId, treatmentTypes]);

  // Picking a treatment type prefills its price as an editable default.
  function selectTreatmentType(id: string) {
    setNewTreatmentTypeId(id);
    const tt = treatmentTypes.find((t) => String(t.id) === id);
    if (tt?.price != null) setNewTotalCost(formatThousands(String(tt.price)));
  }

  function resetForm() {
    setNewName(""); setNewPhone("+998"); setNewBirthDate(""); setNewAddress(""); setNewWorkplace("");
    setNewTreatmentTypeId("");
    setNewStatus("in_progress"); setNewTotalCost("");
    setNewAmountPaid("");
    setNewDoctorId("");
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) resetForm();
  }

  async function handleAddPatient() {
    if (!newName.trim() || !isUzPhoneComplete(newPhone)) {
      toast.error(t("patients.phoneRequired"));
      return;
    }
    let created;
    try {
      created = await addPatient({
        fullName: newName.trim(),
        phone: phoneToE164(newPhone),
        doctorId: newDoctorId || undefined,
        birthDate: newBirthDate || undefined,
        address: newAddress.trim() || undefined,
        office: newWorkplace.trim() || undefined,
      });
      await addTreatment({
        patientId: created.id,
        date: new Date().toISOString(),
        teeth: [],
        treatmentTypeId: Number(newTreatmentTypeId) || undefined,
        totalCost: Number(parseThousands(newTotalCost)) || 0,
        amountPaid: Number(parseThousands(newAmountPaid)) || 0,
        status: newStatus,
        doctorId: newDoctorId || undefined,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi");
      return;
    }
    if (newDoctorId) setLastUsedDoctorId(newDoctorId);
    handleOpenChange(false);
    navigate(`/patients/${created.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
            <Input
              type="tel"
              inputMode="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(formatUzPhone(e.target.value))}
              placeholder="+998-(93)-110-11-01"
            />
          </div>
          {formFields.birthYear && (
            <div className="grid gap-2">
              <Label className="text-[13px]">{t("patients.birthDate")}</Label>
              <Input type="date" value={newBirthDate} onChange={(e) => setNewBirthDate(e.target.value)} />
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
            <Select value={newTreatmentTypeId} onValueChange={selectTreatmentType}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder={t("appointments.selectTreatment")} />
              </SelectTrigger>
              <SelectContent>
                {treatmentTypes.map((tt) => (
                  <SelectItem key={tt.id} value={String(tt.id)}>{tt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="text-[13px]">{t("patients.totalCost")}</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={newTotalCost}
              onChange={(e) => setNewTotalCost(formatThousands(e.target.value))}
              placeholder="500,000"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-[13px]">{t("patients.paid")}</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={newAmountPaid}
              onChange={(e) => setNewAmountPaid(formatThousands(e.target.value))}
              placeholder="200,000"
            />
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
          {/* Doctor selector — one grid cell; hidden when single-doctor clinic.
              space-y-2 aligns its label/control spacing with the sibling fields. */}
          <DoctorSelect
            value={newDoctorId}
            onChange={setNewDoctorId}
            label={t("finance.assignedDoctor")}
            className="space-y-2"
          />
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} className="w-full sm:w-auto">{t("patients.cancel")}</Button>
          <Button onClick={handleAddPatient} className="w-full sm:w-auto">{t("patients.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
