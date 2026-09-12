import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { rateLimit, keyFromRequestHeaders } from '@/lib/rateLimit'
import { safePerfil } from '@/lib/tenant'
import jwt from 'jsonwebtoken'

function getSuperAdmin(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value || ''
  const secret = process.env.JWT_SECRET || ''
  if (!token || !secret) return null
  try {
    const d = jwt.verify(token, secret) as any
    if (d.role !== 'SUPER_ADMIN') return null
    return d
  } catch {
    return null
  }
}

function limparTelefone(v: any): string | null {
  if (v == null) return null
  const s = String(v).replace(/\D/g, '')
  if (!s) return null
  return s
}

function strOrNull(v: any): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s || null
}

function decimalOrNull(v: any) {
  if (v == null || v === '') return null
  const n = Number(String(v).replace(',', '.'))
  if (isNaN(n) || n < 0) return null
  return n
}

function boolOrDef(v: any, def: boolean) {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    const s = v.toLowerCase()
    if (s === 'true' || s === '1' || s === 'on') return true
    if (s === 'false' || s === '0' || s === 'off') return false
  }
  return def
}

function intOrNull(v: any) {
  if (v == null || v === '') return null
  const n = Number(String(v))
  if (!isNaN(n) && Number.isInteger(n) && n >= 0) return n
  return null
}

function jsonOrNull(v: any) {
  if (v == null || v === '' || (typeof v === 'object' && Object.keys(v).length === 0 && !Array.isArray(v))) return null
  if (typeof v === 'string') {
    const s = v.trim()
    if (!s) return null
    if (s.charAt(0) === '{' || s.charAt(0) === '[') {
      try { return JSON.parse(s) } catch { return null }
    }
  }
  return v
}

function diasValidos(v: any) {
  const arr = jsonOrNull(v)
  if (!Array.isArray(arr)) return null
  const validos = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
  const out = arr
    .map((x: any) => String(x).toLowerCase().slice(0, 3))
    .filter((x: any) => validos.includes(x))
  if (out.length === 0) return null
  return Array.from(new Set(out)) as any
}

const CAMPOS_EXTRA = {
  telefone: true,
  descricao: true,
  horarioAbertura: true,
  horarioFechamento: true,
  diasAtivos: true,
  valorMinimoPedido: true,
  taxaEntregaPadrao: true,
  entregaHabilitada: true,
  permitirRetirada: true,
  logoUrl: true,
  corPrimaria: true,
  nomeBot: true,
  mensagemBoasVindas: true,
  aberto: true,
  raioAtendimentoKm: true,
  tempoEntregaMinutos: true,
  endereco: true
} as const

export async function GET(req: NextRequest) {
  const sa = getSuperAdmin(req)
  if (!sa) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const ests = await prisma.estabelecimento.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      nome: true,
      slug: true,
      perfil: true,
      ativo: true,
      createdAt: true,
      logoUrl: true,
      telefone: true,
      descricao: true,
      horarioAbertura: true,
      horarioFechamento: true,
      diasAtivos: true,
      valorMinimoPedido: true,
      taxaEntregaPadrao: true,
      entregaHabilitada: true,
      permitirRetirada: true,
      raioAtendimentoKm: true,
      tempoEntregaMinutos: true,
      corPrimaria: true,
      nomeBot: true,
      mensagemBoasVindas: true,
      aberto: true,
      endereco: true
    }
  })
  return NextResponse.json({ ok: true, estabelecimentos: ests })
}

export async function POST(req: NextRequest) {
  const sa = getSuperAdmin(req)
  if (!sa) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const key = 'superadmin:est:' + keyFromRequestHeaders(req.headers)
  if (!rateLimit(key, 50, 60_000)) return Response.json({ ok: false, error: 'rate limit' }, { status: 429 })
  const b = await req.json()
  const nome = String(b.nome || '').trim()
  if (!nome) return Response.json({ ok: false, error: 'nome_obrigatorio' }, { status: 400 })
  const preferred = String(b.slug || '').trim()
  const base = preferred || nome
  const norm = toSlug(base)
  const unique = await ensureUniqueSlug(norm)
  const perfil = safePerfil(b.perfil) || 'LANCHONETE'
  const criarCategoriasPadrao = Boolean(b.criarCategoriasPadrao ?? true)

  const data: any = {
    nome,
    slug: unique,
    perfil: perfil as any,
    ativo: Boolean(b.ativo ?? true),
    telefone: limparTelefone(b.telefone),
    descricao: strOrNull(b.descricao),
    horarioAbertura: strOrNull(b.horarioAbertura),
    horarioFechamento: strOrNull(b.horarioFechamento),
    diasAtivos: diasValidos(b.diasAtivos),
    valorMinimoPedido: decimalOrNull(b.valorMinimoPedido),
    taxaEntregaPadrao: decimalOrNull(b.taxaEntregaPadrao),
    entregaHabilitada: boolOrDef(b.entregaHabilitada, true),
    permitirRetirada: boolOrDef(b.permitirRetirada, true),
    raioAtendimentoKm: decimalOrNull(b.raioAtendimentoKm),
    tempoEntregaMinutos: intOrNull(b.tempoEntregaMinutos),
    logoUrl: strOrNull(b.logoUrl),
    corPrimaria: strOrNull(b.corPrimaria) || '#22c55e',
    nomeBot: strOrNull(b.nomeBot) || 'Atendimento',
    mensagemBoasVindas: strOrNull(b.mensagemBoasVindas),
    aberto: boolOrDef(b.aberto, true),
    endereco: jsonOrNull(b.endereco)
  }

  const est = await prisma.estabelecimento.create({ data })

  if (perfil === 'DISTRIBUIDORA' && criarCategoriasPadrao) {
    const padroes: { nome: string; icone: string; ordemExibicao: number }[] = [
      { nome: 'Cervejas', icone: '🍺', ordemExibicao: 1 },
      { nome: 'Destilados', icone: '🥃', ordemExibicao: 2 },
      { nome: 'Vinhos', icone: '🍷', ordemExibicao: 3 },
      { nome: 'Refrigerantes', icone: '🥤', ordemExibicao: 4 },
      { nome: 'Águas', icone: '💧', ordemExibicao: 5 },
      { nome: 'Energéticos', icone: '⚡', ordemExibicao: 6 },
      { nome: 'Sucos', icone: '🧃', ordemExibicao: 7 },
      { nome: 'Gelo', icone: '🧊', ordemExibicao: 8 },
      { nome: 'Itens para festas', icone: '🎉', ordemExibicao: 9 },
      { nome: 'Outros', icone: '➕', ordemExibicao: 10 }
    ]
    try {
      await prisma.categoria.createMany({
        data: padroes.map(c => ({
          estabelecimentoId: est.id,
          nome: c.nome,
          icone: c.icone,
          ordemExibicao: c.ordemExibicao,
          ativo: true
        })),
        skipDuplicates: true
      })
    } catch {}
  }
  return Response.json({ ok: true, estabelecimento: est })
}

