-- =========================================================
-- MIGRAÇÃO: Ranking público + Painel Admin
-- Execute no SQL Editor do seu projeto Supabase
-- =========================================================

-- Função que verifica se o usuário logado é admin
create or replace function is_admin()
returns boolean language plpgsql security definer as $$
begin
  return exists (
    select 1 from auth.users
    where id = auth.uid()
    and email in ('rafaalexander2@gmail.com', 'santosaline2802@gmail.com')
  );
end;
$$;

-- Permite que qualquer usuário autenticado leia todos os perfis (necessário para o Ranking)
-- A política existente "perfil_proprio" já cobre leitura própria; esta abre para todos.
drop policy if exists "perfis_leitura_publica" on perfis;
create policy "perfis_leitura_publica" on perfis
  for select
  to authenticated
  using (true);

-- Permite que admins atualizem qualquer perfil (para o reset de dados)
drop policy if exists "perfis_admin_update" on perfis;
create policy "perfis_admin_update" on perfis
  for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- Permite que admins deletem o progresso de qualquer usuário (para o reset)
drop policy if exists "progresso_admin_delete" on progresso;
create policy "progresso_admin_delete" on progresso
  for delete
  to authenticated
  using (is_admin());
