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
  if (!estId && admin.role !== 'SUPER_ADMIN') return Response.json({ error: 'unauthorized' }, { status: 401 })
  const est = estId
    ? await prisma.estabelecimento.findUnique({ where: { id: estId } })
    : await prisma.estabelecimento.findFirst({ where: { ativo: true }, orderBy: { createdAt: 'asc' } })
  if (!est) return Response.json({ error: 'not found' }, { status: 404 })
  return Response.json({
    estabelecimento: {
      id: est.id,
      nome: est.nome,
      slug: est.slug,
      logoUrl: est.logoUrl || null,
      corPrimaria: est.corPrimaria,
      corBot: est.corBot,
      corTexto: est.corTexto,
      corFundoChat: est.corFundoChat,
      nomeBot: est.nomeBot,
      mensagemBoasVindas: est.mensagemBoasVindas,
      avatarBotUrl: est.avatarBotUrl || null,
      temaChat: est.temaChat,
      bordaBaloes: est.bordaBaloes,
      sombraBaloes: est.sombraBaloes
    }
  })
}

export async function POST(req: NextRequest) {
  const admin = getAdmin(req)
  if (!admin) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const estId = admin.estabelecimentoId || null
  if (!estId || admin.role !== 'ADMIN_ESTABELECIMENTO') return Response.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json()
  const data: any = {}
  if (typeof body.corPrimaria === 'string') data.corPrimaria = body.corPrimaria
  if (typeof body.corBot === 'string') data.corBot = body.corBot
  if (typeof body.corTexto === 'string') data.corTexto = body.corTexto
  if (typeof body.corFundoChat === 'string') data.corFundoChat = body.corFundoChat
  if (typeof body.nomeBot === 'string' && body.nomeBot.trim()) data.nomeBot = body.nomeBot.trim()
  if (typeof body.mensagemBoasVindas === 'string') data.mensagemBoasVindas = body.mensagemBoasVindas.trim() || null
  if (typeof body.avatarBotUrl === 'string') data.avatarBotUrl = body.avatarBotUrl || null
  if (typeof body.temaChat === 'string') data.temaChat = body.temaChat
  if (typeof body.bordaBaloes === 'string') data.bordaBaloes = body.bordaBaloes
  if (typeof body.sombraBaloes === 'boolean') data.sombraBaloes = body.sombraBaloes
  const est = await prisma.estabelecimento.update({
    where: { id: estId },
    data
  })
  return Response.json({ ok: true, estabelecimento: est })
}
