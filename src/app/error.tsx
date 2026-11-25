"use client";

import Link from "next/link";

export default function Error({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-4 px-6 py-24 text-center bg-[var(--background)]">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-3xl font-black" aria-hidden="true">
        !
      </div>
      <h1 className="text-xl font-extrabold text-foreground">Nimadir xato ketdi</h1>
      <p className="text-sm text-foreground/60 max-w-xs">Sahifani ochib bo&apos;lmadi. Qaytadan urinib ko&apos;ring yoki bosh sahifaga qayting.</p>
      <div className="flex gap-3 pt-2">
        <Link href="/" className="rounded-2xl border border-brand-light-border dark:border-brand-dark-border px-5 py-3 text-sm font-bold text-foreground">
          Bosh sahifa
        </Link>
        <button type="button" onClick={() => unstable_retry()} className="rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white">
          Qayta urinish
        </button>
      </div>
    </div>
  );
}
