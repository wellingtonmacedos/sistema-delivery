import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import jwt from 'jsonwebtoken'
import { ProdutoCreateSchema } from '@/lib/validate'
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

export async function GET(req: NextRequest) {
  const admin = getAdmin(req)
  if (!admin) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const estId = admin.estabelecimentoId || null
  const isSuper = admin.role === 'SUPER_ADMIN'

  const { searchParams } = new URL(req.url)
  const categoria = searchParams.get('categoria') || undefined

  let targetId: string | null = estId
  if (!targetId && isSuper) {
    const first = await prisma.estabelecimento.findFirst({
      where: { ativo: true },
      orderBy: { createdAt: 'asc' }
    })
    targetId = first?.id || null
  }
  if (!targetId) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const where: any = { estabelecimentoId: targetId }
  if (categoria) where.categoria = categoria

  const produtos = await prisma.produto.findMany({
    where,
    orderBy: { nome: 'asc' },
    select: {
      id: true,
      nome: true,
      descricao: true,
      preco: true,
      categoria: true,
      ativo: true,
      fotoUrl: true,
      adicionais: true,
      maxSabores: true,
      maxSorvetes: true,
      maxAcompanhamentos: true,
      maxCoberturas: true,
      marca: true,
      unidade: true,
      qtdPorEmbalagem: true,
      precoEmbalagem: true,
      destaque: true,
      controlarEstoque: true,
      estoque: true,
      tempoPreparoMinutos: true,
      ordemExibicao: true
    }
  })

  return Response.json({ produtos })
}

export async function POST(req: NextRequest) {
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
    const body = await req.json()
    const toNumOrNull = (v: any) =>
      v !== undefined && v !== '' && v !== null ? Number(v) : null

    const parsed = ProdutoCreateSchema.safeParse({
      categoria: String(body.categoria || '').trim(),
      categoriaId: body.categoriaId ? String(body.categoriaId) : undefined,
      nome: String(body.nome || '').trim(),
      descricao: body.descricao ? String(body.descricao).trim() : null,
      preco: Number(body.preco),
      adicionais: body.adicionais,
      ativo: typeof body.ativo === 'boolean' ? body.ativo : undefined,
      maxSabores: toNumOrNull(body.maxSabores),
      maxSorvetes: toNumOrNull(body.maxSorvetes),
      maxAcompanhamentos: toNumOrNull(body.maxAcompanhamentos),
      maxCoberturas: toNumOrNull(body.maxCoberturas),
      marca: body.marca !== undefined && body.marca !== '' ? String(body.marca).trim() : null,
      unidade: body.unidade !== undefined && body.unidade !== '' ? String(body.unidade).trim() : null,
      qtdPorEmbalagem: toNumOrNull(body.qtdPorEmbalagem),
      precoEmbalagem: toNumOrNull(body.precoEmbalagem),
      destaque: typeof body.destaque === 'boolean' ? body.destaque : undefined,
      ordemExibicao: toNumOrNull(body.ordemExibicao),
      controlarEstoque: typeof body.controlarEstoque === 'boolean' ? body.controlarEstoque : undefined,
      estoque: toNumOrNull(body.estoque),
      tempoPreparoMinutos: toNumOrNull(body.tempoPreparoMinutos),
      fotoUrl: body.fotoUrl !== undefined && body.fotoUrl !== '' ? String(body.fotoUrl).trim() : null
    })
    if (!parsed.success) {
      const firstIssue = parsed.error.issues?.[0]
      return Response.json(
        { error: `dados inválidos: ${firstIssue?.path?.join('.') || 'campo'} — ${firstIssue?.message || ''}` },
        { status: 400 }
      )
    }

    const produto = await prisma.produto.create({
      data: { ...parsed.data, estabelecimentoId: targetId }
    })
    revalidateTag('produtos')
    return Response.json({ produto })
  } catch (e: any) {
    console.error('[POST /api/admin/produtos] erro interno:', e)
    return Response.json(
      { error: 'Erro interno ao criar produto. Tente novamente.' },
      { status: 500 }
    )
  }
}

