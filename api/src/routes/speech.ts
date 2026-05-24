import { Elysia, t } from 'elysia'

const SUPPORTED_LANGS = ['fr', 'en', 'ko', 'vi'] as const

const ttsLimits = new Map<string, { count: number; resetAt: number }>()
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of ttsLimits) if (now > v.resetAt) ttsLimits.delete(k)
}, 300_000)

function checkTtsLimit(ip: string): boolean {
  const now = Date.now()
  const entry = ttsLimits.get(ip)
  if (!entry || now > entry.resetAt) { ttsLimits.set(ip, { count: 1, resetAt: now + 60_000 }); return true }
  if (entry.count >= 60) return false
  entry.count++; return true
}

export const speechRoute = new Elysia({ prefix: '/speech' })

  // TTS proxy — Google Translate audio fetched server-side (avoids CORS)
  .get('/tts', async ({ query, status, set, request }) => {
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
    if (!checkTtsLimit(ip)) return status(429, { error: 'Trop de requêtes TTS — réessaie dans 1 min' })
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
        return status(502, { error: 'TTS unavailable' })
      }

      const buffer = await res.arrayBuffer()
      set.headers['content-type'] = 'audio/mpeg'
      set.headers['cache-control'] = 'public, max-age=86400'
      return Buffer.from(buffer)
    } catch (e) {
      console.error('[TTS proxy]', e)
      return status(502, { error: 'TTS failed' })
    }
  }, {
    query: t.Object({
      text: t.String({ minLength: 1, maxLength: 500 }),
      lang: t.String({ default: 'vi' }),
    }),
  })
