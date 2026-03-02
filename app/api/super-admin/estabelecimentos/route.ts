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
  const nome = String(b.nome || '').trim()
  const preferred = String(b.slug || '').trim()
  const base = preferred || nome
  const norm = toSlug(base)
  const unique = await ensureUniqueSlug(norm)
  const est = await prisma.estabelecimento.create({
    data: {
      nome,
      slug: unique,
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
  const id = String(b.id)
  const nome = String(b.nome || '').trim()
  const slugInput = String(b.slug || '').trim()
  let slug: string | undefined = undefined
  if (slugInput || nome) {
    const base = slugInput || nome
    const norm = toSlug(base)
    const unique = await ensureUniqueSlug(norm, id)
    slug = unique
  }
  const est = await prisma.estabelecimento.update({
    where: { id },
    data: {
      nome,
      slug: slug as any,
      perfil: String(b.perfil || 'LANCHONETE') as any,
      ativo: Boolean(b.ativo ?? true)
    }
  })
  return Response.json({ estabelecimento: est })
}

function toSlug(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function ensureUniqueSlug(base: string, currentId?: string) {
  let candidate = base || 'estabelecimento'
  let n = 1
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await prisma.estabelecimento.findUnique({ where: { slug: candidate } })
    if (!exists || (currentId && exists.id === currentId)) return candidate
    n += 1
    candidate = `${base}-${n}`
  }
}
