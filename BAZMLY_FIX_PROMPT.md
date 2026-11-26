# Bazmly Telegram Mini App — to'liq tuzatish topshirig'i

> Bu fayl AI kod agenti (Claude Code, Cursor va h.k.) yoki dasturchi uchun yozilgan topshiriq.
> Loyiha papkasining ildizida ishga tushiring va topshiriqni bosqichma-bosqich bajaring.

---

## 0. Kontekst

**Bazmly** — O'zbekistonda restoran va to'yxonalarni topish va bron qilish uchun Telegram Mini App.
Bu repozitoriy faqat **mijoz (foydalanuvchi) ilovasi** bo'lishi kerak. Hamkor (partner), admin va xodimlar
uchun bo'lgan hamma narsa bu loyihadan olib tashlanadi — ular alohida ilovada bo'ladi.

**Backend API tayyor** va production'da ishlaydi:

- Base URL: `https://bazmly-backend-production.up.railway.app`
- Frontend so'rovlarni `next.config.ts` dagi rewrite orqali `/api/:path*` ga yuboradi.
- API sxemasi: `https://bazmly-backend-production.up.railway.app/openapi.json` (yoki `/docs`).
  **Har bir endpointni ishlatishdan oldin shu sxemadan so'rov va javob shaklini tekshiring.**
  `src/lib/api/types.ts` sxemadan orqada qolgan bo'lishi mumkin — farq bo'lsa, sxemaga moslab yangilang.

**Texnologiyalar:** Next.js 16.2 (App Router, Turbopack), React 19.2, TypeScript (strict), Tailwind CSS v4,
`lucide-react`. Paket menejeri: npm.

**Muhim:** `AGENTS.md` da yozilganidek, bu Next.js versiyasida API va konvensiyalar o'zgargan.
Next.js'ga oid kod yozishdan oldin `node_modules/next/dist/docs/` ichidagi tegishli qo'llanmani o'qing
(masalan `01-app/03-api-reference/04-functions/use-params.md`,
`01-app/03-api-reference/03-file-conventions/error.md`, `not-found.md`, `loading.md`).

---

## 1. Ishlash qoidalari (hamma bosqichlarga tegishli)

1. **Hech qachon soxta muvaffaqiyat ko'rsatmang.** API xato bersa, foydalanuvchiga tushunarli xato
   xabari va "Qayta urinish" tugmasini ko'rsating. `catch` ichida mock ma'lumot qaytarish, tasodifiy ID
   yasash (`Math.random()`), `setTimeout` bilan "muvaffaqiyat"ni imitatsiya qilish **taqiqlanadi**.
2. **Kodga yozilgan to'qima ma'lumot bo'lmasin.** Ismlar, bronlar, promokodlar, narxlar, reytinglar,
   manzillar faqat API'dan keladi. `src/data/venues.ts` dagi `MOCK_VENUES` va shunga o'xshash
   massivlar oxirida o'chiriladi.
3. **Xatolarni yutmang.** Bo'sh `catch {}` va `.catch(() => {})` faqat ataylab e'tiborsiz qoldirish
   mumkin bo'lgan joylarda (masalan, ixtiyoriy analytics) qoladi va izoh bilan belgilanadi.
4. **Har bir sahifada 4 ta holat bo'lsin:** yuklanmoqda (skeleton), ma'lumot bor, bo'sh, xato.
5. **Agar kerakli endpoint backend'da yo'q bo'lsa** (sxemada topilmasa), uni o'ylab topmang va
   mock qilmang. O'sha funksiyani "Tez orada" holatiga qo'ying va yakuniy hisobotda
   "Backend'dan kerak" ro'yxatiga yozing.
6. **Git:** `main` dan `fix/user-app` branchini oching. Har bir bosqich (yoki mantiqiy kichik qadam)
   alohida commit bo'lsin, xabari o'zbekcha va aniq: `fix(booking): soxta bron yasash olib tashlandi`.
   `main` ga to'g'ridan-to'g'ri push qilmang.
