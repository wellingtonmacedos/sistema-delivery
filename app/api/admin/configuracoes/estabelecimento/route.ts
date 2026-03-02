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

export async function GET(req: NextRequest) {
  const admin = getAdmin(req)
  if (!admin) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const estId = admin.estabelecimentoId || null
  const isSuper = admin.role === 'SUPER_ADMIN'
  const targetId = estId || (isSuper ? (await prisma.estabelecimento.findFirst({ where: { ativo: true }, orderBy: { createdAt: 'asc' } }))?.id : null)
  if (!targetId) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const est = await prisma.estabelecimento.findUnique({ where: { id: targetId } })
  if (!est) return Response.json({ error: 'not_found' }, { status: 404 })
  return Response.json({
    estabelecimento: {
      id: est.id,
      nome: est.nome,
      slug: est.slug,
      descricao: est.descricao || null,
      telefone: est.telefone || null,
      endereco: est.endereco || null,
      horarioAbertura: est.horarioAbertura || null,
      horarioFechamento: est.horarioFechamento || null,
      diasAtivos: est.diasAtivos || null,
      taxaEntregaPadrao: est.taxaEntregaPadrao ? Number(est.taxaEntregaPadrao) : null,
      permitirRetirada: est.permitirRetirada,
      aberto: est.aberto,
      logoUrl: est.logoUrl || null,
      perfil: est.perfil
    }
  })
}

export async function POST(req: NextRequest) {
  const admin = getAdmin(req)
  if (!admin) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const estId = admin.estabelecimentoId || null
  const isSuper = admin.role === 'SUPER_ADMIN'
  if (!estId || isSuper) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json()
  const nome = String(body.nome || '').trim()
  if (!nome) return Response.json({ error: 'nome_obrigatorio' }, { status: 400 })
  const telefone = typeof body.telefone === 'string' ? String(body.telefone).trim() : ''
  if (telefone && !/^\+?\d{8,20}$/.test(telefone)) {
    return Response.json({ error: 'telefone_invalido' }, { status: 400 })
  }
  const data: any = { nome }
  if (typeof body.descricao === 'string') data.descricao = body.descricao.trim() || null
  data.telefone = telefone || null
  if (body.endereco && typeof body.endereco === 'object') data.endereco = body.endereco
  if (typeof body.horarioAbertura === 'string') {
    const h = body.horarioAbertura.trim()
    if (h && !/^([01]\d|2[0-3]):[0-5]\d$/.test(h)) return Response.json({ error: 'horario_invalido' }, { status: 400 })
    data.horarioAbertura = h || null
  }
  if (typeof body.horarioFechamento === 'string') {
    const h = body.horarioFechamento.trim()
    if (h && !/^([01]\d|2[0-3]):[0-5]\d$/.test(h)) return Response.json({ error: 'horario_invalido' }, { status: 400 })
    data.horarioFechamento = h || null
  }
  if (Array.isArray(body.diasAtivos)) {
    data.diasAtivos = body.diasAtivos
  }
  if (body.taxaEntregaPadrao !== undefined) {
    const v = Number(body.taxaEntregaPadrao)
    if (Number.isNaN(v) || v < 0) return Response.json({ error: 'taxa_invalida' }, { status: 400 })
    data.taxaEntregaPadrao = v
  }
  if (typeof body.permitirRetirada === 'boolean') data.permitirRetirada = body.permitirRetirada
  if (typeof body.aberto === 'boolean') data.aberto = body.aberto
  if (typeof body.perfil === 'string') {
    const p = body.perfil.trim().toUpperCase()
    if (!['LANCHONETE', 'ACAITERIA', 'PIZZARIA'].includes(p)) {
      return Response.json({ error: 'perfil_invalido' }, { status: 400 })
    }
    data.perfil = p
  }
  const est = await prisma.estabelecimento.update({
    where: { id: estId },
    data
  })
  return Response.json({ ok: true, estabelecimento: est })
}
