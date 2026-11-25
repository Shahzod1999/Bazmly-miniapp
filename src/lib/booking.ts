import type { VenueWorkingHoursRead } from "@/lib/api";
import { addMinutes, parseISODate, toISODate } from "@/lib/format";

/** Bugundan boshlab `days` kunlik sanalar ro'yxati (minimal oldindan bron qilish kunlarini hisobga olib) */
export function upcomingDates(days: number, minAdvanceDays = 0, from: Date = new Date()): string[] {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate() + Math.max(0, minAdvanceDays));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return toISODate(d);
  });
}

/** API'dagi hafta kuni: 0 = dushanba ... 6 = yakshanba */
export function apiWeekday(iso: string): number {
  return (parseISODate(iso).getDay() + 6) % 7;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Tanlangan kun uchun bron boshlanish vaqtlari (30 daqiqalik qadam).
 * Ish vaqti ma'lum bo'lsa, bron yopilishdan `durationMin` oldin tugashi kerak.
 * Bugungi kun uchun o'tib ketgan vaqtlar ko'rsatilmaydi.
 */
export function timeSlots(
  iso: string,
  hours: VenueWorkingHoursRead[],
  durationMin: number,
  now: Date = new Date()
): string[] {
  const day = hours.find((h) => h.weekday === apiWeekday(iso));
  if (day?.is_closed) return [];
  let open = day?.opens_at ? toMinutes(day.opens_at) : 10 * 60;
  let close = day?.closes_at ? toMinutes(day.closes_at) : 23 * 60;
  if (close <= open) close += 24 * 60; // yarim tundan keyin yopiladigan joylar

  if (iso === toISODate(now)) {
    const nowMin = now.getHours() * 60 + now.getMinutes() + 30;
    open = Math.max(open, Math.ceil(nowMin / 30) * 30);
  }

  const slots: string[] = [];
  for (let t = Math.ceil(open / 30) * 30; t + durationMin <= close; t += 30) {
    if (t >= 24 * 60) break;
    slots.push(addMinutes("00:00", t));
  }
  return slots;
}

export type StatusTone = "success" | "warning" | "danger" | "muted";

export const BOOKING_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  pending: { label: "Tasdiq kutilmoqda", tone: "warning" },
  confirmed: { label: "Tasdiqlangan", tone: "success" },
  checked_in: { label: "Kelgan", tone: "success" },
  completed: { label: "Yakunlangan", tone: "muted" },
  cancelled: { label: "Bekor qilingan", tone: "danger" },
  rejected: { label: "Rad etilgan", tone: "danger" },
  no_show: { label: "Kelinmagan", tone: "danger" },
};

export function bookingStatus(status: string): { label: string; tone: StatusTone } {
  return BOOKING_STATUS[status] ?? { label: status, tone: "muted" };
}

/** Bronni mijoz bekor qila oladimi */
export function canCancel(status: string): boolean {
  return status === "pending" || status === "confirmed";
}

/** QR kod faqat amaldagi bronlar uchun ko'rsatiladi */
export function showsQr(status: string): boolean {
  return status === "pending" || status === "confirmed" || status === "checked_in";
}
