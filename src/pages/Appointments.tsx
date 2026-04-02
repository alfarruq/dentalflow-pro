import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, Plus, Search, Clock, User, List, CalendarRange, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, addMonths, isWithinInterval, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { uz } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { mockAppointments, Appointment, AppointmentStatus } from "@/data/mockAppointments";
import { mockPatients } from "@/data/mockPatients";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<AppointmentStatus, string> = {
  pending: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  confirmed: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-destructive/10 text-destructive",
};

const treatmentColors: Record<string, string> = {
  implant: "border-l-4 border-l-blue-400",
  filling: "border-l-4 border-l-amber-400",
  cleaning: "border-l-4 border-l-emerald-400",
};

const treatmentCardBg: Record<string, string> = {
  implant: "bg-blue-50 dark:bg-blue-950/30",
  filling: "bg-amber-50 dark:bg-amber-950/30",
  cleaning: "bg-emerald-50 dark:bg-emerald-950/30",
};

const treatmentDotColor: Record<string, string> = {
  implant: "bg-blue-500",
  filling: "bg-amber-500",
  cleaning: "bg-emerald-500",
};

const dayLabelsShort = ["Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya"];

const VIEW_MODE_KEY = "dentaflow-appointments-view";

export default function Appointments() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [view, setView] = useState("today");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [patientMode, setPatientMode] = useState<"existing" | "new">("existing");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [aptDate, setAptDate] = useState<Date | undefined>(new Date());
  const [aptTime, setAptTime] = useState("09:00");
  const [aptTreatment, setAptTreatment] = useState("cleaning");
  const [aptNotes, setAptNotes] = useState("");
  const [patientSearch, setPatientSearch] = useState("");

  // View mode: list or grid
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    return (localStorage.getItem(VIEW_MODE_KEY) as "list" | "grid") || "list";
  });
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const filteredAppointments = useMemo(() => {
    let filtered = [...appointments];
    const now = new Date();
    if (view === "today") {
      filtered = filtered.filter((a) => a.date === todayStr);
    } else if (view === "week") {
      const end = addDays(now, 7);
      filtered = filtered.filter((a) => { const d = parseISO(a.date); return isWithinInterval(d, { start: now, end }); });
    } else if (view === "10days") {
      const end = addDays(now, 10);
      filtered = filtered.filter((a) => { const d = parseISO(a.date); return isWithinInterval(d, { start: now, end }); });
    } else if (view === "month") {
      const end = addMonths(now, 1);
      filtered = filtered.filter((a) => { const d = parseISO(a.date); return isWithinInterval(d, { start: now, end }); });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((a) => a.patientName.toLowerCase().includes(q));
    }
    return filtered.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }, [appointments, view, search, todayStr]);

  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return mockPatients.slice(0, 10);
    const q = patientSearch.toLowerCase();
    return mockPatients.filter((p) => p.fullName.toLowerCase().includes(q)).slice(0, 10);
  }, [patientSearch]);

  const resetForm = () => {
    setPatientMode("existing");
    setSelectedPatientId("");
    setNewName("");
    setNewPhone("");
    setAptDate(new Date());
    setAptTime("09:00");
    setAptTreatment("cleaning");
    setAptNotes("");
    setPatientSearch("");
  };

  const handleAdd = () => {
    let patientName = "";
    let phone = "";
    let patientId = "";
    if (patientMode === "existing") {
      const patient = mockPatients.find((p) => p.id === selectedPatientId);
      if (!patient) return;
      patientName = patient.fullName;
      phone = patient.phone;
      patientId = patient.id;
    } else {
      if (!newName.trim()) return;
      patientName = newName;
      phone = newPhone;
      patientId = `new-${Date.now()}`;
    }
    if (!aptDate) return;
    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      patientId,
      patientName,
      phone,
      date: format(aptDate, "yyyy-MM-dd"),
      time: aptTime,
      treatmentType: aptTreatment as any,
      status: "pending",
      notes: aptNotes,
    };
    setAppointments((prev) => [...prev, newApt].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)));
    setDialogOpen(false);
    resetForm();
    toast({ title: t("appointments.appointmentAdded") });
  };

  // Group by date for list view
  const groupedAppointments = useMemo(() => {
    const groups: Record<string, Appointment[]> = {};
    filteredAppointments.forEach((a) => {
      if (!groups[a.date]) groups[a.date] = [];
      groups[a.date].push(a);
    });
    return groups;
  }, [filteredAppointments]);

  // Week days for grid view
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weekAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const d = parseISO(a.date);
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    }).sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, weekStart, weekEnd]);

  const timeSlots = Array.from({ length: 18 }, (_, i) => {
    const h = 9 + Math.floor(i / 2);
    const m = (i % 2) * 30;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t("appointments.title")}</h1>
        <div className="flex items-center gap-2">
          {/* View mode switcher */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="rounded-none gap-1.5"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">{t("appointments.listView")}</span>
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className="rounded-none gap-1.5"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">{t("appointments.gridView")}</span>
            </Button>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("appointments.addAppointment")}
          </Button>
        </div>
      </div>

      {viewMode === "list" ? (
        <>
          {/* List View */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Tabs value={view} onValueChange={setView} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="today">{t("appointments.today")}</TabsTrigger>
                <TabsTrigger value="week">{t("appointments.week")}</TabsTrigger>
                <TabsTrigger value="10days">{t("appointments.tenDays")}</TabsTrigger>
                <TabsTrigger value="month">{t("appointments.month")}</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("appointments.searchPatient")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>

          {filteredAppointments.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <CalendarDays className="h-10 w-10" />
                <p>{t("appointments.noAppointments")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedAppointments).map(([date, apts]) => (
                <div key={date}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    {date === todayStr ? t("appointments.today") : format(parseISO(date), "dd.MM.yyyy, EEEE")}
                    <Badge variant="secondary" className="ml-2">{apts.length}</Badge>
                  </h3>
                  <div className="grid gap-2">
                    {apts.map((apt) => (
                      <Card key={apt.id} className={cn("shadow-sm hover:shadow-md transition-shadow", treatmentColors[apt.treatmentType])}>
                        <CardContent className="flex items-center gap-4 py-3 px-4">
                          <div className="flex items-center gap-2 w-20 shrink-0">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono font-medium text-sm">{apt.time}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium text-sm truncate">{apt.patientName}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {t(`patients.${apt.treatmentType}`)}
                              {apt.toothNumber && ` - ${t("patientProfile.tooth")} #${apt.toothNumber}`}
                            </p>
                          </div>
                          <Badge className={cn("shrink-0 text-xs border-0", statusColors[apt.status])}>
                            {t(`appointments.status_${apt.status}`)}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Grid (Calendar) View */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="rounded-full h-9 w-9" onClick={() => setWeekStart((s) => addDays(s, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-foreground min-w-[200px] text-center">
              {format(weekStart, "yyyy-MM-dd")} — {format(weekEnd, "yyyy-MM-dd")}
            </span>
            <Button variant="outline" size="icon" className="rounded-full h-9 w-9" onClick={() => setWeekStart((s) => addDays(s, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary font-medium"
              onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            >
              {t("appointments.today")}
            </Button>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border/60">
              {weekDays.map((day, i) => {
                const isToday = isSameDay(day, today);
                return (
                  <div
                    key={i}
                    className={cn(
                      "py-3 px-2 text-center",
                      i < 6 && "border-r border-border/40"
                    )}
                  >
                    <p className="text-xs font-medium text-muted-foreground mb-1">{dayLabelsShort[i]}</p>
                    <span
                      className={cn(
                        "inline-flex items-center justify-center text-lg font-semibold w-9 h-9 rounded-full transition-colors",
                        isToday && "bg-primary text-primary-foreground"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Day columns with appointments */}
            <div className="grid grid-cols-7 min-h-[500px]">
              {weekDays.map((day, i) => {
                const dayStr = format(day, "yyyy-MM-dd");
                const dayApts = weekAppointments.filter((a) => a.date === dayStr);
                const isToday = isSameDay(day, today);
                return (
                  <div
                    key={i}
                    className={cn(
                      "p-2 space-y-1.5 overflow-y-auto",
                      i < 6 && "border-r border-border/40",
                      isToday && "bg-primary/[0.03]"
                    )}
                    style={{ maxHeight: "600px" }}
                  >
                    {dayApts.map((apt) => (
                      <div
                        key={apt.id}
                        className={cn(
                          "rounded-xl p-2.5 text-xs cursor-default transition-all hover:scale-[1.02] hover:shadow-sm",
                          treatmentCardBg[apt.treatmentType]
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", treatmentDotColor[apt.treatmentType])} />
                          <span className="font-mono font-semibold text-primary">{apt.time}</span>
                        </div>
                        <p className="font-semibold text-foreground truncate leading-tight">{apt.patientName}</p>
                        <p className="text-muted-foreground truncate leading-tight mt-0.5">
                          {t(`patients.${apt.treatmentType}`)}
                          {apt.toothNumber && ` · #${apt.toothNumber}`}
                        </p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Add Appointment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("appointments.addAppointment")}</DialogTitle>
            <DialogDescription>{t("appointments.addAppointmentDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("appointments.patientType")}</Label>
              <Tabs value={patientMode} onValueChange={(v) => setPatientMode(v as "existing" | "new")}>
                <TabsList className="w-full">
                  <TabsTrigger value="existing" className="flex-1">{t("appointments.existingPatient")}</TabsTrigger>
                  <TabsTrigger value="new" className="flex-1">{t("appointments.newPatient")}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {patientMode === "existing" ? (
              <div className="space-y-2">
                <Label>{t("appointments.selectPatient")}</Label>
                <Input placeholder={t("appointments.searchPatient")} value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} />
                <div className="border rounded-md max-h-32 overflow-y-auto">
                  {filteredPatients.map((p) => (
                    <button key={p.id} type="button" className={cn("w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors", selectedPatientId === p.id && "bg-accent font-medium")} onClick={() => setSelectedPatientId(p.id)}>
                      {p.fullName} — {p.phone}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1"><Label>{t("patients.fullName")}</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
                <div className="space-y-1"><Label>{t("patients.phone")}</Label><Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+998..." /></div>
              </div>
            )}
            <div className="space-y-1">
              <Label>{t("appointments.date")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !aptDate && "text-muted-foreground")}>
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {aptDate ? format(aptDate, "dd.MM.yyyy") : t("appointments.selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={aptDate} onSelect={setAptDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label>{t("appointments.time")}</Label>
              <Select value={aptTime} onValueChange={setAptTime}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{timeSlots.map((ts) => (<SelectItem key={ts} value={ts}>{ts}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("patients.treatmentType")}</Label>
              <Select value={aptTreatment} onValueChange={setAptTreatment}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="implant">{t("patients.implant")}</SelectItem>
                  <SelectItem value="filling">{t("patients.filling")}</SelectItem>
                  <SelectItem value="cleaning">{t("patients.cleaning")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("appointments.notes")}</Label>
              <Textarea value={aptNotes} onChange={(e) => setAptNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("patients.cancel")}</Button>
            <Button onClick={handleAdd}>{t("patients.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
