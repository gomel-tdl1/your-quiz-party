import { supabase } from './supabase'
import type {
  Category,
  CategoryWithQuestions,
  GameState,
  Question,
  Quiz,
  Team,
} from './types'

function client() {
  if (!supabase) throw new Error('Supabase не настроен')
  return supabase
}

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

const TEAM_COLORS = ['#FF2E97', '#22D3EE', '#FFC83D', '#7C5CFF', '#34D399', '#FB7185']

// ---------------------------------------------------------------------------
// Загрузка
// ---------------------------------------------------------------------------

/** Берёт первый квиз; если квизов нет — создаёт демо-игру с примером. */
export async function getOrCreateQuiz(): Promise<Quiz> {
  const db = client()
  const existing = unwrap(
    await db.from('quizzes').select('*').order('created_at').limit(1),
  ) as Quiz[]
  if (existing.length > 0) return existing[0]
  return seedSampleQuiz()
}

export async function listQuizzes(): Promise<Quiz[]> {
  return unwrap(await client().from('quizzes').select('*').order('created_at')) as Quiz[]
}

/** Загружает поле, вопросы и команды одной игры в удобную структуру. */
export async function loadGame(quizId: string): Promise<GameState> {
  const db = client()
  const quiz = unwrap(
    await db.from('quizzes').select('*').eq('id', quizId).single(),
  ) as Quiz
  const categories = unwrap(
    await db.from('categories').select('*').eq('quiz_id', quizId).order('position'),
  ) as Category[]
  const teams = unwrap(
    await db.from('teams').select('*').eq('quiz_id', quizId).order('position'),
  ) as Team[]

  const catIds = categories.map((c) => c.id)
  const questions = catIds.length
    ? (unwrap(
        await db.from('questions').select('*').in('category_id', catIds).order('position'),
      ) as Question[])
    : []

  const withQuestions: CategoryWithQuestions[] = categories.map((c) => ({
    ...c,
    questions: questions.filter((q) => q.category_id === c.id),
  }))

  return { quiz, categories: withQuestions, teams }
}

// ---------------------------------------------------------------------------
// Квиз
// ---------------------------------------------------------------------------

export async function renameQuiz(id: string, title: string): Promise<void> {
  unwrap(await client().from('quizzes').update({ title }).eq('id', id).select())
}

// ---------------------------------------------------------------------------
// Категории
// ---------------------------------------------------------------------------

export async function addCategory(quizId: string, position: number): Promise<Category> {
  const cat = unwrap(
    await client()
      .from('categories')
      .insert({ quiz_id: quizId, name: 'Новая категория', position })
      .select()
      .single(),
  ) as Category
  // Сразу даём колонке пустые ячейки на стандартные стоимости.
  await Promise.all(
    [100, 200, 300, 400, 500].map((value, i) =>
      addQuestion(cat.id, value, i),
    ),
  )
  return cat
}

export async function renameCategory(id: string, name: string): Promise<void> {
  unwrap(await client().from('categories').update({ name }).eq('id', id).select())
}

export async function deleteCategory(id: string): Promise<void> {
  unwrap(await client().from('categories').delete().eq('id', id).select())
}

// ---------------------------------------------------------------------------
// Вопросы
// ---------------------------------------------------------------------------

export async function addQuestion(
  categoryId: string,
  value: number,
  position: number,
): Promise<Question> {
  return unwrap(
    await client()
      .from('questions')
      .insert({ category_id: categoryId, value, position, body: '', answer: '' })
      .select()
      .single(),
  ) as Question
}

export async function updateQuestion(
  id: string,
  patch: Partial<Pick<Question, 'value' | 'body' | 'answer'>>,
): Promise<void> {
  unwrap(await client().from('questions').update(patch).eq('id', id).select())
}

export async function deleteQuestion(id: string): Promise<void> {
  unwrap(await client().from('questions').delete().eq('id', id).select())
}

export async function setAnswered(id: string, answered: boolean): Promise<void> {
  unwrap(await client().from('questions').update({ answered }).eq('id', id).select())
}

// ---------------------------------------------------------------------------
// Команды и счёт
// ---------------------------------------------------------------------------

export async function addTeam(quizId: string, position: number): Promise<Team> {
  return unwrap(
    await client()
      .from('teams')
      .insert({
        quiz_id: quizId,
        name: `Команда ${position + 1}`,
        color: TEAM_COLORS[position % TEAM_COLORS.length],
        position,
      })
      .select()
      .single(),
  ) as Team
}

export async function updateTeam(
  id: string,
  patch: Partial<Pick<Team, 'name' | 'color' | 'score'>>,
): Promise<void> {
  unwrap(await client().from('teams').update(patch).eq('id', id).select())
}

export async function deleteTeam(id: string): Promise<void> {
  unwrap(await client().from('teams').delete().eq('id', id).select())
}

export async function setScore(id: string, score: number): Promise<void> {
  unwrap(await client().from('teams').update({ score }).eq('id', id).select())
}

// ---------------------------------------------------------------------------
// Управление партией
// ---------------------------------------------------------------------------

/** Новая партия: открываем все ячейки заново и обнуляем счёт. */
export async function resetGame(quizId: string): Promise<void> {
  const db = client()
  const categories = unwrap(
    await db.from('categories').select('id').eq('quiz_id', quizId),
  ) as Pick<Category, 'id'>[]
  const catIds = categories.map((c) => c.id)
  if (catIds.length) {
    unwrap(
      await db.from('questions').update({ answered: false }).in('category_id', catIds).select(),
    )
  }
  unwrap(await db.from('teams').update({ score: 0 }).eq('quiz_id', quizId).select())
}

