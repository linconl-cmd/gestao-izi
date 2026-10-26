-- =============================================================================
-- Pré-venda (comanda): o vendedor monta e envia ao caixa; gerente/dono recebe.
--
--  * Vendedor NÃO fecha venda: só cria/edita/cancela as próprias comandas e SUGERE desconto.
--  * Gerente/dono aplica o desconto, escolhe a forma de pagamento e recebe (pay_order).
--    A venda guarda quem vendeu (seller_id, comissão) e quem recebeu (received_by).
--  * Comanda aberta NÃO baixa estoque; o estoque baixa no recebimento.
--  * Comandas abertas expiram no fim do dia (fuso de Brasília). Ao fechar o caixa com
--    comandas pendentes, e ao expirarem, o gerente/dono recebe uma notificação.
-- Pré-requisito: migrations anteriores aplicadas.
-- =============================================================================

create type public.order_status as enum ('open', 'paid', 'cancelled', 'expired');

alter table public.stores add column if not exists order_seq integer not null default 0;
alter table public.sales  add column if not exists received_by uuid references public.profiles (id);

-- -----------------------------------------------------------------------------
-- 1. Tabelas
-- -----------------------------------------------------------------------------
create table public.orders (
  id                  uuid primary key default gen_random_uuid(),
  store_id            uuid not null references public.stores (id) on delete cascade,
  number              integer not null,                       -- sequencial por loja (definido por trigger)
  seller_id           uuid not null references public.profiles (id),
  customer_id         uuid,
  status              public.order_status not null default 'open',
  suggested_discount  numeric(12,2) not null default 0 check (suggested_discount >= 0),
  notes               text,
  business_date       date not null,                          -- dia (Brasília) em que foi criada
  sale_id             uuid,
  cancel_reason       text,
  closed_at           timestamptz,
  closed_by           uuid references public.profiles (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (store_id, id),
  unique (store_id, number),
  foreign key (store_id, customer_id) references public.customers (store_id, id),
  foreign key (store_id, sale_id)     references public.sales (store_id, id) on delete set null (sale_id),
  constraint orders_closed_consistency
    check ((status = 'open' and closed_at is null) or (status <> 'open' and closed_at is not null))
);
create index orders_store_status_idx on public.orders (store_id, status, created_at desc);
create index orders_seller_idx       on public.orders (seller_id, created_at desc);

create table public.order_items (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null,
  order_id    uuid not null,
  variant_id  uuid not null,
  quantity    integer not null check (quantity > 0 and quantity <= 999),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (order_id, variant_id),
  foreign key (store_id, order_id)   references public.orders (store_id, id) on delete cascade,
  foreign key (store_id, variant_id) references public.product_variants (store_id, id)
);
create index order_items_variant_idx on public.order_items (store_id, variant_id);

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores (id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  read_at     timestamptz,
  read_by     uuid references public.profiles (id)
);
create index notifications_store_unread_idx on public.notifications (store_id, created_at desc) where read_at is null;

create trigger set_updated_at before update on public.orders      for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.order_items for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2. Triggers
-- -----------------------------------------------------------------------------

-- Número sequencial por loja, dia da comanda e estado inicial: nunca vêm do cliente.
create or replace function private.orders_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.stores set order_seq = order_seq + 1 where id = new.store_id returning order_seq into new.number;
  new.status        := 'open';
  new.sale_id       := null;
  new.cancel_reason := null;
  new.closed_at     := null;
  new.closed_by     := null;
  new.business_date := (now() at time zone 'America/Sao_Paulo')::date;
  return new;
end;
$$;
create trigger orders_before_insert before insert on public.orders
  for each row execute function private.orders_before_insert();

-- Itens só mudam enquanto a comanda está aberta; variante precisa estar ativa.
create or replace function private.order_items_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.order_status;
begin
  select status into v_status from public.orders where id = coalesce(new.order_id, old.order_id);
  if v_status is distinct from 'open' then
    raise exception 'order is not open';
  end if;

  if tg_op = 'UPDATE' then
    if new.order_id <> old.order_id or new.variant_id <> old.variant_id or new.store_id <> old.store_id then
      raise exception 'order item identity is immutable';
    end if;
  elsif tg_op = 'INSERT' then
    perform 1
      from public.product_variants v
      join public.products p on p.id = v.product_id and p.store_id = v.store_id
     where v.id = new.variant_id and v.store_id = new.store_id and v.is_active and p.is_active;
    if not found then
      raise exception 'variant not found or inactive';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
create trigger order_items_guard before insert or update or delete on public.order_items
  for each row execute function private.order_items_guard();

-- Notificação: caixa fechado com comandas ainda abertas.
create or replace function private.notify_open_orders_on_register_close()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n     integer;
  v_list  text;
  v_who   text;
begin
  if not (old.status = 'open' and new.status = 'closed') then
    return new;
  end if;

  select count(*) into v_n from public.orders where store_id = new.store_id and status = 'open';
  if v_n = 0 then
    return new;
  end if;

  select string_agg('#' || x.number || ' (' || coalesce(x.full_name, '?') || ')', ', ' order by x.number)
    into v_list
    from (select o.number, p.full_name
            from public.orders o left join public.profiles p on p.id = o.seller_id
           where o.store_id = new.store_id and o.status = 'open'
           order by o.number limit 15) x;

  select full_name into v_who from public.profiles where id = new.closed_by;

  insert into public.notifications (store_id, kind, title, body, data)
  values (
    new.store_id,
    'register_closed_open_orders',
    'Caixa fechado com ' || v_n || ' comanda(s) pendente(s)',
    'Fechado por ' || coalesce(v_who, '?') || '. Pendentes: ' || v_list
      || '. Se não forem recebidas, expiram no fim do dia.',
    jsonb_build_object('register_id', new.id, 'pending', v_n)
  );
  return new;
end;
$$;
create trigger notify_open_orders_on_close after update on public.cash_registers
  for each row execute function private.notify_open_orders_on_register_close();

-- Leitura: o banco carimba quem/quando; não dá para "desler" nem alterar outros campos.
create or replace function private.notifications_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.read_at is not null then
    return old;
  end if;
  if new.read_at is not null then
    new.read_at := now();
    new.read_by := auth.uid();
  end if;
  return new;
end;
$$;
create trigger notifications_before_update before update on public.notifications
  for each row execute function private.notifications_before_update();

-- -----------------------------------------------------------------------------
-- 3. Vendas: recebedor separado do vendedor
-- -----------------------------------------------------------------------------
create or replace function private.sales_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reg     public.cash_registers;
  v_cashier uuid := coalesce(new.received_by, new.seller_id);
begin
  select * into v_reg from public.cash_registers
   where id = new.cash_register_id and store_id = new.store_id;
  if not found or v_reg.status <> 'open' then
    raise exception 'cash register is not open';
  end if;
  -- O caixa usado tem que ser de quem está recebendo.
  if v_reg.opened_by <> v_cashier then
    raise exception 'cash register belongs to another user' using errcode = '42501';
  end if;
  new.received_by  := v_cashier;
  new.status       := 'completed';
  new.subtotal     := 0;
  new.total        := 0;
  new.cancelled_at := null;
  new.cancelled_by := null;
  return new;
end;
$$;

create or replace function private.sales_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'cancelled' then
    if auth.uid() is not null then
      raise exception 'cancelled sale is immutable' using errcode = '42501';
    end if;
    return new;
  end if;

  if pg_trigger_depth() = 1 then
    if new.store_id          is distinct from old.store_id
       or new.seller_id        is distinct from old.seller_id
       or new.received_by      is distinct from old.received_by
       or new.cash_register_id is distinct from old.cash_register_id
       or new.payment_method   is distinct from old.payment_method
       or new.subtotal         is distinct from old.subtotal
       or new.discount         is distinct from old.discount
       or new.total            is distinct from old.total then
      raise exception 'sale financial data is immutable';
    end if;

    if new.status = 'completed'
       and (new.cancelled_at  is distinct from old.cancelled_at
         or new.cancelled_by  is distinct from old.cancelled_by
         or new.cancel_reason is distinct from old.cancel_reason) then
      raise exception 'cancellation audit fields are managed by the system' using errcode = '42501';
    end if;
  end if;

  if new.status = 'cancelled' then
    if auth.uid() is not null and nullif(btrim(coalesce(new.cancel_reason, '')), '') is null then
      raise exception 'cancel reason is required' using errcode = '23514';
    end if;
    new.cancel_reason := btrim(new.cancel_reason);
    new.cancelled_at  := now();
    new.cancelled_by  := coalesce(auth.uid(), new.cancelled_by);

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

-- Venda direta (sem comanda) agora é só de dono/gerente: vendedor envia comanda ao caixa.
create or replace function public.create_sale(
  p_cash_register_id uuid,
  p_payment_method   public.payment_method,
  p_items            jsonb,
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
  if private.jwt_role() not in ('owner', 'manager') then
    raise exception 'only owner or manager can finalize a sale; sellers send orders to the cashier' using errcode = '42501';
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

-- -----------------------------------------------------------------------------
-- 4. RPCs da comanda
-- -----------------------------------------------------------------------------

-- Vendedor/gerente/dono cria a comanda (invoker: RLS vale). p_items: [{"variant_id","quantity"}]
create or replace function public.create_order(
  p_items               jsonb,
  p_suggested_discount  numeric default 0,
  p_notes               text    default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_store uuid := private.jwt_store_id();
  v_order uuid;
  v_item  jsonb;
begin
  if v_store is null or auth.uid() is null then
    raise exception 'no store context' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'order must have at least one item';
  end if;

  insert into public.orders (store_id, seller_id, suggested_discount, notes, business_date)
  values (v_store, auth.uid(), coalesce(p_suggested_discount, 0), nullif(btrim(p_notes), ''), current_date)
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.order_items (store_id, order_id, variant_id, quantity)
    values (v_store, v_order, (v_item ->> 'variant_id')::uuid, (v_item ->> 'quantity')::int)
    on conflict (order_id, variant_id) do update set quantity = public.order_items.quantity + excluded.quantity;
  end loop;

  return v_order;
end;
$$;

-- Define a quantidade de um item (0 remove). Só em comanda aberta (trigger + RLS).
create or replace function public.set_order_item(p_order_id uuid, p_variant_id uuid, p_quantity integer)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_store uuid := private.jwt_store_id();
begin
  if v_store is null then
    raise exception 'no store context' using errcode = '42501';
  end if;
  if p_quantity <= 0 then
    delete from public.order_items where order_id = p_order_id and variant_id = p_variant_id;
  else
    insert into public.order_items (store_id, order_id, variant_id, quantity)
    values (v_store, p_order_id, p_variant_id, p_quantity)
    on conflict (order_id, variant_id) do update set quantity = excluded.quantity;
  end if;
end;
$$;

-- Cancelar comanda: vendedor só a própria; dono/gerente qualquer da loja.
create or replace function public.cancel_order(p_order_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_store uuid := private.jwt_store_id();
  v_role  public.user_role := private.jwt_role();
  v_order public.orders;
begin
  if v_uid is null or v_store is null or v_role not in ('owner', 'manager', 'seller') then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id and store_id = v_store for update;
  if not found then
    raise exception 'order not found';
  end if;
  if v_order.status <> 'open' then
    raise exception 'order is not open';
  end if;
  if v_role = 'seller' and v_order.seller_id <> v_uid then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.orders
     set status = 'cancelled', cancel_reason = nullif(btrim(coalesce(p_reason, '')), ''),
         closed_at = now(), closed_by = v_uid
   where id = v_order.id;
end;
$$;

-- Receber: só dono/gerente. Cria a venda no nome do vendedor, no caixa de quem recebe.
-- p_discount nulo = usa o desconto sugerido pelo vendedor; o gerente pode alterar.
create or replace function public.pay_order(
  p_order_id         uuid,
  p_cash_register_id uuid,
  p_payment_method   public.payment_method,
  p_discount         numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_store uuid := private.jwt_store_id();
  v_role  public.user_role := private.jwt_role();
  v_order public.orders;
  v_sale  uuid;
begin
  if v_uid is null or v_store is null or v_role not in ('owner', 'manager') then
    raise exception 'only owner or manager can receive payment' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id and store_id = v_store for update;
  if not found then
    raise exception 'order not found';
  end if;
  if v_order.status <> 'open' then
    raise exception 'order is not open';
  end if;
  if not exists (select 1 from public.order_items where order_id = v_order.id) then
    raise exception 'order has no items';
  end if;

  insert into public.sales (store_id, seller_id, received_by, cash_register_id, customer_id,
                            payment_method, discount, notes)
  values (v_store, v_order.seller_id, v_uid, p_cash_register_id, v_order.customer_id,
          p_payment_method, coalesce(p_discount, v_order.suggested_discount),
          'Comanda #' || v_order.number)
  returning id into v_sale;

  insert into public.sale_items (store_id, sale_id, variant_id, quantity, discount)
  select i.store_id, v_sale, i.variant_id, i.quantity, 0
    from public.order_items i
   where i.order_id = v_order.id;

  update public.orders
     set status = 'paid', sale_id = v_sale, closed_at = now(), closed_by = v_uid
   where id = v_order.id;

  return v_sale;
end;
$$;

-- Expiração das comandas de dias anteriores (+ notificação). Chamada de forma preguiçosa pelo app
-- e, opcionalmente, por pg_cron (ver comentário ao final).
create or replace function private.expire_store_orders(p_store uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  with expired as (
    update public.orders o
       set status = 'expired', closed_at = now()
     where o.store_id = p_store
       and o.status = 'open'
       and o.business_date < (now() at time zone 'America/Sao_Paulo')::date
    returning o.number, o.seller_id
  ), notified as (
    insert into public.notifications (store_id, kind, title, body, data)
    select p_store,
           'orders_expired',
           count(*)::text || ' comanda(s) expirada(s) sem pagamento',
           string_agg('#' || e.number || ' (' || coalesce(p.full_name, '?') || ')', ', ' order by e.number),
           jsonb_build_object('numbers', jsonb_agg(e.number order by e.number))
      from expired e left join public.profiles p on p.id = e.seller_id
    having count(*) > 0
    returning 1
  )
  select count(*) into v_n from expired;

  return v_n;
end;
$$;

create or replace function private.expire_all_stale_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  s       record;
  v_total integer := 0;
begin
  for s in
    select distinct store_id from public.orders
     where status = 'open' and business_date < (now() at time zone 'America/Sao_Paulo')::date
  loop
    v_total := v_total + private.expire_store_orders(s.store_id);
  end loop;
  return v_total;
end;
$$;

create or replace function public.expire_stale_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or private.jwt_store_id() is null
     or private.jwt_role() not in ('owner', 'manager') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return private.expire_store_orders(private.jwt_store_id());
end;
$$;

revoke execute on function
  public.create_order(jsonb, numeric, text),
  public.set_order_item(uuid, uuid, integer),
  public.cancel_order(uuid, text),
  public.pay_order(uuid, uuid, public.payment_method, numeric),
  public.expire_stale_orders()
  from public, anon;
grant execute on function
  public.create_order(jsonb, numeric, text),
  public.set_order_item(uuid, uuid, integer),
  public.cancel_order(uuid, text),
  public.pay_order(uuid, uuid, public.payment_method, numeric),
  public.expire_stale_orders()
  to authenticated;
revoke execute on function private.expire_all_stale_orders() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Privilégios + RLS
-- -----------------------------------------------------------------------------
grant select, insert                 on public.orders        to authenticated;   -- mudanças só via RPC
grant select, insert, update, delete on public.order_items   to authenticated;
grant select                         on public.notifications to authenticated;
grant update (read_at)               on public.notifications to authenticated;

alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;
alter table public.notifications enable row level security;

-- orders
create policy orders_master_select on public.orders
  for select to authenticated using ((select private.jwt_role()) = 'master');
create policy orders_admin_select on public.orders
  for select to authenticated
  using (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) in ('owner', 'manager'));
create policy orders_seller_select on public.orders
  for select to authenticated
  using (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'seller'
         and seller_id = (select auth.uid()));
create policy orders_staff_insert on public.orders
  for insert to authenticated
  with check (store_id = (select private.jwt_store_id())
              and (select private.jwt_role()) in ('owner', 'manager', 'seller')
              and seller_id = (select auth.uid()));

-- order_items (enquanto a comanda está aberta, garantido pelo trigger)
create policy order_items_master_select on public.order_items
  for select to authenticated using ((select private.jwt_role()) = 'master');
create policy order_items_admin_all on public.order_items
  for all to authenticated
  using      (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) in ('owner', 'manager'))
  with check (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) in ('owner', 'manager'));
create policy order_items_seller_all on public.order_items
  for all to authenticated
  using (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'seller'
         and exists (select 1 from public.orders o where o.id = order_items.order_id and o.seller_id = (select auth.uid())))
  with check (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'seller'
         and exists (select 1 from public.orders o where o.id = order_items.order_id and o.seller_id = (select auth.uid())));

-- notifications (só dono/gerente da loja; criadas apenas por triggers/funções)
create policy notifications_master_select on public.notifications
  for select to authenticated using ((select private.jwt_role()) = 'master');
create policy notifications_admin_select on public.notifications
  for select to authenticated
  using (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) in ('owner', 'manager'));
create policy notifications_admin_update on public.notifications
  for update to authenticated
  using      (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) in ('owner', 'manager'))
  with check (store_id = (select private.jwt_store_id()));

-- Vendedor não fecha venda nem abre caixa: só dono/gerente.
drop policy if exists sales_staff_insert on public.sales;
create policy sales_staff_insert on public.sales
  for insert to authenticated
  with check (
    store_id = (select private.jwt_store_id())
    and (select private.jwt_role()) in ('owner', 'manager')
    and seller_id = (select auth.uid())
  );

drop policy if exists sale_items_staff_insert on public.sale_items;
create policy sale_items_staff_insert on public.sale_items
  for insert to authenticated
  with check (
    store_id = (select private.jwt_store_id())
    and (select private.jwt_role()) in ('owner', 'manager')
    and exists (select 1 from public.sales s
                 where s.id = sale_items.sale_id and s.seller_id = (select auth.uid()))
  );

drop policy if exists cash_registers_self_insert on public.cash_registers;
create policy cash_registers_self_insert on public.cash_registers
  for insert to authenticated
  with check (
    store_id = (select private.jwt_store_id())
    and (select private.jwt_role()) in ('owner', 'manager')
    and opened_by = (select auth.uid())
    and status = 'open'
  );

-- -----------------------------------------------------------------------------
-- Opcional: expiração automática à meia-noite de Brasília, mesmo sem ninguém logado.
-- Habilite a extensão em Database > Extensions > pg_cron e rode UMA vez:
--   select cron.schedule('expire-open-orders', '5 3 * * *', $$ select private.expire_all_stale_orders() $$);
-- (03:05 UTC = 00:05 em Brasília.) Sem o cron, o app expira de forma preguiçosa quando
-- dono/gerente abrem o sistema; o resultado é o mesmo.
-- -----------------------------------------------------------------------------
