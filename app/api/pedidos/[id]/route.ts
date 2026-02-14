import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { StatusPedido } from '@prisma/client'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const pedido = await prisma.pedido.findUnique({
    where: { id: params.id },
    include: { itens: true, cliente: true, pagamento: true }
  })
  if (!pedido) return Response.json({ error: 'pedido não encontrado' }, { status: 404 })
  return Response.json({ pedido })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { status } = body as { status: StatusPedido }
  if (!status) return Response.json({ error: 'status obrigatório' }, { status: 400 })
  const pedido = await prisma.pedido.update({
    where: { id: params.id },
    data: { status }
  })
  return Response.json({ pedido })
}
