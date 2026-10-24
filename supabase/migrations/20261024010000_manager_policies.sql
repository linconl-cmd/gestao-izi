-- =============================================================================
-- Papel "manager" (gerente) + auditoria obrigatória de cancelamento de venda.
-- Pré-requisito: 20261024000000_add_manager_role.sql já executada (em separado).
--
-- Gerente PODE: painel, vendas de todos, cancelar venda (com motivo), catálogo,
--   estoque, clientes, etiquetas, ver equipe, criar/desativar vendedores, vender.
-- Gerente NÃO PODE: ver preço de custo (product_costs), criar/desativar gerentes ou
--   donos, alterar dados da loja.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Claims -> profiles: aceitar 'manager' (função da migration anterior só
--    reconhecia master/owner/seller).
-- ---------------------------------------------------------------------------
create or replace function private.sync_claims_to_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role  public.user_role;
  v_store uuid;
  v_has_store boolean := new.raw_app_meta_data ? 'store_id';
begin
  if new.raw_app_meta_data is not distinct from old.raw_app_meta_data then
    return new;
  end if;

  if new.raw_app_meta_data ->> 'role' in ('master', 'owner', 'manager', 'seller') then
    v_role := (new.raw_app_meta_data ->> 'role')::public.user_role;
  end if;

  if v_has_store
     and new.raw_app_meta_data ->> 'store_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_store := (new.raw_app_meta_data ->> 'store_id')::uuid;
  end if;

  update public.profiles p
     set role     = coalesce(v_role, p.role),
         store_id = case when v_has_store then v_store else p.store_id end
   where p.id = new.id
     and (p.role     is distinct from coalesce(v_role, p.role)
       or p.store_id is distinct from case when v_has_store then v_store else p.store_id end);

  return new;
end;
$$;

-- Gerente e dono precisam de loja (o seller sem loja segue como conta inerte).
alter table public.profiles drop constraint if exists profiles_owner_needs_store;
alter table public.profiles
  add constraint profiles_staff_needs_store check (role not in ('owner', 'manager') or store_id is not null);

-- ---------------------------------------------------------------------------
-- 2. Auditoria de cancelamento
-- ---------------------------------------------------------------------------
alter table public.sales add column if not exists cancel_reason text;

create or replace function private.sales_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Venda cancelada é um registro de auditoria: ninguém (exceto service role/SQL) altera.
  if old.status = 'cancelled' then
    if auth.uid() is not null then
      raise exception 'cancelled sale is immutable' using errcode = '42501';
    end if;
    return new;
  end if;

  -- depth 1 = UPDATE direto do cliente; o recálculo de totais vem de trigger (depth > 1)
  if pg_trigger_depth() = 1 then
    if new.store_id          is distinct from old.store_id
       or new.seller_id        is distinct from old.seller_id
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
    -- quem/quando vêm do servidor, nunca do cliente
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

-- ---------------------------------------------------------------------------
-- 3. Policies: "admin da loja" = owner OU manager
--    (product_costs permanece SOMENTE owner.)
-- ---------------------------------------------------------------------------

-- profiles ------------------------------------------------------------------
drop policy if exists profiles_owner_select on public.profiles;
create policy profiles_admin_select on public.profiles
  for select to authenticated
  using (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) in ('owner', 'manager'));

drop policy if exists profiles_owner_update_sellers on public.profiles;
-- dono: gerencia vendedores e gerentes da própria loja
create policy profiles_owner_update_staff on public.profiles
  for update to authenticated
  using      (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'owner' and role in ('seller', 'manager'))
  with check (store_id = (select private.jwt_store_id()) and role in ('seller', 'manager'));
-- gerente: só vendedores
create policy profiles_manager_update_sellers on public.profiles
  for update to authenticated
  using      (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) = 'manager' and role = 'seller')
  with check (store_id = (select private.jwt_store_id()) and role = 'seller');

-- categories / products / variants / customers -------------------------------
drop policy if exists categories_owner_all on public.categories;
create policy categories_admin_all on public.categories
  for all to authenticated
  using      (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) in ('owner', 'manager'))
  with check (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) in ('owner', 'manager'));

drop policy if exists products_owner_all on public.products;
create policy products_admin_all on public.products
  for all to authenticated
  using      (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) in ('owner', 'manager'))
  with check (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) in ('owner', 'manager'));

drop policy if exists variants_owner_all on public.product_variants;
create policy variants_admin_all on public.product_variants
  for all to authenticated
  using      (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) in ('owner', 'manager'))
  with check (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) in ('owner', 'manager'));

drop policy if exists customers_owner_all on public.customers;
create policy customers_admin_all on public.customers
  for all to authenticated
  using      (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) in ('owner', 'manager'))
  with check (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) in ('owner', 'manager'));

-- cash_registers -------------------------------------------------------------
drop policy if exists cash_registers_owner_select on public.cash_registers;
create policy cash_registers_admin_select on public.cash_registers
  for select to authenticated
  using (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) in ('owner', 'manager'));

drop policy if exists cash_registers_owner_update on public.cash_registers;
create policy cash_registers_admin_update on public.cash_registers
  for update to authenticated
  using      (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) in ('owner', 'manager'))
  with check (store_id = (select private.jwt_store_id()));

drop policy if exists cash_registers_self_insert on public.cash_registers;
create policy cash_registers_self_insert on public.cash_registers
  for insert to authenticated
  with check (
    store_id = (select private.jwt_store_id())
    and (select private.jwt_role()) in ('owner', 'manager', 'seller')
    and opened_by = (select auth.uid())
    and status = 'open'
  );

-- sales / sale_items ---------------------------------------------------------
drop policy if exists sales_owner_select on public.sales;
create policy sales_admin_select on public.sales
  for select to authenticated
  using (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) in ('owner', 'manager'));

drop policy if exists sales_owner_update on public.sales;
create policy sales_admin_update on public.sales
  for update to authenticated
  using      (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) in ('owner', 'manager'))
  with check (store_id = (select private.jwt_store_id()));

drop policy if exists sales_staff_insert on public.sales;
create policy sales_staff_insert on public.sales
  for insert to authenticated
  with check (
    store_id = (select private.jwt_store_id())
    and (select private.jwt_role()) in ('owner', 'manager', 'seller')
    and seller_id = (select auth.uid())
  );

drop policy if exists sale_items_owner_select on public.sale_items;
create policy sale_items_admin_select on public.sale_items
  for select to authenticated
  using (store_id = (select private.jwt_store_id()) and (select private.jwt_role()) in ('owner', 'manager'));

drop policy if exists sale_items_staff_insert on public.sale_items;
create policy sale_items_staff_insert on public.sale_items
  for insert to authenticated
  with check (
    store_id = (select private.jwt_store_id())
    and (select private.jwt_role()) in ('owner', 'manager', 'seller')
    and exists (select 1 from public.sales s
                 where s.id = sale_items.sale_id and s.seller_id = (select auth.uid()))
  );
