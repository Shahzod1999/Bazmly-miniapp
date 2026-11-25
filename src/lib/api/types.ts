// TypeScript definitions matching Bazmly Backend OpenAPI 3.1.0 Specification

export type UserRole = "customer" | "venue_owner" | "venue_staff" | "moderator" | "admin" | "partner" | "staff";
export type UserStatus = "active" | "inactive" | "pending_profile" | "blocked" | "deleted";
export type UserTheme = "light" | "dark" | "system";

export interface UserRead {
  id: number;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  language_id: number;
  district_id: number | null;
  role: UserRole;
  status: UserStatus;
  theme: UserTheme;
  created_at: string;
}

export interface UserProfileUpdate {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  language_id?: number | null;
  district_id?: number | null;
  theme?: UserTheme | null;
}

export interface UserListItem {
  id: number;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in_seconds: number;
  user_id: number;
  must_change_password?: boolean;
  profile_completed?: boolean;
}

export interface PhoneCheck {
  phone: string;
}

export interface PhoneCheckResult {
  phone: string;
  registered: boolean;
  password_required: boolean;
}

export interface PhoneRegister {
  phone: string;
  first_name: string;
  last_name: string;
  password?: string | null;
  language_id?: number | null;
  district_id?: number | null;
}

export interface PhoneLogin {
  phone: string;
  password?: string | null;
}

export interface TelegramLogin {
  init_data: string;
}

export interface TelegramContactShare {
  contact_data: string;
}

