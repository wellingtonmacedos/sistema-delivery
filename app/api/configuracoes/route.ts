import { NextRequest } from 'next/server'
import { ConfigSchema } from '@/lib/validate'
import { getConfiguracao, upsertConfiguracao } from '@/lib/config'
import { getCurrentAdminWithEstabelecimento } from '@/lib/authAdmin'

export async function GET() {
  const ctx = await getCurrentAdminWithEstabelecimento()
  const estId = ctx?.estabelecimento?.id || null
  const config = await getConfiguracao(estId)
  return Response.json({ config, estabelecimentoId: estId })
}

export async function POST(req: NextRequest) {
  const ctx = await getCurrentAdminWithEstabelecimento()
  const estId = ctx?.estabelecimento?.id || (ctx?.admin?.role === 'SUPER_ADMIN' ? null : undefined)
  if (estId === undefined && ctx?.admin?.role !== 'SUPER_ADMIN') {
    return Response.json({ error: 'não autorizado' }, { status: 401 })
  }
  const body = await req.json()
  const parsed = ConfigSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'dados inválidos', issues: parsed.error.issues },
      { status: 400 }
    )
  }
  const d = parsed.data
  const input: Record<string, any> = {}
  if (d.taxaEntrega !== undefined) input.taxaEntrega = d.taxaEntrega
  if (d.tempoEstimado !== undefined) input.tempoEstimado = d.tempoEstimado
  if (d.pixApiKey !== undefined) input.pixApiKey = d.pixApiKey
  if (d.pixChave !== undefined) input.pixChave = d.pixChave
  if (d.pixBeneficiario !== undefined) input.pixBeneficiario = d.pixBeneficiario
  if (d.pixCidade !== undefined) input.pixCidade = d.pixCidade
  const config = await upsertConfiguracao(estId || null, input)
  return Response.json({ config, estabelecimentoId: estId || null })
}
