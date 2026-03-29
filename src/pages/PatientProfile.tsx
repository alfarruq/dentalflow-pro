import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ArrowLeft, Phone, AlertTriangle, Calendar, CreditCard, Image as ImageIcon, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { mockPatients, getRemainingBalance, type Patient } from "@/data/mockPatients";

const statusColors: Record<string, string> = {
  pending: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  in_progress: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  completed: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
};

function fmt(n: number) {
  return n.toLocaleString("uz-UZ");
}

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const patient = useMemo(() => mockPatients.find((p) => p.id === id), [id]);

  if (!patient) {
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

  const remaining = getRemainingBalance(patient);
  const totalSpent = patient.treatmentHistory.reduce((s, r) => s + r.cost, 0);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate("/patients")} className="gap-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        {t("patientProfile.backToList")}
      </Button>

      {/* Patient header card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
                {patient.fullName.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{patient.fullName}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>{patient.age} {t("patientProfile.yearsOld")}</span>
                  <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{patient.phone}</span>
                </div>
                <div className="mt-2">
                  <Badge className={statusColors[patient.status]}>{t(`patients.${patient.status}`)}</Badge>
                </div>
              </div>
            </div>
            {patient.allergies.length > 0 && (
              <Card className="border-destructive/30 bg-destructive/5 sm:max-w-xs">
                <CardContent className="flex items-start gap-3 p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  <div>
                    <p className="text-sm font-semibold text-destructive">{t("patientProfile.medicalAlert")}</p>
                    <p className="text-sm text-muted-foreground">{patient.allergies.join(", ")}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">{t("patientProfile.overview")}</TabsTrigger>
          <TabsTrigger value="history">{t("patientProfile.treatmentHistory")}</TabsTrigger>
          <TabsTrigger value="gallery">{t("patientProfile.gallery")}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("patientProfile.totalSpent")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{fmt(totalSpent)} <span className="text-sm font-normal text-muted-foreground">{t("common.currency")}</span></p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("patients.totalCost")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{fmt(patient.totalCost)} <span className="text-sm font-normal text-muted-foreground">{t("common.currency")}</span></p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("patients.paid")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums text-green-600">{fmt(patient.amountPaid)} <span className="text-sm font-normal text-muted-foreground">{t("common.currency")}</span></p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("patients.remaining")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold tabular-nums ${remaining > 0 ? "text-destructive" : ""}`}>
                  {fmt(remaining)} <span className="text-sm font-normal text-muted-foreground">{t("common.currency")}</span>
                  {remaining > 0 && <Badge className="ml-2 bg-destructive/15 text-destructive border-destructive/30">{t("patients.debt")}</Badge>}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Dental Chart Placeholder */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5" />
                {t("patientProfile.dentalChart")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20">
                <p className="text-muted-foreground">{t("patientProfile.dentalChartPlaceholder")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Treatment History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                {t("patientProfile.treatmentHistory")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient.treatmentHistory.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">{t("patientProfile.noHistory")}</p>
              ) : (
                <div className="relative space-y-0">
                  {patient.treatmentHistory.map((record, idx) => (
                    <div key={record.id} className="relative flex gap-4 pb-8 last:pb-0">
                      {/* Timeline line */}
                      {idx < patient.treatmentHistory.length - 1 && (
                        <div className="absolute left-[11px] top-6 h-full w-px bg-border" />
                      )}
                      {/* Dot */}
                      <div className="relative z-10 mt-1.5 h-[10px] w-[10px] shrink-0 rounded-full bg-primary ring-4 ring-background" />
                      {/* Content */}
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ImageIcon className="h-5 w-5" />
                {t("patientProfile.gallery")} ({t("patientProfile.xray")})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {patient.galleryImages.map((src, idx) => (
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
