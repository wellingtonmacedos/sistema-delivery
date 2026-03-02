import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveTenant } from '@/lib/tenant'
import { rateLimit, keyFromRequestHeaders } from '@/lib/rateLimit'
import { ComboCreateSchema } from '@/lib/validate'

export async function GET(req: NextRequest) {
  const est = await resolveTenant(req)
  const rows = await prisma.combo.findMany({
    where: { estabelecimentoId: est?.id || undefined },
    orderBy: { createdAt: 'desc' },
    include: { itens: true }
  })
  return Response.json({ combos: rows })
}

export async function POST(req: NextRequest) {
  const key = 'lanchonete:combos:' + keyFromRequestHeaders(req.headers)
  if (!rateLimit(key, 50, 60_000)) return Response.json({ error: 'rate limit' }, { status: 429 })
  const body = await req.json()
  const parsed = ComboCreateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const est = await resolveTenant(req)
  if (!est) return Response.json({ error: 'estabelecimento não encontrado' }, { status: 400 })
  const combo = await prisma.combo.create({
    data: {
      estabelecimentoId: est.id,
      nome: parsed.data.nome,
      descricao: parsed.data.descricao,
      precoFixo: parsed.data.precoFixo,
      permitirSubstituicao: parsed.data.permitirSubstituicao ?? false,
      ativo: parsed.data.ativo ?? true
    }
  })
  return Response.json({ combo })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const id = String(body.id || '')
  if (!id) return Response.json({ error: 'id obrigatório' }, { status: 400 })
  const parsed = ComboCreateSchema.partial().safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const combo = await prisma.combo.update({
    where: { id },
    data: parsed.data
  })
  return Response.json({ combo })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = String(searchParams.get('id') || '')
  if (!id) return Response.json({ error: 'id obrigatório' }, { status: 400 })
  await prisma.comboItem.deleteMany({ where: { comboId: id } })
  await prisma.combo.delete({ where: { id } })
  return Response.json({ ok: true })
}
