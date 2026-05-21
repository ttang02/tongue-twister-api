import { Hono } from 'hono'
import OpenAI from 'openai'

const app = new Hono()

const LANGUAGE_CODES: Record<string, string> = {
  fr: 'fr', en: 'en', ko: 'ko', vi: 'vi',
}

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

app.post('/transcribe', async (c) => {
  const form = await c.req.formData()
  const audioFile = form.get('audio')
  const language  = form.get('language')?.toString() ?? 'en'

  if (!audioFile || typeof audioFile === 'string') {
    return c.json({ error: 'Missing audio file' }, 400)
  }

  const blob = audioFile as File
  if (blob.size > MAX_BYTES) {
    return c.json({ error: 'Audio file too large (max 10 MB)' }, 413)
  }
  if (blob.size < 1000) {
    return c.json({ error: 'Audio too short or silent' }, 422)
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return c.json({ error: 'Speech recognition not configured' }, 503)

  const openai = new OpenAI({ apiKey })

  const whisperLang = LANGUAGE_CODES[language] ?? 'en'

  const transcription = await openai.audio.transcriptions.create({
    file:     blob,
    model:    'whisper-1',
    language: whisperLang,
    response_format: 'verbose_json',
  })

  const text = transcription.text.trim().toLowerCase()

  return c.json({ transcript: text })
})

export default app
