import { AuthShell } from "@/components/brand/AuthShell";
import { publicProfiles } from "@/lib/users";
import { isConfigured } from "@/lib/supabase/env";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Ingresar" };

export default function Login() {
  const profiles = publicProfiles();
  return (
    <AuthShell title={<>¿Quién <span className="text-gradient">entra</span>?</>} subtitle="Elegí tu perfil e ingresá tu contraseña.">
      {!isConfigured || profiles.length === 0 ? (
        <div className="card p-5 text-[14px] text-ink-2">
          <p className="mb-2 font-semibold text-ink">Falta configurar los usuarios</p>
          <p>
            Completá en Vercel (o en <code className="num">.env.local</code>) las variables <code className="num">DILAK_USER_1_NAME</code>, <code className="num">DILAK_USER_1_EMAIL</code>,{" "}
            <code className="num">DILAK_USER_2_NAME</code> y <code className="num">DILAK_USER_2_EMAIL</code>, además de las de Supabase. Los pasos están en el README.
          </p>
        </div>
      ) : (
        <LoginForm profiles={profiles} />
      )}
    </AuthShell>
  );
}
