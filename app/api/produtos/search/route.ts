import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveTenant } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const rawLimit = Number(searchParams.get('limit') || 20)
  const limit = Math.max(1, Math.min(100, Number.isFinite(rawLimit) ? rawLimit : 20))

  if (q.length < 2) {
    return Response.json({ produtos: [], query: q, limit })
  }

  const est = await resolveTenant(req)
  const like = `%${q}%`

  try {
    const produtos = await prisma.produto.findMany({
      where: {
        ativo: true,
        estabelecimentoId: est?.id || undefined,
        OR: [
          { nome: { contains: q, mode: 'insensitive' } },
          { descricao: { contains: q, mode: 'insensitive' } },
          { marca: { contains: q, mode: 'insensitive' } },
          { categoria: { contains: q, mode: 'insensitive' } },
          { unidade: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: limit,
      orderBy: [
        { destaque: 'desc' },
        { nome: 'asc' }
      ],
      select: {
        id: true,
        nome: true,
        descricao: true,
        preco: true,
        marca: true,
        unidade: true,
        qtdPorEmbalagem: true,
        precoEmbalagem: true,
        categoria: true,
        categoriaId: true,
        fotoUrl: true,
        destaque: true
      }
    })
    return Response.json({ produtos, query: q, limit })
  } catch (err) {
    return Response.json({ produtos: [], query: q, limit, error: 'erro_busca' })
  }
}
