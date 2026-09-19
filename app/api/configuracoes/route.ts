import { NextRequest } from 'next/server'
import { ConfigSchema } from '@/lib/validate'
import { getConfiguracao, normalizarMetodosPagamento, upsertConfiguracao } from '@/lib/config'
import { getCurrentAdminWithEstabelecimento } from '@/lib/authAdmin'

export async function GET() {
  const ctx = await getCurrentAdminWithEstabelecimento()
  const estId = ctx?.estabelecimento?.id || null
  const config = await getConfiguracao(estId)
  const metodosPagamento = normalizarMetodosPagamento((config as any)?.metodosPagamento)
  return Response.json({
    config: { ...(config as any), metodosPagamento },
    estabelecimentoId: estId
  })
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentAdminWithEstabelecimento()
    const estId = ctx?.estabelecimento?.id || (ctx?.admin?.role === 'SUPER_ADMIN' ? null : undefined)
    if (estId === undefined && ctx?.admin?.role !== 'SUPER_ADMIN') {
      return Response.json({ error: 'não autorizado' }, { status: 401 })
    }
    const body = await req.json()
    const parsed = ConfigSchema.safeParse(body)
    if (!parsed.success) {
      const primeiroIssue = parsed.error.issues?.[0]
      return Response.json(
        {
          error: primeiroIssue
            ? `dados inválidos: ${primeiroIssue.path?.join('.') || 'campo'} — ${primeiroIssue.message}`
            : 'dados inválidos',
          issues: parsed.error.issues
        },
        { status: 400 }
      )
    }
    const d = parsed.data
    if (d.metodosPagamento) {
      const nm = normalizarMetodosPagamento(d.metodosPagamento)
      const temAlgum = nm.dinheiro || nm.cartao || nm.pix_online || nm.pix_entrega
      if (!temAlgum) {
        return Response.json(
          { error: 'pelo menos um método de pagamento deve estar habilitado' },
          { status: 400 }
        )
      }
    }
    const input: Record<string, any> = {}
    if (d.taxaEntrega !== undefined) input.taxaEntrega = d.taxaEntrega
    if (d.tempoEstimado !== undefined) input.tempoEstimado = d.tempoEstimado
    if (d.pixApiKey !== undefined) input.pixApiKey = d.pixApiKey
    if (d.pixChave !== undefined) input.pixChave = d.pixChave
    if (d.pixBeneficiario !== undefined) input.pixBeneficiario = d.pixBeneficiario
    if (d.pixCidade !== undefined) input.pixCidade = d.pixCidade
    if (d.metodosPagamento !== undefined) input.metodosPagamento = d.metodosPagamento
    const config = await upsertConfiguracao(estId || null, input)
    const metodosPagamento = normalizarMetodosPagamento((config as any)?.metodosPagamento)
    return Response.json({
      config: { ...(config as any), metodosPagamento },
      estabelecimentoId: estId || null
    })
  } catch (e: any) {
    console.error('[POST /api/configuracoes] erro interno:', e)
    return Response.json(
      { error: 'Erro interno ao salvar configurações. Tente novamente.' },
      { status: 500 }
    )
  }
}
