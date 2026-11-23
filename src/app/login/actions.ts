"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { appUsers } from "@/lib/users";

export interface LoginState {
  error?: string;
  attempt: number;
}

/** Inicia sesión con el perfil elegido y su contraseña. El email se resuelve acá, en el servidor. */
export async function signIn(prev: LoginState, form: FormData): Promise<LoginState> {
  const attempt = prev.attempt + 1;
  const key = String(form.get("profile") ?? "");
  const password = String(form.get("password") ?? "");
  const user = appUsers().find((u) => u.key === key);
  if (!user) return { error: "Elegí tu perfil.", attempt };
  if (password.length < 6) return { error: "La contraseña tiene al menos 6 caracteres.", attempt };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (error) {
    const msg = error.status === 429 ? "Demasiados intentos seguidos. Esperá un minuto y probá de nuevo."
      : error.message?.toLowerCase().includes("invalid") ? "Contraseña incorrecta."
      : "No pudimos iniciar sesión. Revisá la conexión y probá de nuevo.";
    return { error: msg, attempt };
  }
  redirect("/");
}
