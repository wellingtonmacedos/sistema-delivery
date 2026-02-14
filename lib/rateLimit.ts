type Hit = { count: number; resetAt: number }
const store = new Map<string, Hit>()

export function rateLimit(key: string, limit = 20, windowMs = 60_000) {
  const now = Date.now()
  const hit = store.get(key)
  if (!hit || now > hit.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (hit.count >= limit) return false
  hit.count++
  return true
}

export function keyFromRequestHeaders(headers: Headers) {
  const ip = headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'unknown'
  return ip.split(',')[0].trim()
}
