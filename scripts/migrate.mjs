// Автомиграция: накатывает supabase/schema.sql в базу при `npm run dev`.
// Запускается через npm-скрипт "predev". Идемпотентно (create ... if not exists),
// поэтому безопасно гонять при каждом старте.
//
// Требует переменную SUPABASE_DB_URL — строку подключения к Postgres
// (Supabase → Settings → Database → Connection string → URI).
// DDL нельзя выполнить через anon-ключ PostgREST, поэтому идём напрямую в БД.

import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const root = fileURLToPath(new URL('..', import.meta.url))

// --- Загружаем .env.local и .env (Vite их не отдаёт Node-скриптам) ---
function loadEnv(name) {
  const path = root + name
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/)
    if (!m || line.trim().startsWith('#')) continue
    let value = m[2]
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(m[1] in process.env)) process.env[m[1]] = value
  }
}
loadEnv('.env.local')
loadEnv('.env')

const DB_URL = process.env.SUPABASE_DB_URL

const warn = (msg) => console.log(`\x1b[33m${msg}\x1b[0m`)
const ok = (msg) => console.log(`\x1b[32m${msg}\x1b[0m`)

if (!DB_URL) {
  warn('\n⚠  Миграция пропущена: не задан SUPABASE_DB_URL в .env.local')
  warn('   Supabase → Settings → Database → Connection string → URI')
  warn('   Добавь строку:  SUPABASE_DB_URL=postgresql://postgres:ПАРОЛЬ@...\n')
  // Не блокируем dev-сервер — приложение покажет экран настройки.
  process.exit(0)
}

const schema = readFileSync(root + 'supabase/schema.sql', 'utf8')

// Режем файл на отдельные стейтменты: убираем строки-комментарии и делим по `;`.
// В этой схеме нет тел функций с `;`, поэтому наивного разбиения достаточно.
const statements = schema
  .split('\n')
  .filter((l) => !l.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean)

const sql = postgres(DB_URL, { ssl: 'require', prepare: false, max: 1, idle_timeout: 5 })

try {
  for (const stmt of statements) {
    await sql.unsafe(stmt)
  }
  ok('✔ Схема Supabase применена (таблицы готовы)')
} catch (err) {
  warn('\n⚠  Не удалось применить миграцию автоматически:')
  warn('   ' + (err?.message ?? err))
  warn('   Проверь SUPABASE_DB_URL. Можно накатить вручную: supabase/schema.sql\n')
  // Тоже не блокируем dev — пусть приложение запустится и подскажет.
} finally {
  await sql.end({ timeout: 5 })
}
