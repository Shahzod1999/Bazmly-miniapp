"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";


import { useTheme } from "@/components/theme-provider";
import { comingSoon } from "@/components/app-toast";
import { useAuth } from "@/contexts/AuthContext";
import { HomeIcon, VoucherIcon, ReceiptIcon, UserIcon, ScanIcon } from "@/components/nav-icons";

export default function BottomNav() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const { isAuthenticated: isRegistered, loading } = useAuth();
  const mounted = !loading;

  const isHiddenRoute = 
    pathname.startsWith("/venue/") ||
    pathname.startsWith("/toyxona") ||
    pathname.startsWith("/booking/") ||
    pathname.startsWith("/payment/") ||
    pathname.startsWith("/payment-success") ||
    (pathname.startsWith("/login") && mounted && !isRegistered) ||
    (pathname === "/" && mounted && !isRegistered);

  useEffect(() => {
    if (!mounted) return;
    const parentFrame = document.getElementById("global-bottom-nav")?.parentElement;
    if (parentFrame) {
      if (isHiddenRoute) {
        parentFrame.classList.remove("pb-20", "pb-16", "pb-[var(--nav-height)]");
      } else {
        parentFrame.classList.add("pb-[var(--nav-height)]");
      }
    }
    return () => {
      if (parentFrame) {
        parentFrame.classList.remove("pb-20", "pb-16", "pb-[var(--nav-height)]");
      }
    };
  }, [pathname, isHiddenRoute, mounted]);

  // Skaner hali backend bilan ulanmagan — bosilganda "Tez orada"
  const handleScanClick = () => comingSoon("QR skaner");

  // 5 navigation items including the central Scan button
  const navItems = [
    {
      name: "Asosiy",
      path: "/",
      icon: HomeIcon,
      isActive: pathname === "/",
      isAction: false,
    },
    {
      name: "Voucher",
      path: "/tickets",
      icon: VoucherIcon,
      isActive: pathname.startsWith("/tickets") || pathname.startsWith("/payment-success"),
      isAction: false,
    },
    {
      name: "Skaner",
      path: "#scan",
      icon: ScanIcon,
      isActive: false,
      isAction: true,
      action: handleScanClick,
    },
    {
      name: "Joylar",
      path: "/feed",
      icon: ReceiptIcon,
      isActive: pathname.startsWith("/feed") || pathname.startsWith("/venue") || pathname.startsWith("/booking") || pathname.startsWith("/payment"),
      isAction: false,
    },
    {
      name: "Profilim",
      path: "/login",
      icon: UserIcon,
      isActive: pathname.startsWith("/login"),
      isAction: false,
    },
  ];

  // Derive the active index dynamically based on routes and scanner state
  const getActiveIndex = () => {
    if (pathname === "/") return 0;
    if (pathname.startsWith("/tickets") || pathname.startsWith("/payment-success")) return 1;
    if (pathname.startsWith("/feed") || pathname.startsWith("/venue") || pathname.startsWith("/booking") || pathname.startsWith("/payment")) return 3;
    if (pathname.startsWith("/login")) return 4;
    return 0; // default to Asosiy
  };

  const activeIdx = getActiveIndex();

  if (isHiddenRoute) {
    return <div id="global-bottom-nav" className="hidden" />;
  }

  const isDark = theme === "dark";
  const barColor = isDark ? "#333333" : "#FFFFFF";
  const borderColor = isDark ? "#404040" : "#F1F1F1";

  const renderItem = (item: (typeof navItems)[number], index: number) => {
    const isActive = index === activeIdx;
    const Icon = item.icon;
    const color = isActive ? (isDark ? "text-white" : "text-[#FF6A00]") : isDark ? "text-[#8E8E93]" : "text-[#8D8D8D]";
    return (
      <Link
        key={item.name}
        href={item.path}
        aria-current={isActive ? "page" : undefined}
        className={`w-[57px] flex flex-col items-center gap-1 transition-colors duration-200 active:scale-95 ${color}`}
      >
        <Icon className="h-6 w-6 shrink-0" />
        <span className="text-xs leading-[19px] font-bold whitespace-nowrap">{item.name}</span>
      </Link>
    );
  };

  return (
    // Figma "Botton navigation" (2691:3080), 393x98: o'yiqli panel y=18 dan, skaner doirasi 64px (y=0),
    // tugmalar y=30 dan; chap guruh x=16, o'ng guruh o'ngdan 16px; elementlar 57px, oraliq 16px.
    <div
      id="global-bottom-nav"
      className={`fixed bottom-0 left-0 right-0 z-50 h-[var(--nav-height)] max-w-md mx-auto transition-all duration-300 select-none ${
        isDark ? "drop-shadow-[0_-4px_12px_rgba(0,0,0,0.45)]" : "drop-shadow-[0_-4px_12px_rgba(147,61,0,0.1)]"
      }`}
    >
      {/* Panel: chap qism + o'yiqli markaz (120px, Figma path) + o'ng qism */}
      <div className="absolute inset-x-0 bottom-0 top-[18px] flex" aria-hidden="true">
        <div className="flex-1 border-t" style={{ backgroundColor: barColor, borderColor }} />
        <div className="relative z-[1] w-[120px] shrink-0 flex flex-col">
          <svg width="120" height="60" viewBox="0 0 120 60" className="block shrink-0 overflow-visible" fill="none">
            <path d={`${NOTCH_EDGE} V60 H-1 Z`} fill={barColor} />
            <path d={NOTCH_EDGE} stroke={borderColor} strokeWidth="1" transform="translate(0 0.5)" />
          </svg>
          <div className="flex-1 -mt-px -mx-px" style={{ backgroundColor: barColor }} />
        </div>
        <div className="flex-1 border-t" style={{ backgroundColor: barColor, borderColor }} />
      </div>

      {/* Tugmalar: chap va o'ng guruhlar */}
      <nav className="absolute z-[2] inset-x-0 top-[30px]">
        <div className="absolute left-4 flex gap-4">{navItems.slice(0, 2).map((item, i) => renderItem(item, i))}</div>
        <div className="absolute right-4 flex gap-4">{navItems.slice(3).map((item, i) => renderItem(item, i + 3))}</div>
      </nav>

      {/* Markazdagi skaner tugmasi: 64px oq doira, soya 0 -4 12 rgba(77,32,0,.1) */}
      <button
        type="button"
        onClick={handleScanClick}
        aria-label="Skaner"
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-transform ${
          isDark ? "bg-[#3A3A3C] text-white shadow-[0_-4px_12px_rgba(0,0,0,0.35)]" : "bg-white text-[#FF6A00] shadow-[0_-4px_12px_rgba(77,32,0,0.1)]"
        }`}
      >
        <ScanIcon className="h-8 w-8" />
      </button>
    </div>
  );
}

// Figma "Subtract" konturi (x 136..256 qismi, panel chizig'i y=0): o'yiq kengligi 113.8px, chuqurligi 54px.
const NOTCH_EDGE =
  "M-1 0H3.081C12.476 0 20.139 7.52316 20.313 16.9157C20.695 37.5069 37.496 54 58.091 54H61.909C82.504 54 99.305 37.5069 99.687 16.9157C99.861 7.52316 107.524 0 116.919 0H121";
