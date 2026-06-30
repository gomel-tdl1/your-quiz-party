-- ============================================================
--  «Своя игра» — схема Supabase
--  Выполни этот скрипт в Supabase → SQL Editor → New query → Run.
--  Один раз. После этого приложение само создаёт/читает данные.
-- ============================================================

-- Расширение для gen_random_uuid() (обычно уже включено)
create extension if not exists "pgcrypto";

-- Квиз: верхний контейнер игры
create table if not exists public.quizzes (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default 'Новый квиз',
  created_at  timestamptz not null default now()
);

-- Категория = колонка на игровом поле
create table if not exists public.categories (
  id        uuid primary key default gen_random_uuid(),
  quiz_id   uuid not null references public.quizzes(id) on delete cascade,
  name      text not null default 'Категория',
  position  int  not null default 0
);

-- Вопрос = ячейка. body и answer хранят HTML (картинки, звук, форматирование).
create table if not exists public.questions (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.categories(id) on delete cascade,
  value        int  not null default 100,
  body         text not null default '',   -- HTML вопроса
  answer       text not null default '',   -- HTML правильного ответа
  position     int  not null default 0,
  answered     boolean not null default false
);

-- Команда / игрок со счётом
create table if not exists public.teams (
  id        uuid primary key default gen_random_uuid(),
  quiz_id   uuid not null references public.quizzes(id) on delete cascade,
  name      text not null default 'Команда',
  color     text not null default '#FF2E97',
  score     int  not null default 0,
  position  int  not null default 0
);

create index if not exists categories_quiz_idx  on public.categories(quiz_id);
create index if not exists questions_category_idx on public.questions(category_id);
create index if not exists teams_quiz_idx        on public.teams(quiz_id);

-- ------------------------------------------------------------
--  Доступ. Это приватная игра «на вечер»: anon-ключ может всё.
--  Если позже добавишь авторизацию — ужесточи политики.
-- ------------------------------------------------------------
alter table public.quizzes    enable row level security;
alter table public.categories enable row level security;
alter table public.questions  enable row level security;
alter table public.teams      enable row level security;

drop policy if exists "anon all" on public.quizzes;
drop policy if exists "anon all" on public.categories;
drop policy if exists "anon all" on public.questions;
drop policy if exists "anon all" on public.teams;

create policy "anon all" on public.quizzes    for all using (true) with check (true);
create policy "anon all" on public.categories for all using (true) with check (true);
create policy "anon all" on public.questions  for all using (true) with check (true);
create policy "anon all" on public.teams      for all using (true) with check (true);
