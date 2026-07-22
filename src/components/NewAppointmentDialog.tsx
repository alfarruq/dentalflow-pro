import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Patient } from "@/data/mockPatients";
import { useDoctors } from "@/contexts/DoctorsContext";
import { usePatientSearch } from "@/contexts/PatientsContext";
import { useServiceTemplates } from "@/contexts/ServiceTemplatesContext";
import { useCreateAppointment } from "@/hooks/useAppointments";
import { DoctorSelect } from "@/components/DoctorSelect";
import { ToothPicker } from "@/components/ToothPicker";
import { useToast } from "@/hooks/use-toast";

interface NewAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 09:00 → 17:30 in 30-minute steps.
const TIME_SLOTS = Array.from({ length: 18 }, (_, i) => {
  const h = 9 + Math.floor(i / 2);
  const m = (i % 2) * 30;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

/** Reusable field wrapper: label above its control, filling a grid cell. */
function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function NewAppointmentDialog({ open, onOpenChange }: NewAppointmentDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { setLastUsedDoctorId } = useDoctors();
  const { treatmentTypes } = useServiceTemplates();
  const createAppointment = useCreateAppointment();

  // ─── Form state ──────────────────────────────────────────────────────────
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null); // holds hidden id + phone
  const [patientQuery, setPatientQuery] = useState("");
  const [patientOpen, setPatientOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [dateOpen, setDateOpen] = useState(false);
  const [time, setTime] = useState("09:00");
  const [doctorId, setDoctorId] = useState("");
  const [treatmentTypeId, setTreatmentTypeId] = useState("");
  const [teeth, setTeeth] = useState<number[]>([]);
  const [toothOpen, setToothOpen] = useState(false);
  const [notes, setNotes] = useState("");

  // Server-side patient search (debounced inside the hook).
  const { results: patients } = usePatientSearch(patientQuery);

  // Default the treatment-type select to the first option once the list loads.
  useEffect(() => {
    if (open && !treatmentTypeId && treatmentTypes.length > 0) {
      setTreatmentTypeId(String(treatmentTypes[0].id));
    }
  }, [open, treatmentTypeId, treatmentTypes]);

  function resetForm() {
    setSelectedPatient(null);
    setPatientQuery("");
    setPatientOpen(false);
    setDate(new Date());
    setDateOpen(false);
    setTime("09:00");
    setDoctorId("");
    setTreatmentTypeId("");
    setTeeth([]);
    setToothOpen(false);
    setNotes("");
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) resetForm();
  }

  async function handleSave() {
    if (!selectedPatient || !date || !doctorId) return;
    try {
      await createAppointment.mutateAsync({
        patientId: selectedPatient.id,
        doctorId,
        date: format(date, "yyyy-MM-dd"),
        time,
        notes,
        // NOTE: treatment type + selected teeth are captured in the form but the
        // backend create schema (swagger) has no fields for them yet, so they are
        // intentionally not sent. Re-wire here once the API accepts them.
      });
    } catch {
      return; // error toast handled by the mutation
    }
    setLastUsedDoctorId(doctorId);
    handleOpenChange(false);
    toast({ title: t("appointments.appointmentAdded") });
  }

  const canSave = Boolean(selectedPatient && date && doctorId) && !createAppointment.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("appointments.newAppointmentTitle")}</DialogTitle>
          <DialogDescription>{t("appointments.newAppointmentDesc")}</DialogDescription>
        </DialogHeader>

        {/*
          Hidden, screen-invisible fields kept in state so they can be POSTed
          once the backend accepts them: patient id + the selected patient's
          phone number (auto-captured on selection, no visible input).
        */}
        <input type="hidden" name="patientId" value={selectedPatient?.id ?? ""} readOnly />
        <input type="hidden" name="phone" value={selectedPatient?.phone ?? ""} readOnly />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Patient */}
          <Field label={t("appointments.selectPatient")}>
              <Popover open={patientOpen} onOpenChange={setPatientOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={patientOpen}
                    className="w-full justify-between font-normal"
                  >
                    <span className={cn("truncate", !selectedPatient && "text-muted-foreground")}>
                      {selectedPatient ? selectedPatient.fullName : t("appointments.searchPatient")}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={t("appointments.searchPatient")}
                      value={patientQuery}
                      onValueChange={setPatientQuery}
                    />
                    <CommandList>
                      <CommandEmpty>{t("appointments.noPatientsFound")}</CommandEmpty>
                      <CommandGroup>
                        {patients.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={p.id}
                            onSelect={() => {
                              setSelectedPatient(p);
                              setPatientOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 shrink-0",
                                selectedPatient?.id === p.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate text-sm">{p.fullName}</span>
                              <span className="truncate text-xs text-muted-foreground">{p.phone}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
          </Field>

          {/* Doctor (renders its own label) */}
          <DoctorSelect
            value={doctorId}
            onChange={setDoctorId}
            label={t("appointments.doctorLabel")}
            hideIfSingle={false}
            required
          />

          {/* Date */}
          <Field label={t("appointments.date")}>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd.MM.yyyy") : t("appointments.selectDate")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d);
                    setDateOpen(false);
                  }}
                  initialFocus
                  className="pointer-events-auto p-3"
                />
              </PopoverContent>
            </Popover>
          </Field>

          {/* Time */}
          <Field label={t("appointments.time")}>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((ts) => (
                  <SelectItem key={ts} value={ts}>
                    {ts}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Treatment type — options from /clinic/treatment-types/ */}
          <Field label={t("patients.treatmentType")}>
            <Select value={treatmentTypeId} onValueChange={setTreatmentTypeId}>
              <SelectTrigger>
                <SelectValue placeholder={t("appointments.selectTreatment")} />
              </SelectTrigger>
              <SelectContent>
                {treatmentTypes.map((tt) => (
                  <SelectItem key={tt.id} value={String(tt.id)}>{tt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Tooth number — visual FDI picker in a popover */}
          <Field label={t("appointments.toothNumber")}>
            <Popover open={toothOpen} onOpenChange={setToothOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={toothOpen}
                  className="w-full justify-between font-normal"
                >
                  <span className={cn("truncate", teeth.length === 0 && "text-muted-foreground")}>
                    {teeth.length > 0 ? teeth.join(", ") : t("appointments.selectTeeth")}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start">
                <ToothPicker value={teeth} onChange={setTeeth} onClose={() => setToothOpen(false)} />
              </PopoverContent>
            </Popover>
          </Field>

          {/* Notes — full width */}
          <div className="sm:col-span-2">
            <Field label={t("appointments.notes")} htmlFor="apt-notes">
              <Textarea
                id="apt-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("appointments.notesPlaceholder")}
                rows={3}
                className="w-full resize-none"
              />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            {t("patients.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {t("patients.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
