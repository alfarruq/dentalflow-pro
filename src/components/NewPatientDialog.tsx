import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DoctorSelect } from "@/components/DoctorSelect";
import {
  ToothChartPicker, TreatmentRowsTable, TreatmentRowsSummary,
  treatmentRowsToBatchRows, type TreatmentRowDraft,
} from "@/components/TreatmentComposer";
import type { Patient } from "@/data/mockPatients";
import type { TreatmentStatus } from "@/data/mockTreatments";
import { useDoctors } from "@/contexts/DoctorsContext";
import { usePatients } from "@/contexts/PatientsContext";
import { useTreatments } from "@/contexts/TreatmentContext";
import { useServiceTemplates } from "@/contexts/ServiceTemplatesContext";
import { usePatientFormFields } from "@/contexts/PatientFormFieldsContext";
import { formatUzPhone, phoneToE164, isUzPhoneComplete } from "@/lib/phone";
import { cn } from "@/lib/utils";

interface NewPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Which fields failed validation — keyed by field, value is the message. */
interface FormErrors {
  name?: string;
  phone?: string;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[12px] leading-tight text-destructive">{message}</p>;
}

/** "1 Bemor ─ 2 Muolaja" progress header. */
function StepIndicator({ step, labels }: { step: 1 | 2; labels: [string, string] }) {
  return (
    <div className="flex items-center gap-3">
      {labels.map((label, i) => {
        const n = (i + 1) as 1 | 2;
        const active = step === n;
        const done = step > n;
        return (
          <div key={label} className="flex items-center gap-3">
            {i > 0 && <span className="h-px w-6 bg-border sm:w-10" />}
            <div className={cn("flex items-center gap-2", !active && !done && "opacity-50")}>
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  active || done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {n}
              </span>
              <span className={cn("text-[13px]", active ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Globally-mounted "add patient" dialog — reachable from any route (Dashboard
 * quick action, ⌘K palette, ⌘N) rather than only from the Patients list page.
 * On success it navigates to the new patient's profile instead of resetting a
 * page-local pagination page, since that page state doesn't exist here.
 *
 * It merges patient intake with the first treatment, using the same tooth-chart
 * composer as the profile's treatment dialog ([TreatmentComposer.tsx]) so a
 * treatment recorded here carries real tooth numbers. Split across two steps
 * because the chart plus its per-tooth rows table does not share a screen with
 * the patient fields without forcing a whole-modal vertical scroll.
 *
 * Saving is two independent API calls (create patient → bulk-create its
 * treatments) with no server-side transaction spanning them, so the patient can
 * land while the treatments fail. `createdRef` remembers the committed patient
 * across attempts: retrying then only re-sends the treatments instead of
 * creating a duplicate patient, and the user is offered a way out either way.
 */
export function NewPatientDialog({ open, onOpenChange }: NewPatientDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setLastUsedDoctorId } = useDoctors();
  const { fields: formFields } = usePatientFormFields();
  const { addPatient } = usePatients();
  const { addTreatments } = useTreatments();
  const { treatmentTypes } = useServiceTemplates();

  const [step, setStep] = useState<1 | 2>(1);

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("+998");
  const [newBirthDate, setNewBirthDate] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newWorkplace, setNewWorkplace] = useState("");
  const [newDoctorId, setNewDoctorId] = useState("");

  // The first treatment is implicitly optional: no tooth picked ⇒ no rows ⇒
  // only the patient is created. That reads better than a separate on/off
  // toggle, since the chart already communicates "nothing selected".
  const [rows, setRows] = useState<TreatmentRowDraft[]>([]);
  const [newStatus, setNewStatus] = useState<TreatmentStatus>("in_progress");
  const [note, setNote] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  // Mirrors `createdRef` for rendering — the ref is what post-`await` logic reads.
  const [patientCommitted, setPatientCommitted] = useState(false);
  const createdRef = useRef<Patient | null>(null);

  function resetForm() {
    setStep(1);
    setNewName(""); setNewPhone("+998"); setNewBirthDate(""); setNewAddress(""); setNewWorkplace("");
    setNewDoctorId("");
    setRows([]); setNewStatus("in_progress"); setNote("");
    setErrors({}); setSubmitting(false); setPatientCommitted(false);
    createdRef.current = null;
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) resetForm();
  }

  /** Leave with the patient that was already created, treatment left for later. */
  function finishWithCommittedPatient() {
    const created = createdRef.current;
    if (!created) return;
    handleOpenChange(false);
    navigate(`/patients/${created.id}`);
  }

  function validatePatient(): FormErrors {
    const next: FormErrors = {};
    if (!newName.trim()) next.name = t("patients.nameRequired");
    if (!isUzPhoneComplete(newPhone)) next.phone = t("patients.phoneInvalid");
    return next;
  }

  function goToTreatmentStep() {
    const found = validatePatient();
    setErrors(found);
    if (Object.keys(found).length === 0) setStep(2);
  }

  async function save() {
    if (submitting) return;
    // Patient fields live on step 1, so a stale error there must still block.
    const found = validatePatient();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setStep(1);
      return;
    }

    setSubmitting(true);
    try {
      // Skipped when a previous attempt already committed the patient — that's
      // what keeps a failed-treatment retry from creating a second patient.
      let patient = createdRef.current;
      if (!patient) {
        patient = await addPatient({
          fullName: newName.trim(),
          phone: phoneToE164(newPhone),
          doctorId: newDoctorId || undefined,
          birthDate: newBirthDate || undefined,
          address: newAddress.trim() || undefined,
          office: newWorkplace.trim() || undefined,
        });
        createdRef.current = patient;
        setPatientCommitted(true);
      }

      if (rows.length > 0) {
        await addTreatments({
          patientId: patient.id,
          doctorId: newDoctorId || undefined,
          date: new Date().toISOString(),
          note: note.trim() || undefined,
          status: newStatus,
          rows: treatmentRowsToBatchRows(rows),
        });
      }

      if (newDoctorId) setLastUsedDoctorId(newDoctorId);
      const createdId = patient.id;
      handleOpenChange(false);
      toast.success(t("patients.patientCreated"));
      navigate(`/patients/${createdId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.errorOccurred");
      // A committed patient means it was the treatment call that failed — the
      // inline notice below takes over, so no toast is needed for that case.
      if (!createdRef.current) toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) goToTreatmentStep();
    else void save();
  }

  // Patient fields are locked once the record is committed: editing them here
  // would silently do nothing, since only the treatments get retried.
  const lockPatientFields = patientCommitted;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader className="space-y-3">
          <div>
            <DialogTitle>{t("patients.addPatientTitle")}</DialogTitle>
            <DialogDescription>{t("patients.addPatientDesc")}</DialogDescription>
          </div>
          <StepIndicator step={step} labels={[t("patients.patientSection"), t("patients.treatmentSection")]} />
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {patientCommitted && (
            <div className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="space-y-2 text-[13px]">
                <p className="font-medium text-amber-900 dark:text-amber-200">
                  {t("patients.patientSavedTreatmentFailed")}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 bg-background text-xs"
                  onClick={finishWithCommittedPatient}
                >
                  {t("patients.continueWithoutTreatment")}
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 1: patient ─────────────────────────────────────────── */}
          {step === 1 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label className="text-[13px]">
                  {t("patients.fullName")}<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  value={newName}
                  disabled={lockPatientFields}
                  aria-invalid={!!errors.name}
                  className={cn(errors.name && "border-destructive")}
                  onChange={(e) => { setNewName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                  placeholder="Aziz Karimov"
                />
                <FieldError message={errors.name} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[13px]">
                  {t("patients.phone")}<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  type="tel"
                  inputMode="tel"
                  value={newPhone}
                  disabled={lockPatientFields}
                  aria-invalid={!!errors.phone}
                  className={cn(errors.phone && "border-destructive")}
                  onChange={(e) => { setNewPhone(formatUzPhone(e.target.value)); setErrors((p) => ({ ...p, phone: undefined })); }}
                  placeholder="+998-(93)-110-11-01"
                />
                <FieldError message={errors.phone} />
              </div>
              {formFields.birthYear && (
                <div className="grid gap-1.5">
                  <Label className="text-[13px]">{t("patients.birthDate")}</Label>
                  <Input type="date" value={newBirthDate} disabled={lockPatientFields} onChange={(e) => setNewBirthDate(e.target.value)} />
                </div>
              )}
              {formFields.address && (
                <div className="grid gap-1.5">
                  <Label className="text-[13px]">{t("patients.address")}</Label>
                  <Input value={newAddress} disabled={lockPatientFields} onChange={(e) => setNewAddress(e.target.value)} placeholder={t("patients.addressPlaceholder")} />
                </div>
              )}
              {formFields.workplace && (
                <div className="grid gap-1.5">
                  <Label className="text-[13px]">{t("patients.workplace")}</Label>
                  <Input value={newWorkplace} disabled={lockPatientFields} onChange={(e) => setNewWorkplace(e.target.value)} placeholder={t("patients.workplacePlaceholder")} />
                </div>
              )}
              {/* Doctor is the patient's assigned doctor and is reused as the
                  treating doctor for the first treatment. */}
              <DoctorSelect
                value={newDoctorId}
                onChange={setNewDoctorId}
                label={t("finance.assignedDoctor")}
                className="space-y-1.5"
              />
            </div>
          )}

          {/* ── Step 2: first treatment ─────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-[13px] text-muted-foreground">{t("patients.treatmentSectionHint")}</p>

              {/* Chart left, visit-wide fields right — keeps the modal wide
                  rather than tall, same layout as the profile's dialog. */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("treatments.teeth")}</Label>
                  <ToothChartPicker rows={rows} onRowsChange={setRows} treatmentTypes={treatmentTypes} />
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>{t("patients.status")}</Label>
                    <Select value={newStatus} onValueChange={(v) => setNewStatus(v as TreatmentStatus)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_progress">{t("patients.in_progress")}</SelectItem>
                        <SelectItem value="completed">{t("patients.completed")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("treatments.notes")}</Label>
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="..." />
                  </div>
                </div>
              </div>

              <TreatmentRowsTable rows={rows} onRowsChange={setRows} treatmentTypes={treatmentTypes} />
              <TreatmentRowsSummary rows={rows} />
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {step === 1 ? (
              <>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="w-full sm:w-auto">
                  {t("patients.cancel")}
                </Button>
                <Button type="submit" className="w-full gap-1.5 sm:w-auto">
                  {t("patients.next")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={submitting}
                  className="w-full gap-1.5 sm:w-auto"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("patients.back")}
                </Button>
                <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {submitting
                    ? t("patients.saving")
                    : patientCommitted
                      ? t("patients.retryTreatment")
                      : t("patients.save")}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
