import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ProdutoCreateSchema } from '@/lib/validate'
import { rateLimit, keyFromRequestHeaders } from '@/lib/rateLimit'
import { resolveTenant } from '@/lib/tenant'
import { revalidateTag } from 'next/cache'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const categoria = searchParams.get('categoria') || undefined
  const idsRaw = searchParams.get('ids') || undefined
  const est = await resolveTenant(req)
  const ids = idsRaw
    ? idsRaw.split(',').map(s => s.trim()).filter(Boolean)
    : undefined
  let where: any = { ativo: true, estabelecimentoId: est?.id || undefined }
  if (ids && ids.length) {
    where = { id: { in: ids }, ativo: true, estabelecimentoId: est?.id || undefined }
  } else if (categoria) {
    where = { categoria, ativo: true, estabelecimentoId: est?.id || undefined }
  }
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
  } catch {
    return Response.json({ produtos: [], fallback: true, error: 'produtos_indisponiveis' }, { status: 503 })
  }
}

export async function POST(req: NextRequest) {
  const key = 'produtos:' + keyFromRequestHeaders(req.headers)
  if (!rateLimit(key, 50, 60_000)) return Response.json({ error: 'rate limit' }, { status: 429 })
  const body = await req.json()
  const toNumOrNull = (v: any) => v !== undefined && v !== '' && v !== null ? Number(v) : null
  const parsed = ProdutoCreateSchema.safeParse({
    categoria: String(body.categoria || '').trim(),
    categoriaId: body.categoriaId ? String(body.categoriaId) : undefined,
    nome: String(body.nome || '').trim(),
    descricao: body.descricao ? String(body.descricao).trim() : null,
    preco: Number(body.preco),
    adicionais: body.adicionais,
    ativo: body.ativo,
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
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const est = await resolveTenant(req)
  const produto = await prisma.produto.create({
    data: { ...parsed.data, estabelecimentoId: est?.id || null }
  })
  revalidateTag('produtos')
  return Response.json({ produto })
}