7. **Har bir bosqich oxirida** quyidagilarni ishga tushiring va xatosiz o'tishiga erishing:
   ```bash
   npx tsc --noEmit
   npm run lint
   npm run build
   ```
8. Til: interfeysdagi barcha matnlar **o'zbek tilida (lotin)**. Inglizcha qolgan matnlarni tarjima qiling.

---

## 2. Bosqich 1 — Loyihani faqat mijoz ilovasiga aylantirish

### 2.1. O'chiriladigan qismlar

| Nima | Qayerda | Amal |
| --- | --- | --- |
| Admin / hamkor paneli | `src/app/admin/` | Butun papkani o'chirish |
| Hamkor API servisi | `src/lib/api/services/partnerService.ts` | O'chirish |
| Muassasa ichki buyurtmalari (ofitsiant, oshxona, check-in) | `src/lib/api/services/orderService.ts` | O'chirish (mijozga kerakli funksiya bo'lsa, `bookingService` ga ko'chirish) |
| Muassasa xizmatini yaratish | `catalogService.createVenueService` | O'chirish |
| Hudud/tuman yaratish, tahrirlash, o'chirish | `geoService` dagi `create*`, `update*`, `delete*` | O'chirish, faqat o'qish metodlari qoladi |
| Xodim sifatida kirish | `authService.loginStaff`, `AuthContext.loginStaff` | O'chirish |
| Hamkor ro'yxatdan o'tish qadamlari | `src/app/login/page.tsx` dagi `partner_*`, `accountType` (restaurant/toyxona), `handleCompletePartnerRegistration`, `setStep(7)`/`setStep(8)` oqimlari | O'chirish |
| Rollar | `AuthContext` dagi `isPartner`, `isAdmin`, `localStorage.userRole` | O'chirish |
| Hamkor bilan bog'liq navigatsiya | `src/components/bottom-nav.tsx`, `src/app/page.tsx` dagi `/admin` havolalari | O'chirish |
| `types.ts` dagi faqat hamkorga oid turlar | `src/lib/api/types.ts` | Ishlatilmay qolganlarini o'chirish |

O'chirishdan keyin `grep -rn "admin\|partner\|staff\|venue/orders" src` bilan qolgan havolalarni tekshiring.

### 2.2. Qabul mezonlari

