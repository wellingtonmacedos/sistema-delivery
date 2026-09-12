import { NextRequest } from 'next/server'
import { resolveTenant } from '@/lib/tenant'
import { calcularStatusAbertura } from '@/lib/horarioFuncionamento'

export async function GET(req: NextRequest) {
  const est = await resolveTenant(req)
  if (!est) return Response.json({ error: 'estabelecimento não encontrado' }, { status: 404 })
  const status = calcularStatusAbertura({
    abertoManual: est.aberto,
    diasAtivos: est.diasAtivos,
    horarioAbertura: est.horarioAbertura,
    horarioFechamento: est.horarioFechamento
  })
  return Response.json({
    estabelecimento: {
      id: est.id,
      nome: est.nome,
      slug: est.slug,
      perfil: est.perfil,
      ativo: est.ativo,
      aberto: status.aberto,
      statusAbertura: {
        aberto: status.aberto,
        motivo: status.motivo,
        diaAtual: status.diaAtual || null,
        horarioHojeAbre: status.horarioHojeAbre || null,
        horarioHojeFecha: status.horarioHojeFecha || null,
        configurado: status.configurado
      },
      abertoManual: est.aberto,
      descricao: est.descricao || null,
      telefone: est.telefone || null,
      horarioAbertura: est.horarioAbertura || null,
      horarioFechamento: est.horarioFechamento || null,
      diasAtivos: est.diasAtivos || null,
      taxaEntregaPadrao: est.taxaEntregaPadrao,
      entregaHabilitada: est.entregaHabilitada,
      permitirRetirada: est.permitirRetirada,
      raioAtendimentoKm: est.raioAtendimentoKm,
      tempoEntregaMinutos: est.tempoEntregaMinutos,
      valorMinimoPedido: est.valorMinimoPedido,
      endereco: est.endereco || null,
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
