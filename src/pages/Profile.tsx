import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  UserCircle, Phone, Mail, MapPin, Clock, Plus, Pencil, Trash2, Save,
  Stethoscope, Building2, CalendarDays, BadgeCheck, DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { DoctorsManagementCard } from "@/components/DoctorsManagementCard";
import { useServiceTemplates, type ServiceTemplate } from "@/contexts/ServiceTemplatesContext";
import { usePatientFormFields, type PatientFormFields } from "@/contexts/PatientFormFieldsContext";
import { ListChecks, ImagePlus } from "lucide-react";
import { loadClinicInfo, saveClinicInfo, type ClinicInfo } from "@/data/clinicInfo";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DoctorInfo {
  fullName: string;
  specialty: string;
  phone: string;
  email: string;
  experience: number;
  bio: string;
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const defaultDoctor: DoctorInfo = {
  fullName: "Dr. Admin",
  specialty: "Umumiy stomatolog",
  phone: "+998 90 123 45 67",
  email: "doctor@dentaflow.uz",
  experience: 8,
  bio: "Yuqori malakali stomatolog. Implantologiya va estetik stomatologiya bo'yicha mutaxassis.",
};

function formatPrice(n: number) {
  return n.toLocaleString("uz-UZ");
}

// ─── Service Template Dialog ──────────────────────────────────────────────────

function ServiceTemplateDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: ServiceTemplate | null;
}) {
  const { t } = useTranslation();
  const { addTemplate, updateTemplate } = useServiceTemplates();

  const [name, setName]           = useState("");
  const [price, setPrice]         = useState("");
  const [duration, setDuration]   = useState("45");

  // Populate form when editing
  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setPrice(String(editing.price));
      setDuration(String(editing.duration));
    } else {
      setName(""); setPrice(""); setDuration("45");
    }
  }, [editing, open]);

  function handleSave() {
    if (!name.trim() || !price) return;
    const data: Omit<ServiceTemplate, "id"> = {
      name: name.trim(),
      price: Number(price),
      duration: Number(duration) || 30,
      active: editing ? editing.active : true,
    };
    if (editing) {
      updateTemplate(editing.id, data);
      toast.success(t("profile.serviceUpdated"));
    } else {
      addTemplate(data);
      toast.success(t("profile.serviceAdded"));
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? t("profile.editService") : t("profile.addService")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>{t("profile.serviceName")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("profile.serviceNamePlaceholder")}
            />
          </div>

          {/* Price + Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("profile.servicePrice")} ({t("common.currency")})</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="300 000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("profile.serviceDuration")} ({t("profile.min")})</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("patients.cancel")}</Button>
          <Button onClick={handleSave} disabled={!name.trim() || !price}>
            {t("patients.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Profile() {
  const { t } = useTranslation();
  const { templates, toggleActive, deleteTemplate } = useServiceTemplates();
  const { fields: patientFormFields, setFieldEnabled: setPatientFieldEnabled } = usePatientFormFields();

  const [doctor, setDoctor] = useState<DoctorInfo>(() => {
    const saved = localStorage.getItem("doctor_info");
    return saved ? JSON.parse(saved) : defaultDoctor;
  });

  const [clinic, setClinic] = useState<ClinicInfo>(loadClinicInfo);

  const [editingDoctor, setEditingDoctor]   = useState(false);
  const [editingClinic, setEditingClinic]   = useState(false);
  const [doctorForm, setDoctorForm]         = useState<DoctorInfo>(doctor);
  const [clinicForm, setClinicForm]         = useState<ClinicInfo>(clinic);

  const [serviceDialog, setServiceDialog]   = useState(false);
  const [editingService, setEditingService] = useState<ServiceTemplate | null>(null);
  const [deleteTarget, setDeleteTarget]     = useState<ServiceTemplate | null>(null);

  useEffect(() => { localStorage.setItem("doctor_info", JSON.stringify(doctor)); }, [doctor]);
  useEffect(() => { saveClinicInfo(clinic); }, [clinic]);

  const handleSaveDoctor = () => {
    setDoctor(doctorForm);
    setEditingDoctor(false);
    toast.success(t("profile.saved"));
  };

  const handleSaveClinic = () => {
    setClinic(clinicForm);
    setEditingClinic(false);
    toast.success(t("profile.saved"));
  };

  const openAdd = () => { setEditingService(null); setServiceDialog(true); };
  const openEdit = (s: ServiceTemplate) => { setEditingService(s); setServiceDialog(true); };

  const activeCount = templates.filter((s) => s.active).length;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Tabs defaultValue="doctors" className="space-y-4">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="doctors" className="flex items-center gap-1.5">
            <Stethoscope className="h-4 w-4" />
            {t("profile.tabDoctors")}
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4" />
            {t("profile.tabServices")}
          </TabsTrigger>
          <TabsTrigger value="doctor" className="flex items-center gap-1.5">
            <UserCircle className="h-4 w-4" />
            {t("profile.tabMyInfo")}
          </TabsTrigger>
          <TabsTrigger value="clinic" className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4" />
            {t("profile.tabClinic")}
          </TabsTrigger>
        </TabsList>

        {/* ── Doktorlar ─────────────────────────────────────────────────── */}
        <TabsContent value="doctors">
          <DoctorsManagementCard />
        </TabsContent>

        {/* ── Xizmatlar ─────────────────────────────────────────────────── */}
        <TabsContent value="services">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  {t("profile.services")}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeCount} {t("profile.activeServices")}
                </p>
              </div>
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-1" /> {t("profile.addService")}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {templates.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t("profile.noServices")}</p>
                ) : (
                  templates.map((svc) => (
                    <div
                      key={svc.id}
                      className={`rounded-xl border border-border/50 transition-all ${!svc.active ? "opacity-50" : ""}`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">{svc.name}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" /> {svc.duration} {t("profile.min")}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          <span className="font-semibold text-primary whitespace-nowrap">
                            {formatPrice(svc.price)} {t("common.currency")}
                          </span>
                          <div className="flex items-center gap-1">
                            <Switch checked={svc.active} onCheckedChange={() => toggleActive(svc.id)} />
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(svc)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(svc)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Shifokor ma'lumotlari ──────────────────────────────────────── */}
        <TabsContent value="doctor">
          <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-primary" />
            {t("profile.doctorInfo")}
          </CardTitle>
          {!editingDoctor && (
            <Button variant="ghost" size="sm" onClick={() => { setDoctorForm(doctor); setEditingDoctor(true); }}>
              <Pencil className="h-4 w-4 mr-1" /> {t("profile.edit")}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingDoctor ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("profile.fullName")}</Label>
                <Input value={doctorForm.fullName} onChange={(e) => setDoctorForm((p) => ({ ...p, fullName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("profile.specialty")}</Label>
                <Input value={doctorForm.specialty} onChange={(e) => setDoctorForm((p) => ({ ...p, specialty: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("profile.phone")}</Label>
                <Input value={doctorForm.phone} onChange={(e) => setDoctorForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("profile.email")}</Label>
                <Input value={doctorForm.email} onChange={(e) => setDoctorForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("profile.experience")}</Label>
                <Input type="number" value={doctorForm.experience} onChange={(e) => setDoctorForm((p) => ({ ...p, experience: +e.target.value }))} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>{t("profile.bio")}</Label>
                <Textarea value={doctorForm.bio} onChange={(e) => setDoctorForm((p) => ({ ...p, bio: e.target.value }))} rows={3} />
              </div>
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setEditingDoctor(false)}>{t("patients.cancel")}</Button>
                <Button onClick={handleSaveDoctor}><Save className="h-4 w-4 mr-1" />{t("patients.save")}</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Stethoscope className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{doctor.fullName}</h2>
                  <p className="text-muted-foreground">{doctor.specialty}</p>
                </div>
                <Badge variant="secondary" className="ml-auto">
                  <BadgeCheck className="h-3.5 w-3.5 mr-1" />
                  {doctor.experience} {t("profile.years")}
                </Badge>
              </div>
              <Separator />
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" /> {doctor.phone}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" /> {doctor.email}
                </div>
              </div>
              {doctor.bio && <p className="text-sm text-muted-foreground leading-relaxed">{doctor.bio}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            {t("profile.patientFormFieldsTitle")}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {t("profile.patientFormFieldsDesc")}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["birthYear", t("patients.birthYear")],
                ["address", t("patients.address")],
                ["workplace", t("patients.workplace")],
              ] as [keyof PatientFormFields, string][]
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-2.5 rounded-xl border border-border p-3 cursor-pointer hover:bg-accent/30 transition-colors"
              >
                <Checkbox
                  checked={patientFormFields[key]}
                  onCheckedChange={(checked) => setPatientFieldEnabled(key, checked === true)}
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

        </TabsContent>

        {/* ── Klinika ma'lumotlari ───────────────────────────────────────── */}
        <TabsContent value="clinic">
      {/* ── Clinic Info ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {t("profile.clinicInfo")}
          </CardTitle>
          {!editingClinic && (
            <Button variant="ghost" size="sm" onClick={() => { setClinicForm(clinic); setEditingClinic(true); }}>
              <Pencil className="h-4 w-4 mr-1" /> {t("profile.edit")}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingClinic ? (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>{t("profile.clinicLogo")}</Label>
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                    {clinicForm.logo ? (
                      <img src={clinicForm.logo} alt={t("profile.clinicLogo")} className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlus className="h-6 w-6 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("clinic-logo-input")?.click()}
                    >
                      {t("profile.uploadLogo")}
                    </Button>
                    {clinicForm.logo && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setClinicForm((p) => ({ ...p, logo: undefined }))}
                      >
                        {t("profile.removeLogo")}
                      </Button>
                    )}
                  </div>
                  <input
                    id="clinic-logo-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setClinicForm((p) => ({ ...p, logo: String(reader.result) }));
                      reader.readAsDataURL(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("profile.clinicName")}</Label>
                  <Input value={clinicForm.name} onChange={(e) => setClinicForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("profile.clinicPhone")}</Label>
                  <Input value={clinicForm.phone} onChange={(e) => setClinicForm((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t("profile.address")}</Label>
                  <Input value={clinicForm.address} onChange={(e) => setClinicForm((p) => ({ ...p, address: e.target.value }))} />
                </div>
              </div>
              <Separator />
              <div>
                <Label className="mb-3 block">{t("profile.workingHours")}</Label>
                <div className="space-y-2">
                  {DAYS.map((day) => (
                    <div key={day} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50">
                      <Switch
                        checked={clinicForm.workingHours[day].active}
                        onCheckedChange={(checked) =>
                          setClinicForm((p) => ({
                            ...p,
                            workingHours: { ...p.workingHours, [day]: { ...p.workingHours[day], active: checked } },
                          }))
                        }
                      />
                      <span className="w-20 text-sm font-medium">{t(`profile.day_${day}`)}</span>
                      {clinicForm.workingHours[day].active ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            className="w-28 text-sm"
                            value={clinicForm.workingHours[day].start}
                            onChange={(e) =>
                              setClinicForm((p) => ({
                                ...p,
                                workingHours: { ...p.workingHours, [day]: { ...p.workingHours[day], start: e.target.value } },
                              }))
                            }
                          />
                          <span className="text-muted-foreground">—</span>
                          <Input
                            type="time"
                            className="w-28 text-sm"
                            value={clinicForm.workingHours[day].end}
                            onChange={(e) =>
                              setClinicForm((p) => ({
                                ...p,
                                workingHours: { ...p.workingHours, [day]: { ...p.workingHours[day], end: e.target.value } },
                              }))
                            }
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">{t("profile.dayOff")}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setEditingClinic(false)}>{t("patients.cancel")}</Button>
                <Button onClick={handleSaveClinic}><Save className="h-4 w-4 mr-1" />{t("patients.save")}</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {clinic.logo && (
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                  <img src={clinic.logo} alt={clinic.name} className="h-full w-full object-cover" />
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("profile.clinicName")}</span>
                  <p className="font-medium">{clinic.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("profile.clinicPhone")}</span>
                  <p className="font-medium">{clinic.phone}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {t("profile.address")}
                  </span>
                  <p className="font-medium">{clinic.address}</p>
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  {t("profile.workingHours")}
                </h4>
                <div className="grid gap-1">
                  {DAYS.map((day) => (
                    <div key={day} className="flex items-center gap-3 text-sm py-1">
                      <span className="w-20 font-medium">{t(`profile.day_${day}`)}</span>
                      {clinic.workingHours[day].active ? (
                        <span className="text-muted-foreground">
                          {clinic.workingHours[day].start} — {clinic.workingHours[day].end}
                        </span>
                      ) : (
                        <Badge variant="secondary" className="text-xs">{t("profile.dayOff")}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ───────────────────────────────────────────────────────── */}
      <ServiceTemplateDialog
        open={serviceDialog}
        onOpenChange={setServiceDialog}
        editing={editingService}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("inventory.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("inventory.deleteConfirmDesc", { name: deleteTarget?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("patients.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (deleteTarget) {
                  deleteTemplate(deleteTarget.id);
                  toast.success(t("profile.serviceDeleted"));
                  setDeleteTarget(null);
                }
              }}
            >
              {t("inventory.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
