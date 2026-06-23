import Anthropic from '@anthropic-ai/sdk'

let cached: Anthropic | null = null

function getClient(): Anthropic {
  if (cached) return cached
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  cached = new Anthropic({ apiKey })
  return cached
}

// Lazy proxy: defers key validation until a request actually uses the client,
// so importing this module at build time never throws.
export const anthropic = new Proxy({} as Anthropic, {
  get(_target, prop, receiver) {
    const real = getClient()
    const value = Reflect.get(real as object, prop, receiver)
    return typeof value === 'function' ? value.bind(real) : value
  },
})
