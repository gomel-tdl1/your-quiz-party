/** Показывается, когда не заданы ключи Supabase. Текст зависит от среды:
 *  локальная разработка → .env.local, опубликованный сайт → секреты GitHub. */
export function Setup() {
  const hosted = import.meta.env.PROD

  return (
    <div className="center-screen">
      <div className="setup">
        <h1>Почти готово</h1>
        <p className="lead">
          Приложению нужен бесплатный проект Supabase, чтобы хранить квизы и счёт.
        </p>

        {hosted ? (
          <ol>
            <li>
              Создай проект на <a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a>{' '}
              и накати схему: <b>SQL Editor</b> → вставь <code>supabase/schema.sql</code> → <b>Run</b>.
            </li>
            <li>
              В <b>Project Settings → API</b> скопируй <span className="kbd">Project URL</span> и{' '}
              <span className="kbd">anon public</span> ключ.
            </li>
            <li>
              В репозитории: <b>Settings → Secrets and variables → Actions</b> → добавь два секрета:
              <pre>{`VITE_SUPABASE_URL = https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOi...`}</pre>
            </li>
            <li>
              <b>Actions → Deploy to GitHub Pages → Re-run all jobs.</b> Секреты
              попадают в сборку только при новом запуске.
            </li>
          </ol>
        ) : (
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
              (подставь пароль базы).
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
        )}
      </div>
    </div>
  )
}
