import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, CalendarDays, UserRound, UserPlus, CalendarPlus, Pill } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { usePatientSearch } from "@/contexts/PatientsContext";
import { useQuickCreate } from "@/contexts/QuickCreateContext";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Patient results only render once the query is specific enough — otherwise
// this group would dump page 1 of the entire (2000+) patient list.
const MIN_PATIENT_QUERY_LENGTH = 2;

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { openNewPatient, openNewAppointment, openNewPrescription } = useQuickCreate();
  const [query, setQuery] = useState("");

  // Start fresh every time the palette is reopened.
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const { results: patientResults } = usePatientSearch(query);
  const showPatients = query.trim().length >= MIN_PATIENT_QUERY_LENGTH;

  function select(action: () => void) {
    onOpenChange(false);
    action();
  }

  const pages = [
    { path: "/", label: t("commandPalette.goToDashboard"), icon: LayoutDashboard },
    { path: "/patients", label: t("commandPalette.goToPatients"), icon: Users },
    { path: "/appointments", label: t("commandPalette.goToAppointments"), icon: CalendarDays },
    { path: "/profile", label: t("commandPalette.goToProfile"), icon: UserRound },
  ];

  const actions = [
    { key: "new-patient", label: t("commandPalette.actionNewPatient"), shortcut: "⌘N", icon: UserPlus, onSelect: openNewPatient },
    { key: "new-appointment", label: t("commandPalette.actionNewAppointment"), shortcut: "⌘⇧A", icon: CalendarPlus, onSelect: openNewAppointment },
    { key: "new-prescription", label: t("commandPalette.actionNewPrescription"), icon: Pill, onSelect: openNewPrescription },
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder={t("commandPalette.placeholder")}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>{t("commandPalette.noResults")}</CommandEmpty>

        <CommandGroup heading={t("commandPalette.groupPages")}>
          {pages.map((p) => (
            <CommandItem key={p.path} value={p.label} className="gap-2" onSelect={() => select(() => navigate(p.path))}>
              <p.icon className="h-4 w-4" />
              <span>{p.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading={t("commandPalette.groupActions")}>
          {actions.map((a) => (
            <CommandItem key={a.key} value={a.label} className="gap-2" onSelect={() => select(a.onSelect)}>
              <a.icon className="h-4 w-4" />
              <span>{a.label}</span>
              <CommandShortcut>{a.shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        {showPatients && (
          <CommandGroup heading={t("commandPalette.groupPatients")}>
            {patientResults.slice(0, 6).map((p) => (
              <CommandItem
                key={p.id}
                value={`${p.fullName} ${p.phone}`}
                className="gap-2"
                onSelect={() => select(() => navigate(`/patients/${p.id}`))}
              >
                <span className="truncate">{p.fullName}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{p.phone}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
