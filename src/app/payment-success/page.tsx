"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Eski "To'lov muvaffaqiyatli" sahifasi.
 * Onlayn to'lov hali yo'q, shuning uchun hech narsani "to'landi" deb ko'rsatmaymiz:
 * bookingId bo'lsa — bronning haqiqiy holatiga, bo'lmasa — chiptalar ro'yxatiga yo'naltiramiz.
 */
function Redirect() {
  const router = useRouter();
  const bookingId = useSearchParams().get("bookingId");
  useEffect(() => {
    router.replace(bookingId && /^\d+$/.test(bookingId) ? `/payment/${bookingId}` : "/tickets");
  }, [bookingId, router]);
  return <div className="flex flex-col flex-1 bg-[var(--background)] animate-pulse" />;
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="flex flex-col flex-1 bg-[var(--background)]" />}>
      <Redirect />
    </Suspense>
  );
}
