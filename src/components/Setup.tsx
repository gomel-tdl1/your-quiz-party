/** Показывается, когда не заданы ключи Supabase. Объясняет, что сделать. */
export function Setup() {
  return (
    <div className="center-screen">
      <div className="setup">
        <h1>Почти готово</h1>
        <p className="lead">
          Приложению нужен бесплатный проект Supabase. Таблицы создаются
          автоматически при запуске — руками SQL вставлять не нужно.
        </p>
        <ol>
          <li>
            Создай проект на <a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a>.
          </li>
          <li>
            <b>Project Settings → API</b> — скопируй <span className="kbd">Project URL</span> и{' '}
            <span className="kbd">anon public</span> ключ.
          </li>
          <li>
            <b>Settings → Database → Connection string → URI</b> — скопируй строку
            (в ней подставь пароль базы).
          </li>
          <li>
            Создай <code>.env.local</code> в корне проекта:
            <pre>{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_DB_URL=postgresql://postgres:ПАРОЛЬ@db.xxxx.supabase.co:5432/postgres`}</pre>
          </li>
          <li>
            Перезапусти <span className="kbd">npm run dev</span> — миграция накатится сама,
            демо-квиз создастся автоматически.
          </li>
        </ol>
      </div>
    </div>
  )
}
