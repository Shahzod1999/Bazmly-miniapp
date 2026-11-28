"use client";

// Figma "Vouchers" (2421:1975): sarlavha "Promokodlar" va promokod kartochkalari.
// Bron chiptalari (QR, bekor qilish) Joylar → bron sahifasida (/payment/[id]).
// Backend'da promokodlar hali yo'q — kartochka uslubidagi "tez orada" holati ko'rsatiladi.
import { useTheme } from "@/components/theme-provider";
import { ArrowRightIcon, BazmlyWordmark } from "@/components/nav-icons";

interface PromoItem {
  id: string;
  title: string;
  /** Muddat: faol taymer (to'q sariq) yoki sana (kulrang) */
  meta: string;
  metaActive?: boolean;
}

function LogoTile() {
  return (
    <span className="w-[60px] h-[60px] shrink-0 rounded-[14px] bg-[#FF6A00] flex items-center justify-center">
      <BazmlyWordmark className="w-[49px] h-[11px]" />
    </span>
  );
}

function PromoCard({ item, dark }: { item: PromoItem; dark: boolean }) {
  return (
    <button
      type="button"
      className={`w-full flex items-center gap-[15px] p-2 rounded-[20px] text-left active:scale-[0.99] transition-transform ${
        dark ? "bg-[#393939]" : "bg-[#F2F2F2]"
      }`}
    >
      <LogoTile />
      <span className="flex-1 min-w-0 flex flex-col gap-[11px]">
        <span className={`text-lg leading-[17px] ${dark ? "text-white" : "text-black"}`}>{item.title}</span>
        <span className={`text-lg leading-[17px] ${item.metaActive ? "text-[#FF6A00]" : "text-[#8D8D8D]"}`}>{item.meta}</span>
      </span>
      <ArrowRightIcon className={`w-6 h-6 shrink-0 mr-1 ${dark ? "text-white" : "text-black"}`} />
    </button>
  );
}

export default function VouchersPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const promos: PromoItem[] = [];

  return (
    <div className="flex flex-col flex-1 bg-[var(--background)]">
      <div className="h-8 mt-4 px-5 flex items-center justify-center">
        <h1 className={`text-xl leading-[22px] font-bold ${isDark ? "text-white" : "text-black"}`}>Promokodlar</h1>
      </div>

      <div className="px-5 mt-10 flex flex-col gap-2.5">
        {promos.length > 0 ? (
          promos.map((p) => <PromoCard key={p.id} item={p} dark={isDark} />)
        ) : (
          <div className={`flex items-center gap-[15px] p-2 rounded-[20px] ${isDark ? "bg-[#393939]" : "bg-[#F2F2F2]"}`}>
            <LogoTile />
            <span className="flex-1 min-w-0 flex flex-col gap-[11px]">
              <span className={`text-lg leading-[17px] ${isDark ? "text-white" : "text-black"}`}>Promokodlar tez orada</span>
              <span className="text-sm leading-[17px] text-[#8D8D8D]">Chegirma kodlari paydo bo&apos;lganda shu yerda ko&apos;rinadi</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
