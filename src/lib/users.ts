/**
 * Los únicos dos usuarios de la app. Se configuran con variables de entorno PRIVADAS
 * (sin NEXT_PUBLIC_): los emails nunca llegan al navegador; la pantalla de ingreso
 * solo recibe el nombre y una clave interna ("1" o "2").
 */
export interface AppUser {
  key: "1" | "2";
  name: string;
  email: string;
  color: string;
}

export function appUsers(): AppUser[] {
  const raw: AppUser[] = [
    { key: "1", name: process.env.DILAK_USER_1_NAME ?? "", email: process.env.DILAK_USER_1_EMAIL ?? "", color: "blue" },
    { key: "2", name: process.env.DILAK_USER_2_NAME ?? "", email: process.env.DILAK_USER_2_EMAIL ?? "", color: "magenta" },
  ];
  return raw.filter((u) => u.name.trim() && u.email.trim());
}

/** Lo que puede ver el navegador: nombre, color y clave. Nunca el email. */
export const publicProfiles = () => appUsers().map(({ key, name, color }) => ({ key, name, color }));
export type PublicProfile = ReturnType<typeof publicProfiles>[number];
