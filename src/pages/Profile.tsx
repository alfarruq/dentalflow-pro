import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  UserCircle, Phone, Mail, MapPin, Clock, Plus, Pencil, Trash2, Save,
  Stethoscope, Building2, CalendarDays, BadgeCheck, DollarSign, Package, X,
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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { DoctorsManagementCard } from "@/components/DoctorsManagementCard";
import { useServiceTemplates, type ServiceTemplate, type ServiceMaterial } from "@/contexts/ServiceTemplatesContext";
import { useInventory } from "@/contexts/InventoryContext";
import { TREATMENT_TYPE_LABELS, type DentalTreatmentType } from "@/data/mockTreatments";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DoctorInfo {
  fullName: string;
  specialty: string;
  phone: string;
  email: string;
  experience: number;
  bio: string;
}

interface ClinicInfo {
  name: string;
  address: string;
  phone: string;
  workingHours: { [key: string]: { start: string; end: string; active: boolean } };
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

const defaultClinic: ClinicInfo = {
  name: "DentaFlow Klinikasi",
  address: "Toshkent sh., Chilonzor tumani, 12-kvartal",
  phone: "+998 71 200 00 01",
  workingHours: {
    monday:    { start: "09:00", end: "18:00", active: true  },
    tuesday:   { start: "09:00", end: "18:00", active: true  },
    wednesday: { start: "09:00", end: "18:00", active: true  },
    thursday:  { start: "09:00", end: "18:00", active: true  },
    friday:    { start: "09:00", end: "18:00", active: true  },
    saturday:  { start: "09:00", end: "14:00", active: true  },
    sunday:    { start: "09:00", end: "14:00", active: false },
  },
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
  const { items: invItems } = useInventory();

  const [name, setName]           = useState("");
  const [treatmentType, setType]  = useState<DentalTreatmentType>("filling");
  const [price, setPrice]         = useState("");
  const [duration, setDuration]   = useState("45");
  const [materials, setMaterials] = useState<ServiceMaterial[]>([]);

  // Picker state for adding a new material row
  const [pickItemId, setPickItemId]   = useState("");
  const [pickQty, setPickQty]         = useState("1");

  // Populate form when editing
  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setType(editing.treatmentType);
      setPrice(String(editing.price));
      setDuration(String(editing.duration));
      setMaterials(editing.materials.map((m) => ({ ...m })));
    } else {
      setName(""); setType("filling"); setPrice(""); setDuration("45"); setMaterials([]);
    }
    setPickItemId(""); setPickQty("1");
  }, [editing, open]);

  function addMaterialRow() {
    if (!pickItemId) return;
    const inv = invItems.find((i) => i.id === pickItemId);
    if (!inv) return;
    // If already in list, just increase qty
    setMaterials((prev) => {
      const existing = prev.find((m) => m.itemId === pickItemId);
      if (existing) {
        return prev.map((m) =>
          m.itemId === pickItemId
            ? { ...m, plannedQty: m.plannedQty + (Number(pickQty) || 1) }
            : m,
        );
      }
      return [
        ...prev,
        { itemId: inv.id, itemName: inv.name, unit: inv.unit, plannedQty: Number(pickQty) || 1 },
      ];
    });
    setPickItemId(""); setPickQty("1");
  }

  function removeMaterial(itemId: string) {
    setMaterials((prev) => prev.filter((m) => m.itemId !== itemId));
  }

  function updateMaterialQty(itemId: string, qty: number) {
    setMaterials((prev) =>
      prev.map((m) => (m.itemId === itemId ? { ...m, plannedQty: Math.max(0.1, qty) } : m)),
    );
  }

  function handleSave() {
    if (!name.trim() || !price) return;
    const data: Omit<ServiceTemplate, "id"> = {
      name: name.trim(),
      treatmentType,
      price: Number(price),
      duration: Number(duration) || 30,
      active: editing ? editing.active : true,
      materials,
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

  const unusedItems = invItems.filter((i) => !materials.some((m) => m.itemId === i.id));

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

          {/* Treatment type */}
          <div className="space-y-1.5">
            <Label>{t("patients.treatmentType")}</Label>
            <Select value={treatmentType} onValueChange={(v) => setType(v as DentalTreatmentType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(TREATMENT_TYPE_LABELS) as [DentalTreatmentType, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {/* ── Materials section ──────────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold">{t("profile.materials")}</Label>
              <span className="text-xs text-muted-foreground">
                ({materials.length} {t("profile.materialsCount")})
              </span>
            </div>

            {/* Existing materials */}
            {materials.length > 0 && (
              <div className="rounded-lg border border-border divide-y divide-border/50">
                {materials.map((m) => (
                  <div key={m.itemId} className="flex items-center gap-2 px-3 py-2">
                    <span className="flex-1 text-sm truncate">{m.itemName}</span>
                    <span className="text-xs text-muted-foreground w-10 shrink-0">{m.unit}</span>
                    <Input
                      type="number"
                      className="h-7 w-16 text-xs text-center"
                      value={m.plannedQty}
                      min={0.1}
                      step={0.5}
                      onChange={(e) => updateMaterialQty(m.itemId, Number(e.target.value))}
                    />
                    <button
                      onClick={() => removeMaterial(m.itemId)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add material row */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">{t("profile.addMaterial")}</Label>
                <Select value={pickItemId} onValueChange={setPickItemId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={t("profile.selectInventoryItem")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-52">
                    {unusedItems.map((i) => (
                      <SelectItem key={i.id} value={i.id} className="text-xs">
                        {i.name}
                        <span className="ml-1 text-muted-foreground">({i.unit})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-16 space-y-1">
                <Label className="text-xs text-muted-foreground">{t("profile.qty")}</Label>
                <Input
                  type="number"
                  className="h-8 text-xs text-center"
                  value={pickQty}
                  min={0.1}
                  step={0.5}
                  onChange={(e) => setPickQty(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3"
                onClick={addMaterialRow}
                disabled={!pickItemId}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
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

  const [doctor, setDoctor] = useState<DoctorInfo>(() => {
    const saved = localStorage.getItem("doctor_info");
    return saved ? JSON.parse(saved) : defaultDoctor;
  });

  const [clinic, setClinic] = useState<ClinicInfo>(() => {
    const saved = localStorage.getItem("clinic_info");
    return saved ? JSON.parse(saved) : defaultClinic;
  });

  const [editingDoctor, setEditingDoctor]   = useState(false);
  const [editingClinic, setEditingClinic]   = useState(false);
  const [doctorForm, setDoctorForm]         = useState<DoctorInfo>(doctor);
  const [clinicForm, setClinicForm]         = useState<ClinicInfo>(clinic);

  const [serviceDialog, setServiceDialog]   = useState(false);
  const [editingService, setEditingService] = useState<ServiceTemplate | null>(null);
  const [deleteTarget, setDeleteTarget]     = useState<ServiceTemplate | null>(null);
  const [filterType, setFilterType]         = useState<DentalTreatmentType | "all">("all");

  useEffect(() => { localStorage.setItem("doctor_info", JSON.stringify(doctor)); }, [doctor]);
  useEffect(() => { localStorage.setItem("clinic_info", JSON.stringify(clinic)); }, [clinic]);

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

  const filteredTemplates = filterType === "all"
    ? templates
    : templates.filter((s) => s.treatmentType === filterType);

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
              <div className="flex gap-2 mb-4 flex-wrap">
                <Select
                  value={filterType}
                  onValueChange={(v) => setFilterType(v as DentalTreatmentType | "all")}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("profile.allCategories")}</SelectItem>
                    {(Object.entries(TREATMENT_TYPE_LABELS) as [DentalTreatmentType, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                {filteredTemplates.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t("profile.noServices")}</p>
                ) : (
                  filteredTemplates.map((svc) => (
                    <div
                      key={svc.id}
                      className={`rounded-xl border border-border/50 transition-all ${!svc.active ? "opacity-50" : ""}`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">{svc.name}</span>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {TREATMENT_TYPE_LABELS[svc.treatmentType]}
                            </Badge>
                            {svc.materials.length > 0 && (
                              <Badge variant="outline" className="text-xs shrink-0 gap-1">
                                <Package className="h-3 w-3" />
                                {svc.materials.length} {t("profile.materialsCount")}
                              </Badge>
                            )}
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
                      {svc.materials.length > 0 && (
                        <div className="px-4 pb-3 border-t border-border/30">
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {svc.materials.map((m) => (
                              <span key={m.itemId} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                <Package className="h-2.5 w-2.5" />
                                {m.itemName} × {m.plannedQty} {m.unit}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
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
