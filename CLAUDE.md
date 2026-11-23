@AGENTS.md

# Fintech Dilak — convenciones del proyecto

- **Rama de trabajo: `main`.** Vercel publica a producción cada push a `main`. Commitear y pushear directo a `main` (sin ramas ni PRs) salvo que se pida otra cosa.
- **pnpm es obligatorio** (`packageManager: pnpm@10.34.9`, `preinstall` bloquea npm/yarn). Nunca usar `npm install` ni crear `package-lock.json`.
- **Antes de cada push a `main`:** `pnpm lint`, `pnpm test` y `pnpm build` tienen que pasar (es producción).
- Idioma de la interfaz: español rioplatense (voseo). Usuarios: Delibes y Liliana (configurados por variables de entorno privadas, ver README).
- Cambios de base de datos: solo en `supabase/schema.sql`, siempre idempotentes (se vuelve a correr completo en el SQL Editor).
