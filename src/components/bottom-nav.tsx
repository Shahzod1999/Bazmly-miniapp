"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";


import { useTheme } from "@/components/theme-provider";
import { comingSoon } from "@/components/app-toast";
import { useAuth } from "@/contexts/AuthContext";

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
      icon: "/logo-loading.webp",
      isActive: pathname === "/",
      isAction: false,
    },
    {
      name: "Voucher",
      path: "/tickets",
      icon: "/icons/discount-shape.webp",
      isActive: pathname.startsWith("/tickets") || pathname.startsWith("/payment-success"),
      isAction: false,
    },
    {
      name: "Skaner",
      path: "#scan",
      icon: "/icons/scan-barcode.webp",
      isActive: false,
      isAction: true,
      action: handleScanClick,
    },
    {
      name: "Joylar",
      path: "/feed",
      icon: "/icons/receipt.webp",
      isActive: pathname.startsWith("/feed") || pathname.startsWith("/venue") || pathname.startsWith("/booking") || pathname.startsWith("/payment"),
      isAction: false,
    },
    {
      name: "Profilim",
      path: "/login",
      icon: "/icons/user.webp",
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

  return (
    // Figma (BAZMLY · Bottom nav 2691:3080): balandlik --nav-height, panel yuqori chegarasi 26px pastda,
    // markazdagi 64px skaner tugmasi panel ustiga 26px chiqib turadi, uning atrofida yumaloq o'yiq.
    <div
      id="global-bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-50 h-[var(--nav-height)] max-w-md mx-auto transition-all duration-300 select-none"
    >
      {/* Panel foni: chap qism + o'yiqli markaz + o'ng qism (o'yiq har qanday kenglikda buzilmaydi) */}
      <div
        className={`absolute inset-x-0 bottom-0 top-[26px] flex ${
          isDark ? "drop-shadow-[0_-4px_16px_rgba(0,0,0,0.45)]" : "drop-shadow-[0_-4px_16px_rgba(97,64,38,0.07)]"
        }`}
        aria-hidden="true"
      >
        <div className="flex-1" style={{ backgroundColor: barColor }} />
        <div className="w-[120px] shrink-0 -mx-px flex flex-col">
          <svg width="122" height="60" viewBox="0 0 122 60" className="block shrink-0 -mx-px" fill="none">
            <path d={NOTCH_PATH} fill={barColor} />
          </svg>
          <div className="flex-1 -mx-px" style={{ backgroundColor: barColor }} />
        </div>
        <div className="flex-1" style={{ backgroundColor: barColor }} />
      </div>

      {/* Navigatsiya tugmalari */}
      <nav className="absolute inset-x-0 bottom-0 top-[26px] grid grid-cols-5 px-[5px]">
        {navItems.map((item, index) => {
          if (item.isAction) return <div key={item.name} aria-hidden="true" />;
          const isActive = index === activeIdx;

          const iconClass = `h-6 w-6 object-contain transition-all duration-200 ${
            isActive
              ? isDark
                ? "brightness-0 invert"
                : "filter-primary"
              : isDark
              ? "brightness-0 invert opacity-50"
              : "brightness-0 opacity-45"
          }`;
          const textClass = `text-xs leading-4 font-semibold transition-colors duration-200 ${
            isActive ? (isDark ? "text-white" : "text-primary") : isDark ? "text-[#8E8E93]" : "text-[#8C8C8C]"
          }`;

          return (
            <Link
              key={item.name}
              href={item.path}
              aria-current={isActive ? "page" : undefined}
              className="flex flex-col items-center pt-[7px] gap-[5px] active:scale-95 transition-transform"
            >
              <Image src={item.icon} alt="" aria-hidden="true" width={24} height={24} className={iconClass} />
              <span className={textClass}>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Markazdagi skaner tugmasi (64px) va uning atrofidagi bej halqa */}
      <button
        type="button"
        onClick={handleScanClick}
        aria-label="Skaner"
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-transform ${
          isDark
            ? "bg-[#3A3A3C] shadow-[0_0_16px_6px_rgba(0,0,0,0.35)]"
            : "bg-white shadow-[0_2px_18px_8px_rgba(176,146,122,0.34)]"
        }`}
      >
        <Image
          src="/icons/scan-barcode.webp"
          alt=""
          aria-hidden="true"
          width={32}
          height={32}
          className={`h-8 w-8 object-contain ${isDark ? "brightness-0 invert" : "filter-primary"}`}
        />
      </button>
    </div>
  );
}

// O'yiq geometriyasi (122x60, markaz x=61): panel chizig'i y=0, o'yiq doirasi r=42, markazi (61, 6);
// panel bilan tutashgan joylar r=10 bilan yumaloqlangan.
const NOTCH_PATH =
  "M0,0 L9.15,0 A10,10 0 0 1 19.13,9.23 A42,42 0 0 0 102.87,9.23 A10,10 0 0 1 112.85,0 L122,0 L122,60 L0,60 Z";
