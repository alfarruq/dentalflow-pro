import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  ArrowLeft, Phone, AlertTriangle, Calendar, CreditCard,
  Image as ImageIcon, CalendarPlus, Stethoscope,
  Banknote, Edit, Save, X, Bell,
} from "lucide-react";
import { DentalChart, createDefaultTeeth, type ToothData } from "@/components/DentalChart";
import { AddReminderDialog } from "@/components/AddReminderDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { mockPatients, getRemainingBalance, type Patient } from "@/data/mockPatients";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  in_progress: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  completed: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
};

function fmt(n: number) {
  return n.toLocaleString("uz-UZ");
}

function PatientHeader({ patient, t, onAddReminder }: { patient: Patient; t: (k: string) => string; onAddReminder: () => void }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: avatar + info */}
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
              {patient.fullName.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{patient.fullName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>{patient.age} {t("patientProfile.yearsOld")}</span>
                <a href={`tel:${patient.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                  <Phone className="h-3.5 w-3.5" />{patient.phone}
                </a>
              </div>
              <div className="mt-2">
                <Badge className={statusColors[patient.status]}>{t(`patients.${patient.status}`)}</Badge>
              </div>
            </div>
          </div>

          {/* Right: Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5">
              <CalendarPlus className="h-4 w-4" />
              <span className="hidden sm:inline">{t("patientProfile.addAppointment")}</span>
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={onAddReminder}>
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">{t("reminders.addFromProfile")}</span>
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Stethoscope className="h-4 w-4" />
              <span className="hidden sm:inline">{t("patientProfile.addTreatment")}</span>
            </Button>
            <Button size="sm" className="gap-1.5">
              <Banknote className="h-4 w-4" />
              <span className="hidden sm:inline">{t("patientProfile.acceptPayment")}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentDialog({ patient, t, onSave }: { patient: Patient; t: (k: string) => string; onSave: (amount: number) => void }) {
  const [amount, setAmount] = useState("");
  const remaining = getRemainingBalance(patient);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t("patientProfile.acceptPayment")}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("patients.remaining")}:</span>
          <span className="font-semibold text-destructive">{fmt(remaining)} {t("common.currency")}</span>
        </div>
        <div className="space-y-2">
          <Label>{t("patientProfile.paymentAmount")}</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
        </div>
        <Button className="w-full" onClick={() => { onSave(Number(amount)); setAmount(""); }}>
          <Save className="mr-2 h-4 w-4" />
          {t("patients.save")}
        </Button>
      </div>
    </DialogContent>
  );
}

function EditPatientDialog({ patient, t, onSave }: {
  patient: Patient;
  t: (k: string) => string;
  onSave: (data: { fullName: string; phone: string; allergies: string; medicalNotes: string }) => void;
}) {
  const [fullName, setFullName] = useState(patient.fullName);
  const [phone, setPhone] = useState(patient.phone);
  const [allergies, setAllergies] = useState(patient.allergies.join(", "));
  const [medicalNotes, setMedicalNotes] = useState(patient.medicalNotes);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t("patientProfile.editPatient")}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label>{t("patients.fullName")}</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t("patients.phone")}</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t("patientProfile.allergiesLabel")}</Label>
          <Input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder={t("patientProfile.allergiesPlaceholder")} />
        </div>
        <div className="space-y-2">
          <Label>{t("patientProfile.medicalNotesLabel")}</Label>
          <Textarea value={medicalNotes} onChange={(e) => setMedicalNotes(e.target.value)} rows={3} />
        </div>
        <Button className="w-full" onClick={() => onSave({ fullName, phone, allergies, medicalNotes })}>
          <Save className="mr-2 h-4 w-4" />
          {t("patients.save")}
        </Button>
      </div>
    </DialogContent>
  );
}

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [localPatient, setLocalPatient] = useState<Patient | undefined>(() =>
    mockPatients.find((p) => p.id === id)
  );
  const [teethData, setTeethData] = useState<ToothData[]>(createDefaultTeeth);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);

  if (!localPatient) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">{t("patientProfile.notFound")}</p>
        <Button variant="outline" onClick={() => navigate("/patients")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("patientProfile.backToList")}
        </Button>
      </div>
    );
  }

  const remaining = getRemainingBalance(localPatient);
  const totalSpent = localPatient.treatmentHistory.reduce((s, r) => s + r.cost, 0);

  const handlePayment = (amount: number) => {
    if (amount <= 0) return;
    setLocalPatient((prev) => prev ? { ...prev, amountPaid: prev.amountPaid + amount } : prev);
    setPaymentOpen(false);
    toast.success(t("patientProfile.paymentRecorded"));
  };

  const handleEditSave = (data: { fullName: string; phone: string; allergies: string; medicalNotes: string }) => {
    setLocalPatient((prev) => prev ? {
      ...prev,
      fullName: data.fullName,
      phone: data.phone,
      allergies: data.allergies.split(",").map((a) => a.trim()).filter(Boolean),
      medicalNotes: data.medicalNotes,
    } : prev);
    setEditOpen(false);
    toast.success(t("patientProfile.patientUpdated"));
  };

  return (
    <div className="space-y-6">
      {/* Back + Edit buttons */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/patients")} className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {t("patientProfile.backToList")}
        </Button>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              {t("patientProfile.editPatient")}
            </Button>
          </DialogTrigger>
          <EditPatientDialog patient={localPatient} t={t} onSave={handleEditSave} />
        </Dialog>
      </div>

      {/* Header with quick actions */}
      <PatientHeader patient={localPatient} t={t} onAddReminder={() => setReminderOpen(true)} />

      <AddReminderDialog
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        lockedPatientId={localPatient.id}
      />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">{t("patientProfile.overview")}</TabsTrigger>
          <TabsTrigger value="history">{t("patientProfile.treatmentHistory")}</TabsTrigger>
          <TabsTrigger value="gallery">{t("patientProfile.gallery")}</TabsTrigger>
        </TabsList>

        {/* Overview Tab — Two-column layout */}
        <TabsContent value="overview">
          {/* Dental Chart — interactive */}
          <div className="mb-4">
            <DentalChart teeth={teethData} onUpdate={setTeethData} />
          </div>

          {/* Two-column grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Left: Financial + Medical */}
            <div className="space-y-4">
              {/* Financial Summary */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      {t("patientProfile.financialSummary")}
                    </span>
                    <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                          <Banknote className="h-3.5 w-3.5" />
                          {t("patientProfile.acceptPayment")}
                        </Button>
                      </DialogTrigger>
                      <PaymentDialog patient={localPatient} t={t} onSave={handlePayment} />
                    </Dialog>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("patients.totalCost")}</span>
                    <span className="font-semibold tabular-nums">{fmt(localPatient.totalCost)} {t("common.currency")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("patients.paid")}</span>
                    <span className="font-semibold tabular-nums text-green-600">{fmt(localPatient.amountPaid)} {t("common.currency")}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("patients.remaining")}</span>
                    <span className={`font-bold tabular-nums ${remaining > 0 ? "text-destructive" : "text-green-600"}`}>
                      {fmt(remaining)} {t("common.currency")}
                      {remaining > 0 && <Badge className="ml-2 bg-destructive/15 text-destructive border-destructive/30 text-xs">{t("patients.debt")}</Badge>}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Medical Alerts */}
              <Card className="shadow-sm border-destructive/20">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    {t("patientProfile.medicalNotesTitle")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {localPatient.allergies.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {localPatient.allergies.map((a) => (
                          <Badge key={a} variant="outline" className="border-destructive/30 text-destructive text-xs">{a}</Badge>
                        ))}
                      </div>
                      {localPatient.medicalNotes && (
                        <p className="text-sm text-muted-foreground">{localPatient.medicalNotes}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("patientProfile.noAlerts")}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: Stats cards */}
            <div className="space-y-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("patientProfile.totalSpent")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums">{fmt(totalSpent)} <span className="text-sm font-normal text-muted-foreground">{t("common.currency")}</span></p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("patientProfile.totalVisits")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums">{localPatient.treatmentHistory.length}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Treatment History Tab */}
        <TabsContent value="history">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                {t("patientProfile.treatmentHistory")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {localPatient.treatmentHistory.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">{t("patientProfile.noHistory")}</p>
              ) : (
                <div className="relative space-y-0">
                  {localPatient.treatmentHistory.map((record, idx) => (
                    <div key={record.id} className="relative flex gap-4 pb-8 last:pb-0">
                      {idx < localPatient.treatmentHistory.length - 1 && (
                        <div className="absolute left-[11px] top-6 h-full w-px bg-border" />
                      )}
                      <div className="relative z-10 mt-1.5 h-[10px] w-[10px] shrink-0 rounded-full bg-primary ring-4 ring-background" />
                      <div className="flex-1 rounded-lg border bg-muted/30 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {t(`patients.${record.treatmentType}`)} — {t("patientProfile.tooth")} #{record.tooth}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(record.date), "dd.MM.yyyy")}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{record.note}</p>
                        <div className="mt-2 flex items-center gap-1 text-sm font-medium">
                          <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                          {fmt(record.cost)} {t("common.currency")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gallery Tab */}
        <TabsContent value="gallery">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ImageIcon className="h-5 w-5" />
                {t("patientProfile.gallery")} ({t("patientProfile.xray")})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {localPatient.galleryImages.map((_, idx) => (
                  <div key={idx} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="text-center">
                        <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground/40" />
                        <p className="mt-2 text-xs text-muted-foreground">{t("patientProfile.xray")} {idx + 1}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
