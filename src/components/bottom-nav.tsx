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
        parentFrame.classList.remove("pb-20", "pb-16");
      } else {
        parentFrame.classList.add("pb-20");
      }
    }
    return () => {
      if (parentFrame) {
        parentFrame.classList.remove("pb-20", "pb-16");
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

  // Coordinates are locked to 200 to keep the notch centered on the Scanner
  const cX = 200;

  // Silliq tushuvchi (bell-curve) oyiq path formula driven by active index cX
  // Increased gap width (58) and depth (79) to make the space around the button perfectly spacious
  const getDynamicPath = (center: number) => {
    return `M0,15 
            L${center - 58},15 
            C${center - 40},15 ${center - 36},33 ${center - 28},49 
            C${center - 15},79 ${center + 15},79 ${center + 28},49 
            C${center + 36},33 ${center + 40},15 ${center + 58},15 
            L400,15 
            L400,95 
            L0,95 
            Z`;
  };

  // Perfectly symmetrical top border path with slightly wider/deeper spacing
  const getTopBorderPath = (center: number) => {
    return `M0,15 
            L${center - 58},15 
            C${center - 40},15 ${center - 36},33 ${center - 28},49 
            C${center - 15},79 ${center + 15},79 ${center + 28},49 
            C${center + 36},33 ${center + 40},15 ${center + 58},15 
            L400,15`;
  };

  if (isHiddenRoute) {
    return <div id="global-bottom-nav" className="hidden" />;
  }

  const isDark = theme === "dark";

  return (
    <>
      {/* Dynamic Sliding Bottom Bar Container */}
      <div id="global-bottom-nav" className="fixed bottom-0 left-0 right-0 z-50 h-[85px] max-w-md mx-auto transition-all duration-300">
        
        {/* Dynamic Curved SVG Background with sliding notch */}
        <svg
          className={`absolute inset-0 w-full h-[95px] pointer-events-none transition-all duration-300 ${
            isDark ? "drop-shadow-[0_-4px_15px_rgba(0,0,0,0.5)]" : "drop-shadow-[0_-4px_10px_rgba(0,0,0,0.06)]"
          }`}
          viewBox="0 0 400 95"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main dynamic path that morphs smoothly */}
          <path
            d={getDynamicPath(cX)}
            fill={isDark ? "#333333" : "#FFFFFF"}
            className="transition-all duration-300 ease-out"
          />
          {/* Top dynamic border path that morphs smoothly */}
          <path
            d={getTopBorderPath(cX)}
            fill="none"
            stroke={isDark ? "#404040" : "#E5E7EB"}
            strokeWidth="1.5"
            className="transition-all duration-300 ease-out"
          />
        </svg>

        {/* Content Navigation Actions Layer */}
        <div className="absolute inset-0 flex justify-between items-center px-2 z-10 pt-4">
          
          {navItems.map((item, index) => {
            const isCenterFAB = index === 2;
            const isActive = index === activeIdx;

            // Compute icon class dynamically based on theme and active state
            let iconClass = "h-5 w-5 object-contain transition-all duration-300 ease-out ";
            if (isCenterFAB) {
              iconClass += "opacity-0 scale-50 pointer-events-none translate-y-4";
            } else if (isDark) {
              if (isActive) {
                iconClass += "brightness-0 invert opacity-100";
              } else {
                iconClass += "brightness-0 invert opacity-40 hover:opacity-75";
              }
            } else {
              if (isActive) {
                iconClass += "filter-primary opacity-100";
              } else {
                iconClass += "brightness-0 opacity-40 hover:opacity-75";
              }
            }

            // Compute text class dynamically based on theme and active state
            let textClass = "text-[11px] font-bold transition-all duration-300 ease-out ";
            if (isCenterFAB) {
              textClass += "opacity-0 scale-50 pointer-events-none translate-y-4";
            } else if (isDark) {
              if (isActive) {
                textClass += "text-white";
              } else {
                textClass += "text-[#8E8E93] hover:text-white/80";
              }
            } else {
              if (isActive) {
                textClass += "text-primary";
              } else {
                textClass += "text-[#8E8E93] hover:text-zinc-700";
              }
            }

            return (
              <div
                key={index}
                className="relative flex-1 flex flex-col items-center justify-center h-full pt-1"
              >
                {item.isAction ? (
                  <button
                    onClick={item.action}
                    className="flex flex-col items-center gap-1 py-1 px-3 transition-all duration-300 ease-out"
                  >
                    <Image src={item.icon} alt="" aria-hidden="true" width={20} height={20} className={iconClass} />
                    <span className={textClass}>
                      {item.name}
                    </span>
                  </button>
                ) : (
                  <Link
                    href={item.path}
                    className="flex flex-col items-center gap-1 py-1 px-3 transition-all duration-300 ease-out"
                  >
                    <Image src={item.icon} alt="" aria-hidden="true" width={20} height={20} className={iconClass} />
                    <span className={textClass}>
                      {item.name}
                    </span>
                  </Link>
                )}
              </div>
            );
          })}

        </div>

        {/* ==================== SMOOTH SLIDING ACTIVE CIRCLE (FAB) ==================== */}
        {/* Floating position is centered with perfectly matching concentric space around it */}
        <div
          className={`absolute w-[60px] h-[60px] rounded-full flex items-center justify-center shadow-2xl z-50 transition-all duration-300 ease-out cursor-pointer active:scale-95 ${
            isDark 
              ? "bg-[#3A3A3C] border border-white/10" 
              : "bg-white border border-zinc-200 shadow-md"
          }`}
          style={{
            top: "5px", // Mathematically centered: floats 10px above Y=15, and has 14px gap at the bottom Y=79
            left: "50%",
            transform: "translateX(-50%)",
          }}
          onClick={handleScanClick}
        >
          <button className="w-full h-full flex items-center justify-center cursor-pointer">
            <Image
              src="/icons/scan-barcode.webp"
              alt="Skaner"
              width={32}
              height={32}
              className={`h-8 w-8 object-contain animate-scale-up ${
                isDark ? "brightness-0 invert" : "filter-primary"
              }`}
            />
          </button>
        </div>

      </div>

    </>
  );
}
