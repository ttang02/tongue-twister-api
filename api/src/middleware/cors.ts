import { cors } from 'hono/cors'

export const corsMiddleware = cors({
  origin: (origin) => {
    const allowed = (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',')
    return allowed.includes(origin) ? origin : allowed[0]!
  },
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  maxAge: 600,
})
