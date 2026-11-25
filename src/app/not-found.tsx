import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-4 px-6 py-24 text-center bg-[var(--background)]">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-black" aria-hidden="true">
        404
      </div>
      <h1 className="text-xl font-extrabold text-foreground">Sahifa topilmadi</h1>
      <p className="text-sm text-foreground/60 max-w-xs">Siz qidirgan sahifa mavjud emas yoki o&apos;chirilgan.</p>
      <Link href="/" className="mt-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20">
        Bosh sahifaga qaytish
      </Link>
    </div>
  );
}
