import type { ItemPedido, Pedido } from '@prisma/client'

export const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2
})

export function resumoFinanceiro(params: {
  itens: Array<{ subtotal: number | string | Decimal }>
  total: number | string | Decimal
  valorDesconto?: number | string | Decimal | null
}) {
  const subtotal = params.itens.reduce(
    (acc, i) => acc + Number(i.subtotal || 0),
    0
  )
  const desconto = Number(params.valorDesconto || 0)
  const total = Number(params.total || 0)
  const taxaEntrega = Math.max(0, total - subtotal + desconto)
  return { subtotal, desconto, taxaEntrega, total }
}

export function formatarEndereco(end: any): string[] {
  if (!end || typeof end !== 'object') return []
  const partes: string[] = []
  const linha1 = [end.rua || end.logradouro, end.numero ? `, ${end.numero}` : '']
    .filter(Boolean)
    .join('')
  if (linha1) partes.push(linha1)
  const linha2 = [end.bairro, end.cidade, end.uf ? ` - ${end.uf}` : '']
    .filter(Boolean)
    .join(', ')
  if (linha2) partes.push(linha2)
  if (end.complemento) partes.push(`Compl: ${end.complemento}`)
  if (end.referencia) partes.push(`Ref: ${end.referencia}`)
  if (end.cep) partes.push(`CEP: ${end.cep}`)
  return partes
}

export function pagamentoLabel(tipo?: string | null): string {
  if (!tipo) return 'Não informado'
  const t = String(tipo).toLowerCase()
  if (t.includes('pix')) return 'Pix'
  if (t.includes('dinheiro') || t === 'cash') return 'Dinheiro'
  if (t.includes('credito') || t.includes('crédito') || t.includes('credit'))
    return 'Cartão de Crédito'
  if (t.includes('debito') || t.includes('débito') || t.includes('debit'))
    return 'Cartão de Débito'
  if (t.includes('cartao') || t.includes('cartão') || t.includes('card'))
    return 'Cartão'
  return String(tipo)
}

export function statusPagtoLabel(status?: string | null): string {
  if (!status) return 'Pendente'
  const s = String(status).toLowerCase()
  if (s === 'pago' || s === 'approved' || s === 'aprovado') return 'Pago'
  if (s === 'pendente' || s === 'pending' || s === 'aguardando_pix')
    return 'Pendente'
  if (s === 'cancelado' || s === 'cancelled' || s === 'rejected')
    return 'Cancelado'
  return String(status)
}

export function pedidoCodigoCurto(id: string) {
  if (!id) return ''
  return id.length <= 6 ? id : id.slice(0, 6).toUpperCase()
}

export function formaEntregaLabel(f: string) {
  return f === 'entrega' ? 'Entrega' : 'Retirada no balcão'
}

type NormalizadoAdicionais = {
  sabores: string[]
  sorvetes: string[]
  acompanhamentos: string[]
  coberturas: string[]
  complementos: string[]
  variacoes: string[]
  extras: { label: string; valor?: number | null }[]
}

export function normalizarAdicionais(
  adicionais: any,
  opcoes?: {
    sabores?: { id: string; nome: string }[]
    sorvetes?: { id: string; nome: string }[]
    acompanhamentos?: { id: string; nome: string }[]
    coberturas?: { id: string; nome: string }[]
    complementos?: { id: string; nome: string }[]
  } | null
): NormalizadoAdicionais {
  const ad = adicionais || ({} as any)

  const resolveNomes = (
    idsOrNomes: string[] | undefined | null,
    singularId: string | undefined | null,
    opcoesLista?: { id: string; nome: string }[]
  ): string[] => {
    let lista: string[] = []
    if (Array.isArray(idsOrNomes) && idsOrNomes.length > 0) {
      lista = idsOrNomes
    } else if (singularId) {
      lista = [singularId]
    }
    if (opcoesLista && Array.isArray(opcoesLista)) {
      return lista
        .map(id => opcoesLista.find(o => o.id === id)?.nome || id)
        .filter(Boolean)
    }
    return lista.filter(Boolean)
  }

  const sabores = resolveNomes(ad.sabores, ad.saborId, opcoes?.sabores)
  if (sabores.length === 0 && typeof ad.saborNome === 'string' && ad.saborNome)
    sabores.push(ad.saborNome)

  const sorvetes = resolveNomes(ad.sorvetes, ad.sorveteId, opcoes?.sorvetes)
  if (
    sorvetes.length === 0 &&
    typeof ad.sorveteNome === 'string' &&
    ad.sorveteNome
  )
    sorvetes.push(ad.sorveteNome)
  if (sorvetes.length === 0 && ad.sorveteEscolhido === true)
    sorvetes.push('Sem sorvete')

  const acompanhamentos = resolveNomes(
    ad.acompanhamentos,
    null,
    opcoes?.acompanhamentos
  )

  const coberturas = resolveNomes(ad.coberturas, ad.coberturaId, opcoes?.coberturas)
  if (
    coberturas.length === 0 &&
    typeof ad.coberturaNome === 'string' &&
    ad.coberturaNome
  )
    coberturas.push(ad.coberturaNome)

  const complementos = resolveNomes(
    ad.complementos,
    null,
    opcoes?.complementos
  )

  const variacoes: string[] = []
  if (ad.variacaoNome) variacoes.push(String(ad.variacaoNome))
  if (Array.isArray(ad.variacoesSelecionadas) && ad.variacoesSelecionadas.length)
    ad.variacoesSelecionadas.forEach((v: any) => {
      if (v?.nome) variacoes.push(String(v.nome))
    })

  const extras: { label: string; valor?: number | null }[] = []
  if (Array.isArray(ad.itensExtras) && ad.itensExtras.length)
    ad.itensExtras.forEach((e: any) => {
      if (e?.nome)
        extras.push({ label: String(e.nome), valor: Number(e.preco || 0) || null })
    })

  return {
    sabores,
    sorvetes,
    acompanhamentos,
    coberturas,
    complementos,
    variacoes,
    extras
  }
}

type Decimal = any
