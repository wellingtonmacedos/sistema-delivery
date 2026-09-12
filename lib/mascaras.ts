export function mascaraReal(v: number | string): string {
  let raw: string
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return ''
    const scaled = Math.round(v * 100)
    raw = String(scaled)
  } else {
    raw = String(v ?? '')
  }
  if (!raw) return ''
  const only = raw.replace(/\D/g, '').padStart(3, '0')
  const intPart = only.slice(0, -2) || '0'
  const dec = only.slice(-2)
  const intFmt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `R$ ${intFmt},${dec}`
}

export function mascaraRealToNumber(v: string): number | null {
  if (v === undefined || v === null) return null
  const only = String(v).replace(/\D/g, '')
  if (!only) return null
  return Math.round(Number(only)) / 100
}

export function exibirTelefone(v: string): string {
  const only = String(v ?? '').replace(/\D/g, '')
  if (!only) return v || ''
  if (only.length <= 10) {
    const ddd = only.slice(0, 2)
    const p1 = only.slice(2, 6)
    const p2 = only.slice(6)
    return ddd ? `(${ddd}) ${p1}-${p2}` : v
  }
  const ddd = only.slice(0, 2)
  const p1 = only.slice(2, 7)
  const p2 = only.slice(7)
  return `(${ddd}) ${p1}-${p2}`
}
