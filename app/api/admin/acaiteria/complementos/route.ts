import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { rateLimit, keyFromRequestHeaders } from '@/lib/rateLimit'
import { AcaiComplementoCreateSchema } from '@/lib/validate'
import { resolveTenant } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const est = await resolveTenant(req)
  const rows = await prisma.acaiComplemento.findMany({
    where: { estabelecimentoId: est?.id || undefined },
    orderBy: { nome: 'asc' }
  })
  return Response.json({ complementos: rows })
}

export async function POST(req: NextRequest) {
  const key = 'acaiteria:complementos:' + keyFromRequestHeaders(req.headers)
  if (!rateLimit(key, 50, 60_000)) return Response.json({ error: 'rate limit' }, { status: 429 })
  const body = await req.json()
  const parsed = AcaiComplementoCreateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const est = await resolveTenant(req)
  const row = await prisma.acaiComplemento.create({
    data: {
      nome: parsed.data.nome,
      valorAdicional: parsed.data.valorAdicional,
      ativo: parsed.data.ativo ?? true,
      estabelecimentoId: est?.id || ''
    }
  })
  return Response.json({ complemento: row })
}
