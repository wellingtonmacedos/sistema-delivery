import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { rateLimit, keyFromRequestHeaders } from '@/lib/rateLimit'
import { ComboItemCreateSchema } from '@/lib/validate'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const comboId = String(searchParams.get('comboId') || '')
  if (!comboId) return Response.json({ itens: [] })
  const itens = await prisma.comboItem.findMany({
    where: { comboId },
    include: { produto: true }
  })
  return Response.json({ itens })
}

export async function POST(req: NextRequest) {
  const key = 'lanchonete:combos:itens:' + keyFromRequestHeaders(req.headers)
  if (!rateLimit(key, 100, 60_000)) return Response.json({ error: 'rate limit' }, { status: 429 })
  const body = await req.json()
  const parsed = ComboItemCreateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const item = await prisma.comboItem.create({
    data: {
      comboId: parsed.data.comboId,
      produtoId: parsed.data.produtoId
    }
  })
  return Response.json({ item })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = String(searchParams.get('id') || '')
  if (!id) return Response.json({ error: 'id obrigatório' }, { status: 400 })
  await prisma.comboItem.delete({ where: { id } })
  return Response.json({ ok: true })
}

