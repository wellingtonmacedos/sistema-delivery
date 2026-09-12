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

const PERFIS_VALIDOS = ['LANCHONETE', 'ACAITERIA', 'PIZZARIA', 'DISTRIBUIDORA'] as const

export async function GET(req: NextRequest) {
  const admin = getAdmin(req)
  if (!admin) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const estId = admin.estabelecimentoId || null
  const isSuper = admin.role === 'SUPER_ADMIN'
  const adminInfo = {
    email: typeof admin.email === 'string' ? admin.email : null,
    role: typeof admin.role === 'string' ? admin.role : 'ADMIN'
  }

  try {
    const targetId =
      estId || (isSuper ? (await prisma.estabelecimento.findFirst({ where: { ativo: true }, orderBy: { createdAt: 'asc' } }))?.id : null)
    if (targetId) {
      const est = await prisma.estabelecimento.findUnique({ where: { id: targetId } })
      if (est) {
        return Response.json({
          ok: true,
          admin: adminInfo,
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
            perfil: est.perfil,
            raioAtendimentoKm: est.raioAtendimentoKm ? Number(est.raioAtendimentoKm) : null,
            tempoEntregaMinutos: est.tempoEntregaMinutos ?? null,
            valorMinimoPedido: est.valorMinimoPedido ? Number(est.valorMinimoPedido) : null,
            entregaHabilitada: est.entregaHabilitada
          }
        })
      }
    }
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : 'banco_indisponivel'
    return Response.json({ ok: false, admin: adminInfo, error: msg }, { status: 503 })
  }

  return Response.json({ ok: false, admin: adminInfo, error: 'estabelecimento_nao_encontrado' }, { status: 404 })
}

export async function POST(req: NextRequest) {
  const admin = getAdmin(req)
  if (!admin) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const isSuper = admin.role === 'SUPER_ADMIN'
  const adminEstId = admin.estabelecimentoId || null

  let targetId: string | null = null
  const body = await req.json()
  if (isSuper) {
    targetId =
      (body.estabelecimentoId ? String(body.estabelecimentoId) : null) ||
      (await prisma.estabelecimento.findFirst({ where: { ativo: true }, orderBy: { createdAt: 'asc' } }))?.id ||
      null
  } else {
    targetId = adminEstId
  }
  if (!targetId) return Response.json({ ok: false, error: 'estabelecimento_obrigatorio' }, { status: 400 })

  const nome = String(body.nome || '').trim()
  if (!nome) return Response.json({ ok: false, error: 'nome_obrigatorio' }, { status: 400 })
  const telefone = typeof body.telefone === 'string' ? String(body.telefone).trim() : ''
  if (telefone && !/^\+?\d{8,20}$/.test(telefone)) {
    return Response.json({ ok: false, error: 'telefone_invalido' }, { status: 400 })
  }
  const data: any = { nome }
  if (typeof body.descricao === 'string') data.descricao = body.descricao.trim() || null
  data.telefone = telefone || null
  if (body.endereco && typeof body.endereco === 'object') data.endereco = body.endereco
  if (typeof body.horarioAbertura === 'string') {
    const h = body.horarioAbertura.trim()
    if (h && !/^([01]\d|2[0-3]):[0-5]\d$/.test(h)) return Response.json({ ok: false, error: 'horario_invalido' }, { status: 400 })
    data.horarioAbertura = h || null
  }
  if (typeof body.horarioFechamento === 'string') {
    const h = body.horarioFechamento.trim()
    if (h && !/^([01]\d|2[0-3]):[0-5]\d$/.test(h)) return Response.json({ ok: false, error: 'horario_invalido' }, { status: 400 })
    data.horarioFechamento = h || null
  }
  if (Array.isArray(body.diasAtivos)) {
    data.diasAtivos = body.diasAtivos
  }
  if (body.taxaEntregaPadrao !== undefined) {
    const v = Number(body.taxaEntregaPadrao)
    if (Number.isNaN(v) || v < 0) return Response.json({ ok: false, error: 'taxa_invalida' }, { status: 400 })
    data.taxaEntregaPadrao = v
  }
  if (typeof body.permitirRetirada === 'boolean') data.permitirRetirada = body.permitirRetirada
  if (typeof body.aberto === 'boolean') data.aberto = body.aberto

  if (typeof body.perfil === 'string') {
    if (!isSuper) {
      return Response.json({ ok: false, error: 'perfil_somente_super_admin' }, { status: 403 })
    }
    const p = body.perfil.trim().toUpperCase()
    if (!PERFIS_VALIDOS.includes(p as any)) {
      return Response.json({ ok: false, error: 'perfil_invalido' }, { status: 400 })
    }
    data.perfil = p
  }

  if (body.raioAtendimentoKm !== undefined && body.raioAtendimentoKm !== null && body.raioAtendimentoKm !== '') {
    const v = Number(body.raioAtendimentoKm)
    if (Number.isNaN(v) || v < 0) return Response.json({ ok: false, error: 'raio_invalido' }, { status: 400 })
    data.raioAtendimentoKm = v
  } else if (body.raioAtendimentoKm === null || body.raioAtendimentoKm === '') {
    data.raioAtendimentoKm = null
  }
  if (body.tempoEntregaMinutos !== undefined && body.tempoEntregaMinutos !== null && body.tempoEntregaMinutos !== '') {
    const v = Math.round(Number(body.tempoEntregaMinutos))
    if (Number.isNaN(v) || v < 0) return Response.json({ ok: false, error: 'tempo_invalido' }, { status: 400 })
    data.tempoEntregaMinutos = v
  } else if (body.tempoEntregaMinutos === null || body.tempoEntregaMinutos === '') {
    data.tempoEntregaMinutos = null
  }
  if (body.valorMinimoPedido !== undefined && body.valorMinimoPedido !== null && body.valorMinimoPedido !== '') {
    const v = Number(body.valorMinimoPedido)
    if (Number.isNaN(v) || v < 0) return Response.json({ ok: false, error: 'valor_minimo_invalido' }, { status: 400 })
    data.valorMinimoPedido = v
  } else if (body.valorMinimoPedido === null || body.valorMinimoPedido === '') {
    data.valorMinimoPedido = null
  }
  if (typeof body.entregaHabilitada === 'boolean') data.entregaHabilitada = body.entregaHabilitada

  try {
    const est = await prisma.estabelecimento.update({
      where: { id: targetId },
      data
    })
    return Response.json({ ok: true, estabelecimento: est })
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : 'erro_ao_salvar'
    return Response.json({ ok: false, error: msg }, { status: 500 })
  }
}

