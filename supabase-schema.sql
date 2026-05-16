-- Gospel Quest — Schema Supabase
-- Execute no SQL Editor do seu projeto em https://supabase.com

-- ── Perfis dos jogadores ──────────────────────────────────────────
create table if not exists perfis (
  id            uuid references auth.users on delete cascade primary key,
  nome          text not null,
  email         text not null,
  personagem_tipo text not null default 'peregrino'
    check (personagem_tipo in ('peregrino','profeta','guerreiro','sabia')),
  personagem_cor  text not null default '#b8860b',
  xp              integer not null default 0,
  talentos        integer not null default 50,
  sequencia       integer not null default 0,
  sequencia_max   integer not null default 0,
  sequencia_ultimo_dia date,
  vidas           integer not null default 5 check (vidas between 0 and 5),
  vidas_ultima_recarga timestamptz not null default now(),
  armadura        jsonb not null default '{}',
  criado_em       timestamptz not null default now()
);

-- RLS: cada usuário lê/escreve apenas seu próprio perfil
alter table perfis enable row level security;
create policy "perfil_proprio" on perfis
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── Progresso por capítulo ────────────────────────────────────────
create table if not exists progresso (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references perfis(id) on delete cascade not null,
  trilha        text not null check (trilha in ('VT','NT','JESUS')),
  capitulo_id   text not null,
  completo      boolean not null default false,
  pontuacao     integer not null default 0,
  tentativas    integer not null default 0,
  atualizado_em timestamptz not null default now(),
  unique(user_id, trilha, capitulo_id)
);

alter table progresso enable row level security;
create policy "progresso_proprio" on progresso
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Criação automática de perfil após signup ──────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into perfis (id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── Missões diárias (estrutura base) ─────────────────────────────
create table if not exists missoes_diarias (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references perfis(id) on delete cascade not null,
  data        date not null default current_date,
  missao_id   text not null,
  completa    boolean not null default false,
  unique(user_id, data, missao_id)
);

alter table missoes_diarias enable row level security;
create policy "missoes_proprias" on missoes_diarias
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
