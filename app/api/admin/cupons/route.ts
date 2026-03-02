import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveTenant } from '@/lib/tenant'
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
  ativo: z.boolean().optional()
})

export async function GET(req: NextRequest) {
  const est = await resolveTenant(req)
  const rows = await prisma.cupom.findMany({
    where: { estabelecimentoId: est?.id || undefined },
    orderBy: { createdAt: 'desc' }
  })
  return Response.json({ cupons: rows })
}

export async function POST(req: NextRequest) {
  const key = 'cupons:create:' + keyFromRequestHeaders(req.headers)
  if (!rateLimit(key, 50, 60_000)) return Response.json({ error: 'rate limit' }, { status: 429 })
  const est = await resolveTenant(req)
  if (!est?.id) return Response.json({ error: 'tenant' }, { status: 401 })
  const body = await req.json()
  const parsed = CupomCreateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const data = parsed.data
  try {
    const row = await prisma.cupom.create({
      data: {
        estabelecimentoId: est.id,
        codigo: data.codigo.trim().toUpperCase(),
        descricao: data.descricao,
        tipo: data.tipo,
        valor: data.valor,
        valorMinimoPedido: data.valorMinimoPedido,
        limiteTotalUso: data.limiteTotalUso,
        limitePorCliente: data.limitePorCliente,
        dataInicio: new Date(data.dataInicio),
        dataFim: new Date(data.dataFim),
        ativo: data.ativo ?? true
      }
    })
    return Response.json({ cupom: row })
  } catch (e: any) {
    return Response.json({ error: 'erro ao criar' }, { status: 400 })
  }
}

