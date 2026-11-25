"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";

/** Bron QR kodi: muassasa xodimi shu kodni skanerlab mehmonni qayd qiladi */
export function BookingQr({ token, size = 208 }: { token: string; size?: number }) {
  const [qr, setQr] = useState<{ token: string; url: string } | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toString(token, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1c1410", light: "#ffffff" } })
      .then((markup) => {
        if (alive) setQr({ token, url: `data:image/svg+xml;utf8,${encodeURIComponent(markup)}` });
      })
      .catch(() => {
        if (alive) setQr(null);
      });
    return () => {
      alive = false;
    };
  }, [token]);

  if (!qr || qr.token !== token) {
    return <div aria-hidden="true" className="skeleton rounded-2xl" style={{ width: size, height: size }} />;
  }

  return <Image src={qr.url} alt="Bron QR kodi" width={size} height={size} unoptimized className="rounded-2xl bg-white p-2" />;
}
