import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { StatusPedido } from '@prisma/client'
import { rateLimit, keyFromRequestHeaders } from '@/lib/rateLimit'
import { logSistema } from '@/lib/log'
import { revalidateTag } from 'next/cache'

export async function POST(req: NextRequest) {
  const key = 'pix_confirmar:' + keyFromRequestHeaders(req.headers)
  if (!rateLimit(key, 10, 60_000)) return Response.json({ error: 'rate limit' }, { status: 429 })
  try {
    const body = await req.json().catch(() => null)
    const pedidoId = String(body?.pedidoId || '').trim()
    if (!pedidoId) return Response.json({ error: 'pedidoId obrigatório' }, { status: 400 })

    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      select: {
        id: true,
        status: true,
        estabelecimentoId: true,
        total: true
      }
    })
    if (!pedido) return Response.json({ error: 'pedido não encontrado' }, { status: 404 })

    if (pedido.status !== StatusPedido.aguardando_pix) {
      return Response.json(
        { error: 'Pedido não está aguardando pagamento Pix.', status: pedido.status },
        { status: 409 }
      )
    }

    const agora = new Date()
    const pedidoAtualizado = await prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        status: StatusPedido.pago,
        pagoEm: agora
      },
      select: {
        id: true,
        status: true,
        pagoEm: true
      }
    })

    await prisma.pagamento.upsert({
      where: { pedidoId },
      update: {
        status: 'pago',
        pagoEm: agora
      },
      create: {
        pedidoId,
        tipo: 'pix',
        valor: pedido.total,
        status: 'pago',
        pagoEm: agora
      }
    })

    revalidateTag('pedidos')
    await logSistema('pix_confirmado_cliente', `Pedido ${pedidoId} marcado como pago via botão cliente (est=${pedido.estabelecimentoId || 'global'})`)

    return Response.json({
      ok: true,
      pedido: pedidoAtualizado,
      mensagem: 'Pagamento confirmado. Pedido enviado para preparo!'
    })
  } catch (e: any) {
    const msg = String(e?.message || e || 'erro interno')
    console.error('[POST /api/pix/confirmar] erro:', msg)
    return Response.json(
      { error: 'Não foi possível confirmar o pagamento. Tente novamente.' },
      { status: 500 }
    )
  }
}
