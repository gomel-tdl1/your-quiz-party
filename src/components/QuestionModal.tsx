import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CategoryWithQuestions, Question, Team } from '../lib/types'
import { playReveal } from '../lib/sound'
import { Html } from './Html'

interface Props {
  question: Question
  category: CategoryWithQuestions
  teams: Team[]
  origin: DOMRect | null
  onAward: (teamId: string, delta: number) => void
  onClose: () => void
}

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

export function QuestionModal({ question, category, teams, origin, onAward, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [revealed, setRevealed] = useState(false)
  const [mode, setMode] = useState<'add' | 'sub'>('add')
  // По умолчанию начисляем стоимость вопроса, но число можно поменять.
  const [amount, setAmount] = useState(question.value)

  const reveal = useCallback(() => {
    setRevealed((was) => {
      if (!was) playReveal()
      return true
    })
  }, [])

  // Signature: карточка «вырастает» из нажатой плитки (FLIP).
  useLayoutEffect(() => {
    const card = cardRef.current
    if (!card || !origin || prefersReducedMotion()) return
    const target = card.getBoundingClientRect()
    const dx = origin.left + origin.width / 2 - (target.left + target.width / 2)
    const dy = origin.top + origin.height / 2 - (target.top + target.height / 2)
    const sx = origin.width / target.width
    const sy = origin.height / target.height
    card.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.35 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 440, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    )
  }, [origin])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && !revealed) reveal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, revealed, reveal])

  const sign = mode === 'add' ? 1 : -1

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="qcard" ref={cardRef} role="dialog" aria-modal="true">
        <div className="qtop">
          <span className="qcat">{category.name}</span>
          <span className="qvalue">{question.value}</span>
        </div>

        <div className="qbody-scroll">
          {question.body.trim() ? (
            <Html html={question.body} />
          ) : (
            <p className="qhtml muted">Вопрос пуст — заполни его в редакторе.</p>
          )}

          {revealed && (
            <div className="answer-block">
              <div className="answer-label">Правильный ответ</div>
              {question.answer.trim() ? (
                <Html html={question.answer} />
              ) : (
                <p className="qhtml muted">Ответ не заполнен.</p>
              )}
            </div>
          )}
        </div>

        <div className="qfoot">
          {!revealed ? (
            <div className="row">
              <button className="btn primary" onClick={reveal}>
                Показать ответ
              </button>
              <button className="btn ghost" onClick={onClose}>
                Закрыть
              </button>
            </div>
          ) : (
            <>
              <div className="row" style={{ justifyContent: 'center' }}>
                <button
                  className={`btn sm${mode === 'add' ? ' primary' : ''}`}
                  onClick={() => setMode('add')}
                >
                  + Начислить
                </button>
                <button
                  className={`btn sm${mode === 'sub' ? ' danger' : ''}`}
                  onClick={() => setMode('sub')}
                >
                  − Снять
                </button>
                <label className="hint" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  Баллы
                  <input
                    className="input"
                    type="number"
                    style={{ width: 96 }}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  />
                  <button
                    className="btn sm ghost"
                    type="button"
                    onClick={() => setAmount(question.value)}
                    title="Вернуть стоимость вопроса"
                  >
                    ={question.value}
                  </button>
                </label>
              </div>

              {teams.length > 0 ? (
                <div className="row">
                  {teams.map((t) => (
                    <button
                      key={t.id}
                      className={`award${mode === 'sub' ? ' minus' : ''}`}
                      style={{ ['--team' as string]: t.color }}
                      onClick={() => onAward(t.id, sign * amount)}
                    >
                      <span className="dot" />
                      {t.name}
                      <b style={{ color: 'var(--gold)' }}>{t.score}</b>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="hint">Добавь команды в табло, чтобы начислять баллы.</p>
              )}

              <div className="row">
                <button className="btn primary" onClick={onClose}>
                  Готово ✓
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
