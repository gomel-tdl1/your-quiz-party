import DOMPurify, { type Config } from 'dompurify'

// Контент пишет сам ведущий, но dangerouslySetInnerHTML без чистки — это XSS.
// Разрешаем медиа и базовое форматирование, оставляя возможность встраивать
// картинки, аудио, видео и YouTube/Vimeo через iframe.
const config: Config = {
  ADD_TAGS: ['audio', 'video', 'source', 'iframe', 'figure', 'figcaption'],
  ADD_ATTR: [
    'controls',
    'autoplay',
    'loop',
    'muted',
    'playsinline',
    'src',
    'poster',
    'type',
    'allow',
    'allowfullscreen',
    'frameborder',
    'target',
    'width',
    'height',
  ],
}

/** Чистый HTML, готовый для dangerouslySetInnerHTML. */
export function clean(html: string): string {
  return DOMPurify.sanitize(html ?? '', config) as string
}
