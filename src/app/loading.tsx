export default function Loading() {
  return (
    <div role="status" aria-label="Yuklanmoqda" className="flex flex-1 items-center justify-center py-24 bg-[var(--background)]">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" aria-hidden="true" />
    </div>
  );
}
