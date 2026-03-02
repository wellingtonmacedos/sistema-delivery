import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ProdutoCreateSchema } from '@/lib/validate'
import { rateLimit, keyFromRequestHeaders } from '@/lib/rateLimit'
import { revalidateTag } from 'next/cache'
import { resolveTenant } from '@/lib/tenant'
const fallback = [
  { id: 'x-burger', nome: 'X-Burger', descricao: 'Pão, carne, queijo', preco: 18.9, categoria: 'Lanches', ativo: true },
  { id: 'x-salada', nome: 'X-Salada', descricao: 'Pão, carne, queijo, salada', preco: 20.9, categoria: 'Lanches', ativo: true },
  { id: 'batata', nome: 'Batata Frita', descricao: 'Porção média', preco: 16.0, categoria: 'Porções', ativo: true },
  { id: 'refri', nome: 'Refrigerante Lata', descricao: '350ml', preco: 6.0, categoria: 'Bebidas', ativo: true },
  { id: 'pudim', nome: 'Pudim', descricao: 'Fatia', preco: 8.0, categoria: 'Sobremesas', ativo: true }
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const categoria = searchParams.get('categoria') || undefined
  const est = await resolveTenant(req)
  const where = categoria
    ? { categoria, ativo: true, estabelecimentoId: est?.id || undefined }
    : { ativo: true, estabelecimentoId: est?.id || undefined }
  try {
    const produtos = await prisma.produto.findMany({
      where,
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        nome: true,
        descricao: true,
        preco: true,
        categoria: true,
        categoriaId: true,
        ativo: true,
        fotoUrl: true,
        adicionais: true,
        maxSabores: true,
        maxSorvetes: true,
        maxAcompanhamentos: true,
        maxCoberturas: true
      }
    })
    return Response.json({ produtos })
  } catch {
    const prods = categoria ? fallback.filter(f => f.categoria === categoria) : fallback
    return Response.json({ produtos: prods })
  }
}

export async function POST(req: NextRequest) {
  const key = 'produtos:' + keyFromRequestHeaders(req.headers)
  if (!rateLimit(key, 50, 60_000)) return Response.json({ error: 'rate limit' }, { status: 429 })
  const body = await req.json()
  const parsed = ProdutoCreateSchema.safeParse({
    categoria: String(body.categoria || '').trim(),
    categoriaId: body.categoriaId ? String(body.categoriaId) : undefined,
    nome: String(body.nome || '').trim(),
    descricao: body.descricao ? String(body.descricao).trim() : undefined,
    preco: Number(body.preco),
    adicionais: body.adicionais,
    ativo: body.ativo,
    maxSabores: body.maxSabores !== undefined && body.maxSabores !== '' && body.maxSabores !== null ? Number(body.maxSabores) : null,
    maxSorvetes: body.maxSorvetes !== undefined && body.maxSorvetes !== '' && body.maxSorvetes !== null ? Number(body.maxSorvetes) : null,
    maxAcompanhamentos: body.maxAcompanhamentos !== undefined && body.maxAcompanhamentos !== '' && body.maxAcompanhamentos !== null ? Number(body.maxAcompanhamentos) : null,
    maxCoberturas: body.maxCoberturas !== undefined && body.maxCoberturas !== '' && body.maxCoberturas !== null ? Number(body.maxCoberturas) : null
  })
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const est = await resolveTenant(req)
  const produto = await prisma.produto.create({
    data: { ...parsed.data, estabelecimentoId: est?.id || null }
  })
  revalidateTag('produtos')
  return Response.json({ produto })
}
