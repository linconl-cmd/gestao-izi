-- =============================================================================
-- Correção: usuários criados via Admin API (auth.admin.createUser) nascem em
-- auth.users SEM app_metadata (o GoTrue grava role/store_id num UPDATE logo
-- depois). Resultado: private.handle_new_user criava o profile como
-- 'seller' sem loja, divergente do JWT.
--
-- Solução: sentido inverso do sync_claims. Mudanças em
-- auth.users.raw_app_meta_data (role / store_id) são refletidas em profiles.
-- Sem laço: os dois triggers só escrevem quando o valor realmente muda.
-- =============================================================================

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

  if new.raw_app_meta_data ->> 'role' in ('master', 'owner', 'seller') then
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

create trigger on_auth_user_claims_changed
  after update of raw_app_meta_data on auth.users
  for each row execute function private.sync_claims_to_profile();

-- Backfill: alinha perfis já existentes ao app_metadata.
with src as (
  select u.id,
         (u.raw_app_meta_data ->> 'role')::public.user_role as role,
         u.raw_app_meta_data ? 'store_id' as has_store,
         case when u.raw_app_meta_data ->> 'store_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then (u.raw_app_meta_data ->> 'store_id')::uuid end as store_id
    from auth.users u
   where u.raw_app_meta_data ->> 'role' in ('master', 'owner', 'seller')
)
update public.profiles p
   set role     = src.role,
       store_id = case when src.has_store then src.store_id else p.store_id end
  from src
 where src.id = p.id
   and (p.role <> src.role
     or p.store_id is distinct from case when src.has_store then src.store_id else p.store_id end);
