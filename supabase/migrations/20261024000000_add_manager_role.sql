-- Novo papel: gerente (manager).
-- ATENÇÃO: o Postgres não permite usar um valor de enum na mesma transação em que ele
-- foi criado. Por isso este arquivo contém SÓ o ALTER TYPE. Rode-o sozinho, e depois
-- rode 20261024010000_manager_policies.sql.
alter type public.user_role add value if not exists 'manager';
