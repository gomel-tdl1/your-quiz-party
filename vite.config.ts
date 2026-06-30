import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// На GitHub Pages сайт живёт по адресу /your-quiz-party/, поэтому в продакшене
// нужен такой base. В dev оставляем корень.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/your-quiz-party/' : '/',
  plugins: [react()],
  server: { port: 5173 },
}))
