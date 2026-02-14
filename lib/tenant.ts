import { NextRequest } from 'next/server'
import { prisma } from './db'

export async function resolveTenant(req: NextRequest) {
  const slug = req.headers.get('x-estabelecimento-slug') || new URL(req.url).searchParams.get('est') || undefined
  if (slug) {
    const est = await prisma.estabelecimento.findUnique({ where: { slug } })
    if (est && est.ativo) return est
  }
  const est = await prisma.estabelecimento.findFirst({ where: { ativo: true }, orderBy: { createdAt: 'asc' } })
  return est
}