- `/admin` route'i yo'q (`next build` ro'yxatida chiqmaydi).
- Login sahifasida faqat mijoz oqimi qolgan.
- Hech qaysi kod `/api/v1/venue/...` (hamkor endpointlari) ga murojaat qilmaydi.

---

## 3. Bosqich 2 — Autentifikatsiya

### 3.1. Telegram orqali kirish (asosiy yo'l)

1. `src/app/layout.tsx` ga Telegram SDK'ni qo'shing:
   `https://telegram.org/js/telegram-web-app.js` — `next/script`, `strategy="beforeInteractive"`
   (Next 16 hujjatida bu strategiya qayerda ishlatilishi mumkinligini tekshiring).
2. `src/lib/telegram.ts` faylini kengaytiring (u allaqachon `getTelegramWebApp`, `hapticSelection`,
   `hapticImpact`, `useTelegramBackButton` ni o'z ichiga oladi): `initData`, `ready()`, `expand()`,
   `colorScheme`, `themeParams`, `MainButton`, `viewportStableHeight`, `safeAreaInset`,
   `contentSafeAreaInset`, `onEvent/offEvent` uchun turlar va yordamchi funksiyalar qo'shing.
3. Ilova ochilganda (`AuthProvider` ichida yoki alohida `TelegramProvider`):
   - `WebApp.ready()` va `WebApp.expand()` chaqirilsin.
   - Agar `WebApp.initData` bo'sh bo'lmasa va foydalanuvchi kirmagan bo'lsa —
     `POST /api/v1/auth/telegram` (`authService.loginTelegram`) orqali avtomatik kirish.
   - Javobga ko'ra telefon raqami yo'q bo'lsa, `WebApp.requestContact` orqali kontakt so'rab,
     `POST /api/v1/auth/telegram/contact` ga yuborish; profil to'liq bo'lmasa `complete-profile` qadamiga o'tkazish.
4. Oddiy brauzerda (Telegram tashqarisida) ilova telefon orqali kirish bilan ishlashda davom etsin.

### 3.2. Telefon orqali kirish va ro'yxatdan o'tish

- `src/app/login/page.tsx` (3 879 qator) ni qadamlar bo'yicha alohida komponentlarga ajrating:
  `src/components/auth/` ichida `LanguageStep`, `PhoneStep`, `OtpStep`, `ProfileStep`, `PasswordStep` va h.k.
- **SMS/OTP:** OpenAPI sxemasida OTP yuborish va tekshirish endpointlarini toping. Bo'lsa — ulang.
  Bo'lmasa — OTP qadamini butunlay olib tashlang (kodni tekshirmaydigan OTP ekrani qolmasin) va hisobotga yozing.
- **Standart parollarni olib tashlang:** `"Password123!"`, `"Partner123!"` va `password.trim() || undefined`
  holatlari. Parol majburiy bo'lsa — formada majburiy qiling.
- `register` / `login` xato bersa — xatoni ko'rsating, keyingi qadamga **o'tmang**, `/feed` ga yo'naltirmang.
- Login sahifasidagi o'zi chizilgan ekran klaviaturasini (`handleCustomKeyPress`, "Space", "Next" tugmalari)
  olib tashlang. Oddiy `<input type="tel" inputMode="tel" autoComplete="tel">` va
  `<input inputMode="numeric" autoComplete="one-time-code">` ishlating.

### 3.3. Token va sessiya (`src/lib/api/config.ts`, `src/contexts/AuthContext.tsx`)

- Token yangilash muvaffaqiyatsiz bo'lganda navbatdagi so'rovlar abadiy osilib qoladi: `refreshSubscribers`
  rad etilmaydi. Tuzating: refresh xato bersa, kutayotgan barcha so'rovlar xato bilan tugasin.
- `isRefreshing` ni `try/finally` ichida qaytaring.
- `document.cookie` ga access token yozishni olib tashlang (u hech qayerda o'qilmaydi va `HttpOnly` emas).
  Agar backend `HttpOnly` refresh cookie'ni qo'llasa — o'shanga o'ting; bo'lmasa hisobotga yozing.
- `localStorage` dagi `isRegistered`, `fullName`, `phone`, `userRole` nusxalaridan voz keching:
  yagona manba — `AuthContext.user`. `isRegisteredChange` hodisasini olib tashlang.
- `AuthContext` dagi `react-hooks/set-state-in-effect` va `any` lint xatolarini tuzating.

### 3.4. Qabul mezonlari

- Telegram ichida ochilganda foydalanuvchi qo'shimcha qadamsiz avtomatik kiradi.
- Noto'g'ri parol yoki backend xatosida "Muvaffaqiyatli" degan xabar chiqmaydi.
- Kodda `Password123!`, `Partner123!` qolmagan.

---

## 4. Bosqich 3 — Soxta ma'lumot va soxta muvaffaqiyatlarni olib tashlash

Har bir punkt: mock'ni o'chiring → API'ga ulang → yuklanish/bo'sh/xato holatlarini qo'shing.

| # | Fayl | Hozirgi muammo | Kerakli natija |
| --- | --- | --- | --- |
| 4.1 | `src/app/booking/[id]/page.tsx` (~300–430-qatorlar) | `bookHall` / `bookTable` xato bersa, `Math.random()` bilan soxta "confirmed" bron, chek raqami va QR token yasaladi va `localStorage` ga yoziladi | Xato bo'lsa — xabar va "Qayta urinish". Chipta faqat API javobidan. `my_local_bookings`, `my_booking_tokens` ni olib tashlash |
| 4.2 | `src/app/booking/[id]/page.tsx` (`handleVerifyCard`) | Karta qo'shish va SMS kod soxta, istalgan 6 raqam qabul qilinadi | Kartani ilova ichida olmaslik (5-bosqichga qarang) |
| 4.3 | `src/app/feed/page.tsx` (~527) | "Band qilingan joylar"da har doim 2 ta to'qima bron | `bookingService.getMyBookings()` |
| 4.4 | `src/app/tickets/page.tsx` | Promokodlar va "05:35:45" taymeri kodga yozilgan; `localStorage` dagi soxta bronlar qo'shiladi; `alert()` ishlatilgan | Chiptalar — `GET /api/v1/bookings`, promokodlar — sxemada bo'lsa API'dan, bo'lmasa bo'limni yashirish. `alert` o'rniga toast |
| 4.5 | `src/app/page.tsx` (482) | Kirmagan foydalanuvchiga "Hayrli kun! Shahzod" | Ism bo'lmasa — "Hayrli kun!" |
| 4.6 | `src/app/venue/[id]/page.tsx` | API xato bersa "Muassasa", "Faol", "4.8 (0 ta sharh)" ko'rinadi | Xato holati. Reyting faqat `getReviewAggregate` dan |
| 4.7 | `src/app/toyxona/[id]/page.tsx` | Har qanday `id` uchun bir xil "The Royal Grand", narx, manzil, galereya | `useParams` + `venueService.getVenueDetail(id)`, galereya va narxlar API'dan |
| 4.8 | `src/app/toyxona/[id]/menu/page.tsx`, `src/data/toyxona-menu.ts` | Menyu paketlari vaqtinchalik mock faylda | Sxemada paketlar/guest tier endpointi bo'lsa — ulash va `src/data/toyxona-menu.ts` ni o'chirish. Bo'lmasa — hisobotga yozish. Ekran dizayni va komponentlari (`src/components/toyxona-menu/`) saqlanadi |
| 4.9 | `src/components/toyxona-flow-modal.tsx` | Sana, vaqt, mehmonlar narxi kodga yozilgan; depozit to'lovi `setTimeout` bilan soxta; "Selected Venue", "Distinguished Guests", "Premium Gold Catering Service" | Bo'sh sanalar/vaqtlar — `getAvailability`; bron — `bookHall`; menyu ekranidan tanlangan paket va mehmonlar soni prop orqali uzatilsin va qayta so'ralmasin; inglizcha matnlar tarjima qilinsin |
| 4.10 | `src/app/page.tsx`, `src/app/venue/[id]/page.tsx` va boshqalar | Render paytida `Math.random()` / `Date.now()` (`react-hooks/purity`, 12 joy) | Qiymatni effect yoki event ichida yaratish |
| 4.11 | `src/data/venues.ts` | `MOCK_VENUES` bir nechta sahifada zaxira sifatida ishlatiladi | Hamma joydan olib tashlab, faylni o'chirish |

Tekshirish uchun: `grep -rn "Math.random\|MOCK_\|setTimeout\|my_local_bookings\|catch {}" src` —
qolgan har bir natijani ko'rib chiqing va asoslang.

---

## 5. Bosqich 4 — To'lov

Hozir `src/app/payment/[id]/page.tsx` karta raqami, muddati va **CVV** ni ilovaning o'z formasida oladi,
hech qayerga yubormaydi va 1,2 soniyadan keyin `/payment-success` ga o'tadi. Summa URL parametridan olinadi
(`total`, standart qiymati `15000000`) — foydalanuvchi uni o'zgartira oladi.

1. Karta formasini, `CHIP` vizualini va karta ma'lumotlari state'larini **butunlay olib tashlang**.
   Ilova hech qachon karta raqami yoki CVV ni qabul qilmasligi kerak.
2. OpenAPI sxemasidan bron uchun to'lov yaratish endpointini toping (masalan, depozit/invoice yaratish,
   to'lov havolasini qaytarish). Oqim:
   - bron yaratiladi → backend to'lov havolasini (Payme / Click / Uzum) qaytaradi →
   - Telegram ichida `WebApp.openLink(url)` (yoki `openInvoice`, agar backend Telegram Payments ishlatsa) →
   - qaytgandan keyin bron holati `GET /api/v1/bookings/{id}` orqali tekshiriladi.
3. Summa **faqat backend'dan** olinadi, URL'dan emas.
4. `src/app/payment-success/page.tsx` faqat `bookingId` qabul qiladi, bron va to'lov holatini API'dan oladi.
   To'lanmagan yoki topilmagan bron uchun "Muvaffaqiyatli" ekranini ko'rsatmaydi. Chipta raqami
   `Math.random()` bilan emas, API'dagi `ticket_code` / `receipt_number` dan.
5. Agar sxemada mijoz to'lovi uchun endpoint bo'lmasa: to'lov tugmasini "Tez orada" qiling, bronni
   "To'lov kutilmoqda" holatida ko'rsating va hisobotga yozing. Soxta to'lov qilmang.

---

## 6. Bosqich 5 — Telegram Mini App tajribasi

- **Mavzu:** `theme-provider.tsx` boshlang'ich mavzuni Telegram `colorScheme` dan olsin,
  `themeChanged` hodisasini tinglasin. `localStorage` faqat Telegram tashqarisida ishlatilsin.
- **Orqaga tugmasi:** ichki sahifalarda (`/venue/[id]`, `/booking/[id]`, `/toyxona/[id]`, `/toyxona/[id]/menu`,
  `/payment/[id]`) `useTelegramBackButton` ishlatilsin. Telegram ichida sahifadagi o'z "Orqaga" tugmasi yashirilsin.
- **Asosiy tugma:** bron va to'lov qadamlaridagi pastki "Keyingisi / Bron qilish / To'lash" tugmalari
  Telegram ichida `MainButton` orqali ko'rsatilsin (matn, `setParams`, loading holati, `disable`).
  Brauzerda hozirgi pastki panel qoladi. Buning uchun bitta umumiy `useMainButton` hook yozing.
- **Balandlik va safe area:** `min-h-screen` o'rniga Telegram `viewportStableHeight` va
  `safeAreaInset` / `contentSafeAreaInset` dan CSS o'zgaruvchilar (`--tg-viewport-height`,
  `--tg-safe-bottom`) yasang. Fixed pastki panellar shu qiymatni hisobga olsin.
- **Ramka:** `layout.tsx` dagi `max-w-md` + chetki `border-x` faqat Telegram tashqarisida (desktop brauzerda) ko'rinsin.
- **Tebranish:** tanlash (pill, sana, vaqt, paket) — `hapticSelection()`, muvaffaqiyatli bron — `notificationOccurred('success')`.
- `disableVerticalSwipes()` ni scroll bilan ishlovchi sahifalarda yoqing (Bot API versiyasini tekshirib).

---

## 7. Bosqich 6 — Sifat, dizayn va accessibility

### 7.1. Lint

`npm run lint` hozir **227 xato, 117 ogohlantirish** beradi. Natija 0 xato bo'lishi kerak.

| Qoida | Soni | Yo'l |
| --- | --- | --- |
| `react/no-unescaped-entities` | 122 | JSX matnidagi `'` ni `{"so'm"}` yoki `&apos;` bilan. Qoidani o'chirib qo'ymang |
| `@typescript-eslint/no-explicit-any` | 67 | `types.ts` dagi turlar; xatolar uchun `BazmlyApiError` |
| `react-hooks/set-state-in-effect` | 20 | Lazy `useState(() => …)`, hosila qiymatni render'da hisoblash |
| `react-hooks/purity` | 12 | 4.10 punktga qarang |
| `no-unused-vars`, `prefer-const`, `exhaustive-deps` | 81 | Tozalash |
| `@next/next/no-img-element` | 44 ogohlantirish | Katta rasmlarni `next/image` ga (`sizes` bilan) |

### 7.2. Rasmlar

`public/` 43 MB. `public/images/home/tuyxona2.png` — 20 MB, yana 12 ta PNG 0,7–3 MB.
Hammasini WebP ga o'tkazing (eni ≤ 1200 px, sifat ~75), havolalarni yangilang. Maqsad: `public/` ≤ 5 MB.

### 7.3. Next.js fayl konvensiyalari

`src/app/error.tsx`, `src/app/not-found.tsx`, `src/app/global-error.tsx` va og'ir sahifalar uchun
`loading.tsx` qo'shing (Next 16 hujjatidan shablonni oling). Matnlar o'zbekcha, "Qayta urinish" tugmasi bilan.

### 7.4. Dizayn tokenlari (Bazmly dizayn tizimi)

`src/app/globals.css` dagi `@theme` ga quyidagi tokenlarni kiriting va kodda **xom hex ranglar**
(`#FF5A00` 289 marta, `#FF6B00` 173 marta) o'rniga shu tokenlardan foydalaning:

| Token | Light | Dark | Qayerda |
| --- | --- | --- | --- |
| `brand` | `#E85102` | `#FF6A1F` | Asosiy tugma foni, aktiv pill |
| `brand-strong` | `#C24400` | `#FF8A4C` | To'q sariq **matn** (narx, havola), bosilgan tugma |
| `brand-tint` | `#FDEBDF` | `#3A2016` | Yumshoq to'q sariq fon |
| `surface-0` | `#F7F5F3` | `#141110` | Sahifa foni |
| `surface-100` | `#FFFFFF` | `#1E1A18` | Kartalar, sheet'lar |
| `surface-200` | `#EFEBE7` | `#2A2522` | Nofaol pill, input foni |
| `border` | `#E4DED8` | `#3A332F` | Chiziqlar |
| `ink` | `#1C1410` | `#F5F1EE` | Asosiy matn |
| `ink-muted` | `#6B605A` | `#B3A79F` | Ikkinchi darajali matn |
| `success` | `#12805C` | `#3FC495` | "Ochiq", "Depozitlik", tasdiqlangan |
| `warning` | `#B26A00` | `#F2B43C` | Kutilmoqda, reyting yulduzi |
| `danger` | `#C62828` | `#FF6B6B` | Yopiq, xato, bekor qilingan |

Radius: kartalar 16px, sheet/promo 24px, input/tugma 12px, pill to'liq. Shrift: Plus Jakarta Sans (allaqachon ulangan).

### 7.5. Accessibility

- `onClick` bor 109 ta `<div>` ni `<button type="button">` ga (tanlov kartalari uchun —
  `<label>` + yashirin `radio`) almashtiring.
- Bosiladigan elementlar kamida 44×44 px (to'yxona sahifasidagi 40×40 tugmalar).
- Matn kamida 12px: `text-[9px]` (19), `text-[10px]` (67), `text-[11px]` (43) ni ko'rib chiqing.
- To'q sariq fonda oq matn faqat 16px/600 dan katta bo'lsin; kichik matn uchun `brand-strong`.
- Ikonali tugmalarda `aria-label`.

### 7.6. Formatlash va til

- Bitta `formatSom()` (`src/data/toyxona-menu.ts` da bor — `src/lib/format.ts` ga ko'chiring):
  `105 000 000 so'm`. "25,000,000", "125,000 UZS" kabi barcha variantlarni almashtiring.
- Sana/vaqt uchun `Intl.DateTimeFormat('uz-UZ')` asosidagi yagona funksiya.
- Inglizcha qolgan matnlar: "Selected Venue", "Distinguished Guests", "Premium Gold Catering Service",
  "We'll send a code…", "Next", "Search", "Space" va boshqalar — o'zbekchaga.
- Toast'lardagi emoji (`❤️`) o'rniga ikonka.

### 7.7. Katta fayllarni bo'lish

| Fayl | Qatorlar | Bo'lish |
| --- | --- | --- |
| `src/app/login/page.tsx` | 3 879 | `src/components/auth/*` qadamlar |
| `src/app/page.tsx` | 1 930 | `src/components/home/*` (header, qidiruv, kategoriyalar, karusel, ro'yxat) |
| `src/app/booking/[id]/page.tsx` | 1 351 | `src/components/booking/*` qadamlar |
| `src/components/toyxona-flow-modal.tsx` | 1 335 | Har bir qadam alohida komponent |
| `src/app/venue/[id]/page.tsx` | 1 261 | Galereya, ma'lumot, menyu, sharhlar, chat |

Bitta fayl 400 qatordan oshmasligiga harakat qiling.

---

## 8. Bosqich 7 — Testlar

1. Playwright qo'shing (`@playwright/test`), `npm run test:e2e` skripti bilan.
2. API so'rovlarini `page.route('**/api/v1/**', …)` orqali fixture'lar bilan almashtiring
   (fixture'lar faqat `tests/fixtures/` da — ilova kodida emas).
3. Kamida shu ssenariylar (390×844 viewport):
   - Bosh sahifa: muassasalar ro'yxati, bo'sh holat, xato holati.
   - Telegram `initData` bilan avtomatik kirish (`window.Telegram` ni `addInitScript` bilan soxtalashtirib).
   - Telefon orqali ro'yxatdan o'tish; backend 400/500 qaytarsa "Muvaffaqiyatli" chiqmasligi.
   - Stol bron qilish: muvaffaqiyat va **API xatosida soxta chipta chiqmasligi**.
   - To'yxona → menyu paketlari → paket tanlash → mehmonlar soni → bron oynasiga paket uzatilishi.
   - `/payment-success` ga to'lanmagan bron ID bilan kirilganda muvaffaqiyat ekrani chiqmasligi.
   - `/admin` route'i 404 qaytarishi.

---

## 9. Yakuniy tekshiruv va hisobot

Ish tugagach:

```bash
npx tsc --noEmit        # 0 xato
npm run lint            # 0 xato
npm run build           # muvaffaqiyatli
npm run test:e2e        # hammasi o'tadi
grep -rn "Math.random\|MOCK_\|Password123\|Partner123\|my_local_bookings\|/api/v1/venue/" src   # bo'sh
du -sh public           # ≤ 5 MB
```

So'ng `FIX_REPORT.md` faylini yozing:

1. **Bajarildi** — bosqichlar bo'yicha qisqa ro'yxat, commit havolalari bilan.
2. **Backend'dan kerak** — sxemada topilmagan, shuning uchun "Tez orada" qilib qo'yilgan funksiyalar
   (masalan: OTP, mijoz to'lovi, to'yxona menyu paketlari, promokodlar) — har biri uchun qaysi endpoint
   kerakligi va qanday so'rov/javob kutilayotgani.
3. **Qolgan kamchiliklar** — vaqt yetmagan yoki qaror talab qiladigan narsalar.
4. **Qo'lda tekshirish** — Telegram ichida (BotFather'dagi test bot orqali) tekshirish kerak bo'lgan ssenariylar ro'yxati.

---

## 10. Qilmaslik kerak bo'lgan narsalar

- Lint qoidalarini o'chirib yoki `eslint-disable` bilan xatolarni yashirmang.
- Backend'da yo'q endpointni o'ylab topmang va javobni mock qilmang.
- Ilova kodida test fixture'lari yoki "demo" ma'lumot qoldirmang.
- Karta raqami, CVV yoki SMS kodni frontend'da saqlamang va loglamang.
- Production backend'ga test ma'lumoti yozadigan kod qoldirmang.
- `.env` fayllarini commit qilmang.
