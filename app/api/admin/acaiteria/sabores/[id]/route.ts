import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AcaiSaborUpdateSchema } from '@/lib/validate'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const parsed = AcaiSaborUpdateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const row = await prisma.acaiSabor.update({ where: { id: params.id }, data: parsed.data })
  return Response.json({ sabor: row })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.acaiSabor.delete({ where: { id: params.id } })
  return Response.json({ ok: true })
}
