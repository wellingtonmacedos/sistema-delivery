import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AcaiSorveteUpdateSchema } from '@/lib/validate'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const parsed = AcaiSorveteUpdateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const row = await prisma.acaiSorvete.update({ where: { id: params.id }, data: parsed.data })
  return Response.json({ sorvete: row })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.acaiSorvete.delete({ where: { id: params.id } })
  return Response.json({ ok: true })
}
