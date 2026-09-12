import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import jwt from 'jsonwebtoken'

function getAdmin(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value || ''
  const secret = process.env.JWT_SECRET || ''
  if (!token || !secret) return null
  try {
    const d = jwt.verify(token, secret) as any
    return d
  } catch {
    return null
  }
}

const STATUSES_VALIDOS = [
  'aberto',
  'aguardando_pix',
  'pago',
  'preparando',
  'saiu_para_entrega',
  'entregue',
  'cancelado'
] as const

export async function GET(req: NextRequest) {
  const admin = getAdmin(req)
  if (!admin) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const isSuper = admin.role === 'SUPER_ADMIN'
  const adminEstId = typeof admin.estabelecimentoId === 'string' ? admin.estabelecimentoId : null
  const { searchParams } = new URL(req.url)
  let targetEstId: string | null = null
  if (isSuper) {
    const reqEst = searchParams.get('estId') || searchParams.get('estabelecimentoId') || ''
    if (reqEst) targetEstId = reqEst
    else {
      const primeiro = await prisma.estabelecimento.findFirst({
        where: { ativo: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true }
      })
      targetEstId = primeiro?.id || null
    }
  } else {
    targetEstId = adminEstId
  }
  if (!targetEstId) return Response.json({ ok: false, error: 'estabelecimento_obrigatorio' }, { status: 400 })
  if (!isSuper && targetEstId !== adminEstId) {
    return Response.json({ ok: false, error: 'forbidden' }, { status: 403 })
  }
  try {
    const pedidos = await prisma.pedido.findMany({
      where: { estabelecimentoId: targetEstId },
      orderBy: { createdAt: 'desc' },
      include: {
        itens: {
          select: {
            id: true,
            quantidade: true,
            subtotal: true,
            produtoId: true,
            adicionais: true,
            observacoes: true,
            produto: { select: { id: true, nome: true, fotoUrl: true, categoria: true } }
          }
        },
        cliente: { select: { nome: true, telefone: true } },
        pagamento: { select: { status: true, txid: true, tipo: true } },
        cupom: { select: { codigo: true } }
      }
    })
    return Response.json({ ok: true, pedidos, estabelecimentoId: targetEstId })
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : 'erro_ao_listar_pedidos'
    return Response.json({ ok: false, error: msg }, { status: 500 })
  }
}
