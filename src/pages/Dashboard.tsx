import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppointmentsQuery } from "@/hooks/useAppointments";
import { useTotalPatientsCount } from "@/contexts/PatientsContext";
import { useQuickCreate } from "@/contexts/QuickCreateContext";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardKpiGrid } from "@/components/DashboardKpiGrid";
import { DashboardSchedule } from "@/components/DashboardSchedule";
import { DashboardReminders, type Reminder } from "@/components/DashboardReminders";
import { DashboardStatsChart } from "@/components/DashboardStatsChart";

/** Bookable slots for a working day; free ones are surfaced in the KPI card. */
const WORKING_SLOTS = ["09:00", "10:30", "11:30", "13:00", "14:00", "15:30", "17:00"] as const;

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { openNewPatient, openNewAppointment, openNewPrescription } = useQuickCreate();

  // Two server-scoped queries, each cached independently — the dashboard never
  // fetches the whole appointment list.
  const { data: dayAppointments = [], isLoading: dayLoading } = useAppointmentsQuery("day");
  const { data: weekAppointments = [], isLoading: weekLoading } = useAppointmentsQuery("week");
  const { count: totalPatients, isLoading: patientsLoading } = useTotalPatientsCount();

  const todayAppointments = useMemo(
    () => [...dayAppointments].sort((a, b) => a.time.localeCompare(b.time)),
    [dayAppointments],
  );

  const completedCount = todayAppointments.filter((a) => a.status === "completed").length;
  const totalToday = todayAppointments.length;

  // Slots not yet taken by a non-cancelled appointment today.
  const freeSlots = useMemo(() => {
    const booked = new Set(
      todayAppointments.filter((a) => a.status !== "cancelled").map((a) => a.time),
    );
    return WORKING_SLOTS.filter((slot) => !booked.has(slot)).slice(0, 4);
  }, [todayAppointments]);

  // Appointments per weekday for the current week (server-filtered via ?date=week),
  // bucketed into Mon…Sun — one bar per day for the stats chart.
  const todayWeekdayIndex = (new Date().getDay() + 6) % 7;
  const weeklyStats = useMemo(() => {
    const counts = Array<number>(7).fill(0);
    for (const a of weekAppointments) {
      const idx = (new Date(`${a.date}T00:00:00`).getDay() + 6) % 7; // Sun=0 → Mon=0
      counts[idx] += 1;
    }
    return counts.map((value, weekdayIndex) => ({ weekdayIndex, value }));
  }, [weekAppointments]);

  const reminders = useMemo<Reminder[]>(
    () => [
      { id: "r1", title: t("dashboard.reminder1Title"), description: t("dashboard.reminder1Desc"), tone: "warning" },
      { id: "r2", title: t("dashboard.reminder2Title"), description: t("dashboard.reminder2Desc"), tone: "info" },
    ],
    [t],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      <DashboardHeader
        appointmentsToday={totalToday}
        onNewPatient={openNewPatient}
        onNewAppointment={openNewAppointment}
        onWritePrescription={openNewPrescription}
      />

      <DashboardKpiGrid
        completedCount={completedCount}
        totalToday={totalToday}
        totalPatients={totalPatients}
        growthPercent={2.4}
        freeSlots={freeSlots}
        isLoading={dayLoading || patientsLoading}
      />

      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardSchedule
            appointments={todayAppointments}
            isLoading={dayLoading}
            onViewAll={() => navigate("/appointments")}
            onSelectPatient={(patientId) => navigate(`/patients/${patientId}`)}
          />
        </div>
        <div className="space-y-5 sm:space-y-6">
          <DashboardReminders reminders={reminders} onAdd={openNewAppointment} />
          <DashboardStatsChart data={weeklyStats} highlightIndex={todayWeekdayIndex} isLoading={weekLoading} />
        </div>
      </div>
    </div>
  );
}
