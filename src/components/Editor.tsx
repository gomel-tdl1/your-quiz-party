import { useRef, useState } from 'react'
import type { CategoryWithQuestions, GameState, Question } from '../lib/types'
import { Html } from './Html'
import { Scoreboard } from './Scoreboard'

export interface EditorActions {
  renameQuiz: (title: string) => void
  addCategory: () => void
  renameCategory: (id: string, name: string) => void
  deleteCategory: (id: string) => void
  updateQuestion: (id: string, patch: Partial<Pick<Question, 'value' | 'body' | 'answer'>>) => void
  addTeam: () => void
  renameTeam: (id: string, name: string) => void
  setTeamColor: (id: string, color: string) => void
  removeTeam: (id: string) => void
  adjustScore: (id: string, delta: number) => void
  exportJson: () => void
  importJson: (file: File) => void
}

export function Editor({ state, actions }: { state: GameState; actions: EditorActions }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const selected: { q: Question; cat: CategoryWithQuestions } | null = (() => {
    for (const cat of state.categories) {
      const q = cat.questions.find((x) => x.id === selectedId)
      if (q) return { q, cat }
    }
    return null
  })()

  return (
    <div className="editor">
      {/* Название квиза */}
      <div className="panel">
        <h2>Квиз</h2>
        <div className="field">
          <label>Название</label>
          <input
            className="input"
            defaultValue={state.quiz.title}
            onBlur={(e) => actions.renameQuiz(e.target.value.trim() || state.quiz.title)}
          />
        </div>
        <div className="row">
          <button className="btn" onClick={actions.exportJson}>
            Экспорт JSON
          </button>
          <button className="btn" onClick={() => fileInput.current?.click()}>
            Импорт JSON
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) actions.importJson(f)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      {/* Команды */}
      <div className="panel">
        <h2>Команды</h2>
        <Scoreboard
          teams={state.teams}
          editable
          onAdjust={actions.adjustScore}
          onRename={actions.renameTeam}
          onColor={actions.setTeamColor}
          onAdd={actions.addTeam}
          onRemove={actions.removeTeam}
        />
      </div>

      {/* Категории и ячейки */}
      <div className="panel">
        <h2>Поле</h2>
        <div className="cat-editor">
          {state.categories.map((cat) => (
            <div key={cat.id}>
              <div className="cat-row">
                <input
                  className="input"
                  defaultValue={cat.name}
                  onBlur={(e) => actions.renameCategory(cat.id, e.target.value.trim() || cat.name)}
                />
                <button
                  className="btn danger sm"
                  onClick={() => {
                    if (confirm(`Удалить категорию «${cat.name}» со всеми вопросами?`))
                      actions.deleteCategory(cat.id)
                  }}
                >
                  Удалить
                </button>
              </div>
              <div className="q-chip-row">
                {cat.questions
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((q) => (
                    <button
                      key={q.id}
                      className={`q-chip${q.body.trim() ? '' : ' empty'}`}
                      onClick={() => setSelectedId(q.id)}
                    >
                      {q.value}
                    </button>
                  ))}
              </div>
            </div>
          ))}
          <button className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={actions.addCategory}>
            + Категория
          </button>
        </div>
      </div>

      {/* Редактор выбранного вопроса */}
      {selected && (
        <QuestionEditor
          key={selected.q.id}
          question={selected.q}
          categoryName={selected.cat.name}
          onSave={(patch) => actions.updateQuestion(selected.q.id, patch)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}

function QuestionEditor({
  question,
  categoryName,
  onSave,
  onClose,
}: {
  question: Question
  categoryName: string
  onSave: (patch: Partial<Pick<Question, 'value' | 'body' | 'answer'>>) => void
  onClose: () => void
}) {
  const [value, setValue] = useState(question.value)
  const [body, setBody] = useState(question.body)
  const [answer, setAnswer] = useState(question.answer)

  return (
    <div className="panel">
      <h2>
        Вопрос · {categoryName} · {question.value}
      </h2>

      <div className="field" style={{ maxWidth: 200 }}>
        <label>Стоимость (баллы)</label>
        <input
          className="input"
          type="number"
          value={value}
          onChange={(e) => setValue(Number(e.target.value) || 0)}
        />
      </div>

      <div className="two-col">
        <div>
          <div className="field">
            <label>Вопрос — HTML (можно вставлять &lt;img&gt;, &lt;audio&gt;, &lt;video&gt;, &lt;iframe&gt;)</label>
            <textarea
              className="textarea"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={'<p>Текст вопроса</p>\n<img src="https://..." />\n<audio controls src="https://..."></audio>'}
            />
          </div>
          <div className="section-title">Превью вопроса</div>
          <div className="preview">
            {body.trim() ? <Html html={body} /> : <span className="muted">Пусто</span>}
          </div>
        </div>

        <div>
          <div className="field">
            <label>Правильный ответ — HTML</label>
            <textarea
              className="textarea"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={'<p>Правильный ответ</p>'}
            />
          </div>
          <div className="section-title">Превью ответа</div>
          <div className="preview">
            {answer.trim() ? <Html html={answer} /> : <span className="muted">Пусто</span>}
          </div>
        </div>
      </div>

      <div className="row" style={{ marginTop: 16 }}>
        <button
          className="btn primary"
          onClick={() => {
            onSave({ value, body, answer })
            onClose()
          }}
        >
          Сохранить
        </button>
        <button className="btn ghost" onClick={onClose}>
          Отмена
        </button>
      </div>
    </div>
  )
}
