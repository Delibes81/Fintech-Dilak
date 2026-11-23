# Fintech Dilak

App web instalable (PWA) de finanzas familiares: gastos, ingresos, fijos, presupuestos, metas de ahorro y un motor que analiza todo como un asesor financiero.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack, Cache Components, Partial Prefetching) |
| UI | **React 19.3** con **React Compiler** (memoización automática) |
| Estilos | **Tailwind CSS 4.3** · tokens propios en CSS · utilidad `cn()` (clsx + tailwind-merge, patrón shadcn/ui) |
| Animación | **Motion 14** (springs, layout animations, `layoutId`) · **React `<ViewTransition>`** para transiciones entre pantallas |
| Tipografía | **Geist Sans + Geist Mono** (números en monoespaciada) |
| Componentes | vaul (hojas) · sonner (notificaciones) · lucide-react (íconos) |
| Datos | **Supabase**: Auth con contraseña (2 usuarios fijos), Postgres con RLS, Realtime |
| Calidad | TypeScript 6 · ESLint 9 · **Vitest 5** |
| Paquetes | **pnpm 10 (obligatorio)** |
| Deploy | Vercel |

> **pnpm es obligatorio.** `package.json` fija `packageManager: pnpm@10.34.9` y un `preinstall` bloquea npm y yarn. Activalo con `corepack enable pnpm`.

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

**Interfaz y animaciones**
- Modo claro por defecto (oscuro y "según el sistema" en Ajustes). Fondo con cuadrícula y brillos, tarjeta principal con borde de luz que gira.
- Transiciones direccionales entre secciones (View Transitions del navegador vía React): la pantalla se desliza hacia la izquierda o la derecha según la pestaña.
- Números que cuentan hasta su valor, curva de gasto del mes que se dibuja sola, barras y anillos que se llenan con resorte.
- Indicadores que se deslizan (navegación, selectores, categoría elegida), dígitos del monto que entran animados, check de confirmación al guardar.
- Tarjetas con halo que sigue al mouse en la compu. Todo respeta "reducir movimiento" del sistema.
- Compu: barra lateral con atajo **N** para cargar. Celular: dock flotante con botón central.

**Para los dos**
- Un solo **hogar** compartido por los dos usuarios. Todo se sincroniza **en tiempo real** entre los teléfonos.
- Cada movimiento muestra quién lo cargó. Exportación a CSV (Excel / Google Sheets).

**App instalable**
- Manifest, íconos (incluye *maskable*), service worker con página sin conexión y atajo "Cargar un gasto" desde el ícono.
- **Acceso privado para dos personas:** pantalla con los dos perfiles + contraseña. Sin registro público; los emails se resuelven en el servidor.
- Modo claro y oscuro (sistema, claro u oscuro).

---

## Puesta en marcha

### 1. Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. **SQL Editor → New query:** pegá todo `supabase/schema.sql` y apretá **Run**. Crea las tablas, la seguridad (RLS), las funciones y el tiempo real. Se puede volver a correr sin perder datos.
3. **Cerrá el registro público:** *Authentication → Sign In / Providers →* desactivá **Allow new users to sign up**. Así nadie más puede crear cuentas.
4. **Creá los dos usuarios:** *Authentication → Users → Add user → Create new user*. Para cada uno, poné email y contraseña y tildá **Auto Confirm User**. Una para Delibes y otra para Liliana. Los emails no reciben ningún correo; sirven solo como identificador.
5. **Vinculalos al hogar:** en *SQL Editor* corré (con sus emails y nombres):

   ```sql
   select public.setup_household(
     'Casa Dilak',                                        -- nombre del hogar
     'ARS',                                               -- moneda
     array['email-de-delibes@ejemplo.com', 'email-de-liliana@ejemplo.com'],
     array['Delibes', 'Liliana']
   );
   ```

   Crea el hogar, los suma a los dos y carga las categorías iniciales. Se puede volver a correr (por ejemplo, para cambiar un nombre) sin duplicar nada.
