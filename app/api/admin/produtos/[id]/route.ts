import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import jwt from 'jsonwebtoken'
import { ProdutoUpdateSchema } from '@/lib/validate'
import { revalidateTag } from 'next/cache'

function getAdmin(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value || ''
  const secret = process.env.JWT_SECRET || ''
  if (!token || !secret) return null
  try {
    const d = jwt.verify(token, secret) as any
    return d
  } catch {
    return null
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdmin(req)
  if (!admin) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const estId = admin.estabelecimentoId || null
  const isSuper = admin.role === 'SUPER_ADMIN'

  let targetId: string | null = estId
  if (!targetId && isSuper) {
    const first = await prisma.estabelecimento.findFirst({
      where: { ativo: true },
      orderBy: { createdAt: 'asc' }
    })
    targetId = first?.id || null
  }
  if (!targetId) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const produto = await prisma.produto.findUnique({
    where: { id: params.id }
  })
  if (!produto) return Response.json({ error: 'produto não encontrado' }, { status: 404 })
  if (!isSuper && produto.estabelecimentoId !== targetId) {
    return Response.json({ error: 'produto não encontrado' }, { status: 404 })
  }
  return Response.json({ produto })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdmin(req)
  if (!admin) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const estId = admin.estabelecimentoId || null
  const isSuper = admin.role === 'SUPER_ADMIN'

  let targetId: string | null = estId
  if (!targetId && isSuper) {
    const first = await prisma.estabelecimento.findFirst({
      where: { ativo: true },
      orderBy: { createdAt: 'asc' }
    })
    targetId = first?.id || null
  }
  if (!targetId) return Response.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const produtoAtual = await prisma.produto.findUnique({
      where: { id: params.id },
      select: { id: true, estabelecimentoId: true }
    })
    if (!produtoAtual) return Response.json({ error: 'produto não encontrado' }, { status: 404 })
    if (!isSuper && produtoAtual.estabelecimentoId !== targetId) {
      return Response.json({ error: 'não autorizado' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = ProdutoUpdateSchema.safeParse(body)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues?.[0]
      return Response.json(
        { error: `dados inválidos: ${firstIssue?.path?.join('.') || 'campo'} — ${firstIssue?.message || ''}` },
        { status: 400 }
      )
    }
    const produto = await prisma.produto.update({
      where: { id: params.id },
      data: parsed.data
    })
    revalidateTag('produtos')
    return Response.json({ produto })
  } catch (e: any) {
    console.error('[PUT /api/admin/produtos/[id]] erro interno:', e)
    return Response.json(
      { error: 'Erro interno ao atualizar produto. Tente novamente.' },
      { status: 500 }
    )
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdmin(_req)
  if (!admin) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const estId = admin.estabelecimentoId || null
  const isSuper = admin.role === 'SUPER_ADMIN'

  let targetId: string | null = estId
  if (!targetId && isSuper) {
    const first = await prisma.estabelecimento.findFirst({
      where: { ativo: true },
      orderBy: { createdAt: 'asc' }
    })
    targetId = first?.id || null
  }
  if (!targetId) return Response.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const produtoAtual = await prisma.produto.findUnique({
      where: { id: params.id },
      select: { id: true, estabelecimentoId: true }
    })
    if (!produtoAtual) return Response.json({ error: 'produto não encontrado' }, { status: 404 })
    if (!isSuper && produtoAtual.estabelecimentoId !== targetId) {
      return Response.json({ error: 'não autorizado' }, { status: 403 })
    }
    await prisma.produto.delete({ where: { id: params.id } })
    revalidateTag('produtos')
    return Response.json({ ok: true })
  } catch (e: any) {
    console.error('[DELETE /api/admin/produtos/[id]] erro interno:', e)
    return Response.json(
      { error: 'Erro interno ao excluir produto. Tente novamente.' },
      { status: 500 }
    )
  }
}
