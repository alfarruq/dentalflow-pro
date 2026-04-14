import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { mockReminders, Reminder } from "@/data/mockReminders";

interface RemindersContextType {
  reminders: Reminder[];
  addReminder: (reminder: Omit<Reminder, "id" | "createdAt" | "completed">) => void;
  toggleReminder: (id: string) => void;
  deleteReminder: (id: string) => void;
}

const RemindersContext = createContext<RemindersContextType | undefined>(undefined);

function todayStr() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function RemindersProvider({ children }: { children: ReactNode }) {
  const [reminders, setReminders] = useState<Reminder[]>(mockReminders);

  const addReminder = useCallback(
    (r: Omit<Reminder, "id" | "createdAt" | "completed">) => {
      const newReminder: Reminder = {
        ...r,
        id: `rem-${Date.now()}`,
        completed: false,
        createdAt: todayStr(),
      };
      setReminders((prev) =>
        [...prev, newReminder].sort((a, b) =>
          `${a.dueDate} ${a.dueTime}`.localeCompare(`${b.dueDate} ${b.dueTime}`)
        )
      );
    },
    []
  );

  const toggleReminder = useCallback((id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
    );
  }, []);

  const deleteReminder = useCallback((id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return (
    <RemindersContext.Provider value={{ reminders, addReminder, toggleReminder, deleteReminder }}>
      {children}
    </RemindersContext.Provider>
  );
}

export function useReminders() {
  const ctx = useContext(RemindersContext);
  if (!ctx) throw new Error("useReminders must be used within RemindersProvider");
  return ctx;
}
