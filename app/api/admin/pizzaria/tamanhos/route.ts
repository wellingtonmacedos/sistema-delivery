import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { rateLimit, keyFromRequestHeaders } from '@/lib/rateLimit'
import { PizzaTamanhoCreateSchema } from '@/lib/validate'
import { resolveTenant } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const est = await resolveTenant(req)
  const rows = await prisma.pizzaTamanho.findMany({
    where: { estabelecimentoId: est?.id || undefined },
    orderBy: { nome: 'asc' }
  })
  return Response.json({ tamanhos: rows })
}

export async function POST(req: NextRequest) {
  const key = 'pizzaria:tamanhos:' + keyFromRequestHeaders(req.headers)
  if (!rateLimit(key, 50, 60_000)) return Response.json({ error: 'rate limit' }, { status: 429 })
  const body = await req.json()
  const parsed = PizzaTamanhoCreateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const est = await resolveTenant(req)
  const row = await prisma.pizzaTamanho.create({
    data: {
      nome: parsed.data.nome,
      precoBase: parsed.data.precoBase,
      ativo: parsed.data.ativo ?? true,
      estabelecimentoId: est?.id || ''
    }
  })
  return Response.json({ tamanho: row })
}
