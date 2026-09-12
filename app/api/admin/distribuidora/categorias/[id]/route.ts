import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import jwt from 'jsonwebtoken'
import { CategoriaUpdateSchema } from '@/lib/validate'

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
    const est = await prisma.estabelecimento.findFirst({ where: { ativo: true }, orderBy: { createdAt: 'asc' }, select: { id: true } })
    return est?.id || null
  }
  return null
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const estId = await targetEstabelecimentoId(req)
  if (!estId) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const id = params.id
  if (!id) return Response.json({ error: 'id obrigatório' }, { status: 400 })
  const body = await req.json()
  const parsed = CategoriaUpdateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const target = await prisma.categoria.findFirst({ where: { id, estabelecimentoId: estId } })
  if (!target) return Response.json({ error: 'não encontrado' }, { status: 404 })
  const row = await prisma.categoria.update({ where: { id }, data: parsed.data })
  return Response.json({ categoria: row })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const estId = await targetEstabelecimentoId(req)
  if (!estId) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const id = params.id
  if (!id) return Response.json({ error: 'id obrigatório' }, { status: 400 })
  const target = await prisma.categoria.findFirst({ where: { id, estabelecimentoId: estId } })
  if (!target) return Response.json({ error: 'não encontrado' }, { status: 404 })
  await prisma.categoria.delete({ where: { id } })
  return Response.json({ ok: true })
}
