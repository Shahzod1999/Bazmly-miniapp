"use client";

import "./globals.css";

/** Ildiz layout'da xato bo'lsa ko'rsatiladi (o'z html/body teglariga ega) */
export default function GlobalError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <html lang="uz">
      <body className="min-h-screen bg-[var(--background)] text-foreground antialiased">
        <title>Xatolik — Bazmly</title>
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
          <h1 className="text-xl font-extrabold">Ilovani ochib bo&apos;lmadi</h1>
          <p className="mt-2 text-sm opacity-70">Internet aloqasini tekshiring va qaytadan urinib ko&apos;ring.</p>
          <button type="button" onClick={() => unstable_retry()} className="mt-6 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-white">
            Qayta urinish
          </button>
        </main>
      </body>
    </html>
  );
}
