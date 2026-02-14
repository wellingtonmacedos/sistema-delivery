import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { StatusPedido } from '@prisma/client'
import { WebhookPixSchema } from '@/lib/validate'
import { logSistema } from '@/lib/log'

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-pix-signature') || ''
  const secret = process.env.PIX_API_KEY || ''
  if (!secret || signature !== secret) {
    await logSistema('webhook_invalido', 'Assinatura inválida')
    return Response.json({ error: 'assinatura inválida' }, { status: 401 })
  }
  const body = await req.json()
  const parsed = WebhookPixSchema.safeParse(body)
  if (!parsed.success) {
    await logSistema('webhook_invalido', 'Payload inválido')
    return Response.json({ error: 'payload inválido' }, { status: 400 })
  }
  const pagamento = await prisma.pagamento.findFirst({ where: { txid: parsed.data.txid } })
  if (!pagamento) {
    return Response.json({ error: 'pagamento não encontrado' }, { status: 404 })
  }
  if (pagamento.status === 'confirmado') {
    return Response.json({ ok: true })
  }
  await prisma.pagamento.update({
    where: { id: pagamento.id },
    data: { status: parsed.data.status }
  })
  if (parsed.data.status === 'confirmado') {
    await prisma.pedido.update({
      where: { id: pagamento.pedidoId },
      data: { status: StatusPedido.pago }
    })
    await logSistema('pix_confirmado', `Pedido ${pagamento.pedidoId} txid=${pagamento.txid}`)
  }
  return Response.json({ ok: true })
}
