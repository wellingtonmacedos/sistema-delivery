import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ProdutoUpdateSchema } from '@/lib/validate'
import { revalidateTag } from 'next/cache'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const produto = await prisma.produto.findUnique({ where: { id: params.id } })
  if (!produto) return Response.json({ error: 'produto não encontrado' }, { status: 404 })
  return Response.json({ produto })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const parsed = ProdutoUpdateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const produto = await prisma.produto.update({
    where: { id: params.id },
    data: parsed.data
  })
  revalidateTag('produtos')
  return Response.json({ produto })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.produto.delete({ where: { id: params.id } })
  revalidateTag('produtos')
  return Response.json({ ok: true })
}
