import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveTenant } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const est = await resolveTenant(req)
  if (!est) return Response.json({ error: 'estabelecimento não encontrado' }, { status: 404 })
  const [config, sabores, sorvetes, acompanhamentos, coberturas, complementos] = await Promise.all([
    prisma.configuracaoAcaiteria.findUnique({ where: { estabelecimentoId: est.id } }),
    prisma.acaiSabor.findMany({ where: { estabelecimentoId: est.id, ativo: true }, orderBy: { nome: 'asc' } }),
    prisma.acaiSorvete.findMany({ where: { estabelecimentoId: est.id, ativo: true }, orderBy: { nome: 'asc' } }),
    prisma.acaiAcompanhamento.findMany({ where: { estabelecimentoId: est.id, ativo: true }, orderBy: { nome: 'asc' } }),
    prisma.acaiCobertura.findMany({ where: { estabelecimentoId: est.id, ativo: true }, orderBy: { nome: 'asc' } }),
    prisma.acaiComplemento.findMany({ where: { estabelecimentoId: est.id, ativo: true }, orderBy: { nome: 'asc' } })
  ])
  return Response.json({
    config: {
      minSabores: config?.minSabores ?? 0,
      maxSabores: config?.maxSabores ?? 3,
      minSorvetes: config?.minSorvetes ?? 0,
      maxSorvetes: config?.maxSorvetes ?? 2,
      minAcompanhamentos: config?.minAcompanhamentos ?? 0,
      maxAcompanhamentos: config?.maxAcompanhamentos ?? 4,
      minCoberturas: config?.minCoberturas ?? 0,
      maxCoberturas: config?.maxCoberturas ?? 2,
      minComplementos: config?.minComplementos ?? 0,
      maxComplementos: config?.maxComplementos ?? 3
    },
    sabores, sorvetes, acompanhamentos, coberturas, complementos
  })
}
