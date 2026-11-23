# La Libreta de Casa

App web instalable (PWA) para manejar las finanzas de la familia entre dos (o más) personas: gastos, ingresos, fijos, presupuestos, metas de ahorro y consejos automáticos.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Supabase (Auth + Postgres + Realtime) · Vercel.

---

## Qué hace

**Cargar en dos toques**
- Botón **+** siempre a mano. Teclado numérico grande, categorías ordenadas por uso.
- Escribís el detalle ("súper", "nafta") y **la categoría se elige sola**. Además aprende de lo que ya cargaron.
- **"Lo de siempre":** atajos con lo que más repiten (monto incluido).
- Hoy / Ayer / otra fecha. Deshacer después de guardar. "+" para guardar y cargar otro.
- En la compu: tecla **N** abre la carga, números y Enter guardan.

**Fijos (servicios, suscripciones, alquiler, cuotas)**
- Se cargan una vez. Cada mes aparecen en *Por pagar*, con aviso de vencimiento, y se marcan con **Pagar**.
- Si el monto cambió (luz, gas), se toca el monto y se corrige.
- La base impide pagar dos veces el mismo fijo en el mismo mes, aunque los dos toquen a la vez.

**Criterio de asesor financiero (motor en `src/lib/finance/engine.ts`)**
- **Disponible para gastar por día:** ingreso − gastos − fijos pendientes − meta de ahorro, repartido en los días que quedan.
- **Proyección de cierre:** mezcla el ritmo de gasto del mes con el promedio de los últimos 3 meses (al principio de mes pesa la historia, al final lo real).
- **Ingreso conservador:** si todavía no cobraron (menos del 60% de lo habitual), se estima con el promedio. Si ya cobraron, se usa lo real; no se cuenta con extras de otros meses.
- **Regla 50/30/20:** cada categoría es *necesidad*, *deseo* o *ahorro*.
- **Tasa de ahorro** real y proyectada, contra una meta configurable (20% por defecto).
- **Presupuestos por categoría** con marca de "dónde deberían estar hoy". Botón **Sugerir**: promedio de los últimos 3 meses, redondeado.
- **Fondo de emergencia:** objetivo sugerido de 6 meses de gastos esenciales; muestra cuántos meses cubre.
- **Metas** con fecha → cuánto aportar por mes. Los aportes cuentan como ahorro, no como gasto.
- **Peso de los fijos** (sano: menos del 50% del ingreso), **peso de las deudas** (alerta sobre el 20%) y **auditoría de suscripciones** (costo anual).
- **Puntaje de salud financiera (0–100):** ahorro 35, fijos 25, fondo de emergencia 25, presupuestos 15.
- **Consejos automáticos,** ordenados por urgencia: vencidos, presupuestos superados, categorías disparadas contra su promedio, déficit proyectado, etc.

**Para los dos**
- Un **hogar** con código de invitación. Todo se sincroniza **en tiempo real** entre los teléfonos.
- Cada movimiento muestra quién lo cargó. Exportación a CSV (Excel / Google Sheets).

**App instalable**
- Manifest, íconos (incluye *maskable*), service worker con página sin conexión y atajo "Cargar un gasto" desde el ícono.
- Ingreso con **código por email** (no link mágico): en iPhone el link abre Safari en vez de la app instalada; el código funciona en todos lados.
- Modo claro y oscuro (sistema, claro u oscuro).

---

## Puesta en marcha

### 1. Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. **SQL Editor → New query:** pegá todo `supabase/schema.sql` y apretá **Run**. Crea las tablas, la seguridad por hogar (RLS), las funciones y el tiempo real. Se puede volver a correr sin perder datos.
3. **Authentication → Sign In / Providers → Email:** dejalo habilitado.
4. **Authentication → Emails (Email Templates):** en **Magic Link** y en **Confirm signup**, poné el código en el cuerpo, por ejemplo:

   ```html
   <h2>Tu código para La Libreta de Casa</h2>
   <p style="font-size:28px;font-weight:700;letter-spacing:6px">{{ .Token }}</p>
   <p>Vence en una hora. Si no lo pediste, ignorá este mail.</p>
   ```

5. **Authentication → URL Configuration:** en *Site URL* poné la URL de Vercel (paso 3).
6. **Recomendado:** el email que trae Supabase de fábrica tiene un límite muy bajo de envíos por hora. Configurá un SMTP propio (por ejemplo, Resend o Brevo, ambos con plan gratis) en **Authentication → Emails → SMTP Settings**.
7. **Project Settings → API Keys:** copiá la *Project URL* y la *Publishable key* (o la *anon key* si tu proyecto la muestra).

### 2. Local

```bash
cp .env.example .env.local   # y completá las dos variables
npm install
npm run dev
```

Abrí http://localhost:3000. (El service worker solo se activa en producción.)

### 3. Vercel

1. Subí el proyecto a un repositorio de GitHub.
2. En [vercel.com/new](https://vercel.com/new) importá el repositorio (framework: Next.js, sin cambios).
3. En **Environment Variables** cargá:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (o `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. **Deploy.** Copiá la URL final al *Site URL* de Supabase (paso 1.5).

### 4. Primer uso

1. Una persona entra, recibe el código, elige **Crear nuestra libreta**.
2. En **Ajustes → Invitar a tu pareja** aparece el código de 6 letras; se envía con **Enviar**.
3. La otra persona entra con su email y elige **Tengo un código**.
4. Instalar en el teléfono:
   - **iPhone (Safari):** Compartir → *Agregar a inicio*.
   - **Android (Chrome):** menú → *Instalar app*. También aparece un botón en Ajustes.

---

## Estructura

```
supabase/schema.sql          Tablas, RLS, funciones (crear/unirse al hogar, aportes a metas) y realtime
src/proxy.ts                 Refresca la sesión y manda a /login a quien no entró (Next 16: "proxy" = ex middleware)
src/app/
  login/                     Ingreso con código por email
  bienvenida/                Crear la libreta o unirse con código
  (app)/                     La app (cáscara estática + datos del cliente)
    page.tsx                 Inicio: disponible por día, consejos, fijos, presupuestos, metas, últimos movimientos
    movimientos/             Búsqueda, filtros por tipo/persona/categoría, CSV
    plan/                    Fijos · Presupuestos (50/30/20 + sugerencias) · Metas
    analisis/                Salud financiera, recomendaciones, reparto del ingreso, categorías vs promedio, 6 meses
    ajustes/                 Perfil, invitación, moneda, meta de ahorro, categorías, tema, instalar
  manifest.ts                Manifest de la PWA
src/store/household.tsx      Estado central: carga, caché por mes, tiempo real y acciones optimistas
src/lib/finance/engine.ts    Motor financiero (funciones puras, con pruebas)
src/lib/smart.ts             Detección de categoría y atajos frecuentes
src/lib/{dates,money,types}.ts
src/components/              UI: hojas (vaul), teclado de montos, listas, gráficos
public/sw.js                 Service worker (cáscara offline; los datos nunca se cachean)
```

**Decisiones de diseño**
- **Datos del lado del cliente con RLS.** La seguridad la hace Postgres: cada persona solo ve las filas de su hogar (`is_member()`). Así la app abre al instante, funciona instalada y se actualiza en tiempo real sin servidor propio.
- **Escritura optimista.** Lo que cargás aparece al instante y se confirma en segundo plano; si falla, se revierte y avisa.
- **Montos en `numeric(14,2)`,** nunca en coma flotante en la base.

## Scripts

```bash
npm run dev        # desarrollo
npm run build      # build de producción
npm test           # pruebas del motor financiero (Vitest)
npm run lint
npm run typecheck
```
