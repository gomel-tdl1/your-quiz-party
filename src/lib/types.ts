export interface Quiz {
  id: string
  title: string
  created_at: string
}

export interface Category {
  id: string
  quiz_id: string
  name: string
  position: number
}

export interface Question {
  id: string
  category_id: string
  value: number
  body: string // HTML
  answer: string // HTML
  position: number
  answered: boolean
}

export interface Team {
  id: string
  quiz_id: string
  name: string
  color: string
  score: number
  position: number
}

/** Категория вместе со своими вопросами — то, что рисует игровое поле. */
export interface CategoryWithQuestions extends Category {
  questions: Question[]
}

/** Полное состояние одной игры, загруженное в память. */
export interface GameState {
  quiz: Quiz
  categories: CategoryWithQuestions[]
  teams: Team[]
}
