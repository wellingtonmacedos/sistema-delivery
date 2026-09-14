import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAdminWithEstabelecimento } from '@/lib/authAdmin'
import { rateLimit, keyFromRequestHeaders } from '@/lib/rateLimit'
import { z } from 'zod'
import { TipoCupom } from '@prisma/client'

const CupomCreateSchema = z.object({
  codigo: z.string().min(2).max(32),
  descricao: z.string().max(240).optional(),
  tipo: z.nativeEnum(TipoCupom),
  valor: z.number().nonnegative(),
  valorMinimoPedido: z.number().nonnegative().optional(),
  limiteTotalUso: z.number().int().positive().optional(),
  limitePorCliente: z.number().int().positive().optional(),
  dataInicio: z.string().datetime(),
  dataFim: z.string().datetime(),
  ativo: z.boolean().optional(),
  categoriaIds: z.array(z.string().cuid()).optional(),
  produtoIds: z.array(z.string().cuid()).optional()
})

export async function GET(req: NextRequest) {
  const ctx = await getCurrentAdminWithEstabelecimento()
  if (!ctx?.admin) return Response.json({ error: 'não autenticado' }, { status: 401 })
  const estId: string | undefined = ctx.estabelecimento?.id || undefined
  const rows = await prisma.cupom.findMany({
    where: { estabelecimentoId: estId },
    include: {
      categoriasAplicaveis: { include: { categoria: { select: { id: true, nome: true } } } },
      produtosAplicaveis: { include: { produto: { select: { id: true, nome: true, categoria: true } } } }
    },
    orderBy: { createdAt: 'desc' }
  })
  const [categorias, produtos] = await Promise.all([
    estId
      ? prisma.categoria.findMany({
          where: { estabelecimentoId: estId, ativo: true },
          select: { id: true, nome: true },
          orderBy: { nome: 'asc' }
        })
      : Promise.resolve([]),
    estId
      ? prisma.produto.findMany({
          where: { estabelecimentoId: estId, ativo: true },
          select: { id: true, nome: true, categoria: true, categoriaId: true },
          orderBy: { nome: 'asc' }
        })
      : Promise.resolve([])
  ])
  return Response.json({ cupons: rows, categorias, produtos })
}

export async function POST(req: NextRequest) {
  const key = 'cupons:create:' + keyFromRequestHeaders(req.headers)
  if (!rateLimit(key, 50, 60_000)) return Response.json({ error: 'rate limit' }, { status: 429 })
  const ctx = await getCurrentAdminWithEstabelecimento()
  if (!ctx?.admin) return Response.json({ error: 'não autenticado' }, { status: 401 })
  const estId: string | undefined = ctx.estabelecimento?.id || undefined
  if (!estId) return Response.json({ error: 'sem estabelecimento vinculado' }, { status: 403 })
  const body = await req.json()
  const parsed = CupomCreateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'dados inválidos', issues: parsed.error.flatten() }, { status: 400 })
  }
  const data = parsed.data
  try {
    const row = await prisma.cupom.create({
      data: {
        estabelecimentoId: estId,
        codigo: data.codigo.trim().toUpperCase(),
        descricao: data.descricao,
        tipo: data.tipo,
        valor: data.valor,
        valorMinimoPedido: data.valorMinimoPedido,
        limiteTotalUso: data.limiteTotalUso,
        limitePorCliente: data.limitePorCliente,
        dataInicio: new Date(data.dataInicio),
        dataFim: new Date(data.dataFim),
        ativo: data.ativo ?? true,
        categoriasAplicaveis:
          data.categoriaIds && data.categoriaIds.length > 0
            ? { createMany: { data: data.categoriaIds.map(id => ({ categoriaId: id })) } }
            : undefined,
        produtosAplicaveis:
          data.produtoIds && data.produtoIds.length > 0
            ? { createMany: { data: data.produtoIds.map(id => ({ produtoId: id })) } }
            : undefined
      },
      include: {
        categoriasAplicaveis: true,
        produtosAplicaveis: true
      }
    })
    return Response.json({ cupom: row })
  } catch (e: any) {
    return Response.json({ error: 'erro ao criar', detalhe: e?.message || String(e) }, { status: 400 })
  }
}
