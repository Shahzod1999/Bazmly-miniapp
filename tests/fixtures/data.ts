// Test fixture'lari: faqat Playwright testlari uchun. Ilova kodi bu faylni import qilmaydi.
import type {
  AvailableTableRead,
  BookingListItem,
  BookingOwnerDetail,
  BookingRead,
  Page,
  TokenPair,
  UserRead,
  VenueDetailRead,
  VenueListItem,
  VenueRead,
  VenueServiceRead,
  VenueWorkingHoursRead,
} from "../../src/lib/api/types";

export const user: UserRead = {
  id: 1,
  first_name: "Aziz",
  last_name: "Karimov",
  phone: "+998901234567",
  email: null,
  avatar_url: null,
  language_id: 1,
  district_id: null,
  role: "customer",
  status: "active",
  theme: "system",
  created_at: "2026-01-10T10:00:00Z",
};

export const tokens: TokenPair = {
  access_token: "test-access",
  refresh_token: "test-refresh",
  expires_in_seconds: 3600,
  user_id: user.id,
  profile_completed: true,
};

export const restaurantItem: VenueListItem = {
  id: 10,
  name: "Afsona restorani",
  tagline: "Milliy taomlar",
  status: "active",
  rating_avg: "4.7",
  reviews_count: 32,
  base_price: "150000",
  currency: "UZS",
  discount_percent: null,
  requires_deposit: false,
  distance_m: 1200,
  is_open_now: true,
  cover_url: null,
};

export const hallItem: VenueListItem = { ...restaurantItem, id: 20, name: "Navro'z to'yxonasi", tagline: "500 kishigacha", base_price: "250000" };

export function page<T>(items: T[]): Page<T> {
  return { items, total: items.length, limit: 20, offset: 0 };
}

const allWeek: VenueWorkingHoursRead[] = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  opens_at: "08:00:00",
  closes_at: "23:30:00",
  is_closed: false,
}));

function venueRead(overrides: Partial<VenueRead>): VenueRead {
  return {
    id: 10,
    venue_group_id: 5,
    name: "Afsona restorani",
    description: "Oilaviy restoran",
    tagline: "Milliy taomlar",
    district_id: 1,
    venue_type: "restoran",
    street: "Amir Temur ko'chasi",
    house_number: "12",
    latitude: "41.311",
    longitude: "69.279",
    phone: "+998712000000",
    total_seats: 80,
    capacity_min: null,
    capacity_max: null,
    base_price: "150000",
    currency: "UZS",
    min_advance_booking_days: 0,
    late_grace_minutes: 15,
    requires_deposit: false,
    deposit_percent: null,
    discount_percent: null,
    rating_avg: "4.7",
    reviews_count: 32,
    status: "active",
    onboarding_step: 5,
    onboarded_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as VenueRead;
}

export const restaurantDetail: VenueDetailRead = {
  venue: venueRead({}),
  photos: [],
  amenities: [],
  venue_type: "restoran",
  working_hours: allWeek,
  is_open_now: true,
};

export const hallDetail: VenueDetailRead = {
  venue: venueRead({ id: 20, name: "Navro'z to'yxonasi", venue_type: "toyxona", capacity_min: 100, capacity_max: 500, base_price: "250000" }),
  photos: [],
  amenities: [],
  venue_type: "toyxona",
  working_hours: allWeek,
  is_open_now: true,
};

export const freeTables: AvailableTableRead[] = [
  { id: 101, number: 4, seats: 4, zone_id: null },
  { id: 102, number: 7, seats: 6, zone_id: null },
];

export const hallServices: VenueServiceRead[] = [
  { id: 301, venue_group_id: 5, venue_id: 20, service_catalog_id: 1, name: "Karnay-surnay", price: "1500000", currency: "UZS", price_unit: "per_event", is_active: true, sort_order: 1 },
];

function bookingRead(overrides: Partial<BookingRead>): BookingRead {
  return {
    id: 77,
    user_id: user.id,
    venue_id: 10,
    kind: "table",
    status: "pending",
    booking_date: "2026-12-01",
    start_time: "19:00:00",
    end_time: "21:00:00",
    guests_count: 2,
    contact_name: "Aziz Karimov",
    contact_phone: "+998901234567",
    note: null,
    subtotal: "0",
    deposit_amount: "0",
    total_amount: "0",
    currency: "UZS",
    receipt_number: "R-000077",
    ticket_code: "BZ-77",
    table_id: 101,
    guest_tier_id: null,
    auto_cancel_at: null,
    confirmed_at: null,
    checked_in_at: null,
    checked_out_at: null,
    seated_minutes: null,
    cancelled_at: null,
    completed_at: null,
    ...overrides,
  };
}

export const tableBooking: BookingOwnerDetail = {
  booking: bookingRead({}),
  qr_token: "qr-token-77",
  venue_name: "Afsona restorani",
  items: [],
  services: [],
  price_lines: [],
};

export const hallBooking: BookingOwnerDetail = {
  booking: bookingRead({ id: 88, venue_id: 20, kind: "hall", table_id: null, guests_count: 200, deposit_amount: "5000000", total_amount: "50000000" }),
  qr_token: "qr-token-88",
  venue_name: "Navro'z to'yxonasi",
  items: [],
  services: [],
  price_lines: [],
};

export const myBookings: BookingListItem[] = [
  {
    id: 77,
    venue_id: 10,
    venue_name: "Afsona restorani",
    kind: "table",
    status: "pending",
    booking_date: "2026-12-01",
    start_time: "19:00:00",
    end_time: "21:00:00",
    guests_count: 2,
    total_amount: "0",
    currency: "UZS",
    table_number: 4,
  },
];
