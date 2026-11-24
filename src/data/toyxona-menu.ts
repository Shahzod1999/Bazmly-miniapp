// To'yxona menyu paketlari — vaqtinchalik mock ma'lumot.
// Backend'da paketlar uchun endpoint paydo bo'lganda shu shakldagi javob bilan almashtiriladi.

export interface DishSpot {
  /** Rasmdagi taom nomi */
  label: string;
  /** Rasm kengligiga nisbatan foiz (0–100) */
  x: number;
  /** Rasm balandligiga nisbatan foiz (0–100) */
  y: number;
}

export interface PackagePhoto {
  src: string;
  caption: string;
  /** Raqamli belgilar bo'lmagan rasmlar uchun qisqa izoh */
  note?: string;
  /** Faqat butun stol rasmlarida: rasmdagi taomlar */
  spots?: DishSpot[];
}

export interface MenuPackage {
  id: string;
  name: string;
  tagline: string;
  pricePerGuest: number;
  minGuests: number;
  popular?: boolean;
  photos: PackagePhoto[];
  items: string[];
}

/** true = bor, false = yo'q, string = qiymat */
export type CompareValue = boolean | string;

export interface CompareRow {
  label: string;
  values: CompareValue[];
}

const IMG = "/images/toyxona-menu";

const HOT_DISH: PackagePhoto = {
  src: `${IMG}/issiq-taom.webp`,
  caption: "Issiq taom — har bir mehmonga alohida",
  note: "Folgada pishgan go'sht, qovurilgan kartoshka, guruch va sabzavotli salat. Dasturxondan keyin tortiladi.",
};

