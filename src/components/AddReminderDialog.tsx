import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { mockPatients } from "@/data/mockPatients";
import { useReminders } from "@/contexts/RemindersContext";
import { ReminderPriority } from "@/data/mockReminders";
import { useToast } from "@/hooks/use-toast";

interface AddReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lockedPatientId?: string;
}

const timeSlots = Array.from({ length: 18 }, (_, i) => {
  const h = 9 + Math.floor(i / 2);
  const m = (i % 2) * 30;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

export function AddReminderDialog({ open, onOpenChange, lockedPatientId }: AddReminderDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { addReminder } = useReminders();

  const [patientId, setPatientId] = useState<string>(lockedPatientId ?? "");
  const [patientSearch, setPatientSearch] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
  const [dueTime, setDueTime] = useState("09:00");
  const [priority, setPriority] = useState<ReminderPriority>("normal");

  useEffect(() => {
    if (open) {
      setPatientId(lockedPatientId ?? "");
      setPatientSearch("");
      setTitle("");
      setNote("");
      setDueDate(new Date());
      setDueTime("09:00");
      setPriority("normal");
    }
  }, [open, lockedPatientId]);

  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return mockPatients.slice(0, 10);
    const q = patientSearch.toLowerCase();
    return mockPatients.filter((p) => p.fullName.toLowerCase().includes(q)).slice(0, 10);
  }, [patientSearch]);

  const lockedPatient = useMemo(
    () => (lockedPatientId ? mockPatients.find((p) => p.id === lockedPatientId) : undefined),
    [lockedPatientId]
  );

  const handleSave = () => {
    const patient = lockedPatient ?? mockPatients.find((p) => p.id === patientId);
    if (!patient || !title.trim() || !dueDate) {
      toast({ title: t("reminders.fillRequired"), variant: "destructive" });
      return;
    }
    addReminder({
      patientId: patient.id,
      patientName: patient.fullName,
      phone: patient.phone,
      title: title.trim(),
      note: note.trim(),
      dueDate: format(dueDate, "yyyy-MM-dd"),
      dueTime,
      priority,
    });
    toast({ title: t("reminders.reminderAdded") });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("reminders.addReminder")}</DialogTitle>
          <DialogDescription>{t("reminders.addReminderDesc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {lockedPatient ? (
            <div className="space-y-1">
              <Label>{t("reminders.patient")}</Label>
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <span className="font-medium">{lockedPatient.fullName}</span>
                <span className="text-muted-foreground"> — {lockedPatient.phone}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>{t("reminders.selectPatient")}</Label>
              <Input
                placeholder={t("appointments.searchPatient")}
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
              <div className="border rounded-md max-h-32 overflow-y-auto">
                {filteredPatients.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-3 py-2">{t("patients.noResults")}</p>
                ) : (
                  filteredPatients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors",
                        patientId === p.id && "bg-accent font-medium"
                      )}
                      onClick={() => setPatientId(p.id)}
                    >
                      {p.fullName} — {p.phone}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label>{t("reminders.reminderTitle")}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("reminders.titlePlaceholder")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("reminders.date")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "dd.MM.yyyy") : t("appointments.selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label>{t("reminders.time")}</Label>
              <Select value={dueTime} onValueChange={setDueTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((ts) => (
                    <SelectItem key={ts} value={ts}>
                      {ts}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>{t("reminders.priority")}</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as ReminderPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t("reminders.priority_low")}</SelectItem>
                <SelectItem value="normal">{t("reminders.priority_normal")}</SelectItem>
                <SelectItem value="high">{t("reminders.priority_high")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>{t("reminders.note")}</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={t("reminders.notePlaceholder")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("patients.cancel")}
          </Button>
          <Button onClick={handleSave}>{t("patients.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
