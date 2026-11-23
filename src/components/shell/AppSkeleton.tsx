export function AppSkeleton() {
  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-4 px-[max(16px,env(safe-area-inset-left))] pt-[calc(env(safe-area-inset-top)+20px)]" aria-busy="true" aria-label="Cargando la libreta">
      <div className="flex items-center justify-between"><div className="skeleton h-8 w-40" /><div className="skeleton size-10 rounded-full" /></div>
      <div className="skeleton h-[210px] rounded-[26px]" />
      <div className="grid grid-cols-2 gap-3"><div className="skeleton h-24" /><div className="skeleton h-24" /></div>
      <div className="skeleton h-40" />
      <div className="skeleton h-56" />
    </div>
  );
}
