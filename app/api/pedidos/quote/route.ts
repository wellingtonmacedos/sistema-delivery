import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { FormaEntrega } from '@prisma/client'
import { PedidoCreateSchema } from '@/lib/validate'
import { rateLimit, keyFromRequestHeaders } from '@/lib/rateLimit'
import { resolveTenant, safePerfil } from '@/lib/tenant'

type PedidoItemInput = {
  produtoId: string
  quantidade: number
  adicionais?: any
}

export async function POST(req: NextRequest) {
  const key = 'pedidos:quote:' + keyFromRequestHeaders(req.headers)
  if (!rateLimit(key, 60, 60_000)) return Response.json({ error: 'rate limit' }, { status: 429 })
  const body = await req.json()
  const parsed = PedidoCreateSchema.pick({
    clienteTelefone: true,
    itens: true,
    formaEntrega: true,
    cupomCodigo: true
  }).safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const { itens, formaEntrega, cupomCodigo: rawCupom } = parsed.data as {
    itens: PedidoItemInput[]
    formaEntrega: FormaEntrega
    cupomCodigo?: unknown
  }
  const cupomCodigo = (rawCupom ? String(rawCupom).trim().toUpperCase() : '') || ''
  try {
    const est = await resolveTenant(req)
    const produtos = await prisma.produto.findMany({
      where: { id: { in: itens.map(i => i.produtoId) }, ativo: true, estabelecimentoId: est?.id || undefined }
    })
    if (produtos.length !== itens.length) {
      return Response.json({ error: 'produto inválido' }, { status: 400 })
    }
    const perfil = safePerfil(est?.perfil) || 'LANCHONETE'
    const itensData = []
    for (const i of itens) {
      const p = produtos.find(pp => pp.id === i.produtoId)!
      let base = Number(p.preco)
      let extras = 0
      if (perfil === 'ACAITERIA' && i.adicionais?.complementos?.length) {
        const compRows = await prisma.acaiComplemento.findMany({
          where: { id: { in: i.adicionais.complementos }, estabelecimentoId: est?.id || undefined, ativo: true }
        })
        extras += compRows.reduce((acc, c) => acc + Number(c.valorAdicional || 0), 0)
        const cfg = await prisma.configuracaoAcaiteria.findUnique({ where: { estabelecimentoId: est!.id } })
        const maxComp = cfg?.maxComplementos ?? 3
        if (i.adicionais.complementos.length > maxComp) {
          i.adicionais.complementos = i.adicionais.complementos.slice(0, maxComp)
        }
      }
      if (perfil === 'PIZZARIA' && i.adicionais?.tamanhoId) {
        const tamanho = await prisma.pizzaTamanho.findUnique({ where: { id: i.adicionais.tamanhoId } })
        if (tamanho) base = Number(tamanho.precoBase)
        const cfg = await prisma.configuracaoPizzaria.findUnique({ where: { estabelecimentoId: est!.id } })
        const maxSab = cfg?.maxSaboresPorPizza ?? 2
        if (Array.isArray(i.adicionais?.sabores) && i.adicionais.sabores.length > maxSab) {
          i.adicionais.sabores = i.adicionais.sabores.slice(0, maxSab)
        }
      }
      if (perfil === 'DISTRIBUIDORA' && i.adicionais?.tipoCompra === 'embalagem' && p.precoEmbalagem != null) {
        base = Number(p.precoEmbalagem)
      }
      const subtotal = (base + extras) * i.quantidade
      itensData.push({ produtoId: p.id, quantidade: i.quantidade, subtotal })
    }
    const totalItens = itensData.reduce((acc, cur) => acc + cur.subtotal, 0)
    if (est?.valorMinimoPedido != null) {
      const min = Number(est.valorMinimoPedido)
      if (min > 0 && totalItens < min) {
        const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        return Response.json(
          { error: `Valor mínimo do pedido é ${fmt(min)} (atual: ${fmt(totalItens)})` },
          { status: 400 }
        )
      }
    }
    const config = await prisma.configuracao.findUnique({ where: { id: 1 } })
    const taxaBase =
      est && est.taxaEntregaPadrao != null ? Number(est.taxaEntregaPadrao) : Number(config?.taxaEntrega || 0)
    const taxaEntrega = formaEntrega === FormaEntrega.entrega ? taxaBase : 0
    let desconto = 0
    if (cupomCodigo && est?.id) {
      const now = new Date()
      const cupom = await prisma.cupom.findFirst({
        where: {
          estabelecimentoId: est.id,
          codigo: cupomCodigo,
          ativo: true,
          dataInicio: { lte: now },
          dataFim: { gte: now }
        }
      })
      if (cupom) {
        if (cupom.valorMinimoPedido == null || totalItens >= Number(cupom.valorMinimoPedido)) {
          const totalUsos = await prisma.cupomUso.count({ where: { cupomId: cupom.id } })
          const limiteTotalOk = cupom.limiteTotalUso == null || totalUsos < cupom.limiteTotalUso
          if (limiteTotalOk) {
            if (cupom.tipo === 'PERCENTUAL') desconto = (totalItens + taxaEntrega) * (Number(cupom.valor) / 100)
            else if (cupom.tipo === 'VALOR_FIXO') desconto = Number(cupom.valor)
            else if (cupom.tipo === 'FRETE_GRATIS') desconto = taxaEntrega
          }
        }
      }
    }
    if (desconto < 0) desconto = 0
    const total = Math.max(0, totalItens + taxaEntrega - desconto)
    if (total <= 0) return Response.json({ error: 'pedido com valor zero' }, { status: 400 })
    return Response.json({ total, taxaEntrega, desconto })
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : 'quote_indisponivel'
    return Response.json({ error: msg, fallback: true, total: null }, { status: 503 })
  }
}
