import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { DoctorsProvider } from "@/contexts/DoctorsContext";
import { PatientsProvider } from "@/contexts/PatientsContext";
import { TreatmentProvider } from "@/contexts/TreatmentContext";
import { PrescriptionsProvider } from "@/contexts/PrescriptionsContext";
import { ServiceTemplatesProvider } from "@/contexts/ServiceTemplatesContext";
import { PatientFormFieldsProvider } from "@/contexts/PatientFormFieldsContext";
import { QuickCreateProvider } from "@/contexts/QuickCreateContext";
import { KeyboardShortcutsProvider } from "@/contexts/KeyboardShortcutsContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GuestRoute } from "@/components/GuestRoute";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import PatientProfile from "./pages/PatientProfile";
import Appointments from "./pages/Appointments";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DoctorsProvider>
          <PatientsProvider>
          <TreatmentProvider>
          <PrescriptionsProvider>
          <ServiceTemplatesProvider>
          <PatientFormFieldsProvider>
          <QuickCreateProvider>
          <KeyboardShortcutsProvider>
            <Routes>
              <Route
                path="/login"
                element={
                  <GuestRoute>
                    <Login />
                  </GuestRoute>
                }
              />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/patients" element={<Patients />} />
                        <Route path="/patients/:id" element={<PatientProfile />} />
                        <Route path="/appointments" element={<Appointments />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </KeyboardShortcutsProvider>
          </QuickCreateProvider>
          </PatientFormFieldsProvider>
          </ServiceTemplatesProvider>
          </PrescriptionsProvider>
          </TreatmentProvider>
          </PatientsProvider>
          </DoctorsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
