import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { rateLimit, keyFromRequestHeaders } from '@/lib/rateLimit'
import { AcaiCoberturaCreateSchema } from '@/lib/validate'
import { resolveTenant } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const est = await resolveTenant(req)
  const rows = await prisma.acaiCobertura.findMany({
    where: { estabelecimentoId: est?.id || undefined },
    orderBy: { nome: 'asc' }
  })
  return Response.json({ coberturas: rows })
}

export async function POST(req: NextRequest) {
  const key = 'acaiteria:coberturas:' + keyFromRequestHeaders(req.headers)
  if (!rateLimit(key, 50, 60_000)) return Response.json({ error: 'rate limit' }, { status: 429 })
  const body = await req.json()
  const parsed = AcaiCoberturaCreateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const est = await resolveTenant(req)
  const row = await prisma.acaiCobertura.create({
    data: {
      nome: parsed.data.nome,
      ativo: parsed.data.ativo ?? true,
      estabelecimentoId: est?.id || ''
    }
  })
  return Response.json({ cobertura: row })
}
