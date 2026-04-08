import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  UserCircle, Phone, Mail, MapPin, Clock, Plus, Pencil, Trash2, Save,
  Stethoscope, Building2, CalendarDays, BadgeCheck, DollarSign, X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: number; // minutes
  active: boolean;
}

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
    monday: { start: "09:00", end: "18:00", active: true },
    tuesday: { start: "09:00", end: "18:00", active: true },
    wednesday: { start: "09:00", end: "18:00", active: true },
    thursday: { start: "09:00", end: "18:00", active: true },
    friday: { start: "09:00", end: "18:00", active: true },
    saturday: { start: "09:00", end: "14:00", active: true },
    sunday: { start: "09:00", end: "14:00", active: false },
  },
};

const defaultServices: Service[] = [
  { id: "1", name: "Konsultatsiya", category: "general", price: 50000, duration: 30, active: true },
  { id: "2", name: "Plomba (oddiy)", category: "filling", price: 150000, duration: 45, active: true },
  { id: "3", name: "Plomba (murakkab)", category: "filling", price: 300000, duration: 60, active: true },
  { id: "4", name: "Tish tozalash", category: "cleaning", price: 200000, duration: 40, active: true },
  { id: "5", name: "Oqartirish", category: "whitening", price: 500000, duration: 60, active: true },
  { id: "6", name: "Implant o'rnatish", category: "implant", price: 3000000, duration: 90, active: true },
  { id: "7", name: "Toj o'rnatish", category: "crown", price: 1500000, duration: 60, active: true },
  { id: "8", name: "Tish olish", category: "extraction", price: 200000, duration: 30, active: true },
  { id: "9", name: "Kanal davolash", category: "endodontics", price: 400000, duration: 60, active: true },
  { id: "10", name: "Ortodontik konsultatsiya", category: "orthodontics", price: 100000, duration: 45, active: true },
];

const SERVICE_CATEGORIES = [
  "general", "filling", "cleaning", "whitening", "implant",
  "crown", "extraction", "endodontics", "orthodontics"
];

function formatPrice(n: number) {
  return n.toLocaleString("uz-UZ");
}

