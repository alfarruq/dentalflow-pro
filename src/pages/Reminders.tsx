import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { format, parseISO, isToday, isTomorrow, isPast, isWithinInterval, addDays, startOfDay } from "date-fns";
import {
  Bell, Plus, Search, Clock, User, CheckCircle2, Circle, Trash2, Phone, AlertCircle, CalendarDays,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useReminders } from "@/contexts/RemindersContext";
import { Reminder, ReminderPriority } from "@/data/mockReminders";
import { AddReminderDialog } from "@/components/AddReminderDialog";

const priorityColors: Record<ReminderPriority, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
  normal: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-destructive/15 text-destructive",
};

const priorityBorder: Record<ReminderPriority, string> = {
  low: "border-l-4 border-l-slate-300 dark:border-l-slate-600",
  normal: "border-l-4 border-l-blue-400",
  high: "border-l-4 border-l-destructive",
};

type FilterView = "all" | "today" | "tomorrow" | "week" | "overdue" | "completed";

export default function Reminders() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { reminders, toggleReminder, deleteReminder } = useReminders();

  const [view, setView] = useState<FilterView>("today");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const counts = useMemo(() => {
    const now = new Date();
    const weekEnd = addDays(now, 7);
    let today = 0, tomorrow = 0, week = 0, overdue = 0, completed = 0;
    reminders.forEach((r) => {
      const d = parseISO(r.dueDate);
      if (r.completed) {
        completed++;
        return;
      }
      if (isToday(d)) today++;
      else if (isTomorrow(d)) tomorrow++;
      if (isWithinInterval(d, { start: startOfDay(now), end: weekEnd })) week++;
      if (isPast(d) && !isToday(d)) overdue++;
    });
    return { today, tomorrow, week, overdue, completed, all: reminders.length };
  }, [reminders]);

  const filtered = useMemo(() => {
    const now = new Date();
    let list = [...reminders];

    if (view === "today") list = list.filter((r) => !r.completed && isToday(parseISO(r.dueDate)));
    else if (view === "tomorrow") list = list.filter((r) => !r.completed && isTomorrow(parseISO(r.dueDate)));
    else if (view === "week") {
      const end = addDays(now, 7);
      list = list.filter((r) => {
        const d = parseISO(r.dueDate);
        return !r.completed && isWithinInterval(d, { start: startOfDay(now), end });
      });
    } else if (view === "overdue") {
      list = list.filter((r) => !r.completed && isPast(parseISO(r.dueDate)) && !isToday(parseISO(r.dueDate)));
    } else if (view === "completed") {
      list = list.filter((r) => r.completed);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.patientName.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.note.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => `${a.dueDate} ${a.dueTime}`.localeCompare(`${b.dueDate} ${b.dueTime}`));
  }, [reminders, view, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, Reminder[]> = {};
    filtered.forEach((r) => {
      if (!groups[r.dueDate]) groups[r.dueDate] = [];
      groups[r.dueDate].push(r);
    });
    return groups;
  }, [filtered]);

  const formatGroupDate = (date: string) => {
    const d = parseISO(date);
    if (isToday(d)) return t("reminders.today");
    if (isTomorrow(d)) return t("reminders.tomorrow");
    return format(d, "dd.MM.yyyy, EEEE");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{t("reminders.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("reminders.subtitle")}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("reminders.addReminder")}</span>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t("reminders.today")}</p>
                <p className="text-2xl font-bold tabular-nums mt-1">{counts.today}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t("reminders.tomorrow")}</p>
                <p className="text-2xl font-bold tabular-nums mt-1">{counts.tomorrow}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t("reminders.week")}</p>
                <p className="text-2xl font-bold tabular-nums mt-1">{counts.week}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t("reminders.overdue")}</p>
                <p className="text-2xl font-bold tabular-nums mt-1 text-destructive">{counts.overdue}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-destructive/15 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Tabs value={view} onValueChange={(v) => setView(v as FilterView)} className="w-full sm:w-auto">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="today">{t("reminders.today")}</TabsTrigger>
            <TabsTrigger value="tomorrow">{t("reminders.tomorrow")}</TabsTrigger>
            <TabsTrigger value="week">{t("reminders.week")}</TabsTrigger>
            <TabsTrigger value="overdue">{t("reminders.overdue")}</TabsTrigger>
            <TabsTrigger value="all">{t("reminders.all")}</TabsTrigger>
            <TabsTrigger value="completed">{t("reminders.completed")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("reminders.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Bell className="h-10 w-10" />
            <p>{t("reminders.noReminders")}</p>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)} className="gap-2 mt-2">
              <Plus className="h-4 w-4" />
              {t("reminders.addReminder")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                {formatGroupDate(date)}
                <Badge variant="secondary">{items.length}</Badge>
              </h3>
              <div className="grid gap-2">
                {items.map((r) => {
                  const overdue = !r.completed && isPast(parseISO(r.dueDate)) && !isToday(parseISO(r.dueDate));
                  return (
                    <Card
                      key={r.id}
                      className={cn(
                        "shadow-sm hover:shadow-md transition-all",
                        priorityBorder[r.priority],
                        r.completed && "opacity-60"
                      )}
                    >
                      <CardContent className="flex items-start gap-3 py-3 px-4">
                        <button
                          onClick={() => toggleReminder(r.id)}
                          className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                          aria-label={t("reminders.toggleComplete")}
                        >
                          {r.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </button>

                        <div className="flex items-center gap-2 w-16 sm:w-20 shrink-0">
                          <Clock className="h-4 w-4 text-muted-foreground hidden sm:inline" />
                          <span className="font-mono font-medium text-sm">{r.dueTime}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={cn("font-medium text-sm truncate", r.completed && "line-through")}>
                              {r.title}
                            </p>
                            {overdue && (
                              <Badge className="bg-destructive/15 text-destructive text-[10px] border-0 px-1.5 py-0">
                                {t("reminders.overdue")}
                              </Badge>
                            )}
                          </div>
                          <button
                            onClick={() => navigate(`/patients/${r.patientId}`)}
                            className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            <User className="h-3 w-3" />
                            <span className="truncate">{r.patientName}</span>
                          </button>
                          {r.note && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.note}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge className={cn("text-[10px] border-0 hidden sm:inline-flex", priorityColors[r.priority])}>
                            {t(`reminders.priority_${r.priority}`)}
                          </Badge>
                          <a
                            href={`tel:${r.phone}`}
                            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                            aria-label={t("reminders.call")}
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                          <button
                            onClick={() => deleteReminder(r.id)}
                            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            aria-label={t("reminders.delete")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddReminderDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
