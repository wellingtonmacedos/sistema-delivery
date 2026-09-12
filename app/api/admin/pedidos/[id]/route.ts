import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import jwt from 'jsonwebtoken'
import { StatusPedido } from '@prisma/client'

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

const STATUSES_VALIDOS: readonly StatusPedido[] = [
  'aberto',
  'aguardando_pix',
  'pago',
  'preparando',
  'saiu_para_entrega',
  'entregue',
  'cancelado'
]

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdmin(req)
  if (!admin) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const isSuper = admin.role === 'SUPER_ADMIN'
  const adminEstId = typeof admin.estabelecimentoId === 'string' ? admin.estabelecimentoId : null

  try {
    const body = await req.json()
    const status = (body?.status || '').trim()
    if (!STATUSES_VALIDOS.includes(status as StatusPedido)) {
      return Response.json({ ok: false, error: 'status_invalido' }, { status: 400 })
    }
    const existing = await prisma.pedido.findUnique({ where: { id: params.id }, select: { estabelecimentoId: true } })
    if (!existing) return Response.json({ ok: false, error: 'pedido_nao_encontrado' }, { status: 404 })
    if (!isSuper && existing.estabelecimentoId !== adminEstId) {
      return Response.json({ ok: false, error: 'forbidden' }, { status: 403 })
    }
    const pedido = await prisma.pedido.update({ where: { id: params.id }, data: { status: status as StatusPedido } })
    return Response.json({ ok: true, pedido })
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : 'erro_ao_atualizar_pedido'
    return Response.json({ ok: false, error: msg }, { status: 500 })
  }
}