6. **Project Settings → API Keys:** copiá la *Project URL* y la *Publishable key* (o la *anon key* si tu proyecto la muestra).

### 2. Local

```bash
corepack enable pnpm
cp .env.example .env.local   # completá Supabase y los dos usuarios
pnpm install
pnpm dev
```

Abrí http://localhost:3000. (El service worker solo se activa en producción.)

### 3. Vercel

1. Subí el proyecto a un repositorio de GitHub.
2. En [vercel.com/new](https://vercel.com/new) importá el repositorio. Vercel detecta Next.js y **pnpm** solo (por `pnpm-lock.yaml` y `packageManager`), sin tocar nada.
3. En **Environment Variables** cargá:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (o `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `DILAK_USER_1_NAME=Delibes` y `DILAK_USER_1_EMAIL` (tu email)
   - `DILAK_USER_2_NAME=Liliana` y `DILAK_USER_2_EMAIL` (el de Liliana)

   Los emails van en variables **privadas** (sin `NEXT_PUBLIC_`): nunca se publican en la página.
4. **Deploy.**

### 4. Primer uso

1. Abrí la app: aparecen las dos tarjetas (Delibes y Liliana). Tocá la tuya y poné tu contraseña.
2. La sesión queda guardada en el dispositivo y la app recuerda el último perfil usado.
3. Cada uno puede cambiar su contraseña en **Ajustes → Seguridad**. Si alguien la olvida, se cambia desde *Supabase → Authentication → Users*.
4. Instalar en el teléfono:
   - **iPhone (Safari):** Compartir → *Agregar a inicio*.
   - **Android (Chrome):** menú → *Instalar app*. También aparece un botón en Ajustes.

---

## Estructura

```
supabase/schema.sql          Tablas, RLS, funciones (setup_household, aportes a metas) y realtime
src/lib/users.ts             Los dos usuarios (variables de entorno privadas)
src/proxy.ts                 Refresca la sesión y manda a /login a quien no entró (Next 16: "proxy" = ex middleware)
src/app/
  login/                     Elegir perfil + contraseña (Server Action; el email nunca va al navegador)
  (app)/                     La app (cáscara estática + datos del cliente)
    page.tsx                 Inicio: disponible por día, consejos, fijos, presupuestos, metas, últimos movimientos
    movimientos/             Búsqueda, filtros por tipo/persona/categoría, CSV
    plan/                    Fijos · Presupuestos (50/30/20 + sugerencias) · Metas
    analisis/                Salud financiera, recomendaciones, reparto del ingreso, categorías vs promedio, 6 meses
    ajustes/                 Perfil, seguridad (contraseña), moneda, meta de ahorro, categorías, tema, instalar
  manifest.ts                Manifest de la PWA
src/store/household.tsx      Estado central: carga, caché por mes, tiempo real y acciones optimistas
src/lib/finance/engine.ts    Motor financiero (funciones puras, con pruebas)
src/lib/smart.ts             Detección de categoría y atajos frecuentes
src/lib/{dates,money,types}.ts
src/components/
  motion/                    Reveal, NumberTicker, PageTransition (ViewTransition), SpotlightCard, MotionProvider
  brand/                     Logo de Dilak y fondo animado de acceso
  ui/ tx/ fijos/ plan/ charts/  Hojas, teclado de montos, listas y gráficos animados
public/sw.js                 Service worker (cáscara offline; los datos nunca se cachean)
```

**Decisiones de diseño**
- **Datos del lado del cliente con RLS.** La seguridad la hace Postgres: cada persona solo ve las filas de su hogar (`is_member()`). Así la app abre al instante, funciona instalada y se actualiza en tiempo real sin servidor propio.
- **Escritura optimista.** Lo que cargás aparece al instante y se confirma en segundo plano; si falla, se revierte y avisa.
- **Montos en `numeric(14,2)`,** nunca en coma flotante en la base.

## Scripts

```bash
pnpm dev           # desarrollo
pnpm build         # build de producción
pnpm test          # pruebas del motor financiero (Vitest)
pnpm lint
pnpm typecheck
```
