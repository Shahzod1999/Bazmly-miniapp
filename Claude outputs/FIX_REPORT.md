# Bazmly Mini App — fix hisoboti

Branch: `fix/user-app` (main'ga push qilinmagan). Asos: `BAZMLY_FIX_PROMPT.md`.

Yakuniy tekshiruv (bulut nusxasida, toza `.next` bilan):

| Tekshiruv | Natija |
|---|---|
| `npx tsc --noEmit` | 0 xato |
| `npm run lint` | 0 xato, 0 ogohlantirish (`eslint-disable` ishlatilmagan) |
| `npm run build` | muvaffaqiyatli, 12 ta route |
| `npm run test:e2e` | 13/13 o'tdi |
| `public/` hajmi | 43 MB → 12 KB (faqat WebP logolar) |
| Eng katta fayl | `src/lib/api/types.ts` 615 qator (API sxemasi); komponentlar ≤ 226 qator |

---

## Bajarildi

### 1-bosqich — faqat foydalanuvchi ilovasi
- `src/app/admin/`, `partnerService.ts`, `orderService.ts`, `navbar.tsx` o'chirildi; `types.ts` dan 60 ta hamkor/xodim turi olib tashlandi, `any` → `unknown`.
- Login sahifasidan hamkor ro'yxatdan o'tishi (`partner_*`, `accountType`, 7–8-qadamlar), xodim kirishi (`loginStaff`), til tanlash qadami olib tashlandi.
- `/admin` endi 404 (`not-found.tsx`).

### 2-bosqich — autentifikatsiya
- `AuthContext` qayta yozildi: sessiya tiklash (token → `/users/me`, bo'lmasa Telegram `initData` → `/auth/telegram`), `checkPhone`, `login`, `register`, `shareTelegramContact`, `completeProfile`, `updateProfile`, `logout`, `deleteAccount`.
- Soxta OTP, standart parollar va `localStorage` dagi foydalanuvchi nusxalari olib tashlandi; eski kalitlar (`my_local_bookings` va b.) bir marta tozalanadi.
- Token yangilash: bitta umumiy `refreshPromise`, 401 da faqat bir marta qayta urinish, xatolar `BazmlyApiError` bilan tiplangan; tokenlar cookie'ga yozilmaydi.
- Telegram ichida: avtomatik kirish, xato bo'lsa `TelegramLoginCard`; kontakt ulashish banneri; `pending_profile` uchun "Tanishib olaylik" ekrani.
- Brauzerda: telefon → parol yoki ro'yxatdan o'tish; xato bo'lsa xabar ko'rsatiladi va keyingi qadamga o'tilmaydi.
- `/login?next=...` — kirish tugagach faqat ilova ichidagi manzilga qaytaradi (Telegram va profil to'ldirishda ham).

### 3-bosqich — mock va soxta muvaffaqiyatlar
- O'chirildi: `src/data/venues.ts` (`MOCK_VENUES`), `src/data/toyxona-menu.ts`, `toyxona-flow-modal.tsx` (1 335 qator), bron fallback'lari, feed'dagi to'qima bronlar, statik "The Royal Grand", "Shahzod" salomlashuvi, `Math.random`/`setTimeout` bilan soxta natijalar, bo'sh `catch {}`.
- Bosh sahifa: `searchVenues` (qidiruv 350 ms debounce, tur, mehmonlar soni, tuman), yuklanish/bo'sh/xato holatlari.
- `/venue/[id]`, `/toyxona/[id]`: `useParams` + `getVenueDetail`; noto'g'ri tur bo'lsa to'g'ri sahifaga yo'naltiradi; 404 → "topilmadi".
- `/booking/[id]`: bo'sh stollar `getFreeTables`, zonalar, oldindan buyurtma; xato bo'lsa forma ichida xabar, chipta yaratilmaydi.
- To'yxona bron oqimi yangi `/toyxona/[id]/book` sahifasida: band sanalar `getAvailability`, vaqt ish soatidan, xizmatlar `getServices`, `bookHall`.
- `/tickets` — `getMyBookings` (Faol/Tarix), chipta varag'i `getBookingDetail`, bekor qilish, yakunlangan bron uchun sharh.
- `/feed` — "Saqlanganlar" (`getFavorites`).
- `/toyxona/[id]/menu` — endpoint yo'qligi uchun "Tez orada" holati. Dizayn komponentlari (`src/components/toyxona-menu/`) saqlandi, turlari `types.ts` ga ko'chirildi, ranglar tokenlarga o'tkazildi.

### 4-bosqich — to'lov
- Karta formasi, CVV/SMS maydonlari yo'q. Summalar faqat backend'dan (`price_lines`, `total_amount`, `deposit_amount`).
- Depozit bo'lsa: "to'lov kutilmoqda" va "Onlayn to'lov tez orada" yozuvi.
- `/payment-success` hech narsani "to'landi" demaydi: `bookingId` bo'lsa `/payment/[id]` (API'dan haqiqiy holat), bo'lmasa `/tickets`.

### 5-bosqich — Telegram UX
- `telegram-web-app.js` root layout'da `beforeInteractive`; `ready()`, `expand()`, `disableVerticalSwipes()` (≥ 7.7), header/background ranglari.
- Mavzu: Telegram `colorScheme` + `themeChanged`; brauzerda `localStorage`.
- `--tg-viewport-height`, `--tg-safe-top`, `--tg-safe-bottom` CSS o'zgaruvchilari; telefon ramkasi faqat Telegram tashqarisida (≥ 480 px).
- BackButton stek bilan (faqat eng yuqoridagi ishlovchi ishlaydi), MainButton `useMainButton` orqali, sheet ochilganda MainButton vaqtincha yashiriladi.
- Haptik: tanlash, muvaffaqiyat/xato.

### 6-bosqich — sifat
- `error.tsx`, `global-error.tsx`, `not-found.tsx`, `loading.tsx` (Next 16 `unstable_retry` bilan).
- Dizayn tokenlari `globals.css` da (`brand`, `surface-*`, `ink`, `success`, `danger`, radiuslar); yorug'/qorong'i rejim.
- A11y: barcha bosiladigan elementlar `button`/`a`, ≥ 44 px, matn ≥ 12 px, `role="radio"`/`checkbox`/`tab`, `aria-label`lar; kichik oq matn kontrasti uchun `brand-strong`.
- Bitta `formatSom` (`src/lib/format.ts`), barcha matnlar o'zbekcha.
- `public/` dan ishlatilmagan 39 ta rasm o'chirildi, logolar WebP'ga o'tkazildi.
- QR kod `qrcode` kutubxonasi bilan (yangi bog'liqlik), `.gitignore` ga `.env*` qo'shildi, `.env.example` yaratildi.

### 7-bosqich — testlar
- `@playwright/test`, `playwright.config.ts`, `npm run test:e2e`.
- Fixture'lar `tests/fixtures/` da (ilova kodi ularni import qilmaydi); backend `page.route` bilan almashtiriladi, ro'yxatda yo'q so'rov 404 qaytaradi.
- Ssenariylar: bosh sahifa ro'yxat/bo'sh/xato+qayta urinish, `/admin` 404, Telegram `initData` bilan avtomatik kirish, ro'yxatdan o'tish xatosida muvaffaqiyat yo'qligi, stol broni muvaffaqiyat va API xatosi (soxta chipta yo'q), chiptalar ro'yxati, to'yxona → sana band qilish → bron, menyu "Tez orada", `payment-success` to'lanmagan bron va `bookingId`'siz holat.

---

## Backend'dan kerak

1. **OpenAPI tekshiruvi** — ish muhitidan backend'ga ulanib bo'lmadi, sxema sifatida `src/lib/api/types.ts` olindi. `/openapi.json` bilan endpoint va maydonlarni solishtirish kerak.
2. **Mijoz to'lovi** — depozitni to'lash uchun endpoint (masalan, Payme/Click checkout havolasi) va bron holatida to'lov holati (`payment_status`). Shu bo'lmaguncha onlayn to'lov "Tez orada".
3. **To'yxona menyu paketlari / guest tier** — `BookingRead.guest_tier_id` bor, lekin paketlarni o'qish endpointi yo'q. Kerak: paketlar ro'yxati (nom, 1 kishilik narx, minimal mehmon, rasmlar, taomlar) va `bookHall` da paket tanlash maydoni.
4. **SMS/OTP tasdiqlash** — telefon bilan ro'yxatdan o'tishda raqamni tasdiqlash endpointi yo'q (hozir faqat parol).
5. **Promokod / vaucherlar** — endpoint yo'q, funksiya olib tashlandi.
6. **Bron narxini oldindan hisoblash** — to'yxona/xizmatlar uchun "quote" endpointi bo'lsa, bron qilishdan oldin jami summani ko'rsatish mumkin (hozir "yakuniy summa bron yaratilgach hisoblanadi").
7. **`VenueListItem.venue_type`** — ro'yxatdan to'g'ridan-to'g'ri `/toyxona/[id]` ga o'tish uchun (hozir `/venue/[id]` orqali yo'naltiriladi).
8. **HttpOnly refresh cookie** — refresh token hozir `localStorage` da; xavfsizroq variant backend tomonidan cookie.

---

## Qolgan kamchiliklar

- To'yxona menyu ekrani dizayni tayyor, lekin endpoint yo'qligi uchun foydalanuvchiga ko'rinmaydi.
- To'yxona bronida davomiylik (3–6 soat) frontend'da tanlanadi; to'yxona o'z qoidasi bo'lsa backend'dan olish kerak.
- Restoran broni 2 soatlik slot bilan; muassasa sozlamasi bo'lsa backend'dan olish kerak.
- Oldindan buyurtma summasi menyu narxlaridan ko'rsatiladi (yakuniy summa — `price_lines` dan).
- E2E testlar mock backend bilan; haqiqiy backend bilan integratsiya testi yo'q.

---

## Qo'lda tekshirish

1. `npm install` (yangi: `qrcode`, `@types/qrcode`, `@playwright/test`), keyin `npx playwright install chromium`.
2. `npx tsc --noEmit && npm run lint && npm run build && npm run test:e2e`.
3. Telegram'da (BotFather → Mini App URL) ochib tekshiring:
   - avtomatik kirish, kontakt ulashish, profilni to'ldirish;
   - BackButton ichki sahifalarda, MainButton bron sahifalarida, sheet ochilganda MainButton yashirinishi;
   - yorug'/qorong'i mavzu almashishi, iPhone'da safe-area (pastki menyu kesilmasligi);
   - haptik tebranishlar.
4. Haqiqiy backend bilan: stol broni, to'yxona broni (band sanalar), bekor qilish, QR kod, sharh qoldirish, saqlanganlar, bildirishnomalar, chat.
5. Brauzerda: telefon orqali kirish/ro'yxatdan o'tish, noto'g'ri parol xabari, `/login?next=` qaytishi.
