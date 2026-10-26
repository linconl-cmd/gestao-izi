-- Correção: o guard de order_items bloqueava a exclusão em CASCATA de comandas já fechadas
-- (ex.: apagar uma loja com comandas recebidas/canceladas falhava com "order is not open"),
-- porque o trigger BEFORE DELETE também roda quando a FK apaga os itens junto com a comanda.
--
-- Exclusões em cascata são disparadas por trigger de FK (pg_trigger_depth() > 1) e são liberadas.
-- Alterações diretas feitas por usuários (depth = 1) continuam exigindo comanda aberta.
create or replace function private.order_items_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.order_status;
begin
  if pg_trigger_depth() > 1 then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

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

-- Quem leu a notificação não deve impedir a exclusão do usuário depois.
alter table public.notifications drop constraint if exists notifications_read_by_fkey;
alter table public.notifications
  add constraint notifications_read_by_fkey foreign key (read_by) references public.profiles (id) on delete set null;
