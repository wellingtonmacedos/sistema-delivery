import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'
import { resolveTenant } from '@/lib/tenant'
const cache: { data: string[]; expires: number } = { data: [], expires: 0 }
const fallback = ['Lanches', 'Porções', 'Bebidas', 'Sobremesas']

export async function GET(req: NextRequest) {
  const now = Date.now()
  if (cache.expires > now) {
    return Response.json({ categorias: cache.data })
  }
  try {
    const est = await resolveTenant(req)
    const categoriasRows = await prisma.produto.findMany({
      where: { ativo: true, estabelecimentoId: est?.id || undefined },
      select: { categoria: true },
      distinct: ['categoria'],
      orderBy: { categoria: 'asc' }
    })
    const categorias = categoriasRows.map(c => c.categoria)
    cache.data = categorias
    cache.expires = now + 5 * 60_000
    return Response.json({ categorias })
  } catch {
    cache.data = fallback
    cache.expires = now + 60_000
    return Response.json({ categorias: fallback })
  }
}
