# Backend uchun texnik topshiriq (frontend integratsiyasi)

Frontend hozirgi mavjud API'larga to'liq ulandi. Quyida to'liq ishlashi uchun
**yetishmayotgan** endpoint va maydonlar ro'yxati — ustuvorlik tartibida.
Har biri uchun kutilayotgan so'rov/javob formati ko'rsatilgan.

Frontend qaysi joylarda vaqtincha yechim ishlatayotgani ham belgilangan —
endpoint tayyor bo'lganda frontend'da faqat bitta joy (mapper/hook) o'zgaradi.

---

## 1. Muolajalar (eng muhim)

### 1.1 Muolajalar ro'yxati — `GET /api/v1/clinic/treatments/?patient=<id>`

Hozir muolajalarni faqat yaratish mumkin, o'qish yo'li yo'q. Bemor profili
hozircha `patients/<id>/` detalidagi cheklangan ma'lumotdan foydalanmoqda
(faqat birinchi muolajaning summasi ko'rinadi).

Kutilayotgan javob (har bir muolaja to'liq):

```json
[
  {
    "id": 1,
    "patient": 4,
    "doctor": 2,
    "treatment_type": {"id": 2, "name": "Plomba"},
    "total_treatment_cost": 500000,
    "total_paid": 200000,
    "status": "in_progress",
    "tooth_numbers": [16, 17],
    "start_date": "2026-07-17",
    "notes": "..."
  }
]
```

### 1.2 Muolajani tahrirlash/yakunlash — `PATCH /api/v1/clinic/treatments/<id>/`

Qisman yangilash: `total_paid`, `status`, `notes`, `tooth_numbers` va h.k.
Frontend'da "Tahrirlash" va "Muolajani yakunlash" tugmalari bor — hozir faqat
lokal keshda ishlaydi (sahifa yangilanganda yo'qoladi).

### 1.3 Treatment modeliga `status` maydoni

`in_progress` / `completed`. Hozir muolaja holati umuman saqlanmaydi —
frontend `total_paid >= total_treatment_cost` bo'yicha taxmin qilmoqda.

### 1.4 Bir nechta tish — `tooth_number` → `tooth_numbers` (JSON ro'yxat)

Frontend'da bitta muolajada bir nechta tish tanlanadi. Hozir faqat birinchisi
yuborilmoqda.

---

## 2. Retseptlar (butun modul yo'q)

Doctor bemorga dori-darmonlar ro'yxatini yozadi va chop etadi. Model + CRUD:

- `GET /api/v1/clinic/prescriptions/?treatment=<id>` (yoki `?patient=<id>`)
- `POST /api/v1/clinic/prescriptions/`
- `PATCH /api/v1/clinic/prescriptions/<id>/`
- `DELETE /api/v1/clinic/prescriptions/<id>/`

```json
{
  "id": 1,
  "treatment": 1,
  "doctor": 2,
  "date": "2026-07-17",
  "note": "Tashxis izohi",
  "medications": [
    {"name": "Amoksitsillin", "dosage": "500 mg", "schedule": "kuniga 3 mahal", "duration": "7 kun"}
  ]
}
```

`medications` — alohida jadval yoki JSONField, ixtiyoriy. Frontend'da UI to'liq
tayyor, hozircha xotirada ishlaydi.

---

## 3. Bemorlar

### 3.1 Tahrirlash/o'chirish — `PATCH` va `DELETE /api/v1/clinic/patients/<id>/`

Hozir faqat GET bor. Frontend tahrirlashda vaqtincha
`PATCH /authentication/update/<id>/` ishlatmoqda (ism/telefon ishlaydi).

### 3.2 Qo'shimcha maydonlar (User modeliga yoki alohida profilga)

`address`, `workplace` (ish/o'quv joyi), `allergies`, `medical_notes` —
frontend formalarida bor, backend'da saqlanmaydi. `birth_date` modelda bor,
lekin `PatientCreateUpdateSerializer`ga kiritilmagan — qo'shish kerak.

### 3.3 Doctor ID qaytarish

Ro'yxat/detal serializerlarida `doctor` faqat ism (string). Frontend doctor'ni
ranglar/filtrlar uchun ID bo'yicha topadi — hozir ism bo'yicha taxminan
moslashtirilmoqda (bir xil ismli ikki doctor bo'lsa buziladi):

```json
"doctor": {"id": 2, "full_name": "Javohir Karimov"}
```

---

## 4. Uchrashuvlar

### 4.1 `PATCH /api/v1/calendars/appointments/<id>/` — status o'zgartirish/tahrirlash

### 4.2 Status'ga `cancelled` qo'shish

Frontend'da 4 holat bor: pending / confirmed(=in_progress) / completed /
cancelled. Backend'da `cancelled` yo'q.

### 4.3 Ro'yxat serializerida bemor ID + telefon

Hozir `patient` faqat ism. Kerak: `patient: {"id": 4, "full_name": "...", "phone_number": "..."}` —
uchrashuvdan bemor profiliga o'tish uchun.

---

## 5. Galereya

- `DELETE /api/v1/clinic/galleries/<id>/` — hozir o'chirish faqat lokal keshda.
- `GET` javobida `created_at` (yoki `date`) qaytarish — rasm sanasi ko'rsatiladi.
- Ixtiyoriy: yuklashda `date` qabul qilish (rentgen olingan sana).

---

## 6. Doktorlar

- `DELETE` hozir butunlay o'chiradi. Kerak: `is_active=false` (soft delete) +
  qayta tiklash imkoni. Frontend'da "arxivlash/tiklash" UI tayyor.
- Ixtiyoriy: `color` maydoni — hozir frontend ID bo'yicha avtomatik rang beradi.

---

## 7. Xizmatlar (model bor, API yo'q)

`Service` modeli mavjud, endpoint kerak:

- `GET /api/v1/clinic/services/`
- `POST /api/v1/clinic/services/`
- `PATCH /api/v1/clinic/services/<id>/` (shu jumladan `active` toggle)
- `DELETE /api/v1/clinic/services/<id>/`

Frontend maydonlari: `name`, `price`, `duration_minutes`, `active` (modelga
qo'shish kerak). Hozircha localStorage'da ishlaydi.

---

## 8. Klinika sozlamalari (model ham, API ham yo'q)

Retsept chop etishda klinika nomi/manzili/telefoni/logotipi ishlatiladi.

- `GET /api/v1/clinic/settings/`
- `PATCH /api/v1/clinic/settings/` (multipart — logotip fayl)

```json
{
  "name": "DentaFlow Klinikasi",
  "address": "...",
  "phone": "...",
  "logo": "/media/images/logo.png",
  "working_hours": {"monday": {"start": "09:00", "end": "18:00", "active": true}}
}
```

Hozircha localStorage'da.

---

## 9. Auth

- **Refresh endpoint yo'q** — `POST /api/v1/authentication/refresh/`
  (`{"refresh_token": "..."}` → yangi access). Hozir access muddati tugasa
  foydalanuvchi qayta login qiladi.
- `PatientCreateListView` va boshqa clinic view'larda `permission_classes = [AllowAny]`
  turibdi — **`IsAuthenticated` bo'lishi shart** (tibbiy ma'lumot!).

---

## Frontend'dagi vaqtincha yechimlar xaritasi

| Funksiya | Hozirgi holat | Endpoint kelganda o'zgaradigan joy |
|---|---|---|
| Muolaja tahrirlash/yakunlash | lokal kesh | `src/contexts/TreatmentContext.tsx` |
| Retseptlar | xotirada | `src/contexts/PrescriptionsContext.tsx` |
| Galereya o'chirish | lokal kesh | `src/pages/PatientProfile.tsx` |
| Bemor allergiya/izoh | lokal kesh | `src/contexts/PatientsContext.tsx` |
| Xizmatlar | localStorage | `src/contexts/ServiceTemplatesContext.tsx` |
| Klinika sozlamalari | localStorage | `src/data/clinicInfo.ts` |
| Doctor nomidan ID topish | ism bo'yicha | `src/lib/api/mappers.ts` |
