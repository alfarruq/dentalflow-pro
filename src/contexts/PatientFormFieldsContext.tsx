import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";

const STORAGE_KEY = "dentaflow-patient-form-fields";

export interface PatientFormFields {
  birthYear: boolean;
  address: boolean;
  workplace: boolean;
}

const defaultFields: PatientFormFields = {
  birthYear: true,
  address: true,
  workplace: true,
};

interface PatientFormFieldsContextType {
  fields: PatientFormFields;
  setFieldEnabled: (key: keyof PatientFormFields, enabled: boolean) => void;
}

const PatientFormFieldsContext = createContext<PatientFormFieldsContextType | undefined>(undefined);

export function PatientFormFieldsProvider({ children }: { children: ReactNode }) {
  const [fields, setFields] = useState<PatientFormFields>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultFields, ...JSON.parse(saved) } : defaultFields;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fields));
  }, [fields]);

  const setFieldEnabled = useCallback((key: keyof PatientFormFields, enabled: boolean) => {
    setFields((prev) => ({ ...prev, [key]: enabled }));
  }, []);

  return (
    <PatientFormFieldsContext.Provider value={{ fields, setFieldEnabled }}>
      {children}
    </PatientFormFieldsContext.Provider>
  );
}

export function usePatientFormFields() {
  const ctx = useContext(PatientFormFieldsContext);
  if (!ctx) throw new Error("usePatientFormFields must be used within PatientFormFieldsProvider");
  return ctx;
}
