export const PERFIS_VALIDOS: readonly string[] = [
  'LANCHONETE',
  'ACAITERIA',
  'PIZZARIA',
  'DISTRIBUIDORA'
]

export type PerfilValido = 'LANCHONETE' | 'ACAITERIA' | 'PIZZARIA' | 'DISTRIBUIDORA'

export function safePerfil(v: any): PerfilValido | null {
  if (v == null || v === undefined) {
    if (typeof console !== 'undefined') {
      console.warn('[safePerfil] perfil ausente recebido NULL/undefined.')
    }
    return null
  }
  const s = typeof v === 'string' ? v.trim().toUpperCase() : ''
  if (PERFIS_VALIDOS.includes(s)) return s as PerfilValido
  if (typeof console !== 'undefined') {
    console.warn(`[safePerfil] perfil inválido recebido: "${String(v)}" — deve ser um de: ${PERFIS_VALIDOS.join(', ')}`)
  }
  return null
}

export function perfilLabel(v: any): string {
  const p = safePerfil(v)
  if (p === 'ACAITERIA') return 'Açaiteria'
  if (p === 'PIZZARIA') return 'Pizzaria'
  if (p === 'DISTRIBUIDORA') return 'Distribuidora'
  if (p === 'LANCHONETE') return 'Lanchonete'
  return 'Lanchonete'
}
