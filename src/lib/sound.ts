// Звуковые эффекты через Web Audio API — синтезируются на лету,
// без файлов и без сети. Контекст создаётся лениво, при первом клике
// (а все вызовы идут из обработчиков кликов, так что автоплей не блокируется).

let ctx: AudioContext | null = null

function audio(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

let muted = localStorage.getItem('sfx-muted') === '1'

export const isMuted = () => muted

/** Переключает звук, сохраняет выбор. Возвращает новое состояние. */
export function toggleMute(): boolean {
  muted = !muted
  localStorage.setItem('sfx-muted', muted ? '1' : '0')
  return muted
}

interface Tone {
  freq: number
  freqEnd?: number
  start?: number
  dur: number
  gain?: number
  type?: OscillatorType
}

function tone({ freq, freqEnd, start = 0, dur, gain = 0.2, type = 'sine' }: Tone) {
  const c = audio()
  const t0 = c.currentTime + start
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur)
  // Мягкая атака + экспоненциальный спад — звучит чисто, без щелчков.
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.03)
}

/** Триумфальный арпеджио-аккорд при начислении баллов — громкий и заметный. */
export function playDing() {
  if (muted) return
  // Быстрое восходящее мажорное арпеджио C6→E6→G6→C7 с искрой наверху.
  tone({ freq: 1046, dur: 0.16, gain: 0.5, type: 'square' }) // C6 — панч
  tone({ freq: 1318, start: 0.05, dur: 0.18, gain: 0.45, type: 'triangle' }) // E6
  tone({ freq: 1568, start: 0.1, dur: 0.22, gain: 0.45, type: 'triangle' }) // G6
  tone({ freq: 2093, start: 0.16, dur: 0.32, gain: 0.4, type: 'triangle' }) // C7 — звон
}

/** «Скатывание» — нисходящий звук при снятии баллов. */
export function playPenalty() {
  if (muted) return
  tone({ freq: 400, freqEnd: 110, dur: 0.38, gain: 0.2, type: 'sawtooth' })
  tone({ freq: 200, freqEnd: 70, start: 0.04, dur: 0.34, gain: 0.12, type: 'square' })
}

/** Загадочный мерцающий перелив при раскрытии ответа. */
export function playReveal() {
  if (muted) return
  tone({ freq: 131, dur: 0.6, gain: 0.12, type: 'sine' }) // низкая «тень» — интрига
  tone({ freq: 880, dur: 0.5, gain: 0.16, type: 'sine' }) // A5
  tone({ freq: 1174, start: 0.12, dur: 0.5, gain: 0.14, type: 'sine' }) // D6
  tone({ freq: 1760, start: 0.24, dur: 0.55, gain: 0.12, type: 'triangle' }) // A6
  tone({ freq: 2637, start: 0.34, dur: 0.5, gain: 0.1, type: 'sine' }) // E7 — искра
}

/** «Вжух» — восходящий свуш при открытии вопроса. */
export function playOpen() {
  if (muted) return
  tone({ freq: 220, freqEnd: 880, dur: 0.32, gain: 0.16, type: 'sine' })
  tone({ freq: 660, freqEnd: 1480, start: 0.05, dur: 0.3, gain: 0.12, type: 'triangle' })
}
