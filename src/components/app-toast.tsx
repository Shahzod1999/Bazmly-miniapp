"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

type ToastTone = "success" | "error" | "info";
interface ToastDetail {
  message: string;
  tone: ToastTone;
}

const EVENT = "bazmly:toast";

/** Ilova bo'ylab qisqa xabar ko'rsatish */
export function showToast(message: string, tone: ToastTone = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastDetail>(EVENT, { detail: { message, tone } }));
}

/** Backend'da hali yo'q funksiyalar uchun */
export function comingSoon(feature?: string) {
  showToast(feature ? `${feature} tez orada qo'shiladi` : "Tez orada", "info");
}

export default function AppToast() {
  const [toast, setToast] = useState<(ToastDetail & { id: number }) | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      setToast({ ...detail, id: Date.now() });
      clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 3000);
    };
    window.addEventListener(EVENT, onToast);
    return () => {
      window.removeEventListener(EVENT, onToast);
      clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;
  const Icon = toast.tone === "error" ? AlertCircle : toast.tone === "info" ? Clock : CheckCircle;
  return (
    <div
      key={toast.id}
      role={toast.tone === "error" ? "alert" : "status"}
      className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-[999] px-4 py-3 rounded-2xl text-white text-xs font-bold shadow-2xl flex items-center gap-2 border border-white/20 animate-fade-in max-w-[90vw] ${
        toast.tone === "error" ? "bg-red-600" : "bg-[#FF6B00]"
      }`}
    >
      <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
      <span>{toast.message}</span>
    </div>
  );
}
