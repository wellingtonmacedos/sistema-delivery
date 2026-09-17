import { prisma } from './db'
import type { Configuracao } from '@prisma/client'

export type ConfiguracaoUpdateInput = {
  taxaEntrega?: number | null
  tempoEstimado?: number | null
  pixApiKey?: string | null
  pixChave?: string | null
  pixBeneficiario?: string | null
  pixCidade?: string | null
}

const DEFAULTS: Configuracao = {
  id: 0,
  estabelecimentoId: null,
  taxaEntrega: null,
  tempoEstimado: null,
  pixApiKey: null,
  pixChave: null,
  pixBeneficiario: null,
  pixCidade: null
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
      create: { estabelecimentoId, ...update }
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
