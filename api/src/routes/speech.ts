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
