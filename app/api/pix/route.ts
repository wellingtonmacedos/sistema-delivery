import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { gerarCobrancaPix } from '@/lib/pix'
import { StatusPedido } from '@prisma/client'
import { PixCreateSchema } from '@/lib/validate'
import { rateLimit, keyFromRequestHeaders } from '@/lib/rateLimit'
import { logSistema } from '@/lib/log'
import { getConfiguracao } from '@/lib/config'

export async function POST(req: NextRequest) {
  const key = 'pix:' + keyFromRequestHeaders(req.headers)
  if (!rateLimit(key, 20, 60_000)) return Response.json({ error: 'rate limit' }, { status: 429 })
  const body = await req.json()
  const parsed = PixCreateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const pedido = await prisma.pedido.findUnique({ where: { id: parsed.data.pedidoId } })
  if (!pedido) {
    return Response.json({ error: 'pedido não encontrado' }, { status: 404 })
  }
  try {
    const cfg = await getConfiguracao(pedido.estabelecimentoId || null)
    const cobranca = await gerarCobrancaPix(pedido.id, Number(pedido.total), {
      accessTokenEnv: process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.PIX_ACCESS_TOKEN,
      apiUrlEnv: process.env.PIX_API_URL,
      apiKeyEnv: process.env.PIX_API_KEY,
      accessTokenDb: cfg.pixApiKey || undefined,
      chavePix: cfg.pixChave || undefined,
      beneficiario: cfg.pixBeneficiario || undefined,
      cidade: cfg.pixCidade || undefined
    })
    await prisma.pedido.update({
      where: { id: pedido.id },
      data: { status: StatusPedido.aguardando_pix }
    })
    await prisma.pagamento.upsert({
      where: { pedidoId: pedido.id },
      update: { tipo: 'pix', valor: pedido.total, status: 'pendente', txid: cobranca.txid, qrcode: cobranca.qrcode },
      create: { pedidoId: pedido.id, tipo: 'pix', valor: pedido.total, status: 'pendente', txid: cobranca.txid, qrcode: cobranca.qrcode }
    })
    await logSistema('pix_gerado', `Pedido ${pedido.id} (est=${pedido.estabelecimentoId || 'global'}) txid=${cobranca.txid}${cobranca.simulado ? ' (simulado)' : ''}`)
    return Response.json({
      txid: cobranca.txid,
      qrcode: cobranca.qrcode,
      copiaECola: cobranca.copiaECola,
      simulado: !!cobranca.simulado
    })
  } catch (e: any) {
    const msg = String(e?.message || e || 'erro ao gerar pix')
    await logSistema('pix_erro', `Pedido ${pedido.id}: ${msg}`)
    console.error('[pix erro] pedido=', pedido.id, 'msg=', msg)
    return Response.json({ error: msg }, { status: 502 })
  }
}