export async function PUT(req: NextRequest) {
  const sa = getSuperAdmin(req)
  if (!sa) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const key = 'superadmin:est:' + keyFromRequestHeaders(req.headers)
  if (!rateLimit(key, 50, 60_000)) return Response.json({ ok: false, error: 'rate limit' }, { status: 429 })
  const b = await req.json()
  const id = String(b.id || '')
  if (!id) return Response.json({ ok: false, error: 'id_obrigatorio' }, { status: 400 })
  const existing = await prisma.estabelecimento.findUnique({ where: { id } })
  if (!existing) return Response.json({ ok: false, error: 'nao_encontrado' }, { status: 404 })

  const nome = typeof b.nome === 'string' ? String(b.nome).trim() : existing.nome
  const slugInput = typeof b.slug === 'string' ? String(b.slug).trim() : null
  let slug: string | undefined = undefined
  if (slugInput != null || nome !== existing.nome) {
    const baseSlug = slugInput != null ? slugInput : nome
    const norm = toSlug(baseSlug) || existing.slug
    slug = await ensureUniqueSlug(norm, id)
  }
  const perfil = safePerfil(b.perfil) || existing.perfil

  const data: any = {
    nome,
    perfil: perfil as any,
    ativo: typeof b.ativo === 'undefined' ? existing.ativo : Boolean(b.ativo)
  }
  if (slug) data.slug = slug
  if (b.telefone !== undefined) data.telefone = limparTelefone(b.telefone)
  if (b.descricao !== undefined) data.descricao = strOrNull(b.descricao)
  if (b.horarioAbertura !== undefined) data.horarioAbertura = strOrNull(b.horarioAbertura)
  if (b.horarioFechamento !== undefined) data.horarioFechamento = strOrNull(b.horarioFechamento)
  if (b.diasAtivos !== undefined) data.diasAtivos = diasValidos(b.diasAtivos)
  if (b.valorMinimoPedido !== undefined) data.valorMinimoPedido = decimalOrNull(b.valorMinimoPedido)
  if (b.taxaEntregaPadrao !== undefined) data.taxaEntregaPadrao = decimalOrNull(b.taxaEntregaPadrao)
  if (b.entregaHabilitada !== undefined) data.entregaHabilitada = boolOrDef(b.entregaHabilitada, existing.entregaHabilitada)
  if (b.permitirRetirada !== undefined) data.permitirRetirada = boolOrDef(b.permitirRetirada, existing.permitirRetirada)
  if (b.raioAtendimentoKm !== undefined) data.raioAtendimentoKm = decimalOrNull(b.raioAtendimentoKm)
  if (b.tempoEntregaMinutos !== undefined) data.tempoEntregaMinutos = intOrNull(b.tempoEntregaMinutos)
  if (b.logoUrl !== undefined) data.logoUrl = strOrNull(b.logoUrl)
  if (b.corPrimaria !== undefined) data.corPrimaria = strOrNull(b.corPrimaria) || existing.corPrimaria
  if (b.nomeBot !== undefined) data.nomeBot = strOrNull(b.nomeBot) || existing.nomeBot
  if (b.mensagemBoasVindas !== undefined) data.mensagemBoasVindas = strOrNull(b.mensagemBoasVindas)
  if (b.aberto !== undefined) data.aberto = boolOrDef(b.aberto, existing.aberto)
  if (b.endereco !== undefined) data.endereco = jsonOrNull(b.endereco)

  const est = await prisma.estabelecimento.update({ where: { id }, data })
  return Response.json({ ok: true, estabelecimento: est })
}

function toSlug(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function ensureUniqueSlug(base: string, currentId?: string) {
  let candidate = base || 'estabelecimento'
  let n = 1
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await prisma.estabelecimento.findUnique({ where: { slug: candidate } })
    if (!exists || (currentId && exists.id === currentId)) return candidate
    n += 1
    candidate = `${base}-${n}`
  }
}
