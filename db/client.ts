import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

type DbClient = ReturnType<typeof drizzle>

let cached: DbClient | null = null

function getDb(): DbClient {
  if (cached) return cached
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  cached = drizzle(postgres(url))
  return cached
}

// Lazy proxy: defers connection/validation until a query actually runs,
// so importing this module at build time never throws.
export const db = new Proxy({} as DbClient, {
  get(_target, prop, receiver) {
    const real = getDb()
    const value = Reflect.get(real as object, prop, receiver)
    return typeof value === 'function' ? value.bind(real) : value
  },
})
