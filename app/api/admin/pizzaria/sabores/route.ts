import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { rateLimit, keyFromRequestHeaders } from '@/lib/rateLimit'
import { PizzaSaborCreateSchema } from '@/lib/validate'
import { resolveTenant } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const est = await resolveTenant(req)
  const rows = await prisma.pizzaSabor.findMany({
    where: { estabelecimentoId: est?.id || undefined },
    orderBy: { nome: 'asc' }
  })
  return Response.json({ sabores: rows })
}

export async function POST(req: NextRequest) {
  const key = 'pizzaria:sabores:' + keyFromRequestHeaders(req.headers)
  if (!rateLimit(key, 50, 60_000)) return Response.json({ error: 'rate limit' }, { status: 429 })
  const body = await req.json()
  const parsed = PizzaSaborCreateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const est = await resolveTenant(req)
  const row = await prisma.pizzaSabor.create({
    data: {
      nome: parsed.data.nome,
      descricao: parsed.data.descricao,
      ativo: parsed.data.ativo ?? true,
      estabelecimentoId: est?.id || ''
    }
  })
  return Response.json({ sabor: row })
}
