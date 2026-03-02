import { NextRequest } from 'next/server'
import { resolveTenant } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const est = await resolveTenant(req)
  if (!est) return Response.json({ error: 'estabelecimento não encontrado' }, { status: 404 })
  return Response.json({
    estabelecimento: {
      id: est.id,
      nome: est.nome,
      slug: est.slug,
      perfil: est.perfil,
      ativo: est.ativo,
      aberto: est.aberto,
      descricao: est.descricao || null,
      telefone: est.telefone || null,
      horarioAbertura: est.horarioAbertura || null,
      horarioFechamento: est.horarioFechamento || null,
      diasAtivos: est.diasAtivos || null,
      taxaEntregaPadrao: est.taxaEntregaPadrao,
      permitirRetirada: est.permitirRetirada,
      logoUrl: est.logoUrl || null,
      corPrimaria: est.corPrimaria,
      corBot: est.corBot,
      corTexto: est.corTexto,
      corFundoChat: est.corFundoChat,
      nomeBot: est.nomeBot,
      mensagemBoasVindas: est.mensagemBoasVindas || null,
      avatarBotUrl: est.avatarBotUrl || null,
      temaChat: est.temaChat,
      bordaBaloes: est.bordaBaloes,
      sombraBaloes: est.sombraBaloes
    }
  })
}
