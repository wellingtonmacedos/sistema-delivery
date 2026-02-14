import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveTenant } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const est = await resolveTenant(req)
  if (!est) return Response.json({ error: 'estabelecimento não encontrado' }, { status: 404 })
  const [config, tamanhos, sabores] = await Promise.all([
    prisma.configuracaoPizzaria.findUnique({ where: { estabelecimentoId: est.id } }),
    prisma.pizzaTamanho.findMany({ where: { estabelecimentoId: est.id, ativo: true }, orderBy: { nome: 'asc' } }),
    prisma.pizzaSabor.findMany({ where: { estabelecimentoId: est.id, ativo: true }, orderBy: { nome: 'asc' } })
  ])
  return Response.json({
    config: { maxSaboresPorPizza: config?.maxSaboresPorPizza ?? 2 },
    tamanhos, sabores
  })
}
