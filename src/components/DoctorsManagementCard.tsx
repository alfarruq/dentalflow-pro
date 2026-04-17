import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Users, Plus, Pencil, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useDoctors } from "@/contexts/DoctorsContext";
import { Doctor, DoctorColor, doctorColorMap, doctorColorPalette } from "@/data/mockDoctors";

interface FormState {
  name: string;
  specialty: string;
  phone: string;
  email: string;
  color: DoctorColor;
}

const emptyForm: FormState = {
  name: "",
  specialty: "",
  phone: "",
  email: "",
  color: "blue",
};

export function DoctorsManagementCard() {
  const { t } = useTranslation();
  const { doctors, addDoctor, updateDoctor, deleteDoctor, restoreDoctor } = useDoctors();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [toDelete, setToDelete] = useState<Doctor | null>(null);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, color: doctorColorPalette[doctors.length % doctorColorPalette.length] });
    setDialogOpen(true);
  };

  const openEdit = (doc: Doctor) => {
    setEditing(doc);
    setForm({
      name: doc.name,
      specialty: doc.specialty,
      phone: doc.phone,
      email: doc.email,
      color: doc.color,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) {
      updateDoctor(editing.id, form);
      toast.success(t("doctors.doctorUpdated"));
    } else {
      addDoctor(form);
      toast.success(t("doctors.doctorAdded"));
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!toDelete) return;
    deleteDoctor(toDelete.id);
    toast.success(t("doctors.doctorDeleted"));
    setToDelete(null);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {t("doctors.title")}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t("doctors.subtitle")}</p>
          </div>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" />
            {t("doctors.addDoctor")}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {doctors.map((doc) => {
              const palette = doctorColorMap[doc.color];
              return (
                <div
                  key={doc.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border border-border/50 transition-all",
                    !doc.isActive && "opacity-50"
                  )}
                >
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                      palette.bgSoft
                    )}
                  >
                    <span className={cn("h-2.5 w-2.5 rounded-full", palette.dot)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{doc.name}</span>
                      {!doc.isActive && (
                        <Badge variant="secondary" className="text-xs">
                          {t("doctors.inactive")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {doc.specialty} · {doc.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {doc.isActive ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(doc)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setToDelete(doc)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => restoreDoctor(doc.id)}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        {t("doctors.restore")}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? t("doctors.editDoctor") : t("doctors.addDoctor")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>{t("doctors.name")}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("doctors.specialty")}</Label>
              <Input
                value={form.specialty}
                onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("doctors.phone")}</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("doctors.email")}</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("doctors.color")}</Label>
              <div className="flex flex-wrap gap-2">
                {doctorColorPalette.map((c) => {
                  const palette = doctorColorMap[c];
                  const isActive = form.color === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, color: c }))}
                      className={cn(
                        "h-9 w-9 rounded-full border-2 flex items-center justify-center transition-all",
                        palette.bgSoft,
                        isActive ? "border-foreground scale-110" : "border-transparent"
                      )}
                      aria-label={c}
                    >
                      <span className={cn("h-3 w-3 rounded-full", palette.dot)} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              {t("patients.cancel")}
            </Button>
            <Button onClick={handleSave}>{t("patients.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={() => setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("doctors.delete")}</AlertDialogTitle>
            <AlertDialogDescription>{toDelete?.name}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("patients.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              {t("doctors.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
