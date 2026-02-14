import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ClienteSchema, ClienteQuerySchema } from '@/lib/validate'
import { rateLimit, keyFromRequestHeaders } from '@/lib/rateLimit'
import { resolveTenant } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const key = 'clientes:' + keyFromRequestHeaders(req.headers)
  if (!rateLimit(key, 30, 60_000)) return Response.json({ error: 'rate limit' }, { status: 429 })
  const parsed = ClienteQuerySchema.safeParse({ telefone: searchParams.get('telefone') || '' })
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const est = await resolveTenant(req)
  const cliente = await prisma.cliente.findFirst({
    where: { telefone: parsed.data.telefone, estabelecimentoId: est?.id || undefined }
  })
  return Response.json({ cliente })
}

export async function POST(req: NextRequest) {
  const key = 'clientes:' + keyFromRequestHeaders(req.headers)
  if (!rateLimit(key, 20, 60_000)) return Response.json({ error: 'rate limit' }, { status: 429 })
  const body = await req.json()
  const parsed = ClienteSchema.safeParse({
    nome: String(body.nome || '').trim(),
    telefone: String(body.telefone || '').trim(),
    enderecos: body.enderecos
  })
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const est = await resolveTenant(req)
  const existing = await prisma.cliente.findFirst({
    where: { telefone: parsed.data.telefone, estabelecimentoId: est?.id || undefined }
  })
  let cliente
  if (existing) {
    cliente = await prisma.cliente.update({
      where: { id: existing.id },
      data: { nome: parsed.data.nome, enderecos: parsed.data.enderecos }
    })
  } else {
    cliente = await prisma.cliente.create({
      data: {
        nome: parsed.data.nome,
        telefone: parsed.data.telefone,
        enderecos: parsed.data.enderecos,
        estabelecimentoId: est?.id || null
      }
    })
  }
  return Response.json({ cliente })
}