export const TOYXONA_MENU_PACKAGES: MenuPackage[] = [
  {
    id: "standart",
    name: "Standart",
    tagline: "Klassik to'y dasturxoni",
    pricePerGuest: 250000,
    minGuests: 150,
    photos: [
      {
        src: `${IMG}/standart-stol.webp`,
        caption: "To'liq stol · 10 kishilik",
        spots: [
          { label: "Meva assortisi", x: 70, y: 51 },
          { label: "Go'sht assortisi", x: 52, y: 69 },
          { label: "Pishloq assortisi", x: 38, y: 63 },
          { label: "Ko'kat va bodring", x: 30, y: 36 },
          { label: "Yong'oq va konfet", x: 47, y: 36 },
          { label: "Oq pishloq, zaytun", x: 27, y: 51 },
          { label: "Non savatchasi", x: 15, y: 67 },
          { label: "Tovuqli salat", x: 54, y: 86 },
        ],
      },
      HOT_DISH,
    ],
    items: [
      "Meva assortisi: mango, ananas, pitaya, greypfrut",
      "Go'sht assortisi: qazi, til, kolbasa",
      "Pishloq assortisi va oq pishloq",
      "Ko'kat, bodring, pomidor",
      "Yong'oq, bodom va konfetlar",
      "4 xil salat",
      "Issiq taom: folgada go'sht, kartoshka, guruch",
      "Non savatchasi va choy",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Eng ko'p tanlanadigan to'y dasturxoni",
    pricePerGuest: 350000,
    minGuests: 200,
    popular: true,
    photos: [
      {
        src: `${IMG}/premium-stol.webp`,
        caption: "To'liq stol · 10 kishilik",
        spots: [
          { label: "Meva assortisi", x: 49, y: 65 },
          { label: "Go'sht assortisi", x: 60, y: 64 },
          { label: "Pishloq assortisi", x: 31, y: 57 },
          { label: "Ko'kat va bodring", x: 31, y: 33 },
          { label: "Yong'oq va bodom", x: 43, y: 43 },
          { label: "Tuzlamalar", x: 25, y: 46 },
          { label: "Kapreze", x: 67, y: 57 },
          { label: "Qatlamli salat", x: 66, y: 82 },
        ],
      },
      {
        src: `${IMG}/premium-bezak.webp`,
        caption: "Gul kompozitsiyasi bilan bezatilgan stol",
        note: "Stol markazidagi gul va billur bezak Premium va VIP paketlarga kiradi.",
      },
      {
        src: `${IMG}/rulet-assorti.webp`,
        caption: "Mol va tovuq go'shtli rulet",
        note: "Pishloq va bulg'or qalampiri bilan to'ldirilgan, qo'ziqorinli qaymoq sousi bilan tortiladi.",
      },
      {
        src: `${IMG}/rulet-mol.webp`,
        caption: "Mol go'shtli rulet — yaqindan",
        note: "Har bir stolga bitta laganda, 6 bo'lak.",
      },
      HOT_DISH,
    ],
    items: [
      "Standart paketdagi hammasi",
      "6 xil salat, jumladan kapreze va qatlamli salat",
      "Tuzlamalar: lavlagi, karam, bodring",
      "Seld kartoshka bilan, ikrali buterbrodlar",
      "Sushi va rollar",
      "Mol va tovuq go'shtli rulet",
      "Stol bezagi: gul kompozitsiyasi",
    ],
  },
  {
    id: "vip",
    name: "VIP",
    tagline: "Mavsumiy mevalar va baliq assortisi bilan",
    pricePerGuest: 480000,
    minGuests: 250,
    photos: [
      {
        src: `${IMG}/vip-stol.webp`,
        caption: "To'liq stol · 10 kishilik",
        spots: [
          { label: "Tarvuz va qovun", x: 55, y: 50 },
          { label: "Losos, oq baliq", x: 64, y: 65 },
          { label: "Qo'y qovurg'asi", x: 24, y: 57 },
          { label: "Go'sht assortisi", x: 51, y: 66 },
          { label: "Gilos va o'rik", x: 45, y: 52 },
          { label: "Ikrali buterbrod", x: 36, y: 36 },
          { label: "Mango, pitaya", x: 76, y: 42 },
          { label: "Sushi va rollar", x: 56, y: 11 },
        ],
      },
      {
        src: `${IMG}/vip-stol-2.webp`,
        caption: "Boshqa burchakdan",
        note: "Mavsumiy mevalar (tarvuz, qovun, gilos) yoz oylarida qo'shiladi.",
      },
      {
        src: `${IMG}/vip-sushi-stol.webp`,
        caption: "Sushi va baliq assortisi bilan stol",
        note: "Stol tartibi zalga qarab o'zgarishi mumkin.",
      },
      {
        src: `${IMG}/rulet-tovuq.webp`,
        caption: "Tovuqli rulet, zaytun bilan",
        note: "Qo'ziqorinli qaymoq sousi bilan tortiladi.",
      },
    ],
    items: [
      "Premium paketdagi hammasi",
      "Losos va oq baliq assortisi",
      "Qovurilgan qo'y qovurg'asi",
      "Mavsumiy mevalar: tarvuz, qovun, gilos, o'rik",
      "Ekzotik mevalar: mango, pitaya, ananas",
      "8 xil salat",
      "Ichimliklar cheklovsiz",
    ],
  },
];

/** Qiymatlar TOYXONA_MENU_PACKAGES tartibida: Standart, Premium, VIP */
export const PACKAGE_COMPARE_ROWS: CompareRow[] = [
  { label: "1 kishi narxi", values: ["250 000", "350 000", "480 000"] },
  { label: "Kamida mehmon", values: ["150", "200", "250"] },
  { label: "Salatlar", values: ["4 xil", "6 xil", "8 xil"] },
  { label: "Meva assortisi", values: [true, true, true] },
  { label: "Go'sht assortisi", values: [true, true, true] },
  { label: "Sushi va rollar", values: [false, true, true] },
  { label: "Go'shtli rulet", values: [false, true, true] },
  { label: "Baliq", values: [false, "seld", "losos"] },
  { label: "Mavsumiy meva", values: [false, false, true] },
  { label: "Qo'y qovurg'asi", values: [false, false, true] },
];

export const GUEST_STEP = 10;
export const MAX_GUESTS = 2000;

/** 105000000 → "105 000 000 so'm" (bo'linmas bo'sh joy bilan) */
export function formatSom(amount: number): string {
  const digits = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${digits} so'm`;
}
