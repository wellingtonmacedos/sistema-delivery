import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { PizzaTamanhoUpdateSchema } from '@/lib/validate'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const parsed = PizzaTamanhoUpdateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const row = await prisma.pizzaTamanho.update({ where: { id: params.id }, data: parsed.data })
  return Response.json({ tamanho: row })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.pizzaTamanho.delete({ where: { id: params.id } })
  return Response.json({ ok: true })
}
