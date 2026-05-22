import { Elysia, t } from 'elysia'

const SUPPORTED_LANGS = ['fr', 'en', 'ko', 'vi'] as const

export const speechRoute = new Elysia({ prefix: '/speech' })

  // TTS proxy — Google Translate audio fetched server-side (avoids CORS)
  .get('/tts', async ({ query, error, set }) => {
    const { text, lang } = query
    const tl = (SUPPORTED_LANGS as readonly string[]).includes(lang) ? lang : 'vi'

    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${tl}&client=tw-ob&ttsspeed=0.8`
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/',
        },
      })
      if (!res.ok) {
        console.error('[TTS proxy]', res.status, await res.text().catch(() => ''))
        return error(502, { error: 'TTS unavailable' })
      }

      const buffer = await res.arrayBuffer()
      set.headers['content-type'] = 'audio/mpeg'
      set.headers['cache-control'] = 'public, max-age=86400'
      return Buffer.from(buffer)
    } catch (e) {
      console.error('[TTS proxy]', e)
      return error(502, { error: 'TTS failed' })
    }
  }, {
    query: t.Object({
      text: t.String({ minLength: 1, maxLength: 500 }),
      lang: t.String({ default: 'vi' }),
    }),
  })
