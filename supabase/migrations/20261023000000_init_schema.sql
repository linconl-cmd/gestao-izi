-- =============================================================================
-- gestao-izi · Fase 1 · Schema multi-tenant + RLS
-- Executar no SQL Editor do Supabase (ou `supabase db push`).
--
-- Modelo de segurança
--   * Tenant = store. Todo dado de negócio carrega store_id.
--   * Claims lidas do JWT:  auth.jwt() -> 'app_metadata' ->> 'role' | 'store_id'
--     (app_metadata só é gravável pelo servidor/service role, nunca pelo usuário).
--   * profiles é a fonte da verdade; um trigger copia role/store_id para
--     auth.users.raw_app_meta_data, que o Supabase embute no JWT.
--   * FKs compostas (store_id, id) impedem referências cruzadas entre lojas.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Enums
-- -----------------------------------------------------------------------------
create type public.user_role            as enum ('master', 'owner', 'seller');
create type public.payment_method       as enum ('cash', 'credit_card', 'debit_card', 'pix', 'store_credit', 'other');
create type public.sale_status          as enum ('completed', 'cancelled');
create type public.cash_register_status as enum ('open', 'closed');

-- -----------------------------------------------------------------------------
-- 2. Schema privado + helpers de claims (não expostos pela API REST)
-- -----------------------------------------------------------------------------
create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.jwt_role()
returns public.user_role
language sql stable
set search_path = ''
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'role', '')::public.user_role
$$;

create or replace function private.jwt_store_id()
returns uuid
language sql stable
set search_path = ''
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'store_id', '')::uuid
$$;

grant execute on function private.jwt_role(), private.jwt_store_id() to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Tabelas
-- -----------------------------------------------------------------------------
create table public.stores (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  document    text,                          -- CNPJ
  email       text,
  phone       text,
  address     jsonb not null default '{}'::jsonb,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  store_id    uuid references public.stores (id) on delete restrict,
  role        public.user_role not null default 'seller',
  full_name   text not null,
  email       text,
  avatar_url  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- seller sem loja = conta ainda não provisionada: inerte (nenhuma policy casa store_id nulo)
  constraint profiles_owner_needs_store check (role <> 'owner' or store_id is not null)
);
create index profiles_store_id_idx on public.profiles (store_id);

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores (id) on delete cascade,
  parent_id   uuid,
  name        text not null check (length(trim(name)) > 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (store_id, id),
  unique (store_id, name),
  foreign key (store_id, parent_id) references public.categories (store_id, id) on delete set null (parent_id)
);

create table public.products (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references public.stores (id) on delete cascade,
  category_id  uuid,
  name         text not null check (length(trim(name)) > 0),
  description  text,
  brand        text,
  base_price   numeric(12,2) not null check (base_price >= 0),
  image_url    text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (store_id, id),
  foreign key (store_id, category_id) references public.categories (store_id, id) on delete set null (category_id)
);
create index products_store_active_idx on public.products (store_id, is_active);
create index products_category_idx     on public.products (store_id, category_id);

-- Custo isolado: vendedores NÃO podem ver preço de custo/margem.
create table public.product_costs (
  product_id  uuid primary key,
  store_id    uuid not null,
  cost_price  numeric(12,2) not null check (cost_price >= 0),
  updated_at  timestamptz not null default now(),
  foreign key (store_id, product_id) references public.products (store_id, id) on delete cascade
);
create index product_costs_store_idx on public.product_costs (store_id);

create table public.product_variants (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null,
  product_id      uuid not null,
  size            text,
  color           text,
  sku             text not null check (length(trim(sku)) > 0),
  barcode         text,
  price           numeric(12,2) check (price >= 0),       -- null = usa products.base_price
  stock_quantity  integer not null default 0 check (stock_quantity >= 0),
  min_stock       integer not null default 0 check (min_stock >= 0),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (store_id, id),
  unique (store_id, sku),
  unique (store_id, barcode),
  foreign key (store_id, product_id) references public.products (store_id, id) on delete cascade
);
create index product_variants_product_idx on public.product_variants (store_id, product_id);
create index product_variants_low_stock_idx on public.product_variants (store_id)
  where stock_quantity <= min_stock;

