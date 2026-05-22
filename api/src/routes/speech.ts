import { Elysia, t } from 'elysia'
import Groq from 'groq-sdk'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'

const SUPPORTED_LANGS = ['fr', 'en', 'ko', 'vi'] as const
type Lang = (typeof SUPPORTED_LANGS)[number]

const MAX_BYTES = 10 * 1024 * 1024  // 10 MB
const WHISPER_MODEL = 'whisper-large-v3-turbo'

// Edge TTS voice mapping — neural voices, female
const EDGE_VOICES: Partial<Record<Lang, string>> = {
  vi: 'vi-VN-HoaiMyNeural',
}

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

  // TTS via Microsoft Edge neural voices (free, no API key)
  .get('/tts', async ({ query, error, set }) => {
    const { text, lang } = query
    const l = (SUPPORTED_LANGS as readonly string[]).includes(lang) ? (lang as Lang) : 'vi'
    const voiceName = EDGE_VOICES[l]
    if (!voiceName) return error(400, { error: `TTS not available for: ${lang}` })

    try {
      const tts = new MsEdgeTTS()
      await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
      const readable = tts.toStream(text)

      const chunks: Buffer[] = []
      for await (const chunk of readable) {
        chunks.push(Buffer.from(chunk))
      }

      set.headers['content-type'] = 'audio/mpeg'
      set.headers['cache-control'] = 'public, max-age=86400'
      return Buffer.concat(chunks)
    } catch (e) {
      console.error('[Edge TTS]', e)
      return error(502, { error: 'TTS generation failed' })
    }
  }, {
    query: t.Object({
      text: t.String({ minLength: 1, maxLength: 500 }),
      lang: t.String({ default: 'vi' }),
    }),
  })

