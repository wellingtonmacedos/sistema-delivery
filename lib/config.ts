import { prisma } from './db'
import type { Configuracao } from '@prisma/client'

export const METODOS_PAGAMENTO_DEFAULT = {
  dinheiro: true,
  cartao: true,
  pix_online: true,
  pix_entrega: false
} as const

export type MetodosPagamentoCfg = {
  dinheiro: boolean
  cartao: boolean
  pix_online: boolean
  pix_entrega: boolean
}

export function normalizarMetodosPagamento(
  parcial: Partial<MetodosPagamentoCfg> | any | null | undefined
): MetodosPagamentoCfg {
  if (!parcial || typeof parcial !== 'object') return { ...METODOS_PAGAMENTO_DEFAULT }
  return {
    dinheiro: typeof parcial.dinheiro === 'boolean' ? parcial.dinheiro : METODOS_PAGAMENTO_DEFAULT.dinheiro,
    cartao: typeof parcial.cartao === 'boolean' ? parcial.cartao : METODOS_PAGAMENTO_DEFAULT.cartao,
    pix_online: typeof parcial.pix_online === 'boolean' ? parcial.pix_online : METODOS_PAGAMENTO_DEFAULT.pix_online,
    pix_entrega: typeof parcial.pix_entrega === 'boolean' ? parcial.pix_entrega : METODOS_PAGAMENTO_DEFAULT.pix_entrega
  }
}

export function metodoHabilitado(
  cfg: MetodosPagamentoCfg | null | undefined,
  metodoRaw: 'pix' | 'pix_entrega' | 'dinheiro' | 'cartao' | null | undefined
): boolean {
  const norm = normalizarMetodosPagamento(cfg)
  switch (metodoRaw) {
    case 'dinheiro': return norm.dinheiro
    case 'cartao': return norm.cartao
    case 'pix': return norm.pix_online
    case 'pix_entrega': return norm.pix_entrega
    default: return false
  }
}

export type ConfiguracaoUpdateInput = {
  taxaEntrega?: number | null
  tempoEstimado?: number | null
  pixApiKey?: string | null
  pixChave?: string | null
  pixBeneficiario?: string | null
  pixCidade?: string | null
  metodosPagamento?: Partial<MetodosPagamentoCfg> | MetodosPagamentoCfg | null
}

const DEFAULTS: Configuracao = {
  id: 0,
  estabelecimentoId: null,
  taxaEntrega: null,
  tempoEstimado: null,
  pixApiKey: null,
  pixChave: null,
  pixBeneficiario: null,
  pixCidade: null,
  metodosPagamento: null
} as Configuracao

function toPrismaUpdate(d: ConfiguracaoUpdateInput): Record<string, any> {
  const out: Record<string, any> = {}
  if (Object.prototype.hasOwnProperty.call(d, 'taxaEntrega')) {
    out.taxaEntrega = d.taxaEntrega != null ? d.taxaEntrega : null
  }
  if (Object.prototype.hasOwnProperty.call(d, 'tempoEstimado')) {
    out.tempoEstimado = d.tempoEstimado != null ? d.tempoEstimado : null
  }
  if (Object.prototype.hasOwnProperty.call(d, 'pixApiKey')) out.pixApiKey = d.pixApiKey || null
  if (Object.prototype.hasOwnProperty.call(d, 'pixChave')) out.pixChave = d.pixChave || null
  if (Object.prototype.hasOwnProperty.call(d, 'pixBeneficiario')) out.pixBeneficiario = d.pixBeneficiario || null
  if (Object.prototype.hasOwnProperty.call(d, 'pixCidade')) out.pixCidade = d.pixCidade || null
  if (Object.prototype.hasOwnProperty.call(d, 'metodosPagamento')) {
    if (!d.metodosPagamento) {
      out.metodosPagamento = null
    } else {
      out.metodosPagamento = normalizarMetodosPagamento(d.metodosPagamento)
    }
  }
  return out
}

export async function getConfiguracao(estabelecimentoId?: string | null): Promise<Configuracao> {
  if (estabelecimentoId) {
    const especifica = await prisma.configuracao.findUnique({
      where: { estabelecimentoId }
    })
    if (especifica) return especifica
  }
  const globalCfg = await prisma.configuracao.findFirst({
    where: { estabelecimentoId: null },
    orderBy: { id: 'asc' }
  })
  if (globalCfg) return globalCfg
  return { ...DEFAULTS } as Configuracao
}

export async function upsertConfiguracao(
  estabelecimentoId: string | null | undefined,
  data: ConfiguracaoUpdateInput
): Promise<Configuracao> {
  const update = toPrismaUpdate(data)
  if (estabelecimentoId) {
    return prisma.configuracao.upsert({
      where: { estabelecimentoId },
      update,
      create: {
        ...update,
        estabelecimento: { connect: { id: estabelecimentoId } }
      }
    }) as Promise<Configuracao>
  }
  const existing = await prisma.configuracao.findFirst({
    where: { estabelecimentoId: null },
    select: { id: true }
  })
  if (existing) {
    return prisma.configuracao.update({
      where: { id: existing.id },
      data: update
    }) as Promise<Configuracao>
  }
  return prisma.configuracao.create({
    data: { estabelecimentoId: null, ...update }
  }) as Promise<Configuracao>
}