export default function Profile() {
  const { t } = useTranslation();

  const [doctor, setDoctor] = useState<DoctorInfo>(() => {
    const saved = localStorage.getItem("doctor_info");
    return saved ? JSON.parse(saved) : defaultDoctor;
  });

  const [clinic, setClinic] = useState<ClinicInfo>(() => {
    const saved = localStorage.getItem("clinic_info");
    return saved ? JSON.parse(saved) : defaultClinic;
  });

  const [services, setServices] = useState<Service[]>(() => {
    const saved = localStorage.getItem("doctor_services");
    return saved ? JSON.parse(saved) : defaultServices;
  });

  const [editingDoctor, setEditingDoctor] = useState(false);
  const [editingClinic, setEditingClinic] = useState(false);
  const [doctorForm, setDoctorForm] = useState<DoctorInfo>(doctor);
  const [clinicForm, setClinicForm] = useState<ClinicInfo>(clinic);

  const [serviceDialog, setServiceDialog] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState({ name: "", category: "general", price: 0, duration: 30, active: true });
  const [deleteService, setDeleteService] = useState<Service | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");

  useEffect(() => { localStorage.setItem("doctor_info", JSON.stringify(doctor)); }, [doctor]);
  useEffect(() => { localStorage.setItem("clinic_info", JSON.stringify(clinic)); }, [clinic]);
  useEffect(() => { localStorage.setItem("doctor_services", JSON.stringify(services)); }, [services]);

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

  const openAddService = () => {
    setEditingService(null);
    setServiceForm({ name: "", category: "general", price: 0, duration: 30, active: true });
    setServiceDialog(true);
  };

  const openEditService = (s: Service) => {
    setEditingService(s);
    setServiceForm({ name: s.name, category: s.category, price: s.price, duration: s.duration, active: s.active });
    setServiceDialog(true);
  };

  const handleSaveService = () => {
    if (!serviceForm.name.trim()) return;
    if (editingService) {
      setServices(prev => prev.map(s => s.id === editingService.id ? { ...s, ...serviceForm } : s));
      toast.success(t("profile.serviceUpdated"));
    } else {
      setServices(prev => [...prev, { id: Date.now().toString(), ...serviceForm }]);
      toast.success(t("profile.serviceAdded"));
    }
    setServiceDialog(false);
  };

  const handleDeleteService = () => {
    if (deleteService) {
      setServices(prev => prev.filter(s => s.id !== deleteService.id));
      toast.success(t("profile.serviceDeleted"));
      setDeleteService(null);
    }
  };

  const toggleServiceActive = (id: string) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const filteredServices = filterCategory === "all"
    ? services
    : services.filter(s => s.category === filterCategory);

  const totalActiveServices = services.filter(s => s.active).length;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto">
      {/* Doctor Info */}
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
                <Input value={doctorForm.fullName} onChange={e => setDoctorForm(p => ({ ...p, fullName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("profile.specialty")}</Label>
                <Input value={doctorForm.specialty} onChange={e => setDoctorForm(p => ({ ...p, specialty: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("profile.phone")}</Label>
                <Input value={doctorForm.phone} onChange={e => setDoctorForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("profile.email")}</Label>
                <Input value={doctorForm.email} onChange={e => setDoctorForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("profile.experience")}</Label>
                <Input type="number" value={doctorForm.experience} onChange={e => setDoctorForm(p => ({ ...p, experience: +e.target.value }))} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>{t("profile.bio")}</Label>
                <Textarea value={doctorForm.bio} onChange={e => setDoctorForm(p => ({ ...p, bio: e.target.value }))} rows={3} />
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

      {/* Services */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              {t("profile.services")}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {totalActiveServices} {t("profile.activeServices")}
            </p>
          </div>
          <Button size="sm" onClick={openAddService}>
            <Plus className="h-4 w-4 mr-1" /> {t("profile.addService")}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4 flex-wrap">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("profile.allCategories")}</SelectItem>
                {SERVICE_CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{t(`profile.cat_${c}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {filteredServices.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t("profile.noServices")}</p>
            ) : (
              filteredServices.map(service => (
                <div
                  key={service.id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-border/50 transition-all ${!service.active ? "opacity-50" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{service.name}</span>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {t(`profile.cat_${service.category}`)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {service.duration} {t("profile.min")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="font-semibold text-primary whitespace-nowrap">
                      {formatPrice(service.price)} {t("common.currency")}
                    </span>
                    <div className="flex items-center gap-1">
                      <Switch checked={service.active} onCheckedChange={() => toggleServiceActive(service.id)} />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditService(service)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteService(service)}>
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

      {/* Clinic Info */}
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
                  <Input value={clinicForm.name} onChange={e => setClinicForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("profile.clinicPhone")}</Label>
                  <Input value={clinicForm.phone} onChange={e => setClinicForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t("profile.address")}</Label>
                  <Input value={clinicForm.address} onChange={e => setClinicForm(p => ({ ...p, address: e.target.value }))} />
                </div>
              </div>
              <Separator />
              <div>
                <Label className="mb-3 block">{t("profile.workingHours")}</Label>
                <div className="space-y-2">
                  {DAYS.map(day => (
                    <div key={day} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50">
                      <Switch
                        checked={clinicForm.workingHours[day].active}
                        onCheckedChange={checked => setClinicForm(p => ({
                          ...p, workingHours: { ...p.workingHours, [day]: { ...p.workingHours[day], active: checked } }
                        }))}
                      />
                      <span className="w-20 text-sm font-medium">{t(`profile.day_${day}`)}</span>
                      {clinicForm.workingHours[day].active ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="time" className="w-28 text-sm"
                            value={clinicForm.workingHours[day].start}
                            onChange={e => setClinicForm(p => ({
                              ...p, workingHours: { ...p.workingHours, [day]: { ...p.workingHours[day], start: e.target.value } }
                            }))}
                          />
                          <span className="text-muted-foreground">—</span>
                          <Input
                            type="time" className="w-28 text-sm"
                            value={clinicForm.workingHours[day].end}
                            onChange={e => setClinicForm(p => ({
                              ...p, workingHours: { ...p.workingHours, [day]: { ...p.workingHours[day], end: e.target.value } }
                            }))}
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
                  <span className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {t("profile.address")}</span>
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
                  {DAYS.map(day => (
                    <div key={day} className="flex items-center gap-3 text-sm py-1">
                      <span className="w-20 font-medium">{t(`profile.day_${day}`)}</span>
                      {clinic.workingHours[day].active ? (
                        <span className="text-muted-foreground">{clinic.workingHours[day].start} — {clinic.workingHours[day].end}</span>
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

      {/* Service Dialog */}
      <Dialog open={serviceDialog} onOpenChange={setServiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingService ? t("profile.editService") : t("profile.addService")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>{t("profile.serviceName")}</Label>
              <Input value={serviceForm.name} onChange={e => setServiceForm(p => ({ ...p, name: e.target.value }))} placeholder={t("profile.serviceNamePlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label>{t("profile.serviceCategory")}</Label>
              <Select value={serviceForm.category} onValueChange={v => setServiceForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{t(`profile.cat_${c}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("profile.servicePrice")} ({t("common.currency")})</Label>
                <Input type="number" value={serviceForm.price} onChange={e => setServiceForm(p => ({ ...p, price: +e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("profile.serviceDuration")} ({t("profile.min")})</Label>
                <Input type="number" value={serviceForm.duration} onChange={e => setServiceForm(p => ({ ...p, duration: +e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setServiceDialog(false)}>{t("patients.cancel")}</Button>
            <Button onClick={handleSaveService}>{t("patients.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteService} onOpenChange={() => setDeleteService(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("inventory.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("inventory.deleteConfirmDesc", { name: deleteService?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("patients.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteService} className="bg-destructive text-destructive-foreground">
              {t("inventory.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
