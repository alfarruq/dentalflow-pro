import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  defaultServiceTemplates,
  type ServiceTemplate,
  type ServiceMaterial,
} from "@/data/mockServiceTemplates";
import type { DentalTreatmentType } from "@/data/mockTreatments";

const LS_KEY = "service_templates";

// ─── Context type ─────────────────────────────────────────────────────────────

interface ServiceTemplatesContextType {
  templates: ServiceTemplate[];

  addTemplate: (data: Omit<ServiceTemplate, "id">) => ServiceTemplate;
  updateTemplate: (id: string, data: Partial<Omit<ServiceTemplate, "id">>) => void;
  deleteTemplate: (id: string) => void;
  toggleActive: (id: string) => void;

  /** All active templates that match a specific treatment type */
  getTemplatesForType: (type: DentalTreatmentType) => ServiceTemplate[];
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function load(): ServiceTemplate[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as ServiceTemplate[];
  } catch {
    // ignore parse errors
  }
  return defaultServiceTemplates;
}

function save(templates: ServiceTemplate[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(templates));
  } catch {
    // ignore storage errors
  }
}

function uid() {
  return `svc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ServiceTemplatesContext = createContext<ServiceTemplatesContextType | undefined>(undefined);

export function ServiceTemplatesProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<ServiceTemplate[]>(load);

  function update(next: ServiceTemplate[]) {
    setTemplates(next);
    save(next);
  }

  const addTemplate = useCallback((data: Omit<ServiceTemplate, "id">): ServiceTemplate => {
    const t: ServiceTemplate = { id: uid(), ...data };
    setTemplates((prev) => {
      const next = [t, ...prev];
      save(next);
      return next;
    });
    return t;
  }, []);

  const updateTemplate = useCallback((id: string, data: Partial<Omit<ServiceTemplate, "id">>) => {
    setTemplates((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...data } : t));
      save(next);
      return next;
    });
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id);
      save(next);
      return next;
    });
  }, []);

  const toggleActive = useCallback((id: string) => {
    setTemplates((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, active: !t.active } : t));
      save(next);
      return next;
    });
  }, []);

  const getTemplatesForType = useCallback(
    (type: DentalTreatmentType) => templates.filter((t) => t.treatmentType === type && t.active),
    [templates],
  );

  void update; // suppress unused warning — used via setTemplates+save pattern above

  return (
    <ServiceTemplatesContext.Provider
      value={{
        templates,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        toggleActive,
        getTemplatesForType,
      }}
    >
      {children}
    </ServiceTemplatesContext.Provider>
  );
}

export function useServiceTemplates() {
  const ctx = useContext(ServiceTemplatesContext);
  if (!ctx) throw new Error("useServiceTemplates must be used within ServiceTemplatesProvider");
  return ctx;
}

// Re-export types for consumers
export type { ServiceTemplate, ServiceMaterial };