create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  document    text,                          -- CPF
  email       text,
  phone       text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (store_id, id)
);
create unique index customers_store_document_uq on public.customers (store_id, document)
  where document is not null;

create table public.cash_registers (
  id               uuid primary key default gen_random_uuid(),
  store_id         uuid not null references public.stores (id) on delete cascade,
  opened_by        uuid not null references public.profiles (id),
  closed_by        uuid references public.profiles (id),
  status           public.cash_register_status not null default 'open',
  opening_amount   numeric(12,2) not null default 0 check (opening_amount >= 0),
  closing_amount   numeric(12,2) check (closing_amount >= 0),
  expected_amount  numeric(12,2),
  notes            text,
  opened_at        timestamptz not null default now(),
  closed_at        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (store_id, id),
  constraint cash_registers_closed_consistency
    check ((status = 'open' and closed_at is null) or (status = 'closed' and closed_at is not null))
);
-- Um caixa aberto por operador.
create unique index cash_registers_one_open_per_user_uq on public.cash_registers (opened_by)
  where status = 'open';
create index cash_registers_store_idx on public.cash_registers (store_id, opened_at desc);

create table public.sales (
  id                uuid primary key default gen_random_uuid(),
  store_id          uuid not null references public.stores (id) on delete cascade,
  seller_id         uuid not null references public.profiles (id),
  cash_register_id  uuid not null,
  customer_id       uuid,
  payment_method    public.payment_method not null,
  status            public.sale_status not null default 'completed',
  subtotal          numeric(12,2) not null default 0 check (subtotal >= 0),   -- mantido por trigger
  discount          numeric(12,2) not null default 0 check (discount >= 0),
  total             numeric(12,2) not null default 0 check (total >= 0),      -- mantido por trigger
  notes             text,
  cancelled_at      timestamptz,
  cancelled_by      uuid references public.profiles (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (store_id, id),
  foreign key (store_id, cash_register_id) references public.cash_registers (store_id, id),
  foreign key (store_id, customer_id)      references public.customers (store_id, id)
);
create index sales_store_created_idx  on public.sales (store_id, created_at desc);
create index sales_seller_created_idx on public.sales (store_id, seller_id, created_at desc);
create index sales_register_idx       on public.sales (cash_register_id);
create index sales_customer_idx       on public.sales (store_id, customer_id) where customer_id is not null;

create table public.sale_items (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid not null,
  sale_id        uuid not null,
  variant_id     uuid not null,
  -- snapshots preenchidos por trigger (histórico imutável)
  product_name   text not null,
  variant_label  text,
  sku            text not null,
  quantity       integer not null check (quantity > 0),
  unit_price     numeric(12,2) not null check (unit_price >= 0),
  discount       numeric(12,2) not null default 0 check (discount >= 0),
  total          numeric(12,2) generated always as (quantity * unit_price - discount) stored,
  created_at     timestamptz not null default now(),
  check (discount <= quantity * unit_price),
  foreign key (store_id, sale_id)    references public.sales (store_id, id) on delete cascade,
  foreign key (store_id, variant_id) references public.product_variants (store_id, id)
);
create index sale_items_sale_idx    on public.sale_items (sale_id);
create index sale_items_variant_idx on public.sale_items (store_id, variant_id);

-- -----------------------------------------------------------------------------
-- 4. Triggers utilitários
-- -----------------------------------------------------------------------------

-- 4.1 updated_at
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'stores','profiles','categories','products','product_costs',
    'product_variants','customers','cash_registers','sales'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function private.set_updated_at()', t);
  end loop;
end $$;

-- 4.2 auth.users -> profiles
-- Role e loja vêm de raw_app_meta_data (definido pelo servidor via Admin API).
-- raw_user_meta_data é controlado pelo usuário e NUNCA é usado para privilégios.
-- Sem app_metadata o perfil nasce como 'seller' sem loja: não enxerga nada até ser
-- provisionado. Desative "Allow new users to sign up" no Auth do Supabase.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, store_id, role, full_name, email)
  values (
    new.id,
    nullif(new.raw_app_meta_data ->> 'store_id', '')::uuid,
    coalesce(nullif(new.raw_app_meta_data ->> 'role', '')::public.user_role, 'seller'),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- 4.3 profiles -> auth.users.raw_app_meta_data (claims do JWT)
-- Efeito no JWT após o próximo refresh do token (<= 1h; force com refreshSession()).
create or replace function private.sync_profile_claims()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                             || jsonb_build_object('role', new.role, 'store_id', new.store_id)
   where id = new.id;
  return new;
end;
$$;

create trigger sync_claims
  after update of role, store_id on public.profiles
  for each row execute function private.sync_profile_claims();

-- 4.4 Anti-escalonamento de privilégio em profiles / stores
-- auth.uid() nulo = service role / SQL editor / migrações: liberado.
create or replace function private.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or private.jwt_role() = 'master' then
    return new;
  end if;
  if new.role is distinct from old.role or new.store_id is distinct from old.store_id then
    raise exception 'role and store_id can only be changed by master' using errcode = '42501';
  end if;
  if new.is_active is distinct from old.is_active and new.id = auth.uid() then
    raise exception 'cannot change own active status' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_profile_update
  before update on public.profiles
  for each row execute function private.guard_profile_update();

create or replace function private.guard_store_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or private.jwt_role() = 'master' then
    return new;
  end if;
  if new.is_active is distinct from old.is_active or new.slug is distinct from old.slug then
    raise exception 'only master can change slug or active status' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_store_update
  before update on public.stores
  for each row execute function private.guard_store_update();

-- -----------------------------------------------------------------------------
-- 5. Regras de negócio no banco (caixa, vendas, estoque)
-- -----------------------------------------------------------------------------

-- 5.1 Fechamento de caixa: carimba quem/quando e calcula o esperado em dinheiro.
create or replace function private.cash_register_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'closed' then
    raise exception 'closed cash register is immutable';
  end if;
  if new.store_id is distinct from old.store_id
     or new.opened_by is distinct from old.opened_by
     or new.opening_amount is distinct from old.opening_amount then
    raise exception 'store_id, opened_by and opening_amount are immutable';
  end if;
  if new.status = 'closed' then
    new.closed_at := now();
    new.closed_by := coalesce(auth.uid(), new.closed_by, old.opened_by);
    new.expected_amount := old.opening_amount + coalesce((
      select sum(s.total) from public.sales s
       where s.cash_register_id = old.id
         and s.store_id = old.store_id
         and s.payment_method = 'cash'
         and s.status = 'completed'
    ), 0);
  end if;
  return new;
end;
$$;

create trigger cash_register_before_update
  before update on public.cash_registers
  for each row execute function private.cash_register_before_update();

-- 5.2 Venda: caixa aberto do próprio vendedor; totais são sempre calculados.
create or replace function private.sales_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reg public.cash_registers;
begin
  select * into v_reg from public.cash_registers
   where id = new.cash_register_id and store_id = new.store_id;
  if not found or v_reg.status <> 'open' then
    raise exception 'cash register is not open';
  end if;
  if v_reg.opened_by <> new.seller_id then
    raise exception 'cash register belongs to another user' using errcode = '42501';
  end if;
  new.status       := 'completed';
  new.subtotal     := 0;
  new.total        := 0;
  new.cancelled_at := null;
  new.cancelled_by := null;
  return new;
end;
$$;

create trigger sales_before_insert
  before insert on public.sales
  for each row execute function private.sales_before_insert();

-- 5.3 Cancelamento: único update permitido (completed -> cancelled) + estorno de estoque.
create or replace function private.sales_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- depth 1 = UPDATE direto do cliente; o recálculo de totais vem de trigger (depth > 1)
  if pg_trigger_depth() = 1 and (
        new.store_id         is distinct from old.store_id
     or new.seller_id        is distinct from old.seller_id
     or new.cash_register_id is distinct from old.cash_register_id
     or new.payment_method   is distinct from old.payment_method
     or new.subtotal         is distinct from old.subtotal
     or new.discount         is distinct from old.discount
     or new.total            is distinct from old.total) then
    raise exception 'sale financial data is immutable';
  end if;
  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'cancelled sale cannot be reopened';
  end if;
  if old.status = 'completed' and new.status = 'cancelled' then
    new.cancelled_at := now();
    new.cancelled_by := auth.uid();
    update public.product_variants v
       set stock_quantity = v.stock_quantity + i.quantity
      from public.sale_items i
     where i.sale_id = old.id
       and v.id = i.variant_id
       and v.store_id = i.store_id;
  end if;
  return new;
end;
$$;

create trigger sales_before_update
  before update on public.sales
  for each row execute function private.sales_before_update();

-- 5.4 Item: preço/nome vêm do catálogo (cliente não define preço), só na mesma
--     transação da venda (use public.create_sale), baixa estoque e recalcula totais.
create or replace function private.sale_items_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale  public.sales;
  v_row   record;
begin
  select * into v_sale from public.sales
   where id = new.sale_id and store_id = new.store_id;
  if not found
     or v_sale.status <> 'completed'
     or v_sale.created_at <> transaction_timestamp() then
    raise exception 'items can only be added while creating the sale (use create_sale)';
  end if;

  select p.name, v.size, v.color, v.sku, coalesce(v.price, p.base_price) as price
    into v_row
    from public.product_variants v
    join public.products p on p.id = v.product_id and p.store_id = v.store_id
   where v.id = new.variant_id and v.store_id = new.store_id
     and v.is_active and p.is_active;
  if not found then
    raise exception 'variant not found or inactive';
  end if;

  new.product_name  := v_row.name;
  new.variant_label := nullif(concat_ws(' / ', v_row.size, v_row.color), '');
  new.sku           := v_row.sku;
  new.unit_price    := v_row.price;
  return new;
end;
$$;

create trigger sale_items_before_insert
  before insert on public.sale_items
  for each row execute function private.sale_items_before_insert();

create or replace function private.sale_items_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.product_variants
     set stock_quantity = stock_quantity - new.quantity
   where id = new.variant_id and store_id = new.store_id
     and stock_quantity >= new.quantity;
  if not found then
    raise exception 'insufficient stock for sku %', new.sku using errcode = 'P0001';
  end if;

  update public.sales s
     set subtotal = t.sum_total,
         total    = greatest(t.sum_total - s.discount, 0)
    from (select coalesce(sum(total), 0) as sum_total
            from public.sale_items where sale_id = new.sale_id) t
   where s.id = new.sale_id;

  return null;
end;
$$;

create trigger sale_items_after_insert
  after insert on public.sale_items
  for each row execute function private.sale_items_after_insert();

-- 5.5 RPC atômica de venda (SECURITY INVOKER: RLS e triggers se aplicam).
create or replace function public.create_sale(
  p_cash_register_id uuid,
  p_payment_method   public.payment_method,
  p_items            jsonb,                 -- [{"variant_id": "...", "quantity": 1, "discount": 0}]
  p_customer_id      uuid    default null,
  p_discount         numeric default 0,
  p_notes            text    default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_store uuid := private.jwt_store_id();
  v_sale  uuid;
  v_item  jsonb;
begin
  if v_store is null or auth.uid() is null then
    raise exception 'no store context' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'sale must have at least one item';
  end if;

  insert into public.sales (store_id, seller_id, cash_register_id, customer_id,
                            payment_method, discount, notes)
  values (v_store, auth.uid(), p_cash_register_id, p_customer_id,
          p_payment_method, coalesce(p_discount, 0), p_notes)
  returning id into v_sale;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.sale_items (store_id, sale_id, variant_id, quantity, discount)
    values (v_store, v_sale,
            (v_item ->> 'variant_id')::uuid,
            (v_item ->> 'quantity')::int,
            coalesce((v_item ->> 'discount')::numeric, 0));
  end loop;

  return v_sale;
end;
$$;

revoke execute on function public.create_sale(uuid, public.payment_method, jsonb, uuid, numeric, text) from public, anon;
grant  execute on function public.create_sale(uuid, public.payment_method, jsonb, uuid, numeric, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Privilégios de tabela (RLS faz o filtro fino)
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

grant select, insert, update, delete on
  public.stores, public.profiles, public.categories, public.products,
  public.product_costs, public.product_variants, public.customers
  to authenticated;
grant select, insert, update on public.cash_registers, public.sales to authenticated;
grant select, insert         on public.sale_items to authenticated;   -- ledger imutável

-- -----------------------------------------------------------------------------
-- 7. Row Level Security (habilitado em TODAS as tabelas)
-- -----------------------------------------------------------------------------
alter table public.stores           enable row level security;
alter table public.profiles         enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_costs    enable row level security;
alter table public.product_variants enable row level security;
alter table public.customers        enable row level security;
alter table public.cash_registers   enable row level security;
alter table public.sales            enable row level security;
alter table public.sale_items       enable row level security;

-- Convenção: (select private.jwt_*()) em subselect => avaliado uma vez por query (initplan).

-- ---- stores -----------------------------------------------------------------
create policy stores_master_all on public.stores
  for all to authenticated
  using      ((select private.jwt_role()) = 'master')
  with check ((select private.jwt_role()) = 'master');

create policy stores_member_select on public.stores
  for select to authenticated
  using (id = (select private.jwt_store_id()));

create policy stores_owner_update on public.stores
  for update to authenticated
  using      (id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'owner')
  with check (id = (select private.jwt_store_id()));

-- ---- profiles ---------------------------------------------------------------
-- INSERT/DELETE: só via trigger de auth.users / cascade / service role.
create policy profiles_master_all on public.profiles
  for all to authenticated
  using      ((select private.jwt_role()) = 'master')
  with check ((select private.jwt_role()) = 'master');

create policy profiles_self_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_owner_select on public.profiles
  for select to authenticated
  using (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'owner');

create policy profiles_self_update on public.profiles
  for update to authenticated
  using      (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy profiles_owner_update_sellers on public.profiles
  for update to authenticated
  using      (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'owner' and role = 'seller')
  with check (store_id = (select private.jwt_store_id()) and role = 'seller');

-- ---- categories -------------------------------------------------------------
create policy categories_master_select on public.categories
  for select to authenticated
  using ((select private.jwt_role()) = 'master');

create policy categories_owner_all on public.categories
  for all to authenticated
  using      (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'owner')
  with check (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'owner');

create policy categories_seller_select on public.categories
  for select to authenticated
  using (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'seller');

-- ---- products ---------------------------------------------------------------
create policy products_master_select on public.products
  for select to authenticated
  using ((select private.jwt_role()) = 'master');

create policy products_owner_all on public.products
  for all to authenticated
  using      (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'owner')
  with check (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'owner');

create policy products_seller_select on public.products
  for select to authenticated
  using (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'seller' and is_active);

-- ---- product_costs (somente owner; vendedor nunca vê custo) -----------------
create policy product_costs_master_select on public.product_costs
  for select to authenticated
  using ((select private.jwt_role()) = 'master');

create policy product_costs_owner_all on public.product_costs
  for all to authenticated
  using      (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'owner')
  with check (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'owner');

-- ---- product_variants -------------------------------------------------------
-- Vendedor: leitura apenas (estoque só muda via venda, por trigger).
create policy variants_master_select on public.product_variants
  for select to authenticated
  using ((select private.jwt_role()) = 'master');

create policy variants_owner_all on public.product_variants
  for all to authenticated
  using      (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'owner')
  with check (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'owner');

create policy variants_seller_select on public.product_variants
  for select to authenticated
  using (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'seller' and is_active);

-- ---- customers --------------------------------------------------------------
create policy customers_master_select on public.customers
  for select to authenticated
  using ((select private.jwt_role()) = 'master');

create policy customers_owner_all on public.customers
  for all to authenticated
  using      (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'owner')
  with check (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'owner');

create policy customers_seller_select on public.customers
  for select to authenticated
  using (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'seller');

create policy customers_seller_insert on public.customers
  for insert to authenticated
  with check (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'seller');

-- ---- cash_registers ---------------------------------------------------------
create policy cash_registers_master_select on public.cash_registers
  for select to authenticated
  using ((select private.jwt_role()) = 'master');

create policy cash_registers_owner_select on public.cash_registers
  for select to authenticated
  using (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'owner');

create policy cash_registers_owner_update on public.cash_registers
  for update to authenticated
  using      (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'owner')
  with check (store_id = (select private.jwt_store_id()));

-- Abertura/fechamento do próprio caixa (owner e seller).
create policy cash_registers_self_select on public.cash_registers
  for select to authenticated
  using (store_id = (select private.jwt_store_id()) and opened_by = (select auth.uid()));

create policy cash_registers_self_insert on public.cash_registers
  for insert to authenticated
  with check (
    store_id = (select private.jwt_store_id())
    and (select private.jwt_role()) in ('owner', 'seller')
    and opened_by = (select auth.uid())
    and status = 'open'
  );

create policy cash_registers_self_update on public.cash_registers
  for update to authenticated
  using      (store_id = (select private.jwt_store_id()) and opened_by = (select auth.uid()) and status = 'open')
  with check (store_id = (select private.jwt_store_id()) and opened_by = (select auth.uid()));

-- ---- sales ------------------------------------------------------------------
-- Sem policy de DELETE: vendas nunca são apagadas, apenas canceladas pelo owner.
create policy sales_master_select on public.sales
  for select to authenticated
  using ((select private.jwt_role()) = 'master');

create policy sales_owner_select on public.sales
  for select to authenticated
  using (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'owner');

create policy sales_owner_update on public.sales
  for update to authenticated
  using      (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'owner')
  with check (store_id = (select private.jwt_store_id()));

create policy sales_seller_select on public.sales
  for select to authenticated
  using (store_id = (select private.jwt_store_id())
         and (select private.jwt_role()) = 'seller'
         and seller_id = (select auth.uid()));

create policy sales_staff_insert on public.sales
  for insert to authenticated
  with check (
    store_id = (select private.jwt_store_id())
    and (select private.jwt_role()) in ('owner', 'seller')
    and seller_id = (select auth.uid())
  );

-- ---- sale_items (somente leitura + insert na criação da venda) --------------
create policy sale_items_master_select on public.sale_items
  for select to authenticated
  using ((select private.jwt_role()) = 'master');

create policy sale_items_owner_select on public.sale_items
  for select to authenticated
  using (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'owner');

create policy sale_items_seller_select on public.sale_items
  for select to authenticated
  using (
    store_id = (select private.jwt_store_id())
    and (select private.jwt_role()) = 'seller'
    and exists (select 1 from public.sales s
                 where s.id = sale_items.sale_id and s.seller_id = (select auth.uid()))
  );

create policy sale_items_staff_insert on public.sale_items
  for insert to authenticated
  with check (
    store_id = (select private.jwt_store_id())
    and (select private.jwt_role()) in ('owner', 'seller')
    and exists (select 1 from public.sales s
                 where s.id = sale_items.sale_id and s.seller_id = (select auth.uid()))
  );

-- -----------------------------------------------------------------------------
-- 8. Bootstrap do usuário Master (rodar UMA vez, no SQL Editor, após criar o
--    usuário em Authentication > Users). O trigger sync_claims grava o claim;
--    faça logout/login para o JWT novo:
--
--   update public.profiles set role = 'master'
--    where email = 'voce@dominio.com';
--
-- Provisionar owner/seller (server-side, service role):
--   supabase.auth.admin.createUser({ email, password, email_confirm: true,
--     app_metadata: { role: 'owner', store_id: '<uuid>' },
--     user_metadata: { full_name: '...' } })
-- -----------------------------------------------------------------------------
