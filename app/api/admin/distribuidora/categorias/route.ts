import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import jwt from 'jsonwebtoken'
import { CategoriaCreateSchema, CategoriaUpdateSchema } from '@/lib/validate'

function getAdmin(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value || ''
  const secret = process.env.JWT_SECRET || ''
  if (!token || !secret) return null
  try {
    return jwt.verify(token, secret) as any
  } catch {
    return null
  }
}

async function targetEstabelecimentoId(req: NextRequest): Promise<string | null> {
  const admin = getAdmin(req)
  if (!admin) return null
  if (admin.estabelecimentoId) return admin.estabelecimentoId
  if (admin.role === 'SUPER_ADMIN') {
    const est = await prisma.estabelecimento.findFirst({
      where: { ativo: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true }
    })
    return est?.id || null
  }
  return null
}

export async function GET(req: NextRequest) {
  const estId = await targetEstabelecimentoId(req)
  if (!estId) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const rows = await prisma.categoria.findMany({
    where: { estabelecimentoId: estId },
    orderBy: [{ ordemExibicao: 'asc' }, { nome: 'asc' }]
  })
  return Response.json({ categorias: rows })
}

export async function POST(req: NextRequest) {
  const estId = await targetEstabelecimentoId(req)
  if (!estId) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json()
  const parsed = CategoriaCreateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })

  const exists = await prisma.categoria.findFirst({
    where: { estabelecimentoId: estId, nome: parsed.data.nome }
  })
  if (exists) return Response.json({ error: 'categoria já existe' }, { status: 400 })

  const row = await prisma.categoria.create({
    data: {
      estabelecimentoId: estId,
      nome: parsed.data.nome,
      icone: parsed.data.icone,
      imagemUrl: parsed.data.imagemUrl,
      ordemExibicao: parsed.data.ordemExibicao ?? null,
      ativo: parsed.data.ativo ?? true
    }
  })
  return Response.json({ categoria: row })
}

export async function PUT(req: NextRequest) {
  const estId = await targetEstabelecimentoId(req)
  if (!estId) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json()
  const id = String(body.id || '')
  if (!id) return Response.json({ error: 'id obrigatório' }, { status: 400 })
  const parsed = CategoriaUpdateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const target = await prisma.categoria.findFirst({ where: { id, estabelecimentoId: estId } })
  if (!target) return Response.json({ error: 'não encontrado' }, { status: 404 })
  const row = await prisma.categoria.update({ where: { id }, data: parsed.data })
  return Response.json({ categoria: row })
}

export async function DELETE(req: NextRequest) {
  const estId = await targetEstabelecimentoId(req)
  if (!estId) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = String(searchParams.get('id') || '')
  if (!id) return Response.json({ error: 'id obrigatório' }, { status: 400 })
  const target = await prisma.categoria.findFirst({ where: { id, estabelecimentoId: estId } })
  if (!target) return Response.json({ error: 'não encontrado' }, { status: 404 })
  await prisma.categoria.delete({ where: { id } })
  return Response.json({ ok: true })
}
