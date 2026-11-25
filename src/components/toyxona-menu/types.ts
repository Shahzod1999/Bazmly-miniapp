// To'yxona menyu paketlari uchun UI turlari.
// Backend'da paketlar endpointi paydo bo'lganda shu shaklga moslab ulanadi.

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


export const GUEST_STEP = 10;
export const MAX_GUESTS = 2000;
