import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AcaiAcompanhamentoUpdateSchema } from '@/lib/validate'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const parsed = AcaiAcompanhamentoUpdateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const row = await prisma.acaiAcompanhamento.update({ where: { id: params.id }, data: parsed.data })
  return Response.json({ acompanhamento: row })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.acaiAcompanhamento.delete({ where: { id: params.id } })
  return Response.json({ ok: true })
}
