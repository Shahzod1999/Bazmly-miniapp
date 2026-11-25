# Bazmly Mini App — fix hisoboti (v2: dizayn saqlangan)

Branch: `fix/user-app-v2` (asos: `b2445a4`, main'ga push qilinmagan).

**Muhim:** bu versiyada ekranlarning dizayni va markup'i o'zgartirilmagan. Faqat ichki mantiq tuzatilgan:
mock ma'lumotlar o'rniga API, soxta muvaffaqiyatlar olib tashlangan, Telegram orqali kirish qo'shilgan.
Backend'i yo'q bloklar joyida qoldi va bosilganda "Tez orada" deydi.

Avvalgi `fix/user-app` branchi (dizayni qayta chizilgan versiya) solishtirish uchun qoldirildi.

## Tekshiruv natijalari

| Tekshiruv | Natija |
|---|---|
| `npx tsc --noEmit` | 0 xato |
| `npx eslint .` | 0 xato, 0 ogohlantirish (`eslint-disable` yo'q) |
| `npm run build` | muvaffaqiyatli, 11 ta route |
| `npm run test:e2e` | 13/13 o'tdi (backend mock bilan) |
| `public/` hajmi | 42 MB → 480 KB (ishlatilmagan rasmlar o'chirildi, qolganlari WebP) |

---

## Bajarildi

### Faqat foydalanuvchi qismi
- `src/app/admin/`, `partnerService`, `orderService` o'chirildi; `/admin` → 404.
- Login sahifasidagi hamkor ro'yxatdan o'tish qadamlari (3–8), xodim kirishi, `admin/admin` "bypass" olib tashlandi.
- "Restoran/To'yxona uchun akkaunt" tugmalari joyida — "Hamkorlar uchun ro'yxatdan o'tish tez orada".

### Kirish (auth)
- `AuthContext`: token bo'lsa `/users/me`, bo'lmasa Telegram `initData` bilan avtomatik kirish; token yangilash bitta so'rov bilan.
- `localStorage` dagi `isRegistered`, `fullName`, `phone`, `my_local_bookings` va boshqa nusxalar o'rniga foydalanuvchi faqat API'dan.
- Ro'yxatdan o'tish: telefon → (ro'yxatdan o'tgan bo'lsa) parol bilan kirish, aks holda ism + parol (kamida 8 belgi). Soxta SMS-kod va standart parollar (`Password123!`, `Partner123!`) yo'q. Xato bo'lsa xabar ko'rsatiladi, keyingi qadamga o'tilmaydi.
- `/login?next=...` — kirgandan keyin shu sahifaga qaytadi.

### Mock ma'lumotlar va soxta muvaffaqiyatlar
- Bosh sahifa: kartalar endi API'dagi nom, reyting, ochiq/yopiq, masofa, depozit, narx bilan. "The Royal Grand", "25,000,000", "4.8 (356 ta sharh)", soxta rasm fallback'lari olib tashlandi. Xato holati va "Qayta urinish" qo'shildi.
- Bildirishnomalar: soxta 2 ta xabar o'rniga bo'sh holat; "hammasini o'qilgan qilish" xatoda muvaffaqiyat ko'rsatmaydi.
- Restoran sahifasi: soxta galereya, 10 ta soxta taom, "10% chegirma", soxta chat javobi ("Menejerimiz tez orada javob beradi"), soxta sharh qo'shish olib tashlandi. Chat haqiqiy suhbat API'si bilan ishlaydi; sharh yozish "Tez orada".
- Stol broni: sana/vaqt ish soatidan, stollar `getFreeTables` dan. Xato bo'lsa soxta chipta (`Math.random` id, `0789 …`) yaratilmaydi — xabar ko'rsatiladi. Chipta va QR haqiqiy `ticket_code`/`qr_token` dan.
- To'yxona sahifasi: barcha ma'lumot `getVenueDetail` dan, qulayliklar API'dan.
- To'yxona bron oynasi (`toyxona-flow-modal`): band sanalar `getAvailability`, vaqt ish soatidan, mehmonlar soni zal sig'imidan, xizmatlar `getServices`, bron `bookHall`. Dollardagi soxta "Detailed Price Report" va `setTimeout` bilan soxta depozit to'lovi olib tashlandi.
- To'yxona menyu paketlari: endpoint yo'q — "Tez orada". Paket komponentlari saqlangan, turlari `components/toyxona-menu/types.ts` da; mock fayl va rasmlar o'chirildi.
- Chiptalar: faqat `getMyBookings`; bekor qilish API orqali (xatoda muvaffaqiyat ko'rsatilmaydi); QR — haqiqiy. Promokodlar tabi "Tez orada".
- Joylar (feed): soxta "Rest One"/"Versal" bronlari olib tashlandi; bo'sh holat, xato holati, kirish taklifi.
- Profil: stock rasm o'rniga foydalanuvchi rasmi yoki ism bosh harflari; "Alisher Raimov" fallback'lari yo'q; "Xabarlar" va "Tarix" API'dan; kartalar, Google/Apple kirish, do'stlarni taklif qilish, rasm yuklash — "Tez orada".

### To'lov
- Karta raqami/CVV formasi va soxta kartalar olib tashlandi; summalar faqat backend'dan.
- Bron sahifasida "Onlayn to'lov — tez orada", promokod — "tez orada".
- `/payment/[id]` — haqiqiy bron chiptasi (holat, summa, narx qatorlari, QR, bekor qilish).
- `/payment-success` hech narsani "to'landi" demaydi: `bookingId` bo'lsa `/payment/[id]` ga, aks holda `/tickets` ga yo'naltiradi.

### Telegram
- `telegram-web-app.js` root layout'da; `ready`, `expand`, `disableVerticalSwipes`, viewport/safe-area CSS o'zgaruvchilari.
- Mavzu: Telegram ichida Telegram rangi, tashqarida — avvalgidek yorug' (saqlangan tanlov bo'lsa o'sha).
- Ichki sahifalarda Telegram BackButton (restoran, to'yxona, bron oynasi, bron qadamlari, chipta).
- Pastki menyudagi "Skaner" — "Tez orada" (oldin 2.8 soniyadan keyin soxta "BZ-90214" natija chiqardi).

### Sifat
- `error.tsx`, `global-error.tsx`, `not-found.tsx`, `loading.tsx` — avvalgi uslubda.
- Barcha `any`, `react-hooks` xatolari, `<img>` ogohlantirishlari tuzatildi (`next/image`).
- Inglizcha matnlar o'zbekchaga: "Edit profile", "Add friends", "Sign In", "Continue with Google/Apple".
- Yagona `formatSom` (`src/lib/format.ts`).
- `check_brackets.js` (eski yordamchi skript) o'chirildi; `.env.example` qo'shildi.

### Testlar
- Playwright: `tests/e2e/*`, fixture'lar `tests/fixtures/` da (ilova kodi import qilmaydi). Backend `page.route` bilan almashtiriladi, ro'yxatda yo'q so'rov 404 qaytaradi.

---

## Backend'dan kerak

1. **OpenAPI tekshiruvi** — ish muhitidan backend'ga ulanib bo'lmadi; sxema sifatida `src/lib/api/types.ts` olindi.
2. **Mijoz to'lovi** (depozit) — to'lov havolasi va bron'dagi to'lov holati.
3. **To'yxona menyu paketlari / guest tier** — paketlar ro'yxati va `bookHall` da paket tanlash.
4. **SMS/OTP tasdiqlash** — telefonni tasdiqlash.
5. **Promokodlar**, **QR skaner** stsenariysi, **saqlangan kartalar**.
6. **Sharh yozish** — `createReview` uchun `booking_id` kerak; foydalanuvchi qaysi bron uchun yozishini tanlash oqimi.
7. **Menyu kategoriyalari** — `MenuItemListItem` da kategoriya yo'q, shuning uchun menyuda faqat "Barchasi".
8. **`VenueListItem.venue_type` va manzil** — umumiy ro'yxatda to'yxonani to'g'ridan-to'g'ri ochish va manzilni ko'rsatish uchun.
9. **Profil shahri** — profilda shahar maydoni yo'q, tanlov faqat qurilmada saqlanadi.

## Qolgan kamchiliklar

- Dizaynni saqlash uchun katta fayllar bo'linmadi: `login/page.tsx` (1 599), `page.tsx` (1 429), `venue/[id]` (1 054), `toyxona-flow-modal` (914), `booking/[id]` (824) qator.
- Ranglar avvalgidek ko'p joyda to'g'ridan-to'g'ri yozilgan (`#FF6B00` va h.k.) — dizayn o'zgarmasligi uchun tokenlarga o'tkazilmadi.
- To'yxona tadbiri davomiyligi 5 soat, stol broni 2 soat deb olingan; muassasa sozlamasi bo'lsa backend'dan olish kerak.
- Telegram ichida sahifadagi "Orqaga" tugmalari ham ko'rinadi (dizayn saqlangan), Telegram BackButton bilan birga.

## Qo'lda tekshirish

1. `npm install`, `npx playwright install chromium`.
2. `npx tsc --noEmit && npm run lint && npm run build && npm run test:e2e`.
3. Telegram'da: avtomatik kirish, BackButton, mavzu, iPhone safe-area.
4. Haqiqiy backend bilan: stol va to'yxona broni, bekor qilish, QR, chat, saqlash, bildirishnomalar.