// ---------------------------------------------------------------------------
// Экспорт / импорт (для шеринга квизов)
// ---------------------------------------------------------------------------

export interface QuizExport {
  title: string
  categories: { name: string; questions: { value: number; body: string; answer: string }[] }[]
}

export function exportGame(state: GameState): QuizExport {
  return {
    title: state.quiz.title,
    categories: state.categories.map((c) => ({
      name: c.name,
      questions: c.questions
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((q) => ({ value: q.value, body: q.body, answer: q.answer })),
    })),
  }
}

/** Создаёт новый квиз из экспортированного JSON и возвращает его id. */
export async function importGame(data: QuizExport): Promise<string> {
  const db = client()
  const quiz = unwrap(
    await db.from('quizzes').insert({ title: data.title || 'Импортированный квиз' }).select().single(),
  ) as Quiz
  for (let ci = 0; ci < data.categories.length; ci++) {
    const c = data.categories[ci]
    const cat = unwrap(
      await db.from('categories').insert({ quiz_id: quiz.id, name: c.name, position: ci }).select().single(),
    ) as Category
    if (c.questions.length) {
      unwrap(
        await db
          .from('questions')
          .insert(
            c.questions.map((q, qi) => ({
              category_id: cat.id,
              value: q.value,
              body: q.body,
              answer: q.answer,
              position: qi,
            })),
          )
          .select(),
      )
    }
  }
  return quiz.id
}

// ---------------------------------------------------------------------------
// Демо-квиз
// ---------------------------------------------------------------------------

async function seedSampleQuiz(): Promise<Quiz> {
  const sample: QuizExport = {
    title: 'Викторина на вечер',
    categories: [
      {
        name: 'Музыка',
        questions: [
          { value: 100, body: '<p>Назовите инструмент с 88 клавишами.</p>', answer: '<p>Фортепиано</p>' },
          {
            value: 200,
            body: '<p>Послушайте фрагмент и угадайте группу:</p><audio controls src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"></audio>',
            answer: '<p>Это пример — вставьте свой трек тегом <code>&lt;audio&gt;</code>.</p>',
          },
          { value: 300, body: '<p>Сколько струн у классической гитары?</p>', answer: '<p>Шесть</p>' },
          { value: 400, body: '<p>В каком городе родился The Beatles?</p>', answer: '<p>Ливерпуль</p>' },
          { value: 500, body: '<p>Кто написал «Времена года»?</p>', answer: '<p>Антонио Вивальди</p>' },
        ],
      },
      {
        name: 'Кино',
        questions: [
          {
            value: 100,
            body: '<p>Кадр из какого фильма?</p><img src="https://placehold.co/640x360/1e1b4b/ffc83d?text=Ваш+кадр" alt="кадр" />',
            answer: '<p>Замените картинку своим кадром через тег <code>&lt;img&gt;</code>.</p>',
          },
          { value: 200, body: '<p>Кто сыграл Нео в «Матрице»?</p>', answer: '<p>Киану Ривз</p>' },
          { value: 300, body: '<p>Режиссёр «Интерстеллара»?</p>', answer: '<p>Кристофер Нолан</p>' },
          { value: 400, body: '<p>Сколько «Оскаров» у «Властелина колец: Возвращение короля»?</p>', answer: '<p>11</p>' },
          { value: 500, body: '<p>Первый полнометражный мультфильм Pixar?</p>', answer: '<p>«История игрушек» (1995)</p>' },
        ],
      },
      {
        name: 'Спорт',
        questions: [
          { value: 100, body: '<p>Сколько игроков в футбольной команде на поле?</p>', answer: '<p>Одиннадцать</p>' },
          { value: 200, body: '<p>В каком виде спорта есть «страйк» и «спэр»?</p>', answer: '<p>Боулинг</p>' },
          { value: 300, body: '<p>Сколько колец на олимпийском флаге?</p>', answer: '<p>Пять</p>' },
          { value: 400, body: '<p>Длина марафонской дистанции?</p>', answer: '<p>42,195 км</p>' },
          { value: 500, body: '<p>Страна-родина дзюдо?</p>', answer: '<p>Япония</p>' },
        ],
      },
      {
        name: 'Наука',
        questions: [
          { value: 100, body: '<p>Химический символ воды?</p>', answer: '<p>H₂O</p>' },
          { value: 200, body: '<p>Какая планета ближе всего к Солнцу?</p>', answer: '<p>Меркурий</p>' },
          { value: 300, body: '<p>Кто сформулировал теорию относительности?</p>', answer: '<p>Альберт Эйнштейн</p>' },
          { value: 400, body: '<p>Сколько костей у взрослого человека?</p>', answer: '<p>206</p>' },
          { value: 500, body: '<p>Что измеряют в герцах?</p>', answer: '<p>Частоту</p>' },
        ],
      },
    ],
  }
  const id = await importGame(sample)
  // Две команды по умолчанию.
  await Promise.all([addTeam(id, 0), addTeam(id, 1)])
  return unwrap(await client().from('quizzes').select('*').eq('id', id).single()) as Quiz
}
