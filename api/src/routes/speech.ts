import { Elysia, t } from 'elysia'
import Groq from 'groq-sdk'

const SUPPORTED_LANGS = ['fr', 'en', 'ko', 'vi'] as const
type Lang = (typeof SUPPORTED_LANGS)[number]

const MAX_BYTES = 10 * 1024 * 1024  // 10 MB
const WHISPER_MODEL = 'whisper-large-v3-turbo'

// Google Cloud TTS voice mapping — Neural2 voices for languages with poor Web Speech API
const CLOUD_TTS_VOICES: Partial<Record<Lang, { name: string; languageCode: string }>> = {
  vi: { name: 'vi-VN-Neural2-A', languageCode: 'vi-VN' },
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

  // Text-to-speech via Google Cloud TTS — for languages with poor Web Speech API (Vietnamese)
  .post('/tts', async ({ body, error, set }) => {
    const { text, language } = body

    const lang = (SUPPORTED_LANGS as readonly string[]).includes(language)
      ? (language as Lang)
      : 'vi'

    const voiceConfig = CLOUD_TTS_VOICES[lang]
    if (!voiceConfig) return error(400, { error: `TTS not configured for language: ${language}` })

    const apiKey = process.env.GOOGLE_TTS_API_KEY
    if (!apiKey) return error(503, { error: 'Google Cloud TTS not configured' })

    const res = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: voiceConfig.languageCode,
            name:         voiceConfig.name,
          },
          audioConfig: {
            audioEncoding:   'MP3',
            speakingRate:    0.75,  // slow for learning
            pitch:           0,     // neutral — preserve tones
          },
        }),
      }
    )

    if (!res.ok) {
      const msg = await res.text().catch(() => 'unknown')
      console.error('[Google TTS]', res.status, msg)
      return error(502, { error: 'Google Cloud TTS failed' })
    }

    const json = await res.json() as { audioContent: string }

    set.headers['content-type'] = 'audio/mpeg'
    return Buffer.from(json.audioContent, 'base64')
  }, {
    body: t.Object({
      text:     t.String({ minLength: 1, maxLength: 500 }),
      language: t.String({ default: 'vi' }),
    }),
  })
