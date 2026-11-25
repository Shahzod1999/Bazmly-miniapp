// Ilova bo'ylab yagona formatlash funksiyalari.

const NBSP = " ";

/** 105000000 → "105 000 000 so'm" */
export function formatSom(amount: number | string | null | undefined): string {
  const value = typeof amount === "string" ? Number(amount) : amount ?? 0;
  const safe = Number.isFinite(value) ? Math.round(value as number) : 0;
  const digits = Math.abs(safe)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${safe < 0 ? "-" : ""}${digits}${NBSP}so'm`;
}

const MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];

const WEEKDAYS_SHORT = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"];

/** "2026-12-05" → Date (mahalliy vaqt bo'yicha, UTC siljishisiz) */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Date → "2026-12-05" */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "2026-12-05" → "5-dekabr, 2026" */
export function formatDate(iso: string, withYear = true): string {
  const date = parseISODate(iso);
  const base = `${date.getDate()}-${MONTHS[date.getMonth()]}`;
  return withYear ? `${base}, ${date.getFullYear()}` : base;
}

/** Date → "Jum" */
export function weekdayShort(date: Date): string {
  return WEEKDAYS_SHORT[date.getDay()];
}

/** "18:00:00" → "18:00" */
export function formatTime(time: string | null | undefined): string {
  if (!time) return "";
  return time.slice(0, 5);
}

/** "18:00" → "18:00:00" (API kutadigan shakl) */
export function toApiTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

/** "18:00" + 120 daqiqa → "20:00" */
export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = (h * 60 + m + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Faqat raqamlar: "+998 (90) 123-45-67" → "998901234567" */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Mahalliy 9 xonali raqam → "+998901234567" */
export function toE164Uz(localDigits: string): string {
  const digits = digitsOnly(localDigits);
  const local = digits.startsWith("998") ? digits.slice(3) : digits;
  return `+998${local}`;
}

/** "901234567" → "90 123 45 67" (kiritish paytida) */
export function formatLocalPhone(localDigits: string): string {
  const d = digitsOnly(localDigits).slice(0, 9);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return parts.join(" ");
}

/** "+998901234567" → "+998 90 123 45 67" */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const d = digitsOnly(e164);
  if (d.length !== 12 || !d.startsWith("998")) return e164;
  return `+998 ${formatLocalPhone(d.slice(3))}`;
}

/** Masofa: 850 → "850 m", 1250 → "1,3 km" */
export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined) return "";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

/** "4.80" → "4,8" */
export function formatRating(value: string | number | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  if (!Number.isFinite(n) || n <= 0) return "";
  return n.toFixed(1).replace(".", ",");
}

/** ISO vaqt belgisi → "5-dekabr, 18:30" */
export function formatDateTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return "";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${date.getDate()}-${MONTHS[date.getMonth()]}, ${hh}:${mm}`;
}
