-- ============================================================================
-- La Libreta de Casa · Esquema de Supabase
-- Ejecutar completo en: Supabase → SQL Editor → New query → Run.
-- Es idempotente en lo posible: se puede volver a correr sin perder datos.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

-- Un hogar agrupa a las personas que comparten las finanzas.
create table if not exists public.households (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null default 'Nuestra casa',
  currency           text not null default 'ARS',
  savings_target_pct int  not null default 20 check (savings_target_pct between 0 and 90),
  invite_code        text not null unique default upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 6)),
  created_at         timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null default '',
  color        text not null default 'blue',
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index if not exists household_members_user_idx on public.household_members(user_id);

-- bucket: clasificación 50/30/20 → need (necesidad), want (deseo), saving (ahorro)
create table if not exists public.categories (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households(id) on delete cascade,
  name           text not null,
  kind           text not null check (kind in ('expense', 'income')),
  bucket         text check (bucket in ('need', 'want', 'saving')),
  icon           text not null default 'circle',
  color          text not null default 'slate',
  keywords       text[] not null default '{}',
  monthly_budget numeric(14,2) check (monthly_budget is null or monthly_budget >= 0),
  sort           int not null default 100,
  archived       boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists categories_household_idx on public.categories(household_id);

-- Gastos fijos: servicios, suscripciones, alquiler, cuotas.
create table if not exists public.recurring (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name         text not null,
  amount       numeric(14,2) not null check (amount > 0),
  category_id  uuid references public.categories(id) on delete set null,
  frequency    text not null default 'monthly' check (frequency in ('monthly', 'yearly')),
  due_day      int  not null default 10 check (due_day between 1 and 31),
  due_month    int  check (due_month between 1 and 12),
  active       boolean not null default true,
  created_by   uuid references auth.users(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now()
);
create index if not exists recurring_household_idx on public.recurring(household_id);

-- Metas de ahorro (incluye el fondo de emergencia).
create table if not exists public.goals (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  name          text not null,
  kind          text not null default 'goal' check (kind in ('emergency', 'goal')),
  target_amount numeric(14,2) not null check (target_amount > 0),
  saved_amount  numeric(14,2) not null default 0 check (saved_amount >= 0),
  target_date   date,
  archived      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists goals_household_idx on public.goals(household_id);

create table if not exists public.transactions (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  kind         text not null check (kind in ('expense', 'income')),
  amount       numeric(14,2) not null check (amount > 0),
  category_id  uuid references public.categories(id) on delete set null,
  note         text not null default '',
  occurred_on  date not null default current_date,
  recurring_id uuid references public.recurring(id) on delete set null,
  goal_id      uuid references public.goals(id) on delete set null,
  created_by   uuid references auth.users(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  period       int generated always as ((extract(year from occurred_on)::int * 100) + extract(month from occurred_on)::int) stored
);
create index if not exists transactions_household_date_idx on public.transactions(household_id, occurred_on desc);
-- Un fijo se puede pagar una sola vez por mes (evita doble pago si los dos tocan "Pagar").
create unique index if not exists transactions_recurring_once_idx
  on public.transactions(recurring_id, period) where recurring_id is not null;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists transactions_touch on public.transactions;
create trigger transactions_touch before update on public.transactions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Seguridad (RLS): cada persona solo ve los datos de su hogar
-- ---------------------------------------------------------------------------

-- Permisos de la API para usuarios con sesión. Los proyectos nuevos de Supabase ya no
-- los dan por defecto; sin esto la app no puede leer nada. Lo que cada persona ve lo
-- siguen limitando las políticas RLS de abajo. Los visitantes sin sesión (anon) no
-- reciben ningún permiso.
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.households, public.household_members, public.categories,
  public.recurring, public.goals, public.transactions
  to authenticated;

create or replace function public.is_member(hid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.household_members where household_id = hid and user_id = auth.uid());
$$;

alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.categories        enable row level security;
alter table public.recurring         enable row level security;
alter table public.goals             enable row level security;
alter table public.transactions      enable row level security;

drop policy if exists households_select on public.households;
create policy households_select on public.households for select to authenticated using (public.is_member(id));
drop policy if exists households_update on public.households;
create policy households_update on public.households for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

drop policy if exists members_select on public.household_members;
create policy members_select on public.household_members for select to authenticated using (public.is_member(household_id));
drop policy if exists members_update_self on public.household_members;
create policy members_update_self on public.household_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists members_delete_self on public.household_members;
create policy members_delete_self on public.household_members for delete to authenticated using (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['categories', 'recurring', 'goals', 'transactions'] loop
    execute format('drop policy if exists %1$s_all on public.%1$s', t);
    execute format(
      'create policy %1$s_all on public.%1$s for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Funciones (RPC)
-- ---------------------------------------------------------------------------

-- Funciones de versiones anteriores (registro abierto, invitaciones): ya no se usan.
drop function if exists public.create_household(text, text, text);
drop function if exists public.join_household(text, text);
drop function if exists public.regenerate_invite_code(uuid);

-- Categorías iniciales de un hogar (solo si todavía no tiene ninguna).
create or replace function public.seed_categories(hid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from categories where household_id = hid) then return; end if;
  insert into categories (household_id, name, kind, bucket, icon, color, sort, keywords) values
    (hid, 'Supermercado',       'expense', 'need',   'cart',       'green',   10, array['super','supermercado','mercado','almacen','chino','verduleria','verdura','fruta','carniceria','carne','coto','carrefour','jumbo','disco','vea','walmart','soriana','chedraui','despensa','compras','kiosco','panaderia','pan','dietetica']),
    (hid, 'Comida afuera',      'expense', 'want',   'utensils',   'orange',  20, array['restaurante','resto','cena','almuerzo','desayuno','merienda','delivery','rappi','pedidosya','pizza','empanadas','cafe','cafeteria','helado','bar','hamburguesa','burger','sushi','cerveza','birra','starbucks','comida','parrilla','tacos']),
    (hid, 'Transporte',         'expense', 'need',   'car',        'blue',    30, array['nafta','gasolina','combustible','ypf','shell','axion','uber','cabify','didi','taxi','remis','sube','colectivo','subte','peaje','estacionamiento','cochera','tren','metro','bus','auto','mecanico','gomeria','service','patente','vtv']),
    (hid, 'Vivienda',           'expense', 'need',   'home',       'violet',  40, array['alquiler','renta','expensas','hipoteca','abl','inmobiliario','predial']),
    (hid, 'Servicios',          'expense', 'need',   'zap',        'yellow',  50, array['luz','edenor','edesur','gas','metrogas','agua','aysa','internet','wifi','fibertel','celular','telefono','movistar','claro','personal','cable','seguro','cfe','telmex']),
    (hid, 'Suscripciones',      'expense', 'want',   'repeat',     'magenta', 60, array['netflix','spotify','disney','hbo','max','prime','youtube','icloud','chatgpt','claude','paramount','apple','suscripcion','gimnasio','gym','crunchyroll']),
    (hid, 'Salud',              'expense', 'need',   'heart',      'red',     70, array['farmacia','medico','doctor','dentista','odontologo','prepaga','osde','swiss','remedios','medicamentos','analisis','psicologo','terapia','clinica','lentes','pediatra']),
    (hid, 'Hogar',              'expense', 'need',   'sofa',       'aqua',    80, array['ferreteria','limpieza','muebles','deco','arreglo','plomero','electricista','pintura','electrodomestico','bazar','easy','sodimac','ikea','lavanderia']),
    (hid, 'Educación',          'expense', 'need',   'graduation', 'blue',    90, array['colegio','escuela','jardin','curso','libro','libros','universidad','facultad','utiles','clases','ingles','matricula']),
    (hid, 'Deudas y cuotas',    'expense', 'need',   'card',       'red',    100, array['tarjeta','visa','mastercard','amex','prestamo','cuota','cuotas','credito','deuda','resumen']),
    (hid, 'Ocio y salidas',     'expense', 'want',   'ticket',     'magenta',110, array['cine','salida','teatro','recital','show','entradas','juego','juegos','steam','playstation','boliche','paseo','museo']),
    (hid, 'Viajes',             'expense', 'want',   'plane',      'aqua',   120, array['viaje','hotel','vuelo','pasaje','pasajes','airbnb','vacaciones','hospedaje','excursion']),
    (hid, 'Ropa',               'expense', 'want',   'shirt',      'violet', 130, array['ropa','zapatillas','zapatos','remera','pantalon','campera','vestido','calzado','buzo','camisa','jean']),
    (hid, 'Mascotas',           'expense', 'need',   'paw',        'orange', 140, array['veterinaria','vete','veterinario','perro','gato','balanceado','petshop','mascota']),
    (hid, 'Regalos',            'expense', 'want',   'gift',       'yellow', 150, array['regalo','regalos','cumple','cumpleanos']),
    (hid, 'Otros gastos',       'expense', 'want',   'dots',       'slate',  990, array[]::text[]),
    (hid, 'Ahorro e inversión', 'expense', 'saving', 'piggy',      'green',  995, array['ahorro','ahorre','inversion','invertir','plazo','fci','dolares','usd','cripto','fondo']),
    (hid, 'Sueldo',             'income',  null,     'briefcase',  'green',   10, array['sueldo','salario','aguinaldo','nomina','quincena','haberes']),
    (hid, 'Extras / freelance', 'income',  null,     'sparkles',   'blue',    20, array['freelance','cliente','factura','proyecto','honorarios','changa','bono','comision']),
    (hid, 'Otros ingresos',     'income',  null,     'coins',      'slate',  990, array['venta','vendi','reintegro','devolucion','interes','intereses','rendimiento','cobre','cobro']);
end $$;

-- Configura el hogar con sus DOS únicos usuarios (se corre una vez desde el SQL Editor).
-- Los usuarios se crean antes en Authentication → Users → Add user. Es idempotente:
-- si el hogar ya existe lo reutiliza, y actualiza nombres sin duplicar nada.
create or replace function public.setup_household(
  p_name text, p_currency text, p_emails text[], p_names text[]
) returns uuid language plpgsql security definer set search_path = public, auth as $$
declare hid uuid; uid uuid; i int; colors text[] := array['blue', 'magenta', 'aqua', 'orange'];
begin
  if coalesce(array_length(p_emails, 1), 0) = 0 or array_length(p_emails, 1) <> array_length(p_names, 1) then
    raise exception 'Pasá la misma cantidad de emails y de nombres';
  end if;
  select id into hid from households order by created_at limit 1;
  if hid is null then
    insert into households (name, currency) values (coalesce(nullif(trim(p_name), ''), 'Nuestra casa'), coalesce(p_currency, 'ARS')) returning id into hid;
  else
    update households set name = coalesce(nullif(trim(p_name), ''), name), currency = coalesce(p_currency, currency) where id = hid;
  end if;
  for i in 1 .. array_length(p_emails, 1) loop
    select id into uid from auth.users where lower(email) = lower(trim(p_emails[i]));
    if uid is null then
      raise exception 'No existe el usuario %. Crealo primero en Authentication → Users → Add user', p_emails[i];
    end if;
    insert into household_members (household_id, user_id, display_name, color)
      values (hid, uid, trim(p_names[i]), colors[1 + ((i - 1) % 4)])
      on conflict (household_id, user_id) do update set display_name = excluded.display_name;
  end loop;
  perform public.seed_categories(hid);
  return hid;
end $$;

-- Aporte (monto positivo) o retiro (monto negativo) de una meta.
-- El aporte queda registrado como movimiento en "Ahorro e inversión".
create or replace function public.contribute_goal(p_goal uuid, p_amount numeric, p_date date default current_date)
returns void language plpgsql security definer set search_path = public as $$
declare g goals; cat uuid;
begin
  select * into g from goals where id = p_goal;
  if g.id is null or not public.is_member(g.household_id) then raise exception 'not_found'; end if;
  if p_amount = 0 then return; end if;
  update goals set saved_amount = greatest(0, saved_amount + p_amount) where id = p_goal;
  if p_amount > 0 then
    select id into cat from categories where household_id = g.household_id and bucket = 'saving' and not archived order by sort limit 1;
    insert into transactions (household_id, kind, amount, category_id, note, occurred_on, goal_id)
      values (g.household_id, 'expense', p_amount, cat, 'Aporte: ' || g.name, coalesce(p_date, current_date), g.id);
  end if;
end $$;

revoke all on function public.seed_categories(uuid) from public, anon, authenticated;
revoke all on function public.setup_household(text, text, text[], text[]) from public, anon, authenticated;
revoke all on function public.contribute_goal(uuid, numeric, date) from public, anon;
grant execute on function public.contribute_goal(uuid, numeric, date) to authenticated;
grant execute on function public.is_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Tiempo real: los cambios de uno aparecen al instante en el teléfono del otro
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['households', 'household_members', 'categories', 'recurring', 'goals', 'transactions'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