export interface PasswordChange {
  current_password?: string | null;
  new_password: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

// Geo & Localization
export interface LanguageRead {
  id: number;
  code: string;
  name_native: string;
  name_english: string;
  flag_url: string | null;
  sort_order: number;
}

export interface RegionRead {
  id: number;
  name: string;
  code: string;
}

export interface DistrictRead {
  id: number;
  region_id: number;
  name: string;
  latitude: string;
  longitude: string;
}

export interface NearestDistrictRead {
  district_id: number;
  district_name: string;
  region_id: number;
  region_name: string;
  latitude: string;
  longitude: string;
  distance_m: number;
}

export interface UserAddressRead {
  id: number;
  district_id: number;
  label: string;
  latitude: string;
  longitude: string;
  last_used_at: string;
}

export interface UserAddressCreate {
  district_id: number;
  label: string;
  latitude: number | string;
  longitude: number | string;
}

export type DevicePlatform = "android" | "ios" | "web";

export interface DeviceRead {
  id: number;
  device_uuid: string;
  platform: DevicePlatform;
  app_version: string;
  last_seen_at: string;
}

export interface DeviceCreate {
  device_uuid: string;
  platform: DevicePlatform;
  app_version: string;
  push_token?: string | null;
}

export type FriendshipStatus = "pending" | "accepted" | "declined" | "blocked";

export interface FriendshipRead {
  id: number;
  requester_id: number;
  addressee_id: number;
  status: FriendshipStatus;
}

// Catalog & Services
export interface AmenityRead {
  id: number;
  slug: string;
  name: string;
  icon_url: string | null;
  sort_order: number;
}

export type VenueTypeSlug = "restoran" | "toyxona" | "katering" | "bezaklar";

export interface ServiceCatalogRead {
  id: number;
  slug: string;
  name: string;
  icon_url: string | null;
  applies_to_venue_type: VenueTypeSlug | null;
  sort_order: number;
}

export type ServicePriceUnit = "per_event" | "per_guest" | "per_hour" | "fixed";

export interface VenueServiceItemRead {
  id: number;
  name: string;
  price: string;
  sort_order: number;
}

export interface VenueServiceRead {
  id: number;
  venue_group_id: number;
  venue_id: number | null;
  service_catalog_id: number;
  name: string;
  price: string;
  currency: string;
  price_unit: ServicePriceUnit;
  is_active: boolean;
  sort_order: number;
  items?: VenueServiceItemRead[];
}

// Venues & Venue Groups
export type VenueStatus = "active" | "draft" | "closed" | "suspended";

export interface VenueWorkingHoursRead {
  weekday: number; // 0 = Monday, 6 = Sunday
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
}

export interface VenuePhotoRead {
  id: number;
  url: string;
  sort_order: number;
  is_cover: boolean;
}

export interface VenueZoneRead {
  id: number;
  slug: string;
  name: string;
  sort_order: number;
}

export interface AvailableTableRead {
  id: number;
  number: number;
  seats: number;
  zone_id: number | null;
}

export interface BlockedDatesRead {
  venue_id: number;
  dates: string[]; // ['2026-06-18', ...]
}

export interface VenueRead {
  id: number;
  venue_group_id: number;
  name: string;
  description: string | null;
  tagline: string | null;
  district_id: number;
  venue_type: VenueTypeSlug;
  street: string;
  house_number: string;
  latitude: string;
  longitude: string;
  phone: string;
  total_seats: number | null;
  capacity_min: number | null;
  capacity_max: number | null;
  base_price: string | null;
  currency: string;
  min_advance_booking_days: number;
  late_grace_minutes: number;
  requires_deposit: boolean;
  deposit_percent: string | null;
  discount_percent: string | null;
  rating_avg: string;
  reviews_count: number;
  status: VenueStatus;
  onboarding_step: number;
  onboarded_at: string | null;
}

export interface VenueDetailRead {
  venue: VenueRead;
  photos: VenuePhotoRead[];
  amenities: AmenityRead[];
  venue_type: VenueTypeSlug;
  working_hours: VenueWorkingHoursRead[];
  is_open_now: boolean;
}

export interface VenueListItem {
  id: number;
  name: string;
  tagline: string | null;
  status: VenueStatus;
  rating_avg: string;
  reviews_count: number;
  base_price: string | null;
  currency: string;
  discount_percent: string | null;
  requires_deposit: boolean;
  distance_m: number | null;
  is_open_now: boolean;
  cover_url?: string | null;
}

export interface VenueSearchParams {
  query?: string | null;
  venue_type?: VenueTypeSlug | null;
  district_id?: number | null;
  guest_count?: number | null;
  min_rating?: number | string | null;
  requires_deposit?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  radius_m?: number | null;
  only_open_now?: boolean;
  sort?: string;
  limit?: number;
  offset?: number;
}

// Menu Items & Categories
export type MenuItemStatus = "active" | "hidden" | "out_of_stock";

export interface MenuItemVariantRead {
  id: number;
  name: string;
  price: string;
  effective_price: string;
  sort_order: number;
  is_active: boolean;
}

export interface MenuItemListItem {
  id: number;
  name: string;
  photo_url: string | null;
  effective_price: string | null;
  currency: string;
  discount_percent: string | null;
  has_variants: boolean;
  is_available: boolean;
  status: MenuItemStatus;
}

export interface MenuItemRead {
  id: number;
  menu_category_id: number;
  name: string;
  description: string | null;
  base_price: string | null;
  effective_price: string | null;
  currency: string;
  photo_url: string | null;
  has_variants: boolean;
  discount_percent: string | null;
  sort_order: number;
  is_available: boolean;
  status: MenuItemStatus;
  variants: MenuItemVariantRead[];
}

// Bookings
export type BookingKind = "table" | "hall";
export type BookingStatus = "pending" | "confirmed" | "checked_in" | "completed" | "cancelled" | "rejected" | "no_show";

export interface BookingItemCreate {
  menu_item_id: number;
  quantity: number;
}

export interface BookingItemRead {
  id: number;
  menu_item_id: number;
  quantity: number;
  unit_price: string;
  total_price: string;
  name_snapshot: string;
}

export interface BookingServiceCreate {
  venue_service_id: number;
  quantity?: number;
}

export interface BookingServiceRead {
  id: number;
  venue_service_id: number;
  quantity: number;
  unit_price: string;
  total_price: string;
  name_snapshot: string;
}

export type PriceLineType = "deposit" | "table_fee" | "menu" | "service" | "discount" | "tax";

export interface PriceLineRead {
  id: number;
  sort_order: number;
  line_type: PriceLineType;
  label_snapshot: string;
  unit_price: string;
  quantity: number;
  amount: string;
}

export interface BookingRead {
  id: number;
  user_id: number;
  venue_id: number;
  kind: BookingKind;
  status: BookingStatus;
  booking_date: string;
  start_time: string;
  end_time: string;
  guests_count: number;
  contact_name: string;
  contact_phone: string;
  note: string | null;
  subtotal: string;
  deposit_amount: string;
  total_amount: string;
  currency: string;
  receipt_number: string;
  ticket_code: string;
  table_id: number | null;
  guest_tier_id: number | null;
  auto_cancel_at: string | null;
  confirmed_at: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  seated_minutes: number | null;
  cancelled_at: string | null;
  completed_at: string | null;
}

export interface BookingListItem {
  id: number;
  venue_id: number;
  venue_name: string;
  kind: BookingKind;
  status: BookingStatus;
  booking_date: string;
  start_time: string;
  end_time: string;
  guests_count: number;
  total_amount: string;
  currency: string;
  table_number: number | null;
}

export interface BookingOwnerDetail {
  booking: BookingRead;
  qr_token: string;
  venue_name: string;
  items: BookingItemRead[];
  services: BookingServiceRead[];
  price_lines: PriceLineRead[];
}

export interface TableReservationCreate {
  venue_id: number;
  booking_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS or HH:MM
  end_time: string;
  guests_count: number;
  contact_name: string;
  contact_phone: string;
  table_id: number;
  note?: string | null;
  services?: BookingServiceCreate[];
  items?: BookingItemCreate[];
}

export interface HallEventCreate {
  venue_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  guests_count: number;
  contact_name: string;
  contact_phone: string;
  note?: string | null;
  services?: BookingServiceCreate[];
  venue_service_ids?: number[];
}

export interface BookingCancel {
  reason?: string | null;
}


// Staff & Roles

// Analytics & Reports
// Reviews
export type ReviewStatus = "pending" | "published" | "rejected";

export interface ReviewPhotoRead {
  id: number;
  url: string;
  sort_order: number;
}

export interface ReviewRead {
  id: number;
  user_id: number;
  venue_id: number;
  booking_id: number | null;
  rating: number;
  comment: string | null;
  is_verified: boolean;
  status: ReviewStatus;
  published_at: string | null;
}

export interface ReviewListItem {
  id: number;
  rating: number;
  comment: string | null;
  is_verified: boolean;
  published_at: string | null;
  author: UserListItem;
  photos?: ReviewPhotoRead[];
}

export interface ReviewAggregateRead {
  venue_id: number;
  average: string;
  count: number;
}

export interface ReviewCreate {
  booking_id: number;
  rating: number;
  comment?: string | null;
  photo_urls?: string[];
}

// Favorites & Engagement
export interface FavoriteRead {
  id: number;
  venue: VenueListItem;
}

export interface FavoriteCreate {
  venue_id: number;
}

export interface FavoriteToggled {
  venue_id: number;
  is_favorite: boolean;
}

export type MessageSenderType = "user" | "venue" | "system";

export interface MessageRead {
  id: number;
  conversation_id: number;
  sender_type: MessageSenderType;
  sender_user_id: number;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface MessageCreate {
  body: string;
}

export interface ConversationRead {
  id: number;
  venue_id: number;
  user_id: number;
  booking_id: number | null;
  last_message_at: string | null;
}

export interface ConversationListItem {
  id: number;
  venue_id: number;
  user_id: number;
  booking_id: number | null;
  last_message_at: string | null;
  last_message: MessageRead | null;
  unread_count?: number;
}

export interface ConversationCreate {
  venue_id: number;
  booking_id?: number | null;
}

export interface NotificationRead {
  id: number;
  type: string;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  sent_at: string;
}

export interface UnreadCountRead {
  unread: number;
}

// Pagination & Standard Error
export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
  request_id?: string;
}
