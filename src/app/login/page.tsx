"use client";

import { errorMessage } from "@/lib/use-api";
import React, { Suspense, useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { comingSoon } from "@/components/app-toast";
import { LanguageList, applyLanguage, savedLanguage } from "@/components/onboarding/onboarding-flow";
import { useTheme } from "@/components/theme-provider";
import {
  Globe,
  User,
  ChevronLeft,
  MapPin,
  Bell,
  Wallet,
  Clock,
  Languages,
  Headset,
  HelpCircle,
  LogOut,
  ChevronRight,
  Share2,
  CheckCircle,
  X,
  ChevronDown,
  Trash2,
} from "lucide-react";
import Navbar from "@/components/navbar";
import { BookingHistoryList, NotificationsList } from "@/components/profile/profile-lists";
import { useAuth } from "@/contexts/AuthContext";




const FAQS = [
  {
    q: "Qanday qilib restoran yoki marosim zalini bron qilish mumkin?",
    a: "Loyiha bosh sahifasidagi 'Joylar' bo'limiga o'ting, o'zingizga yoqqan restoran yoki zalni tanlang. Sana, vaqt va stol raqamini belgilab, to'lovni tasdiqlang. Broningiz muvaffaqiyatli amalga oshgach, u 'Tarix' bo'limida faol holatda ko'rinadi."
  },
  {
    q: "To'lovlar xavfsizmi va qanday amalga oshiriladi?",
    a: "Barcha to'lovlar hamkor rasmiy to'lov tizimlari orqali 3D-Secure himoyasi bilan amalga oshiriladi. Humo yoki Uzcard bank kartangizni kiritib, SMS-kod orqali tasdiqlash yo'li bilan mutlaqo xavfsiz to'lov qilishingiz mumkin."
  },
  {
    q: "Buyurtmani bekor qilsam, pulim qaytariladimi?",
    a: "Ha, albatta. Agar tadbiringiz boshlanishiga 48 soatdan ko'proq vaqt qolgan bo'lsa, buyurtmani bekor qilishingiz mumkin va mablag'ingiz kartangizga 100% qaytarib beriladi. 48 soatdan kam vaqt qolganda esa bekor qilish imkoniyati mavjud emas."
  },
  {
    q: "Promo-kodlar va kuponlardan qanday foydalanaman?",
    a: "Mavjud kuponlarni 'Voucher' bo'limida ko'rishingiz mumkin. Buyurtmani rasmiylashtirish va to'lov sahifasida promo-kod kiritish oynasiga kupon kodini kiritsangiz, chegirma avtomatik ravishda buyurtma summasiga qo'llaniladi."
  }
];

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex flex-col flex-1 bg-[var(--background)] animate-pulse" />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, loading: authLoading, logout, updateProfile, deleteAccount } = useAuth();
  const isDark = theme === "dark";
  const [saving, setLoading] = useState(false);
  
  // Registration / Profile States
  const [selectedLang, setSelectedLang] = useState(savedLanguage);
  const nextParam = useSearchParams().get("next");
  const nextPath = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;

  // Kirish tugagach boshlangan sahifaga qaytish (kirish ilova darvozasida, faqat Telegram orqali)
  useEffect(() => {
    if (user && nextPath) router.replace(nextPath);
  }, [user, nextPath, router]);
  // Shahar tanlovi faqat shu qurilmada saqlanadi (backend profilida maydon yo'q)
  const [location, setLocation] = useState(() => {
    if (typeof window === "undefined") return "Tashkent, Tashkent city";
    return localStorage.getItem("location") || "Tashkent, Tashkent city";
  });
  

  // Profile Edit Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [showLanguages, setShowLanguages] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [tempLanguage, setTempLanguage] = useState("uz");

  // Cards Management States

  



  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  // Foydalanuvchi ma'lumotlari faqat AuthContext'dan
  const mounted = !authLoading;
  const userFullName = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : "";

  // Dynamic bottom navigation bar visibility controller for cards sub-flows & logout drawers
  useEffect(() => {
    const bottomNav = document.getElementById("global-bottom-nav");
    if (bottomNav) {
      if (
        activeModal === "logout_profile" ||
        activeModal === "delete_account" ||
        showLanguages ||
        showMessages ||
        showHelp
      ) {
        bottomNav.style.transform = "translateY(100%)";
        bottomNav.style.opacity = "0";
        bottomNav.style.pointerEvents = "none";
      } else {
        bottomNav.style.transform = "translateY(0)";
        bottomNav.style.opacity = "1";
        bottomNav.style.pointerEvents = "auto";
      }
    }
    return () => {
      if (bottomNav) {
        bottomNav.style.transform = "translateY(0)";
        bottomNav.style.opacity = "1";
        bottomNav.style.pointerEvents = "auto";
      }
    };
  }, [activeModal, showLanguages, showMessages, showHelp]);

  // Toast auto-dismiss helper
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  if (!mounted) {
    return <div className="flex flex-col flex-1 bg-[var(--background)] animate-pulse" />;
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      showToast("Ism va familiyangiz bo'sh bo'lishi mumkin emas!");
      return;
    }
    const nameParts = editName.trim().split(/\s+/);
    const firstName = nameParts[0] || "Foydalanuvchi";
    const lastName = nameParts.slice(1).join(" ") || "";
    const cleanLocation = editLocation.trim() || "Tashkent, Tashkent city";
    setLoading(true);
    try {
      await updateProfile({
        first_name: firstName,
        last_name: lastName,
      });
      showToast("Profil muvaffaqiyatli saqlandi!");
      setLocation(cleanLocation);
      localStorage.setItem("location", cleanLocation);
      setIsEditing(false);
    } catch (err) {
      showToast(errorMessage(err, "Profilni saqlashda xatolik!"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      await deleteAccount();
      setActiveModal(null);
      showToast("Akkaunt muvaffaqiyatli o'chirildi.");
    } catch (err) {
      showToast(errorMessage(err, "Akkauntni o'chirishda xatolik yuz berdi."));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setActiveModal(null);
    showToast("Akkauntdan chiqildi.");
  };






  const menuItems = [
    {
      label: "Xabarlar",
      icon: Bell,
      action: () => setShowMessages(true),
    },
    {
      label: "Mening kartalarim",
      icon: Wallet,
      action: () => comingSoon("Kartalar"),
    },
    {
      label: "Tarix",
      icon: Clock,
      action: () => setShowHistory(true),
    },
    {
      label: "Tillar",
      icon: Languages,
      action: () => {
        setTempLanguage(selectedLang || "uz");
        setShowLanguages(true);
      },
    },
    {
      label: "Yordam",
      icon: Headset,
      action: () => setShowHelp(true),
    },
    {
      label: "Chiqish",
      icon: LogOut,
      action: () => setActiveModal("logout_profile"),
    },
  ];

  const isBottomNavHidden =
    activeModal === "logout_profile" ||
    activeModal === "delete_account" ||
    showLanguages ||
    showMessages ||
    showHelp;

  return (
    <div
      className="flex flex-col flex-1 bg-[var(--background)] transition-colors duration-300 relative"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xl animate-fade-in flex items-center gap-2 max-w-xs text-center border border-white/20">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

        {/* ==================== PROFILE VIEW ==================== */}
        <div className={`flex flex-col flex-1 bg-[var(--background)] ${isDark ? "text-white" : "text-zinc-900"} transition-all duration-300 ${isBottomNavHidden ? "-mb-16" : ""}`}>
          {showLanguages ? (
            /* ==================== HIGH-FIDELITY REGISTERED LANGUAGE SETTINGS VIEW ==================== */
            <div className={`flex flex-col flex-1 bg-[var(--background)] ${isDark ? "text-white" : "text-zinc-900"}`}>
              {/* Top Bar Header */}
              <div className="relative flex items-center justify-between px-6 py-5">
                <button
                  onClick={() => setShowLanguages(false)}
                  className={`p-2 rounded-xl transition-all active:scale-95 ${
                    isDark ? "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h1 className={`text-base font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>Til sozlamalari</h1>
                <div className="w-9 h-9" />
              </div>

              {/* Form Content */}
              <main className="flex-1 px-6 py-6 flex flex-col justify-between max-w-md mx-auto w-full">
                <div className="space-y-6">
                  {/* Subtitle */}
                  <div className="space-y-1 text-left">
                    <h2 className={`text-xl font-bold tracking-tight leading-tight ${isDark ? "text-white" : "text-zinc-900"}`}>Ilovani o&apos;zingizga qulay</h2>
                    <p className={`text-xl font-bold tracking-tight leading-tight ${isDark ? "text-white/95" : "text-zinc-800"}`}>tilda boshqaring</p>
                  </div>

                  {/* Til ro'yxati (Figma) */}
                  <LanguageList selected={tempLanguage} onSelect={setTempLanguage} />
                </div>

                {/* Bottom Confirm Button */}
                <div className="pb-8">
                  <button
                    type="button"
                    onClick={() => {
                      if (!applyLanguage(tempLanguage)) return;
                      setSelectedLang(tempLanguage);
                      setShowLanguages(false);
                    }}
                    className="w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-sm tracking-wide transition-all active:scale-98 shadow-lg shadow-primary/20"
                  >
                    Tasdiqlash
                  </button>
                </div>
              </main>
            </div>
          ) : showMessages ? (
            /* ==================== HIGH-FIDELITY REGISTERED XABARLAR VIEW ==================== */
            <div className={`flex flex-col flex-1 bg-[var(--background)] ${isDark ? "text-white" : "text-zinc-900"} animate-fade-in`}>
              {/* Top Bar Header */}
              <div className="relative flex items-center justify-between px-6 py-5">
                <button
                  onClick={() => setShowMessages(false)}
                  className={`p-2 rounded-xl transition-all active:scale-95 ${
                    isDark ? "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h1 className={`text-base font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>Xabarlar</h1>
                <div className="w-9 h-9" />
              </div>

              {/* Form Content */}
              <main className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6 max-w-md mx-auto w-full text-left">
                {/* Subtitle */}
                <div className="space-y-1">
                  <h2 className={`text-xl font-bold tracking-tight leading-tight ${isDark ? "text-white" : "text-zinc-900"}`}>Ilovamiz bo&apos;yicha yangiliklarni</h2>
                  <p className={`text-xl font-bold tracking-tight leading-tight ${isDark ? "text-white/95" : "text-zinc-800"}`}>kuzatib boring</p>
                </div>

                {/* Notifications List (API) */}
                <NotificationsList dark={isDark} />
              </main>
            </div>
          ) : showHistory ? (
            /* ==================== HIGH-FIDELITY REGISTERED BOOKINGS HISTORY VIEW ==================== */
            <div className={`flex flex-col flex-1 bg-[var(--background)] ${isDark ? "text-white" : "text-zinc-900"}`}>
              {/* Top Bar Header */}
              <div className={`relative flex items-center justify-between px-6 py-5 border-b ${
                isDark ? "border-white/5" : "border-zinc-100"
              }`}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowHistory(false)}
                    className={`p-2 rounded-xl transition-all active:scale-95 ${
                      isDark ? "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                    }`}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h1 className={`text-xl font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>Band qilingan</h1>
                </div>
                
                {/* Location pin with Toshkent */}
                <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
                  isDark 
                    ? "text-white/80 bg-white/5 border-white/5" 
                    : "text-zinc-800 bg-zinc-100 border-zinc-200"
                }`}>
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span>Toshkent</span>
                </div>
              </div>

              {/* Scrollable Bookings List */}
              <main className="flex-1 overflow-y-auto px-6 py-6 pb-2 flex flex-col gap-6 max-w-md mx-auto w-full text-left">
                <BookingHistoryList dark={isDark} />
              </main>
            </div>
          ) : showHelp ? (
            /* ==================== HIGH-FIDELITY REGISTERED YORDAM (HELP) VIEW ==================== */
            <div className={`flex flex-col flex-1 bg-[var(--background)] ${isDark ? "text-white" : "text-zinc-900"} animate-fade-in`}>
              {/* Top Bar Header */}
              <div className={`relative flex items-center justify-between px-6 py-5 border-b ${
                isDark ? "border-white/5" : "border-zinc-100"
              }`}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowHelp(false);
                      setOpenFaq(null);
                    }}
                    className={`p-2 rounded-xl transition-all active:scale-95 ${
                      isDark ? "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                    }`}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h1 className={`text-xl font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>Yordam markazi</h1>
                </div>
              </div>

              {/* Scrollable Help Content */}
              <main className="flex-1 overflow-y-auto px-6 py-6 pb-8 flex flex-col gap-6 max-w-md mx-auto w-full text-left">
                {/* Hero Card */}
                <div className={`w-full border rounded-3xl p-5 flex flex-col gap-3 shadow-xl ${
                  isDark 
                    ? "bg-gradient-to-br from-[#393939] to-[#252528] border-white/5" 
                    : "bg-zinc-100 border-zinc-200"
                }`}>
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                    <HelpCircle className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h2 className={`text-base font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>Qanday yordam bera olamiz?</h2>
                    <p className={`text-xs leading-relaxed font-medium ${isDark ? "text-white/60" : "text-zinc-650"}`}>
                      BAZMLY ilovasi orqali marosim zallari, restoran va shou-dasturlarni onlayn, xavfsiz va eng yaxshi narxlarda bron qilish bo&apos;yicha savollaringizga javob oling.
                    </p>
                  </div>
                </div>

                {/* FAQ Header */}
                <div className="space-y-1 mt-1">
                  <h3 className={`text-base font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>Tez-tez beriladigan savollar</h3>
                  <p className={`text-xs font-medium ${isDark ? "text-white/40" : "text-zinc-500"}`}>Eng ko&apos;p beriladigan savollarga javoblar</p>
                </div>

                {/* FAQ Accordions List */}
                <div className="space-y-3">
                  {FAQS.map((faq, idx) => {
                    const isOpen = openFaq === idx;
                    return (
                      <div
                        key={idx}
                        className={`w-full border rounded-2xl overflow-hidden transition-all duration-300 shadow-md ${
                          isDark ? "bg-[#393939] border-white/5" : "bg-zinc-100 border-zinc-200"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaq(isOpen ? null : idx)}
                          className={`w-full px-5 py-4 flex items-center justify-between gap-3 text-left transition-colors ${
                            isDark ? "hover:bg-white/5" : "hover:bg-zinc-200"
                          }`}
                        >
                          <span className={`text-xs font-bold leading-snug ${isDark ? "text-white/90" : "text-zinc-900"}`}>{faq.q}</span>
                          <ChevronDown className={`h-4.5 w-4.5 shrink-0 transition-transform duration-300 ${isDark ? "text-white/40" : "text-zinc-500"} ${isOpen ? "rotate-180 text-primary" : ""}`} />
                        </button>
                        
                        <div
                          className={`transition-all duration-300 ease-in-out overflow-hidden ${
                            isOpen ? `border-t ${isDark ? "border-white/5" : "border-zinc-200"}` : "max-h-0"
                          }`}
                        >
                          <p className={`px-5 py-4 text-xs leading-relaxed font-medium ${
                            isDark ? "text-white/60 bg-[#161618]" : "text-zinc-650 bg-zinc-50"
                          }`}>
                            {faq.a}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Support Contact Section */}
                <div className={`w-full border rounded-3xl p-5 flex flex-col gap-4 shadow-xl mt-2 ${
                  isDark ? "bg-[#221A15] border-[#FF6B00]/10" : "bg-orange-50/50 border-orange-100"
                }`}>
                  <div className="space-y-1">
                    <h4 className={`text-sm font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>Savolingizga javob topmadingizmi?</h4>
                    <p className={`text-[11px] leading-relaxed font-medium ${isDark ? "text-white/60" : "text-zinc-650"}`}>
                      Bizning mijozlarni qo&apos;llab-quvvatlash xizmati mutaxassislarimiz haftada 7 kun, 24 soat davomida sizga tezkor yordam berishga tayyor.
                    </p>
                  </div>
                  
                  <a
                    href="https://t.me/bazmly_support"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3.5 rounded-2xl bg-[#FF6B00] hover:bg-[#E05000] text-white font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition-all active:scale-98 shadow-lg shadow-[#FF6B00]/20"
                  >
                    <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15.82-.77 4.47-1.09 6.16-.13.72-.4 1-.66 1.03-.57.05-1-.38-1.55-.74-.86-.57-1.34-.86-2.18-1.41-.97-.64-.34-.99.21-1.56.14-.15 2.65-2.42 2.7-2.63.01-.03.01-.13-.05-.18-.06-.05-.14-.03-.21-.02-.09.02-1.54.98-4.36 2.88-.41.28-.79.42-1.12.41-.37-.01-1.08-.21-1.61-.38-.65-.21-1.17-.32-1.12-.68.02-.19.28-.38.77-.57 3.01-1.31 5.02-2.18 6.03-2.6 2.87-1.19 3.47-1.4 3.86-1.4.08 0 .28.02.4.12.1.09.13.21.14.31.01.07-.01.2-.02.26z"/>
                    </svg>
                    <span>Qo&apos;llab-quvvatlash xizmati (Telegram)</span>
                  </a>
                </div>
              </main>
            </div>
          ) : isEditing ? (
            /* ==================== HIGH-FIDELITY REGISTERED EDIT PROFILE VIEW ==================== */
            <div className="flex flex-col flex-1">
              {/* Custom Top Bar Header matching screenshot */}
              <div className={`relative flex items-center justify-between px-6 py-5 border-b ${
                isDark ? "border-white/5" : "border-zinc-100"
              }`}>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className={`p-2 rounded-xl transition-all active:scale-95 ${
                    isDark 
                      ? "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white" 
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h1 className={`text-base font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>Sozlamalar</h1>
                <div className="w-9 h-9" />
              </div>

              {/* Content Container */}
              <main className="flex-1 overflow-y-auto px-6 py-8 pb-10 flex flex-col items-center max-w-md mx-auto w-full">
                {/* Circle Avatar with Camera/Plus icon */}
                <div className="relative mb-8 mt-2">
                  <div className="relative w-36 h-36 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl bg-zinc-800">
                    <ProfileAvatar avatarUrl={user?.avatar_url ?? null} name={userFullName} />
                  </div>
                  <button type="button" aria-label="Rasm yuklash" onClick={() => comingSoon("Rasm yuklash")} className="absolute bottom-1 right-1 bg-white text-zinc-800 p-2.5 rounded-full shadow-lg border border-white/10 cursor-pointer hover:bg-zinc-100 transition-colors flex items-center justify-center">
                    <svg className="h-4.5 w-4.5 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                      <line x1="21" y1="10" x2="21" y2="6"/>
                      <line x1="19" y1="8" x2="23" y2="8"/>
                    </svg>
                  </button>
                </div>

                {/* Form Fields */}
                <div className="w-full space-y-5">
                  {/* Name field */}
                  <div className="space-y-2 text-left">
                    <label className={`block text-xs font-semibold ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Ism/Familiya</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Ism va familiya"
                      className={`w-full px-4 py-3.5 rounded-xl border text-sm font-medium outline-none focus:border-primary/50 transition-colors ${
                        isDark ? "border-white/10 bg-[#393939] text-white" : "border-zinc-200 bg-zinc-100 text-zinc-900 focus:bg-white"
                      }`}
                    />
                  </div>

                  {/* Phone field */}
                  <div className="space-y-2 text-left">
                    <label className={`block text-xs font-semibold ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Telefon raqam</label>
                    <input
                      type="text"
                      value={editPhone}
                      readOnly
                      aria-readonly="true"
                      placeholder="Telefon raqami ulanmagan"
                      className={`w-full px-4 py-3.5 rounded-xl border text-sm font-medium outline-none focus:border-primary/50 transition-colors ${
                        isDark ? "border-white/10 bg-[#393939] text-white" : "border-zinc-200 bg-zinc-100 text-zinc-900 focus:bg-white"
                      }`}
                    />
                  </div>

                  {/* Location field */}
                  <div className="space-y-2 text-left">
                    <label className={`block text-xs font-semibold ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Manzil</label>
                    <div className="relative">
                      <select
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        className={`w-full px-4 py-3.5 pr-10 rounded-xl border text-sm font-medium outline-none focus:border-primary/50 transition-colors appearance-none cursor-pointer ${
                          isDark ? "border-white/10 bg-[#393939] text-white" : "border-zinc-200 bg-zinc-100 text-zinc-900"
                        }`}
                      >
                        <option value="Tashkent, Tashkent city">Toshkent</option>
                        <option value="Samarkand, Samarkand region">Samarqand</option>
                        <option value="Bukhara, Bukhara region">Buxoro</option>
                        <option value="Andijan, Andijan region">Andijon</option>
                      </select>
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-400">
                        <ChevronDown className="h-4.5 w-4.5" />
                      </div>
                    </div>
                  </div>

                  {/* Danger zone */}
                  <div className="pt-2">
                    <span className="block text-red-400 text-xs font-semibold uppercase tracking-wider text-left mb-2">
                      Xavfli zona
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveModal("delete_account")}
                      className={`w-full border rounded-xl p-4 flex justify-between items-center cursor-pointer transition-colors text-left ${
                        isDark ? "bg-[#393939] border-white/10 hover:bg-[#252528]" : "bg-zinc-100 border-zinc-200 hover:bg-zinc-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
                          <Trash2 className="h-4.5 w-4.5" />
                        </span>
                        <span className={`text-sm font-bold ${isDark ? "text-white/90" : "text-zinc-900"}`}>Akkauntni o&apos;chirish</span>
                      </div>
                      <ChevronRight className={`h-4.5 w-4.5 ${isDark ? "text-white/30" : "text-zinc-400"}`} />
                    </button>
                  </div>
                </div>
              </main>
            </div>
          ) : (
            /* ==================== REGISTERED DASHBOARD VIEW ==================== */
            <>
              <Navbar />

              <main className="flex-1 flex flex-col items-center justify-start py-8 px-4 pb-0 max-w-md mx-auto w-full">
                {/* Header Title */}
                <h1 className={`text-xl font-black mb-6 ${isDark ? "text-white" : "text-zinc-900"}`}>
                  Sozlamalar
                </h1>

                {/* Profile Card Info */}
                <div className="w-full flex flex-col items-center text-center mb-8">
                  {/* Circle Avatar with custom styling */}
                  <div className="relative">
                    <div className={`w-36 h-36 rounded-full overflow-hidden relative ${
                      isDark 
                        ? "border-4 border-primary/20 bg-zinc-800 shadow-2xl" 
                        : "bg-zinc-150 shadow-md"
                    }`}>
                      <ProfileAvatar avatarUrl={user?.avatar_url ?? null} name={userFullName} />
                    </div>
                    {isDark && (
                      <div className="absolute bottom-0 right-1 bg-primary text-white p-2.5 rounded-full shadow-lg border-2 border-brand-dark">
                        <User className="h-4.5 w-4.5" />
                      </div>
                    )}
                  </div>

                  <div className="mt-5 space-y-1.5">
                    <h2 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-black"}`}>
                      {userFullName || "Foydalanuvchi"}
                    </h2>
                    <div className={`flex items-center justify-center gap-2 ${
                      isDark ? "text-xs font-medium text-white/60" : "text-base font-semibold text-black"
                    }`}>
                      <MapPin className={isDark ? "h-4 w-4 text-primary" : "h-5.5 w-5.5 text-black"} />
                      <span>{isDark ? location.split(",")[0] : location}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-center gap-3.5 w-full max-w-xs mt-6">
                    <button
                      onClick={() => {
                        setEditName(userFullName);
                        setEditLocation(location);
                        setEditPhone(user?.phone ?? "");
                        setIsEditing(true);
                      }}
                      className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm ${
                        isDark 
                          ? "bg-white/5 border border-white/10 text-white hover:bg-[#252528]" 
                          : "bg-white border border-primary text-primary hover:bg-orange-50"
                      }`}
                    >
                      Profilni tahrirlash
                    </button>
                    <button
                      onClick={() => comingSoon("Do'stlarni taklif qilish")}
                      className="flex-1 py-3 px-4 rounded-xl bg-primary text-xs font-bold text-white shadow-lg hover:bg-primary-hover transition-all active:scale-95"
                    >
                      Do&apos;stlarni taklif qilish
                    </button>
                  </div>
                </div>

                {/* Options List Dashboard Container */}
                <div className={`w-full border rounded-[32px] p-5.5 space-y-4 bg-transparent shadow-xl ${
                  isDark ? "border-white/5" : "border-zinc-100 bg-white/50"
                }`}>
                  {menuItems.map((item, index) => {
                    const Icon = item.icon;
                    const isChiqish = item.label === "Chiqish";
                    
                    if (isChiqish) {
                      return (
                        <button
                          key={index}
                          onClick={item.action}
                          className={`w-full flex items-center justify-between py-4 px-5 rounded-[20px] active:scale-[0.99] border transition-all duration-200 text-left cursor-pointer ${
                            isDark
                              ? "bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-500"
                              : "bg-red-50/60 border-red-100/80 hover:bg-red-100/50 text-red-500"
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <Icon className="w-5.5 h-5.5 text-red-500 shrink-0" />
                            <span className="text-sm font-extrabold text-red-500 tracking-wide">{item.label}</span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-red-500/70" />
                        </button>
                      );
                    }
                    
                    return (
                      <button
                        key={index}
                        onClick={item.action}
                        className={`w-full flex items-center justify-between py-4 px-5 rounded-[20px] active:scale-[0.99] transition-all duration-200 text-left cursor-pointer shadow-sm ${
                          isDark
                            ? "bg-[#393939] hover:bg-[#484848] text-white"
                            : "bg-zinc-100 hover:bg-zinc-200 text-zinc-900"
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <Icon className={`w-5.5 h-5.5 shrink-0 ${isDark ? "text-white/90" : "text-zinc-650"}`} />
                          <span className={`text-sm font-semibold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>{item.label}</span>
                        </div>
                        <ChevronRight className={`w-5 h-5 ${isDark ? "text-white/70" : "text-zinc-400"}`} />
                      </button>
                    );
                  })}
                </div>
              </main>
            </>
          )}

          {/* ==================== SETTINGS MODALS ==================== */}
          {activeModal && activeModal !== "logout_profile" && activeModal !== "delete_account" && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="w-full max-w-sm border border-foreground/10 dark:border-white/10 rounded-3xl shadow-2xl bg-brand-light-card dark:bg-zinc-900 p-6 space-y-5 relative animate-scale-up">
                
                {/* Close Button */}
                <button
                  onClick={() => setActiveModal(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg bg-foreground/5 dark:bg-white/5 hover:bg-foreground/10 dark:hover:bg-white/10 text-foreground/50 dark:text-white/50 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Modal Title */}
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    {activeModal === "messages" && <Bell className="h-5 w-5" />}
                    {activeModal === "history" && <Clock className="h-5 w-5" />}
                    {activeModal === "languages" && <Globe className="h-5 w-5" />}
                    {activeModal === "help" && <HelpCircle className="h-5 w-5" />}
                    {activeModal === "logout" && <LogOut className="h-5 w-5" />}
                    {activeModal === "friends" && <Share2 className="h-5 w-5" />}
                  </span>
                  <h3 className="text-lg font-black text-foreground dark:text-white">
                    {activeModal === "messages" && "Xabarlar"}
                    {activeModal === "history" && "Bronlar Tarixi"}
                    {activeModal === "languages" && "Tizim Tili"}
                    {activeModal === "help" && "Yordam Markazi"}
                    {activeModal === "logout" && "Akkauntdan chiqish"}
                    {activeModal === "friends" && "Do'stlarni chaqirish"}
                  </h3>
                </div>

                {/* Modal Content */}
                <div className="text-xs text-foreground/70 dark:text-white/70 space-y-3 leading-relaxed">



                  {/* Help Content */}
                  {activeModal === "help" && (
                    <div className="space-y-4">
                      <p>BAZMLY ilovasi orqali marosim zallari, restoran va shou-dasturlarni onlayn, xavfsiz va eng yaxshi narxlarda bron qilishingiz mumkin.</p>
                      
                      <div className="space-y-2">
                        <p className="font-bold text-foreground dark:text-white">Tez-tez beriladigan savollar:</p>
                        <details className="bg-foreground/5 dark:bg-white/5 rounded-xl border border-foreground/5 dark:border-white/5 p-2 focus:outline-none">
                          <summary className="font-bold text-[11px] cursor-pointer text-foreground dark:text-white">To&apos;lovlar xavfsizmi?</summary>
                          <p className="mt-1 pl-2 text-[10px] text-foreground/60 dark:text-white/60">Barcha to&apos;lovlar rasmiy to&apos;lov tizimlari orqali 3D-Secure himoyasi bilan amalga oshiriladi.</p>
                        </details>
                        <details className="bg-foreground/5 dark:bg-white/5 rounded-xl border border-foreground/5 dark:border-white/5 p-2 focus:outline-none">
                          <summary className="font-bold text-[11px] cursor-pointer text-foreground dark:text-white">Qanday bekor qilish mumkin?</summary>
                          <p className="mt-1 pl-2 text-[10px] text-foreground/60 dark:text-white/60">Tadbirdan 48 soat oldin bekor qilinsa, pul mablag&apos;ingiz to&apos;liq qaytariladi.</p>
                        </details>
                      </div>

                      <a
                        href="https://t.me/bazmly_support"
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-white shadow-md hover:bg-primary-hover transition-colors"
                      >
                        Qo&apos;llab-quvvatlash guruhi bilan aloqa (Telegram)
                      </a>
                    </div>
                  )}


                  {/* Logout Content */}
                  {activeModal === "logout" && (
                    <div className="space-y-4">
                      <p className="text-center text-foreground/80 dark:text-white/80 font-medium">
                        Haqiqatan ham akkauntingizdan chiqmoqchimisiz?
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setActiveModal(null)}
                          className="flex-1 py-3 rounded-xl bg-foreground/10 dark:bg-white/10 hover:bg-foreground/15 text-xs font-bold text-foreground dark:text-white transition-colors"
                        >
                          Bekor qilish
                        </button>
                        <button
                          onClick={handleLogout}
                          className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-xs font-bold text-white shadow-md transition-colors"
                        >
                          Ha, chiqish
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* Profildan Chiqish Bottom Sheet Modal matching Screenshot 2 (left) */}
          {activeModal === "logout_profile" && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center transition-opacity duration-300 animate-fade-in">
              <div className="absolute inset-0" onClick={() => setActiveModal(null)} />
              
              <div className={`w-full max-w-md rounded-t-[32px] px-6 pt-3 pb-8 flex flex-col items-center gap-4 z-10 animate-slide-up border-t relative ${
                isDark ? "bg-[#393939] border-white/5" : "bg-white border-zinc-200"
              }`}>
                {/* Notch indicator */}
                <div className={`w-12 h-1 rounded-full mb-2 ${isDark ? "bg-white/20" : "bg-zinc-200"}`} />
                
                {/* Title */}
                <p className={`text-base font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>Profildan chiqmoqchimisiz?</p>
                
                {/* Red Profile Logout Button with logout icon */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    handleLogout();
                  }}
                  className="w-full py-4 rounded-2xl bg-[#E82C2C] hover:bg-red-700 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all active:scale-98 shadow-lg shadow-red-600/10"
                >
                  <LogOut className="h-4.5 w-4.5" />
                  <span>Profildan chiqish</span>
                </button>
                
                {/* Cancel Button */}
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className={`w-full py-4 font-bold text-sm tracking-wide transition-all active:scale-98 ${
                    isDark ? "text-white/60 hover:text-white" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  Bekor qilish
                </button>
              </div>
            </div>
          )}

          {/* Akkauntni O'chirish Bottom Sheet Modal matching Screenshot 2 (right) */}
          {activeModal === "delete_account" && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center transition-opacity duration-300 animate-fade-in">
              <div className="absolute inset-0" onClick={() => setActiveModal(null)} />
              
              <div className={`w-full max-w-md rounded-t-[32px] px-6 pt-3 pb-8 flex flex-col items-center gap-4 z-10 animate-slide-up border-t relative ${
                isDark ? "bg-[#393939] border-white/5" : "bg-white border-zinc-200"
              }`}>
                {/* Notch indicator */}
                <div className={`w-12 h-1 rounded-full mb-2 ${isDark ? "bg-white/20" : "bg-zinc-200"}`} />
                
                {/* Title */}
                <p className={`text-base font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>Akkauntni o&apos;chirish tasdiqlansinmi?</p>
                
                {/* Red Account Delete Button with trash icon */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    handleDeleteAccount();
                  }}
                  className="w-full py-4 rounded-2xl bg-[#E82C2C] hover:bg-red-700 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all active:scale-98 shadow-lg shadow-red-600/10"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                  <span>Akkauntni o&apos;chirish</span>
                </button>
                
                {/* Cancel Button */}
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className={`w-full py-4 font-bold text-sm tracking-wide transition-all active:scale-98 ${
                    isDark ? "text-white/60 hover:text-white" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  Bekor qilish
                </button>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}

/** Profil rasmi: foydalanuvchi rasmi bo'lsa — rasm, bo'lmasa — ism bosh harflari */
function ProfileAvatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  if (avatarUrl) {
    return <Image src={avatarUrl} alt={name || "Profil rasmi"} fill unoptimized sizes="144px" className="object-cover" />;
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <div className="w-full h-full flex items-center justify-center bg-primary text-white text-4xl font-extrabold" aria-label={name || "Profil"}>
      {initials || "B"}
    </div>
  );
}
