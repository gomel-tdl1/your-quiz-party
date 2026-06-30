import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from './lib/api'
import { isConfigured } from './lib/supabase'
import type { CategoryWithQuestions, GameState, Question } from './lib/types'
import { Board } from './components/Board'
import { Editor, type EditorActions } from './components/Editor'
import { QuestionModal } from './components/QuestionModal'
import { Scoreboard } from './components/Scoreboard'
import { Setup } from './components/Setup'
import { isMuted, playDing, playOpen, playPenalty, toggleMute } from './lib/sound'

type Screen = 'loading' | 'error' | 'play' | 'edit'

interface OpenQuestion {
  question: Question
  category: CategoryWithQuestions
  origin: DOMRect | null
}

export default function App() {
  return isConfigured ? <Game /> : <Setup />
}

function Game() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [game, setGame] = useState<GameState | null>(null)
  const [open, setOpen] = useState<OpenQuestion | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [muted, setMuted] = useState(isMuted())
  const quizId = useRef<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const flash = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }, [])

  const reload = useCallback(async () => {
    if (!quizId.current) return
    setGame(await api.loadGame(quizId.current))
  }, [])

  // Загрузка (или создание демо-квиза) при старте.
  useEffect(() => {
    ;(async () => {
      try {
        const quiz = await api.getOrCreateQuiz()
        quizId.current = quiz.id
        await reload()
        setScreen('play')
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : String(e))
        setScreen('error')
      }
    })()
  }, [reload])

  /** Запускает мутацию, обновляет данные и показывает ошибку тостом. */
  const run = useCallback(
    async (fn: () => Promise<unknown>, after?: () => void) => {
      try {
        await fn()
        await reload()
        after?.()
      } catch (e) {
        flash(e instanceof Error ? e.message : 'Ошибка')
      }
    },
    [reload, flash],
  )

  // --- Игровой процесс ---
  const openQuestion = (question: Question, category: CategoryWithQuestions, tile: HTMLElement) => {
    playOpen()
    setOpen({ question, category, origin: tile.getBoundingClientRect() })
  }

  const award = (teamId: string, delta: number) => {
    const team = game?.teams.find((t) => t.id === teamId)
    if (!team) return
    delta >= 0 ? playDing() : playPenalty()
    run(() => api.setScore(teamId, team.score + delta), () =>
      flash(`${team.name}: ${delta >= 0 ? '+' : ''}${delta}`),
    )
  }

  const closeQuestion = () => {
    if (!open) return
    const id = open.question.id
    setOpen(null)
    run(() => api.setAnswered(id, true))
  }

  const adjustScore = (teamId: string, delta: number) => {
    const team = game?.teams.find((t) => t.id === teamId)
    if (!team) return
    delta >= 0 ? playDing() : playPenalty()
    run(() => api.setScore(teamId, team.score + delta))
  }

  // --- Действия редактора ---
  const actions: EditorActions = {
    renameQuiz: (title) => void run(() => api.renameQuiz(game!.quiz.id, title)),
    addCategory: () => void run(() => api.addCategory(game!.quiz.id, game!.categories.length)),
    renameCategory: (id, name) => void run(() => api.renameCategory(id, name)),
    deleteCategory: (id) => void run(() => api.deleteCategory(id)),
    updateQuestion: (id, patch) => void run(() => api.updateQuestion(id, patch)),
    addTeam: () => void run(() => api.addTeam(game!.quiz.id, game!.teams.length)),
    renameTeam: (id, name) => void run(() => api.updateTeam(id, { name })),
    setTeamColor: (id, color) => void run(() => api.updateTeam(id, { color })),
    removeTeam: (id) => void run(() => api.deleteTeam(id)),
    adjustScore,
    exportJson: () => {
      if (!game) return
      const data = api.exportGame(game)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${game.quiz.title || 'quiz'}.json`
      a.click()
      URL.revokeObjectURL(a.href)
      flash('Квиз выгружен')
    },
    importJson: async (file) => {
      try {
        const data = JSON.parse(await file.text())
        const newId = await api.importGame(data)
        quizId.current = newId
        await reload()
        flash('Квиз импортирован')
      } catch (e) {
        flash(e instanceof Error ? e.message : 'Не удалось импортировать')
      }
    },
  }

  const newGame = () => {
    if (!game) return
    if (!confirm('Начать новую партию? Все ячейки откроются заново, счёт обнулится.')) return
    run(() => api.resetGame(game.quiz.id), () => flash('Новая партия!'))
  }

  // --- Экраны ---
  if (screen === 'loading') {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    )
  }

  if (screen === 'error') {
    return (
      <div className="center-screen">
        <div className="setup">
          <h1>Не удалось подключиться</h1>
          <p className="lead">{errorMsg}</p>
          <p className="muted">
            Проверь, что выполнил <code>supabase/schema.sql</code> и ключи в{' '}
            <code>.env.local</code> верные.
          </p>
        </div>
      </div>
    )
  }

  if (!game) return null

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="spark">Своя игра</span>
          <span className="title">{game.quiz.title}</span>
        </div>
        <div className="spacer" />
        <button
          className="btn ghost"
          onClick={() => setMuted(toggleMute())}
          title={muted ? 'Включить звук' : 'Выключить звук'}
          aria-label={muted ? 'Включить звук' : 'Выключить звук'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
        {screen === 'play' ? (
          <>
            <button className="btn" onClick={newGame}>
              Новая партия
            </button>
            <button className="btn primary" onClick={() => setScreen('edit')}>
              Редактор
            </button>
          </>
        ) : (
          <button className="btn primary" onClick={() => setScreen('play')}>
            ← Играть
          </button>
        )}
      </header>

      {screen === 'play' ? (
        <>
          {game.teams.length > 0 && (
            <div style={{ padding: '16px clamp(16px, 3vw, 32px) 0' }}>
              <Scoreboard teams={game.teams} onAdjust={adjustScore} />
            </div>
          )}
          <Board categories={game.categories} onOpen={openQuestion} />
        </>
      ) : (
        <Editor state={game} actions={actions} />
      )}

      {open && (
        <QuestionModal
          question={open.question}
          category={open.category}
          teams={game.teams}
          origin={open.origin}
          onAward={award}
          onClose={closeQuestion}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
