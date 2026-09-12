import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import jwt from 'jsonwebtoken'

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

