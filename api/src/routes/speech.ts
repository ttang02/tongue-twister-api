import { Elysia, t } from 'elysia'
import Groq from 'groq-sdk'

const SUPPORTED_LANGS = ['fr', 'en', 'ko', 'vi'] as const
type Lang = (typeof SUPPORTED_LANGS)[number]

const MAX_BYTES = 10 * 1024 * 1024  // 10 MB
const WHISPER_MODEL = 'whisper-large-v3-turbo'

export const speechRoute = new Elysia({ prefix: '/speech' })

  .post('/transcribe', async ({ body, error }) => {
    const { audio, language } = body

    if (!audio.type.startsWith('audio/'))
      return error(422, { error: 'File must be an audio file' })
    if (audio.size > MAX_BYTES)
      return error(413, { error: 'Audio too large (max 10 MB)' })
    if (audio.size < 500)
      return error(422, { error: 'Audio too short or silent' })

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return error(503, { error: 'Speech recognition not configured' })

    const lang: Lang = (SUPPORTED_LANGS as readonly string[]).includes(language)
      ? (language as Lang)
      : 'en'

    const groq = new Groq({ apiKey })

    const result = await groq.audio.transcriptions.create({
      file:            audio,
      model:           WHISPER_MODEL,
      language:        lang,
      response_format: 'json',
    })

    return { transcript: result.text.trim().toLowerCase() }
  }, {
    body: t.Object({
      audio:    t.File(),           // accept any audio/* — type checked manually above
      language: t.String({ default: 'en' }),
    }),
  })

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

