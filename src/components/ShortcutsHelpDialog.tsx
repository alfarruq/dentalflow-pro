import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ShortcutsHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border bg-muted px-1.5 font-mono text-[11px] font-medium text-foreground">
      {children}
    </kbd>
  );
}

function Row({ keys, label }: { keys: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-foreground">{label}</span>
      <span className="flex items-center gap-1">{keys}</span>
    </div>
  );
}

export function ShortcutsHelpDialog({ open, onOpenChange }: ShortcutsHelpDialogProps) {
  const { t } = useTranslation();

  const chordKeys: Array<{ letter: string; labelKey: string }> = [
    { letter: "D", labelKey: "shortcutsHelp.goToDashboard" },
    { letter: "P", labelKey: "shortcutsHelp.goToPatients" },
    { letter: "A", labelKey: "shortcutsHelp.goToAppointments" },
    { letter: "O", labelKey: "shortcutsHelp.goToProfile" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{t("shortcutsHelp.title")}</DialogTitle>
          <DialogDescription>{t("shortcutsHelp.chordHint")}</DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-border/60">
          <Row
            keys={
              <>
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </>
            }
            label={t("shortcutsHelp.openPalette")}
          />
          <Row
            keys={
              <>
                <Kbd>⌘</Kbd>
                <Kbd>N</Kbd>
              </>
            }
            label={t("shortcutsHelp.newPatient")}
          />
          <Row
            keys={
              <>
                <Kbd>⌘</Kbd>
                <Kbd>⇧</Kbd>
                <Kbd>A</Kbd>
              </>
            }
            label={t("shortcutsHelp.newAppointment")}
          />
          <Row keys={<Kbd>?</Kbd>} label={t("shortcutsHelp.openHelp")} />
        </div>

        <div className={cn("mt-1 divide-y divide-border/60 border-t border-border/60 pt-1")}>
          {chordKeys.map(({ letter, labelKey }) => (
            <Row
              key={letter}
              keys={
                <>
                  <Kbd>G</Kbd>
                  <span className="text-xs text-muted-foreground">{"→"}</span>
                  <Kbd>{letter}</Kbd>
                </>
              }
              label={t(labelKey)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
