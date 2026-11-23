import { HouseholdProvider } from "@/store/household";
import { AppShell } from "@/components/shell/AppShell";
import { AppSkeleton } from "@/components/shell/AppSkeleton";

/**
 * Toda la app es "cliente": la cáscara se sirve estática (abre al instante,
 * también instalada) y los datos llegan desde Supabase con la sesión del usuario.
 * El proxy ya mandó a /login a quien no inició sesión.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <HouseholdProvider fallback={<AppSkeleton />}>
      <AppShell>{children}</AppShell>
    </HouseholdProvider>
  );
}
