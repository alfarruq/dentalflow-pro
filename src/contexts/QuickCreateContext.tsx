import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { NewPatientDialog } from "@/components/NewPatientDialog";
import { NewAppointmentDialog } from "@/components/NewAppointmentDialog";
import { PrescriptionDialog } from "@/components/PrescriptionDialog";

interface QuickCreateContextType {
  openNewPatient: () => void;
  openNewAppointment: () => void;
  openNewPrescription: () => void;
}

const QuickCreateContext = createContext<QuickCreateContextType | undefined>(undefined);

/**
 * Mounts the "New Patient" / "New Appointment" / "Write Prescription" dialogs
 * once at the app root so they can be opened from anywhere (Dashboard actions,
 * the ⌘K palette, ⌘N/⌘⇧A) instead of only from their original page's own
 * button. Opened this way the prescription dialog gets no patient, so it asks
 * the doctor to pick one.
 */
export function QuickCreateProvider({ children }: { children: ReactNode }) {
  const [patientOpen, setPatientOpen] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const navigate = useNavigate();

  const openNewPatient = useCallback(() => setPatientOpen(true), []);
  const openNewAppointment = useCallback(() => setAppointmentOpen(true), []);
  const openNewPrescription = useCallback(() => setPrescriptionOpen(true), []);

  return (
    <QuickCreateContext.Provider value={{ openNewPatient, openNewAppointment, openNewPrescription }}>
      {children}
      <NewPatientDialog open={patientOpen} onOpenChange={setPatientOpen} />
      <NewAppointmentDialog open={appointmentOpen} onOpenChange={setAppointmentOpen} />
      <PrescriptionDialog
        open={prescriptionOpen}
        onOpenChange={setPrescriptionOpen}
        // A prescription written here is nearly always handed to the patient on
        // paper, so land on their prescriptions tab with the print already firing.
        onCreated={(rx) =>
          navigate(`/patients/${rx.patientId}`, { state: { printPrescriptionId: rx.id } })
        }
      />
    </QuickCreateContext.Provider>
  );
}

export function useQuickCreate() {
  const ctx = useContext(QuickCreateContext);
  if (!ctx) throw new Error("useQuickCreate must be used within QuickCreateProvider");
  return ctx;
}
