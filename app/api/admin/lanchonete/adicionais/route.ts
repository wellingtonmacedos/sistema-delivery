import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { rateLimit, keyFromRequestHeaders } from '@/lib/rateLimit'
import { LanchoneteAdicionalCreateSchema, LanchoneteAdicionalUpdateSchema } from '@/lib/validate'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const produtoId = String(searchParams.get('produtoId') || '')
  if (!produtoId) return Response.json({ adicionais: [] })
  const rows = await prisma.adicional.findMany({
    where: { produtoId },
    orderBy: { nome: 'asc' }
  })
  return Response.json({ adicionais: rows })
}

export async function POST(req: NextRequest) {
  const key = 'lanchonete:adicionais:' + keyFromRequestHeaders(req.headers)
  if (!rateLimit(key, 50, 60_000)) return Response.json({ error: 'rate limit' }, { status: 429 })
  const body = await req.json()
  const parsed = LanchoneteAdicionalCreateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const row = await prisma.adicional.create({
    data: {
      produtoId: parsed.data.produtoId,
      nome: parsed.data.nome,
      valor: parsed.data.valor,
      maximoPermitido: parsed.data.maximoPermitido ?? null,
      obrigatorio: parsed.data.obrigatorio ?? false,
      ativo: parsed.data.ativo ?? true
    }
  })
  return Response.json({ adicional: row })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const id = String(body.id || '')
  if (!id) return Response.json({ error: 'id obrigatório' }, { status: 400 })
  const parsed = LanchoneteAdicionalUpdateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const row = await prisma.adicional.update({
    where: { id },
    data: parsed.data
  })
  return Response.json({ adicional: row })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = String(searchParams.get('id') || '')
  if (!id) return Response.json({ error: 'id obrigatório' }, { status: 400 })
  await prisma.adicional.delete({ where: { id } })
  return Response.json({ ok: true })
}

