import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveTenant } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const est = await resolveTenant(req)
  if (!est) return Response.json({ error: 'estabelecimento não encontrado' }, { status: 404 })
  const [cfg, saboresInit, sorvetesInit, acompanhamentosInit, coberturasInit, complementosInit] = await Promise.all([
    prisma.configuracaoAcaiteria.findUnique({ where: { estabelecimentoId: est.id } }),
    prisma.acaiSabor.findMany({ where: { estabelecimentoId: est.id }, orderBy: { nome: 'asc' } }),
    prisma.acaiSorvete.findMany({ where: { estabelecimentoId: est.id }, orderBy: { nome: 'asc' } }),
    prisma.acaiAcompanhamento.findMany({ where: { estabelecimentoId: est.id }, orderBy: { nome: 'asc' } }),
    prisma.acaiCobertura.findMany({ where: { estabelecimentoId: est.id }, orderBy: { nome: 'asc' } }),
    prisma.acaiComplemento.findMany({ where: { estabelecimentoId: est.id }, orderBy: { nome: 'asc' } })
  ])
  // Fallback: se nada encontrado para o tenant, retorna itens ativos globais
  const sabores = saboresInit.length
    ? saboresInit
    : await prisma.acaiSabor.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } })
  const sorvetes = sorvetesInit.length
    ? sorvetesInit
    : await prisma.acaiSorvete.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } })
  const acompanhamentos = acompanhamentosInit.length
    ? acompanhamentosInit
    : await prisma.acaiAcompanhamento.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } })
  const coberturas = coberturasInit.length
    ? coberturasInit
    : await prisma.acaiCobertura.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } })
  const complementos = complementosInit.length
    ? complementosInit
    : await prisma.acaiComplemento.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } })
  return Response.json({
    config: {
      minSabores: cfg?.minSabores ?? 0,
      maxSabores: cfg?.maxSabores ?? 3,
      minSorvetes: cfg?.minSorvetes ?? 0,
      maxSorvetes: cfg?.maxSorvetes ?? 2,
      minAcompanhamentos: cfg?.minAcompanhamentos ?? 0,
      maxAcompanhamentos: cfg?.maxAcompanhamentos ?? 4,
      minCoberturas: cfg?.minCoberturas ?? 0,
      maxCoberturas: cfg?.maxCoberturas ?? 2,
      minComplementos: cfg?.minComplementos ?? 0,
      maxComplementos: cfg?.maxComplementos ?? 3
    },
    sabores: sabores.map(s => ({ id: s.id, nome: s.nome, descricao: s.descricao || null })),
    sorvetes: sorvetes.map(s => ({ id: s.id, nome: s.nome })),
    acompanhamentos: acompanhamentos.map(a => ({ id: a.id, nome: a.nome })),
    coberturas: coberturas.map(c => ({ id: c.id, nome: c.nome })),
    complementos: complementos.map(c => ({ id: c.id, nome: c.nome, valorAdicional: Number(c.valorAdicional) }))
  })
}
