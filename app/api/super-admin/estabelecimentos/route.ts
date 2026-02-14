import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { rateLimit, keyFromRequestHeaders } from '@/lib/rateLimit'

export async function GET() {
  const ests = await prisma.estabelecimento.findMany({ orderBy: { createdAt: 'desc' } })
  return Response.json({ estabelecimentos: ests })
}

export async function POST(req: NextRequest) {
  const key = 'superadmin:est:' + keyFromRequestHeaders(req.headers)
  if (!rateLimit(key, 50, 60_000)) return Response.json({ error: 'rate limit' }, { status: 429 })
  const b = await req.json()
  const est = await prisma.estabelecimento.create({
    data: {
      nome: String(b.nome || '').trim(),
      slug: String(b.slug || '').trim(),
      perfil: String(b.perfil || 'LANCHONETE') as any,
      ativo: Boolean(b.ativo ?? true)
    }
  })
  return Response.json({ estabelecimento: est })
}

export async function PUT(req: NextRequest) {
  const key = 'superadmin:est:' + keyFromRequestHeaders(req.headers)
  if (!rateLimit(key, 50, 60_000)) return Response.json({ error: 'rate limit' }, { status: 429 })
  const b = await req.json()
  const est = await prisma.estabelecimento.update({
    where: { id: String(b.id) },
    data: {
      nome: String(b.nome || '').trim(),
      slug: String(b.slug || '').trim(),
      perfil: String(b.perfil || 'LANCHONETE') as any,
      ativo: Boolean(b.ativo ?? true)
    }
  })
  return Response.json({ estabelecimento: est })
}
