import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/** true, когда оба ключа заданы и приложение может ходить в Supabase. */
export const isConfigured = Boolean(url && key)

/**
 * Клиент создаётся только при наличии ключей. Иначе приложение
 * показывает экран настройки вместо падения с ошибкой.
 */
export const supabase: SupabaseClient | null = isConfigured
  ? createClient(url as string, key as string)
  : null
