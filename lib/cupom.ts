import { prisma } from '@/lib/db'

export type ItemCarrinhoCupom = {
  produtoId: string
  quantidade: number
  precoUnitario: number
  observacao?: string | null
  adicionaisPreco?: number
}

export type ItemAplicadoResumo = {
  produtoId: string
  produtoNome?: string | null
  quantidade: number
  subtotal: number
  descontoRecebido: number
}

export type CupomValidado = {
  cupomId: string | null
  desconto: number
  aplicado: boolean
  motivo: string | null
  codigo?: string | null
  tipo?: string | null
  valor?: number | null
  baseCalculoElegivel?: number
  itensAplicados?: ItemAplicadoResumo[]
  categoriaLabel?: string | null
  produtoLabel?: string | null
}

export async function validarCupomUso(params: {
  estId: string
  cupomCodigo: string
  totalItens: number
  taxaEntrega: number
  clienteId?: string | null
  clienteTelefone?: string | null
  agora?: Date
  itensCarrinho?: ItemCarrinhoCupom[]
}): Promise<CupomValidado> {
  const { estId, cupomCodigo, totalItens, taxaEntrega, clienteId, clienteTelefone, agora, itensCarrinho = [] } = params
  const codigo = (cupomCodigo || '').trim().toUpperCase()
  const now = agora || new Date()
  const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const retorno: CupomValidado = {
    cupomId: null,
    desconto: 0,
    aplicado: false,
    motivo: null,
    codigo: codigo || null,
    baseCalculoElegivel: 0,
    itensAplicados: []
  }
  if (!codigo || !estId) return retorno

  const cupom = await prisma.cupom.findFirst({
    where: {
      estabelecimentoId: estId,
      codigo: codigo,
      ativo: true,
      dataInicio: { lte: now },
      dataFim: { gte: now }
    },
    include: {
      categoriasAplicaveis: { include: { categoria: { select: { id: true, nome: true } } } },
      produtosAplicaveis: { include: { produto: { select: { id: true, nome: true, categoria: true, categoriaId: true } } } }
    }
  })
  if (!cupom) {
    retorno.motivo = 'Cupom inválido, expirado ou inativo.'
    return retorno
  }
  retorno.tipo = cupom.tipo
  retorno.valor = Number(cupom.valor)

  const catElegiveis = (cupom.categoriasAplicaveis || []).map(j => ({
    id: j.categoria.id,
    nome: j.categoria.nome
  }))
  const prodElegiveis = (cupom.produtosAplicaveis || []).map(j => ({
    id: j.produto.id,
    nome: j.produto.nome,
    categoriaId: j.produto.categoriaId || null,
    categoriaNome: j.produto.categoria
  }))

  const temRestricao = catElegiveis.length > 0 || prodElegiveis.length > 0

  if (catElegiveis.length > 0) {
    retorno.categoriaLabel =
      catElegiveis.length <= 3
        ? catElegiveis.map(c => c.nome).join(', ')
        : `${catElegiveis.length} categorias`
  }
  if (prodElegiveis.length > 0) {
    retorno.produtoLabel =
      prodElegiveis.length <= 3
        ? prodElegiveis.map(p => p.nome).join(', ')
        : `${prodElegiveis.length} produtos`
  }

  let baseCalculoElegivel = 0
  let itensAplicados: ItemAplicadoResumo[] = []

  if (temRestricao && itensCarrinho.length > 0) {
    const prodElegIds = new Set(prodElegiveis.map(p => p.id))
    const catElegIds = new Set(catElegiveis.map(c => c.id))
    const catElegNomeLower = new Set(catElegiveis.map(c => c.nome.trim().toLowerCase()))
    const produtoIdsCarrinho = Array.from(new Set(itensCarrinho.map(i => i.produtoId)))
    const dadosProdutos = new Map<string, { id: string; nome: string; categoriaId?: string | null; categoriaNome: string }>()

    if (produtoIdsCarrinho.length > 0) {
      const rows = await prisma.produto.findMany({
        where: { id: { in: produtoIdsCarrinho } },
        select: { id: true, nome: true, categoriaId: true, categoria: true }
      })
      for (const r of rows) {
        dadosProdutos.set(r.id, {
          id: r.id,
          nome: r.nome,
          categoriaId: r.categoriaId || null,
          categoriaNome: r.categoria
        })
      }
    }

    for (const item of itensCarrinho) {
      const prod = dadosProdutos.get(item.produtoId)
      const matchProd = prodElegIds.has(item.produtoId)
      let matchCat = false
      if (prod?.categoriaId && catElegIds.has(prod.categoriaId)) matchCat = true
      if (!matchCat && prod?.categoriaNome && catElegNomeLower.has(prod.categoriaNome.trim().toLowerCase())) {
        matchCat = true
      }
      const elegivel = matchProd || matchCat
      if (!elegivel) continue
      const subtotalItem =
        item.quantidade * (Number(item.precoUnitario) || 0) + (Number(item.adicionaisPreco) || 0)
      baseCalculoElegivel += subtotalItem
      itensAplicados.push({
        produtoId: item.produtoId,
        produtoNome: prod?.nome || null,
        quantidade: item.quantidade,
        subtotal: subtotalItem,
        descontoRecebido: 0
      })
    }

    if (itensAplicados.length === 0) {
      const nomes = []
      if (catElegiveis.length > 0)
        nomes.push(`${catElegiveis.length} categoria(s) (${catElegiveis.map(c => c.nome).join(', ')})`)
      if (prodElegiveis.length > 0)
        nomes.push(`${prodElegiveis.length} produto(s) (${prodElegiveis.slice(0, 3).map(p => p.nome).join(', ')}${prodElegiveis.length > 3 ? '...' : ''})`)
      retorno.motivo = `Este cupom só vale para ${nomes.join(' + ')}. Nenhum item no carrinho se encaixa.`
      return retorno
    }
  } else {
    baseCalculoElegivel = totalItens
  }

  retorno.baseCalculoElegivel = Number(baseCalculoElegivel.toFixed(2))

  if (cupom.valorMinimoPedido != null && totalItens < Number(cupom.valorMinimoPedido)) {
    retorno.motivo = `Valor mínimo para este cupom é ${fmt(Number(cupom.valorMinimoPedido))}.`
    return retorno
  }

  const totalUsos = await prisma.cupomUso.count({ where: { cupomId: cupom.id } })
  const limiteTotalOk =
    cupom.limiteTotalUso == null || totalUsos < Number(cupom.limiteTotalUso)
  if (!limiteTotalOk) {
    retorno.motivo = 'Este cupom atingiu o limite total de usos.'
    return retorno
  }

  let clienteParaLimite: string | undefined | null = clienteId
  if (!clienteParaLimite && clienteTelefone && estId) {
    try {
      const tel = String(clienteTelefone).replace(/\D/g, '').slice(0, 11)
      if (tel.length >= 10) {
        const row = await prisma.cliente.findFirst({
          where: { estabelecimentoId: estId, telefone: tel },
          select: { id: true }
        })
        if (row) clienteParaLimite = row.id
      }
    } catch {}
  }

  if (clienteParaLimite && cupom.limitePorCliente != null) {
    const usosCliente = await prisma.cupomUso.count({
      where: { cupomId: cupom.id, clienteId: clienteParaLimite }
    })
    if (usosCliente >= Number(cupom.limitePorCliente)) {
      retorno.motivo = `Você atingiu o limite de ${cupom.limitePorCliente} uso(s) deste cupom.`
      return retorno
    }
  } else if (clienteTelefone && cupom.limitePorCliente != null) {
    try {
      const tel = String(clienteTelefone).replace(/\D/g, '').slice(0, 11)
      if (tel.length >= 10 && estId) {
        const usosClientePorTelefone = await prisma.cupomUso.count({
          where: {
            cupomId: cupom.id,
            cliente: { estabelecimentoId: estId, telefone: tel }
          }
        })
        if (usosClientePorTelefone >= Number(cupom.limitePorCliente)) {
          retorno.motivo = `Você atingiu o limite de ${cupom.limitePorCliente} uso(s) deste cupom.`
          return retorno
        }
      }
    } catch {}
  }

  if (cupom.tipo === 'PERCENTUAL') {
    const descontoBruto = baseCalculoElegivel * (Number(cupom.valor) / 100)
    retorno.desconto = Number(descontoBruto.toFixed(2))
    if (temRestricao && itensAplicados.length > 0) {
      const totalSub = itensAplicados.reduce((acc, i) => acc + i.subtotal, 0)
      for (const ia of itensAplicados) {
        const peso = totalSub > 0 ? ia.subtotal / totalSub : 0
        ia.descontoRecebido = Number((descontoBruto * peso).toFixed(2))
      }
      retorno.itensAplicados = itensAplicados
    }
  } else if (cupom.tipo === 'VALOR_FIXO') {
    const descontoBruto = Math.min(Number(cupom.valor), baseCalculoElegivel)
    retorno.desconto = Number(descontoBruto.toFixed(2))
    if (temRestricao && itensAplicados.length > 0) {
      const totalSub = itensAplicados.reduce((acc, i) => acc + i.subtotal, 0)
      for (const ia of itensAplicados) {
        const peso = totalSub > 0 ? ia.subtotal / totalSub : 0
        ia.descontoRecebido = Number((descontoBruto * peso).toFixed(2))
      }
      retorno.itensAplicados = itensAplicados
    }
  } else if (cupom.tipo === 'FRETE_GRATIS') {
    retorno.desconto = taxaEntrega
  } else {
    retorno.motivo = 'Tipo de cupom inválido.'
    return retorno
  }

  if (retorno.desconto < 0) retorno.desconto = 0
  const baseCalc = temRestricao ? totalItens + taxaEntrega : baseCalculoElegivel + taxaEntrega
  if (retorno.desconto > baseCalc) retorno.desconto = Number(baseCalc.toFixed(2))

  retorno.cupomId = cupom.id
  retorno.aplicado = true

  let prefixo = ''
  if (temRestricao) {
    const partes = []
    if (catElegiveis.length > 0) {
      const nomes = catElegiveis.map(c => c.nome)
      partes.push(
        nomes.length <= 3
          ? `nas categorias ${nomes.join(', ')}`
          : `em ${nomes.length} categorias`
      )
    }
    if (prodElegiveis.length > 0) {
      const nomes = prodElegiveis.map(p => p.nome)
      partes.push(
        nomes.length <= 3
          ? `nos produtos ${nomes.join(', ')}`
          : `em ${nomes.length} produtos`
      )
    }
    if (partes.length > 0) {
      prefixo = ` (base ${fmt(baseCalculoElegivel)} ${partes.join(' + ')})`
    }
  }

  retorno.motivo =
    cupom.tipo === 'PERCENTUAL'
      ? `Desconto de ${Number(cupom.valor)}% aplicado${prefixo}.`
      : cupom.tipo === 'VALOR_FIXO'
      ? `Desconto de ${fmt(Number(cupom.valor))} aplicado${prefixo}.`
      : cupom.tipo === 'FRETE_GRATIS' && taxaEntrega > 0
      ? 'Frete grátis aplicado.'
      : cupom.tipo === 'FRETE_GRATIS'
      ? 'Frete grátis (pedido sem taxa de entrega).'
      : 'Cupom aplicado.'

  return retorno
}
