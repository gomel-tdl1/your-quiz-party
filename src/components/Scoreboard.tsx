import { useState } from 'react'
import type { Team } from '../lib/types'

interface Props {
  teams: Team[]
  editable?: boolean
  onAdjust: (teamId: string, delta: number) => void
  onRename?: (teamId: string, name: string) => void
  onColor?: (teamId: string, color: string) => void
  onAdd?: () => void
  onRemove?: (teamId: string) => void
}

/** Табло команд. Шаг начисления настраивается; в редакторе — имя, цвет, удаление. */
export function Scoreboard({ teams, editable, onAdjust, onRename, onColor, onAdd, onRemove }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [step, setStep] = useState(100)

  return (
    <div className="scoreboard">
      <label className="step-ctrl" title="На сколько баллов меняет кнопками −/+">
        <span>Шаг</span>
        <input
          className="input"
          type="number"
          value={step}
          onChange={(e) => setStep(Number(e.target.value) || 0)}
        />
      </label>

      {teams.map((t) => (
        <div key={t.id} className="score-card" style={{ ['--team' as string]: t.color }}>
          {editable && editingId === t.id ? (
            <input
              className="input"
              autoFocus
              defaultValue={t.name}
              onBlur={(e) => {
                onRename?.(t.id, e.target.value.trim() || t.name)
                setEditingId(null)
              }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
          ) : (
            <div
              className="team-name"
              onClick={() => editable && setEditingId(t.id)}
              style={{ cursor: editable ? 'text' : 'default' }}
              title={editable ? 'Нажми, чтобы переименовать' : undefined}
            >
              {t.name}
            </div>
          )}

          <div className="team-score">{t.score}</div>

          <div className="adj">
            <button onClick={() => onAdjust(t.id, -step)} aria-label={`Минус ${step}`}>
              −{step}
            </button>
            <button onClick={() => onAdjust(t.id, step)} aria-label={`Плюс ${step}`}>
              +{step}
            </button>
          </div>

          {editable && (
            <div className="team-tools">
              <label className="color-swatch" title="Цвет команды">
                <input
                  type="color"
                  value={t.color}
                  onChange={(e) => onColor?.(t.id, e.target.value)}
                />
              </label>
              <button
                className="btn danger sm"
                onClick={() => onRemove?.(t.id)}
                aria-label="Удалить команду"
              >
                Удалить
              </button>
            </div>
          )}
        </div>
      ))}

      {editable && onAdd && (
        <button className="btn ghost" style={{ alignSelf: 'center' }} onClick={onAdd}>
          + Команда
        </button>
      )}
    </div>
  )
}
