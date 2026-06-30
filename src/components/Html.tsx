import { clean } from '../lib/sanitize'

/** Рендерит HTML вопроса/ответа через dangerouslySetInnerHTML после чистки. */
export function Html({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={className ?? 'qhtml'}
      dangerouslySetInnerHTML={{ __html: clean(html) }}
    />
  )
}
