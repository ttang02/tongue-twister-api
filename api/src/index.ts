import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { corsMiddleware } from './middleware/cors'
import phrasesRoute from './routes/phrases'
import scoresRoute  from './routes/scores'
import speechRoute  from './routes/speech'

const app = new Hono()

app.use('*', logger())
app.use('*', secureHeaders())
app.use('*', corsMiddleware)
app.use('*', prettyJSON())

app.get('/', (c) => c.json({ status: 'ok', version: '1.0.0' }))

app.route('/phrases', phrasesRoute)
app.route('/scores',  scoresRoute)
app.route('/speech',  speechRoute)

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})

app.notFound((c) => c.json({ error: 'Not found' }, 404))

const port = Number(process.env.PORT ?? 3000)
console.log(`Server running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
