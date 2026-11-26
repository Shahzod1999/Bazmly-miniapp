"use client";

import { useTelegramBackButton } from "@/lib/telegram";
import React, { use, useState, useEffect } from "react";
import Image from "next/image";
import { comingSoon } from "@/components/app-toast";
import { formatRating, formatSom } from "@/lib/format";
import { errorMessage } from "@/lib/use-api";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChevronLeft,
  ImageOff,
  Share2,
  Bookmark,
  Percent,
  ChevronRight,
  MapPin,
  Search,
  Star,
  CheckCircle,
  Wallet,
  Plus,
  Minus,
  X,
  Loader2,
  Phone,
  Users,
  MessageSquare,
  Send,
} from "lucide-react";
import {
  venueService,
  engagementService,
  VenueDetailRead,
  MenuItemListItem,
  ReviewListItem,
  ReviewAggregateRead,
  MessageRead,
} from "@/lib/api";

interface Props {
  params: Promise<{ id: string }>;
}

export default function VenueDetailPage({ params }: Props) {
  const router = useRouter();
  const { id } = use(params);
  const { theme } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const isDark = theme === "dark";
  useTelegramBackButton(() => router.back());

  // Real backend states
  const [venueDetail, setVenueDetail] = useState<VenueDetailRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItemListItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("Barchasi");
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});

  // Interactive party/time picker state
  const [showPartySheet, setShowPartySheet] = useState(false);
  const [partySize, setPartySize] = useState(5);

  // Reviews state
  const [showReviews, setShowReviews] = useState(false);
  const [newReviewText, setNewReviewText] = useState("");
  const [reviewsList, setReviewsList] = useState<ReviewListItem[]>([]);
  const [aggregate, setAggregate] = useState<ReviewAggregateRead | null>(null);

  // Real-time Chat States
  const [showChatModal, setShowChatModal] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<MessageRead[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const [newMessageText, setNewMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  // Load Real Venue Details, Zones, Menu, and Reviews from Backend
  // Ma'lumot yuklash: setState faqat javob kelgandan keyin chaqiriladi
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let alive = true;
    Promise.all([
      venueService.getVenueDetail(id),
      venueService.getMenu(id).catch(() => [] as MenuItemListItem[]),
      venueService.getReviews(id).catch(() => ({ items: [] as ReviewListItem[], total: 0 })),
      venueService.getReviewAggregate(id).catch(() => null),
    ])
      .then(([detail, menu, revs, agg]) => {
        if (!alive) return;
        setVenueDetail(detail);
        setMenuItems(menu || []);
        setReviewsList(revs.items || []);
        setAggregate(agg);
        const cover = detail.photos.find((ph) => ph.is_cover) ?? detail.photos[0];
        setActiveImage(cover ? cover.url : null);
      })
      .catch((err) => {
        if (alive) setLoadError(errorMessage(err, "Muassasa ma'lumotlarini yuklab bo'lmadi"));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, reloadKey]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let alive = true;
    engagementService
      .getFavorites()
      .then((favs) => {
        if (alive) setIsSaved((favs || []).some((f) => f.venue?.id === Number(id)));
      })
      .catch(() => {
        // Saqlanganlar yuklanmasa, belgi bo'sh turadi
      });
    return () => {
      alive = false;
    };
  }, [id, isAuthenticated]);

  const retryLoad = () => {
    setLoading(true);
    setLoadError(null);
    setReloadKey((k) => k + 1);
  };

  // To'yxonalar o'z sahifasida ochiladi
  const isHall = venueDetail?.venue_type === "toyxona";
  useEffect(() => {
    if (isHall) router.replace(`/toyxona/${id}`);
  }, [isHall, router, id]);

  const handleOpenChat = async () => {
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(`/venue/${id}`)}`);
      return;
    }
    setShowChatModal(true);
    setLoadingChat(true);
    setChatError(null);
    try {
      const conv = await engagementService.createConversation(Number(id));
      setConversationId(conv.id);
      const msgs = await engagementService.getMessages(conv.id);
      setChatMessages(msgs || []);
    } catch (err) {
      setChatError(errorMessage(err, "Suhbatni ochib bo'lmadi"));
    } finally {
      setLoadingChat(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMessageText.trim();
    if (!text || !conversationId || sendingMessage) return;
    setSendingMessage(true);
    try {
      const sent = await engagementService.sendMessage(conversationId, text);
      setChatMessages((prev) => [...prev, sent]);
      setNewMessageText("");
    } catch (err) {
      setToastMessage(errorMessage(err, "Xabar yuborilmadi"));
    } finally {
      setSendingMessage(false);
    }
  };

  // Cart total calculations
  const handleAddItem = (itemId: number) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));
  };

  const allFoodsList = menuItems
    .filter((m) => m.is_available)
    .map((m) => ({
      id: m.id,
      name: m.name,
      category: "Barchasi",
      img: m.photo_url,
      price: formatSom(m.effective_price),
      priceVal: Number(m.effective_price || 0),
    }));
  const categories = ["Barchasi"];

  const filteredFoods = allFoodsList.filter((f) => {
    const matchCategory = activeCategory === "Barchasi" || f.category === activeCategory;
    const matchSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const cartTotal = Object.entries(selectedItems).reduce((sum, [itemId, qty]) => {
    const item = allFoodsList.find((f) => f.id === Number(itemId));
    return sum + (item ? item.priceVal * qty : 0);
  }, 0);

  const formatPrice = (val: number) => formatSom(val);

  // Toggle Save / Bookmark
  const handleSaveToggle = async () => {
    if (!isAuthenticated) {
      setToastMessage("Sevimliga qo'shish uchun tizimga kiring");
      return;
    }
    try {
      const res = await engagementService.toggleFavorite(Number(id));
      setIsSaved(res.is_favorite);
      setToastMessage(res.is_favorite ? "Restoran saqlandi ❤️" : "Saqlanganlardan olib tashlandi");
    } catch (err) {
      setToastMessage(errorMessage(err, "Saqlab bo'lmadi"));
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToastMessage("Havola buferga nusxalandi!");
    } catch {
      setToastMessage("Havolani nusxalab bo'lmadi");
    }
  };

  // Sharh faqat yakunlangan bron orqali qoldiriladi (backend talabi)
  const handleSendReview = (e: React.FormEvent) => {
    e.preventDefault();
    comingSoon("Sharh yozish");
  };

  // Toast auto-dismiss helper
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const venueName = venueDetail?.venue.name || "";
  const venueLocation = venueDetail
    ? `${venueDetail.venue.street}${venueDetail.venue.house_number ? `, ${venueDetail.venue.house_number}` : ""}`
    : "";
  const venueRating = formatRating(aggregate?.average ?? venueDetail?.venue.rating_avg) || "—";
  const reviewsCount =
    aggregate?.count || venueDetail?.venue.reviews_count || reviewsList.length || 0;
  const isDeposit = venueDetail?.venue.requires_deposit ?? false;
  const gallery = (venueDetail?.photos ?? []).map((p) => p.url);

  if (loading) {
    return (
      <div
        className={`flex flex-col flex-1 min-h-screen relative animate-pulse select-none ${
          isDark ? "bg-[var(--background)] text-white" : "bg-white text-zinc-900"
        }`}
      >
        {/* Cinematic Top Image Skeleton */}
        <div className="relative w-full h-[280px] bg-zinc-200 dark:bg-zinc-800 border-b border-zinc-200 dark:border-white/5 overflow-hidden">
          {/* Header Action Buttons Skeleton */}
          <div className="absolute top-5 left-6 right-6 flex items-center justify-between z-20">
            <div className="w-10 h-10 rounded-full bg-black/25 dark:bg-white/10 backdrop-blur-md" />
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-black/25 dark:bg-white/10 backdrop-blur-md" />
              <div className="w-10 h-10 rounded-full bg-black/25 dark:bg-white/10 backdrop-blur-md" />
            </div>
          </div>

          {/* Bottom Small Gallery Thumbnails Skeleton */}
          <div className="absolute bottom-4 left-6 right-6 z-20 flex justify-center">
            <div className="bg-white/80 dark:bg-zinc-900/80 rounded-[18px] p-1.5 flex gap-1.5 items-center shadow-lg border border-white/40 dark:border-white/10 backdrop-blur-md max-w-[340px] overflow-hidden">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="w-11 h-11 rounded-[12px] bg-zinc-300 dark:bg-white/10 shrink-0"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Main Details Body Skeleton */}
        <main className="flex-1 px-6 py-6 pb-28 flex flex-col gap-6 max-w-md mx-auto w-full text-left">
          {/* Info Block Skeleton */}
          <div className="space-y-4">
            {/* Badges & Rating Row */}
            <div className="flex items-center justify-between gap-4">
              <div className="w-36 h-6 rounded-lg bg-emerald-500/15" />
              <div className="w-24 h-6 rounded-lg bg-yellow-500/15" />
            </div>

            {/* Title & Status */}
            <div className="flex items-center justify-between gap-2">
              <div className="h-8 w-56 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-5 w-14 rounded-full bg-emerald-500/15" />
            </div>

            {/* Tagline */}
            <div className="h-4 w-40 rounded-md bg-zinc-200/80 dark:bg-zinc-800/80" />

            {/* Capacity & Deposit */}
            <div className="flex items-center justify-between pt-1">
              <div className="h-4 w-32 rounded-md bg-zinc-200/70 dark:bg-zinc-800/70" />
              <div className="h-5 w-20 rounded-md bg-zinc-200/70 dark:bg-zinc-800/70" />
            </div>

            {/* Address */}
            <div className="h-4 w-60 rounded-md bg-zinc-200/60 dark:bg-zinc-800/60" />

            {/* Contact Action Buttons Skeleton */}
            <div className="flex gap-2.5 pt-1">
              <div className="flex-1 h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
              <div className="flex-1 h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>



          {/* Menu Food Section Skeleton */}
          <div className="space-y-3 pt-2">
            <div className="h-5 w-32 rounded-md bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex gap-2 overflow-hidden">
              <div className="h-9 w-20 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
              <div className="h-9 w-24 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
              <div className="h-9 w-20 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
            </div>
            <div className="space-y-2.5 pt-1">
              <div className="h-20 w-full rounded-2xl border border-zinc-200 dark:border-white/5 bg-zinc-100 dark:bg-zinc-800/40" />
              <div className="h-20 w-full rounded-2xl border border-zinc-200 dark:border-white/5 bg-zinc-100 dark:bg-zinc-800/40" />
            </div>
          </div>
        </main>

        {/* Sticky Bottom CTA Skeleton */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 z-40 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/90 to-transparent">
          <div className="w-full h-14 bg-primary/40 rounded-[24px]" />
        </div>
      </div>
    );
  }

  if (loadError || !venueDetail || isHall) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-4 px-6 py-24 text-center">
        <p className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-800"}`}>
          {isHall ? "Yuklanmoqda..." : loadError || "Muassasa topilmadi"}
        </p>
        {!isHall && (
          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()} className="px-5 py-3 rounded-2xl border border-zinc-200 dark:border-white/10 text-sm font-bold">
              Orqaga
            </button>
            <button type="button" onClick={retryLoad} className="px-5 py-3 rounded-2xl bg-[#E85102] text-white text-sm font-bold">
              Qayta urinish
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col flex-1 bg-[var(--background)] min-h-screen relative ${
        isDark ? "text-white" : "text-zinc-900"
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xl animate-fade-in flex items-center gap-2 max-w-xs text-center border border-white/20">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cinematic Top Image Section */}
      <div className="relative w-full h-[280px] bg-zinc-900 border-b border-white/5 overflow-hidden">
        {activeImage ? (
          <Image src={activeImage} alt={venueName} fill unoptimized priority sizes="448px" className="object-cover transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/40" aria-hidden="true">
            <ImageOff className="h-10 w-10" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70 pointer-events-none" />

        {/* Floating Header Actions */}
        <div className="absolute top-5 left-6 right-6 flex items-center justify-between z-20">
          <button
            onClick={() => router.back()}
            className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/90 hover:text-white transition-all active:scale-90 cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleShare}
              className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/90 hover:text-white transition-all active:scale-90 cursor-pointer"
            >
              <Share2 className="h-5 w-5" />
            </button>
            <button
              onClick={handleSaveToggle}
              className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 transition-all active:scale-90 cursor-pointer"
            >
              <Bookmark
                className={`h-5 w-5 ${
                  isSaved ? "fill-primary text-primary" : "text-white/90 hover:text-white"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Bottom Small Image Gallery previews */}
        <div className="absolute bottom-4 left-6 right-6 z-20 flex justify-center">
          <div className="bg-white/95 dark:bg-zinc-900/90 rounded-[18px] p-[5px] flex gap-[6px] items-center shadow-[0_8px_30px_rgba(0,0,0,0.16)] border border-white/40 dark:border-white/10 max-w-[340px] overflow-x-auto scrollbar-none backdrop-blur-md">
            {gallery.map((thumb, idx) => {
              const isSel = activeImage === thumb;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(thumb)}
                  className={`w-11 h-11 rounded-[12px] overflow-hidden shrink-0 transition-all duration-300 cursor-pointer ${
                    isSel ? "border-2 border-[#E85102] scale-105" : "border-0 opacity-80 hover:opacity-100"
                  }`}
                >
                  <Image src={thumb} alt={`${idx + 1}-rasm`} width={44} height={44} unoptimized className="w-full h-full object-cover" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Details Body */}
      <main className="flex-1 px-6 py-6 pb-28 flex flex-col gap-6 max-w-md mx-auto w-full text-left">
        {/* Info detail block */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            {Number(venueDetail?.venue.discount_percent || 0) > 0 ? (
              <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-[#10B981] font-bold rounded-lg px-2.5 py-1 text-xs">
                <Percent className="h-3.5 w-3.5" />
                <span>{Math.round(Number(venueDetail?.venue.discount_percent))}% maxsus chegirma</span>
              </div>
            ) : (
              <span />
            )}

            {/* Rating row link */}
            <button
              type="button"
              onClick={() => setShowReviews(true)}
              className={`flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer active:scale-95 ${
                isDark ? "text-white/70 hover:text-white" : "text-zinc-650 hover:text-zinc-950"
              }`}
            >
              <Star className="h-3.5 w-3.5 fill-[#FFB800] text-[#FFB800]" />
              <span>
                {venueRating} ({reviewsCount} ta sharh)
              </span>
              <ChevronRight className="h-4 w-4 text-[#FFB800]" />
            </button>
          </div>

          {/* Restaurant Title & Status */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className={`text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-black"}`}>
                {venueName}
              </h2>
              {venueDetail?.venue.tagline && (
                <p className="text-xs text-zinc-400 mt-0.5">{venueDetail.venue.tagline}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#10B981] font-bold pt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span>{venueDetail?.is_open_now ? "Ochiq" : "Yopiq"}</span>
            </div>
          </div>

          {/* Metadata Row: Capacity & Deposit */}
          <div className="flex justify-between items-center text-xs">
            <div
              className={`flex items-center gap-1.5 font-semibold ${
                isDark ? "text-white/70" : "text-zinc-600"
              }`}
            >
              <Users className="h-4 w-4 text-[#E85102]" />
              <span>Sig&apos;imi: {venueDetail?.venue.total_seats ? `${venueDetail.venue.total_seats} ta o'rin` : "—"}</span>
            </div>

            {/* Deposit Badges */}
            {isDeposit ? (
              <div className="flex items-center gap-1 bg-green-500/10 border border-green-500/20 text-[#10B981] font-bold rounded-lg px-2.5 py-1 text-[10px] uppercase tracking-wider">
                <Wallet className="h-3.5 w-3.5 shrink-0" />
                <span>Depozitlik</span>
              </div>
            ) : (
              <span className="text-[11px] font-bold text-zinc-400">Depozitsiz</span>
            )}
          </div>

          {/* Address */}
          <div
            className={`flex items-center gap-2 text-xs font-semibold leading-relaxed ${
              isDark ? "text-white/50" : "text-zinc-600"
            }`}
          >
            <MapPin className={`h-4 w-4 shrink-0 ${isDark ? "text-white/30" : "text-zinc-400"}`} />
            <span>{venueLocation}</span>
          </div>

          {/* Quick Contact & Chat Buttons */}
          <div className="flex gap-2.5 pt-1">
            {venueDetail?.venue.phone && (
              <a
                href={`tel:${venueDetail.venue.phone}`}
                className={`flex-1 py-3 px-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98 ${
                  isDark
                    ? "bg-[#393939] border-white/10 text-white hover:bg-white/10"
                    : "bg-zinc-100 border-zinc-200 text-zinc-800 hover:bg-zinc-200"
                }`}
              >
                <Phone className="h-4 w-4 text-emerald-500" />
                <span>Qo&apos;ng&apos;iroq</span>
              </a>
            )}
            <button
              type="button"
              onClick={handleOpenChat}
              className="flex-1 py-3 px-4 rounded-2xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer shadow-sm"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Xabar yozish</span>
            </button>
          </div>
        </div>



        {/* Menyu Section */}
        <div className="space-y-4 pt-2 text-left">
          <div className={`border-b ${isDark ? "border-white/5" : "border-zinc-100"}`}>
            <div className="inline-block border-b-2 border-primary pb-2 pr-4 text-sm font-bold text-primary tracking-wide">
              Menyu
            </div>
          </div>

          <div className="flex justify-between items-center text-xs font-bold">
            <span className={isDark ? "text-white/90" : "text-zinc-850"}>
              {`Taomlar (${filteredFoods.length} mahsulot)`}
            </span>
          </div>

          {/* Search bar inside section */}
          <div
            className={`flex items-center border rounded-2xl overflow-hidden transition-all duration-300 ${
              isDark
                ? "bg-[#393939] border-white/5 focus-within:border-[#E85102]/50"
                : "bg-zinc-100 border-transparent focus-within:bg-zinc-200/50"
            }`}
          >
            <span className={isDark ? "text-white/40 pl-4" : "text-zinc-400 pl-4"}>
              <Search className="h-5 w-5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Taom qidirish..."
              className={`w-full pl-3 pr-4 py-3.5 bg-transparent text-sm font-semibold outline-none ${
                isDark ? "text-white placeholder:text-white/30" : "text-zinc-950 placeholder:text-zinc-400"
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="pr-4 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Categories Horizontal Pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                    isActive
                      ? "bg-[#E85102] border-[#E85102] text-white shadow-sm"
                      : isDark
                      ? "bg-[#393939] border-white/5 text-white/60 hover:text-white"
                      : "bg-white border-zinc-200 text-zinc-700 hover:text-zinc-950"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {filteredFoods.length === 0 && (
            <p className={`py-6 text-center text-xs font-semibold ${isDark ? "text-white/50" : "text-zinc-500"}`}>
              {menuItems.length === 0 ? "Menyu hali qo'shilmagan" : "Hech narsa topilmadi"}
            </p>
          )}

          {/* Food Grid Display */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            {filteredFoods.map((food, idx) => {
              const qty = selectedItems[food.id] || 0;
              return (
                <div
                  key={idx}
                  className={`border rounded-3xl p-3 flex flex-col gap-3 relative text-left animate-fade-in ${
                    isDark
                      ? "bg-[#393939] border-white/5 shadow-lg"
                      : "bg-white border-zinc-200 shadow-sm"
                  }`}
                >
                  <div
                    className={`w-full aspect-[1.15/1] rounded-2xl overflow-hidden relative border ${
                      isDark ? "border-white/5 bg-zinc-800" : "border-zinc-100 bg-zinc-50"
                    }`}
                  >
                    {food.img ? (
                      <Image src={food.img} alt={food.name} fill unoptimized sizes="200px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400" aria-hidden="true">
                        <ImageOff className="h-6 w-6" />
                      </div>
                    )}

                    {qty > 0 ? (
                      <div className="absolute bottom-2 right-2 bg-white border border-zinc-200 text-black rounded-full px-2 py-1 flex items-center gap-2 shadow-md z-10 animate-scale-up">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItems((prev) => {
                              const next = { ...prev };
                              if (next[food.id] > 1) next[food.id]--;
                              else delete next[food.id];
                              return next;
                            });
                          }}
                          className="w-5 h-5 flex items-center justify-center font-black text-xs text-zinc-500 hover:text-black cursor-pointer active:scale-80 transition-all"
                        >
                          <Minus className="h-3 w-3 stroke-[3]" />
                        </button>
                        <span className="text-xs font-bold text-zinc-955 select-none min-w-[8px] text-center">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddItem(food.id)}
                          className="w-5 h-5 flex items-center justify-center font-black text-xs text-zinc-500 hover:text-black cursor-pointer active:scale-80 transition-all"
                        >
                          <Plus className="h-3 w-3 stroke-[3]" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddItem(food.id)}
                        className={`absolute bottom-2 right-2 w-8 h-8 rounded-full shadow-md flex items-center justify-center font-bold hover:scale-105 active:scale-95 transition-all z-10 ${
                          isDark
                            ? "bg-[#E85102] text-white"
                            : "bg-white border border-zinc-200 text-zinc-950 cursor-pointer"
                        }`}
                      >
                        <Plus className="h-4 w-4 stroke-[3]" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1 pr-0.5">
                    <p className={`text-sm font-black tracking-wide ${isDark ? "text-white" : "text-zinc-955"}`}>
                      {food.price}
                    </p>
                    <p className={`text-xs font-semibold truncate ${isDark ? "text-white/50" : "text-zinc-500"}`}>
                      {food.name}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Sticky Bottom Action Panel */}
      <div
        className={`fixed bottom-0 left-0 right-0 max-w-md mx-auto border-t px-6 py-4 z-40 ${
          isDark ? "bg-black/90 border-white/5" : "bg-white border-zinc-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
        }`}
      >
        <button
          onClick={() => setShowPartySheet(true)}
          className="w-full py-4 rounded-[24px] bg-[#E85102] hover:bg-[#C94600] text-white font-extrabold text-sm tracking-wide flex items-center justify-center gap-2 transition-all active:scale-98 shadow-lg shadow-[#E85102]/25 cursor-pointer"
        >
          <span>{cartTotal > 0 ? `${formatPrice(cartTotal)} • Bron qilish` : "Bron qilish"}</span>
        </button>
      </div>

      {/* Reviews Screen Overlay */}
      {showReviews && (
        <div
          className={`fixed inset-0 z-50 flex flex-col max-w-md mx-auto shadow-2xl animate-fade-in overflow-hidden ${
            isDark ? "bg-[#333333] text-white" : "bg-white text-zinc-900"
          }`}
        >
          <div
            className={`relative py-6 px-6 flex items-center justify-between z-20 border-b ${
              isDark ? "border-white/5 bg-[#333333]" : "border-zinc-100 bg-white"
            }`}
          >
            <button
              onClick={() => setShowReviews(false)}
              className={`w-9 h-9 rounded-full transition-all flex items-center justify-center cursor-pointer active:scale-90 ${
                isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
              }`}
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div
              className={`absolute left-1/2 -translate-x-1/2 font-bold text-base tracking-wide ${
                isDark ? "text-white" : "text-zinc-950"
              }`}
            >
              Sharhlar ({reviewsList.length})
            </div>
            <div className="w-9" />
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 pb-20 flex flex-col gap-4">
            {/* Aggregate Score Header */}
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between text-left ${
                isDark ? "bg-[#393939] border-white/5" : "bg-zinc-50 border-zinc-200"
              }`}
            >
              <div>
                <span className="text-3xl font-black text-[#FFB800]">{venueRating}</span>
                <span className="text-xs text-zinc-400 block mt-0.5">5.0 ballik shkalada</span>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-0.5 text-[#FFB800] justify-end">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[#FFB800] text-[#FFB800]" />
                  ))}
                </div>
                <span className="text-xs font-bold text-zinc-400 block mt-0.5">
                  {reviewsCount} ta umumiy baho
                </span>
              </div>
            </div>

            {reviewsList.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-xs">
                Hozircha sharhlar mavjud emas. Birinchi bo&apos;lib sharh qoldiring!
              </div>
            ) : (
              reviewsList.map((rev, idx) => (
                <div
                  key={rev.id || idx}
                  className={`border rounded-[22px] p-5 relative text-left animate-slide-up ${
                    isDark ? "bg-[#393939] border-white/5 shadow-lg" : "bg-white border-zinc-200 shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full overflow-hidden shrink-0 border ${
                          isDark ? "border-white/10 bg-zinc-800" : "border-zinc-200 bg-zinc-50"
                        }`}
                      >
                        {rev.author.avatar_url ? (
                          <Image src={rev.author.avatar_url} alt={rev.author.first_name} width={36} height={36} unoptimized className="w-full h-full object-cover" />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-xs font-bold text-[#E85102]">
                            {rev.author.first_name?.[0]?.toUpperCase() ?? "?"}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-950"}`}>
                            {rev.author.first_name} {rev.author.last_name || ""}
                          </span>
                          {rev.is_verified && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-[4px] font-semibold tracking-wide ml-1">
                              Tasdiqlangan
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 text-[#FFB800]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className="text-xs">
                          {i < rev.rating ? "★" : "☆"}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className={`text-xs font-medium leading-relaxed ${isDark ? "text-white/80" : "text-zinc-850"}`}>
                    {rev.comment}
                  </p>
                </div>
              ))
            )}
          </div>

          <div
            className={`absolute bottom-0 left-0 right-0 px-6 py-4 border-t pb-6 z-10 ${
              isDark ? "bg-[#333333] border-white/5" : "bg-white border-zinc-150"
            }`}
          >
            <form
              onSubmit={handleSendReview}
              className={`flex items-center rounded-full px-4 py-3 gap-3 border transition-all ${
                isDark
                  ? "bg-[#393939] border-white/5 focus-within:border-[#E85102]/40"
                  : "bg-zinc-100 border-transparent focus-within:bg-zinc-200/50"
              }`}
            >
              <input
                type="text"
                value={newReviewText}
                onChange={(e) => setNewReviewText(e.target.value)}
                placeholder="Sharh qoldirish..."
                className={`flex-1 bg-transparent text-sm outline-none ${
                  isDark ? "text-white placeholder:text-zinc-500" : "text-zinc-950 placeholder:text-zinc-450"
                }`}
              />
              <button
                type="submit"
                disabled={!newReviewText.trim()}
                className="p-1.5 rounded-full bg-transparent text-[#E85102] hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all shrink-0 flex items-center justify-center cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Partiya Soni & Kun va Vaqt Bottom Sheet Overlay */}
      {showPartySheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end max-w-md mx-auto bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="absolute inset-0 z-0" onClick={() => setShowPartySheet(false)} />

          <div
            className={`w-full border-t rounded-t-[36px] px-6 pb-9 pt-4 shadow-2xl relative z-10 flex flex-col gap-6 animate-slide-up select-none ${
              isDark ? "bg-[#393939] border-white/5" : "bg-white border-zinc-150"
            }`}
          >
            <div className={`w-10 h-1.5 rounded-full mx-auto ${isDark ? "bg-white/10" : "bg-zinc-200"}`} />

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Bronlash sozlamalari
              </span>
              <button
                onClick={() => setShowPartySheet(false)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isDark ? "bg-white/5 text-zinc-400 hover:text-white" : "bg-zinc-100 text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>



            <div className="space-y-3.5 text-left">
              <h3 className={`font-extrabold text-sm ${isDark ? "text-white" : "text-zinc-950"}`}>
                Mehmonlar soni
              </h3>
              <div className="flex justify-between items-center gap-2.5">
                {[1, 2, 4, 6, 8, 10].map((num) => {
                  const isSelected = partySize === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPartySize(num)}
                      className={`flex-1 py-3 text-sm font-extrabold rounded-2xl transition-all cursor-pointer ${
                        isSelected
                          ? "border border-[#E85102] bg-[#E85102]/10 text-[#E85102] scale-105"
                          : isDark
                          ? "border border-white/5 bg-zinc-900 text-white hover:bg-zinc-800"
                          : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className={`text-xs font-semibold text-left ${isDark ? "text-white/50" : "text-zinc-500"}`}>
              Kun, vaqt va stol keyingi qadamda bo&apos;sh joylar asosida tanlanadi.
            </p>

            <button
              onClick={() => {
                setShowPartySheet(false);
                const itemsQuery = encodeURIComponent(JSON.stringify(selectedItems));
                router.push(
                  `/booking/${id}?guests=${partySize}&items=${itemsQuery}`
                );
              }}
              className="w-full py-4.5 bg-[#E85102] hover:bg-[#C94600] text-white font-extrabold text-sm rounded-[24px] shadow-lg shadow-[#E85102]/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer"
            >
              Stol tanlash va davom etish
            </button>
          </div>
        </div>
      )}

      {/* ==================== DIRECT VENUE CHAT MODAL ==================== */}
      {showChatModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in p-4">
          <div className="absolute inset-0" onClick={() => setShowChatModal(false)} />
          <div
            className={`w-full max-w-md h-[550px] rounded-[32px] flex flex-col z-10 border relative text-left shadow-2xl overflow-hidden ${
              isDark ? "bg-[#2C2C2E] border-white/10" : "bg-white border-zinc-200"
            }`}
          >
            {/* Chat Top Header */}
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between bg-zinc-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full border border-primary/30 overflow-hidden bg-zinc-100">
                  {activeImage && <Image src={activeImage} alt={venueName} fill unoptimized sizes="40px" className="object-cover" />}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm leading-tight text-foreground dark:text-white">
                    {venueName}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Ma&apos;muriyat onlayn</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChatModal(false)}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingChat ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-400 text-xs">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>Xabarlar yuklanmoqda...</span>
                </div>
              ) : chatError ? (
                <div role="alert" className="text-center py-10 text-xs text-red-500 font-semibold">{chatError}</div>
              ) : chatMessages.length === 0 ? (
                <div className="text-center py-10 text-xs text-zinc-400">
                  Muloqotni boshlash uchun savolingizni yozing.
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMine = msg.sender_type === "user" && msg.sender_user_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"} animate-scale-up`}
                    >
                      <div
                        className={`max-w-[75%] p-3.5 rounded-2xl text-xs font-medium leading-relaxed ${
                          isMine
                            ? "bg-primary text-white rounded-br-none shadow-md shadow-primary/20"
                            : isDark
                            ? "bg-[#393939] text-white/90 rounded-bl-none border border-white/5"
                            : "bg-zinc-100 text-zinc-800 rounded-bl-none"
                        }`}
                      >
                        <p>{msg.body}</p>
                        <span
                          className={`text-[9px] block text-right mt-1 opacity-60 ${
                            isMine ? "text-white" : "text-zinc-400"
                          }`}
                        >
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02] flex items-center gap-2"
            >
              <input
                type="text"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder="Savolingizni yozing..."
                className={`flex-1 px-4 py-3 rounded-2xl border text-xs font-medium outline-none ${
                  isDark ? "border-white/10 bg-[#1E1E1E] text-white" : "border-zinc-200 bg-white text-zinc-900"
                }`}
              />
              <button
                type="submit"
                disabled={!newMessageText.trim()}
                className="w-11 h-11 rounded-2xl bg-primary hover:bg-[#C94600] text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:scale-100 active:scale-95 cursor-pointer shadow-md shadow-primary/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
