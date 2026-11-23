import { LogoMark } from "@/components/brand/Logo";

export function AppSkeleton() {
  return (
    <div className="md:pl-[244px]" aria-busy="true" aria-label="Cargando Fintech Dilak">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-4 px-[max(16px,env(safe-area-inset-left))] pt-[calc(env(safe-area-inset-top)+16px)] md:px-8">
        <div className="flex items-center justify-between"><LogoMark size={32} className="animate-pulse" /><div className="skeleton h-9 w-36 rounded-full" /></div>
        <div className="skeleton mt-4 h-8 w-56" />
        <div className="skeleton h-[260px] rounded-[26px]" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><div className="skeleton h-24" /><div className="skeleton h-24" /><div className="skeleton h-24" /><div className="skeleton h-24" /></div>
        <div className="skeleton h-56" />
      </div>
    </div>
  );
}
