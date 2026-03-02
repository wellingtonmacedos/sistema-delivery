import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveTenant } from '@/lib/tenant'
import { rateLimit, keyFromRequestHeaders } from '@/lib/rateLimit'
import { CategoriaCreateSchema, CategoriaUpdateSchema } from '@/lib/validate'

export async function GET(req: NextRequest) {
  const est = await resolveTenant(req)
  const rows = await prisma.categoria.findMany({
    where: { estabelecimentoId: est?.id || undefined },
    orderBy: [{ ordemExibicao: 'asc' }, { nome: 'asc' }]
  })
  return Response.json({ categorias: rows })
}

export async function POST(req: NextRequest) {
  const key = 'lanchonete:categorias:' + keyFromRequestHeaders(req.headers)
  if (!rateLimit(key, 50, 60_000)) return Response.json({ error: 'rate limit' }, { status: 429 })
  const body = await req.json()
  const parsed = CategoriaCreateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const est = await resolveTenant(req)
  if (!est) return Response.json({ error: 'estabelecimento não encontrado' }, { status: 400 })

  const existing = await prisma.categoria.findFirst({
    where: { estabelecimentoId: est.id, nome: parsed.data.nome }
  })
  if (existing) return Response.json({ error: 'categoria já existe' }, { status: 400 })

  const row = await prisma.categoria.create({
    data: {
      estabelecimentoId: est.id,
      nome: parsed.data.nome,
      icone: parsed.data.icone,
      ordemExibicao: parsed.data.ordemExibicao ?? null,
      ativo: parsed.data.ativo ?? true
    }
  })
  return Response.json({ categoria: row })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const id = String(body.id || '')
  if (!id) return Response.json({ error: 'id obrigatório' }, { status: 400 })
  const parsed = CategoriaUpdateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const row = await prisma.categoria.update({
    where: { id },
    data: parsed.data
  })
  return Response.json({ categoria: row })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = String(searchParams.get('id') || '')
  if (!id) return Response.json({ error: 'id obrigatório' }, { status: 400 })
  await prisma.categoria.delete({ where: { id } })
  return Response.json({ ok: true })
}

