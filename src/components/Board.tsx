import type { CategoryWithQuestions, Question } from '../lib/types'

interface Props {
  categories: CategoryWithQuestions[]
  onOpen: (q: Question, cat: CategoryWithQuestions, tile: HTMLElement) => void
}

/** Игровое поле: категории — колонки, стоимости — строки. */
export function Board({ categories, onOpen }: Props) {
  if (categories.length === 0) {
    return (
      <div className="center-screen">
        <p className="muted" style={{ textAlign: 'center', maxWidth: 360 }}>
          В этом квизе пока нет категорий. Открой <b>Редактор</b> и собери поле —
          добавь категории и впиши вопросы.
        </p>
      </div>
    )
  }

  // Сетка строк = максимум вопросов в одной категории.
  const rows = Math.max(...categories.map((c) => c.questions.length))

  return (
    <div className="board-wrap">
      <div
        className="board"
        style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }}
      >
        {categories.map((c) => (
          <div key={c.id} className="cat-head">
            {c.name}
          </div>
        ))}

        {Array.from({ length: rows }).map((_, rowIdx) =>
          categories.map((c) => {
            const sorted = c.questions.slice().sort((a, b) => a.position - b.position)
            const q = sorted[rowIdx]
            if (!q) return <div key={`${c.id}-${rowIdx}`} />
            return (
              <button
                key={q.id}
                className={`tile${q.answered ? ' spent' : ''}`}
                disabled={q.answered}
                onClick={(e) => onOpen(q, c, e.currentTarget)}
                aria-label={`${c.name}, ${q.value} баллов`}
              >
                {q.value}
              </button>
            )
          }),
        )}
      </div>
    </div>
  )
}
