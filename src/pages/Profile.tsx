import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserCircle, Phone, Mail, MapPin, Plus, Pencil, Trash2, Save,
  Stethoscope, Building2, CalendarDays, BadgeCheck, DollarSign, Loader2,
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { DoctorsManagementCard } from "@/components/DoctorsManagementCard";
import { useServiceTemplates } from "@/contexts/ServiceTemplatesContext";
import { usePatientFormFields, type PatientFormFields } from "@/contexts/PatientFormFieldsContext";
import { ListChecks, ImagePlus } from "lucide-react";
import { loadClinicInfo, saveClinicInfo, type ClinicInfo } from "@/data/clinicInfo";
import { authService } from "@/lib/api/auth.service";
import type { UserMeDto, UserUpdateDto, TreatmentTypeDto } from "@/lib/api/dto";

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

const emptyDoctor: DoctorInfo = { fullName: "", specialty: "", phone: "", email: "", experience: 0, bio: "" };

function toDoctorInfo(me: UserMeDto): DoctorInfo {
  return {
    fullName: me.full_name,
    specialty: me.specialty ?? "",
    phone: me.phone_number,
    email: me.email ?? "",
    experience: me.experience ?? 0,
    bio: me.biography ?? "",
  };
}

function toUserUpdateDto(d: DoctorInfo): UserUpdateDto {
  return {
    full_name: d.fullName,
    phone_number: d.phone,
    specialty: d.specialty || null,
    email: d.email || null,
    experience: d.experience || null,
    biography: d.bio || null,
  };
}

function formatPrice(n: number) {
  return n.toLocaleString("uz-UZ");
}

// ─── Service (treatment-type) Dialog ──────────────────────────────────────────
// Backend treatment-types accept only { name, price } and support add-only.

function ServiceTemplateDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: TreatmentTypeDto | null;
}) {
  const { t } = useTranslation();
  const { addTreatmentType, updateTreatmentType } = useServiceTemplates();

  const [name, setName]   = useState("");
  const [price, setPrice] = useState("");

  // Sync the form to the target each time the dialog opens (edit vs add).
  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setPrice(editing?.price != null ? String(editing.price) : "");
  }, [open, editing]);

  function handleSave() {
    if (!name.trim() || !price) return;
    const data = { name: name.trim(), price: Number(price) };
    if (editing) {
      updateTreatmentType(editing.id, data);
      toast.success(t("profile.serviceUpdated"));
    } else {
      addTreatmentType(data);
      toast.success(t("profile.serviceAdded"));
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? t("profile.editService") : t("profile.addService")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("profile.serviceName")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("profile.serviceNamePlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("profile.servicePrice")} ({t("common.currency")})</Label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="300 000"
            />
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
  const { treatmentTypes, deleteTreatmentType } = useServiceTemplates();
  const { fields: patientFormFields, setFieldEnabled: setPatientFieldEnabled } = usePatientFormFields();
  const queryClient = useQueryClient();

  const { data: doctor, isLoading: doctorLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => toDoctorInfo(await authService.getMyProfile()),
  });

  const [clinic, setClinic] = useState<ClinicInfo>(loadClinicInfo);

  const [editingDoctor, setEditingDoctor]   = useState(false);
  const [editingClinic, setEditingClinic]   = useState(false);
  const [doctorForm, setDoctorForm]         = useState<DoctorInfo>(emptyDoctor);
  const [clinicForm, setClinicForm]         = useState<ClinicInfo>(clinic);

  const [serviceDialog, setServiceDialog]   = useState(false);
  const [editingService, setEditingService] = useState<TreatmentTypeDto | null>(null);
  const [deleteTarget, setDeleteTarget]     = useState<TreatmentTypeDto | null>(null);

  useEffect(() => { saveClinicInfo(clinic); }, [clinic]);

  const updateDoctorMutation = useMutation({
    mutationFn: (data: DoctorInfo) => authService.updateMyProfile(toUserUpdateDto(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      setEditingDoctor(false);
      toast.success(t("profile.saved"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSaveDoctor = () => updateDoctorMutation.mutate(doctorForm);

  const handleSaveClinic = () => {
    setClinic(clinicForm);
    setEditingClinic(false);
    toast.success(t("profile.saved"));
  };

  const openAdd = () => { setEditingService(null); setServiceDialog(true); };
  const openEdit = (tt: TreatmentTypeDto) => { setEditingService(tt); setServiceDialog(true); };

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
                  {t("profile.servicesCount", { count: treatmentTypes.length })}
                </p>
              </div>
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-1" /> {t("profile.addService")}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {treatmentTypes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t("profile.noServices")}</p>
                ) : (
                  treatmentTypes.map((svc) => (
                    <div key={svc.id} className="rounded-xl border border-border/50">
                      <div className="flex items-center justify-between gap-3 p-3 sm:p-4">
                        <span className="min-w-0 flex-1 truncate font-medium">{svc.name}</span>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <span className="whitespace-nowrap font-semibold text-primary">
                            {svc.price != null ? `${formatPrice(svc.price)} ${t("common.currency")}` : "—"}
                          </span>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(svc)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteTarget(svc)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
          {!editingDoctor && doctor && (
            <Button variant="ghost" size="sm" onClick={() => { setDoctorForm(doctor); setEditingDoctor(true); }}>
              <Pencil className="h-4 w-4 mr-1" /> {t("profile.edit")}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {doctorLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : editingDoctor ? (
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
                <Button variant="ghost" onClick={() => setEditingDoctor(false)} disabled={updateDoctorMutation.isPending}>{t("patients.cancel")}</Button>
                <Button onClick={handleSaveDoctor} disabled={updateDoctorMutation.isPending}>
                  {updateDoctorMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  {t("patients.save")}
                </Button>
              </div>
            </div>
          ) : doctor ? (
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
          ) : null}
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
      <ServiceTemplateDialog open={serviceDialog} onOpenChange={setServiceDialog} editing={editingService} />

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
                  deleteTreatmentType(deleteTarget.id);
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
