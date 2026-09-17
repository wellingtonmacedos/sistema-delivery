import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { FormaEntrega } from '@prisma/client'
import { PedidoCreateSchema } from '@/lib/validate'
import { rateLimit, keyFromRequestHeaders } from '@/lib/rateLimit'
import { resolveTenant, safePerfil } from '@/lib/tenant'
import { validarCupomUso } from '@/lib/cupom'
import { calcularStatusAbertura } from '@/lib/horarioFuncionamento'
import { getConfiguracao } from '@/lib/config'

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
  const { itens, formaEntrega, cupomCodigo: rawCupom, clienteTelefone } = parsed.data as {
    itens: PedidoItemInput[]
    formaEntrega: FormaEntrega
    cupomCodigo?: unknown
    clienteTelefone?: unknown
  }
  const cupomCodigo = (rawCupom ? String(rawCupom).trim().toUpperCase() : '') || ''
  try {
    const est = await resolveTenant(req)
    if (est?.id) {
      const status = calcularStatusAbertura({
        abertoManual: est.aberto as any,
        diasAtivos: est.diasAtivos as any,
        horarioAbertura: (est as any).horarioAbertura,
        horarioFechamento: (est as any).horarioFechamento
      })
      if (!status.aberto) {
        const detalhe = status.horarioHojeAbre && status.horarioHojeFecha ? ` Horário hoje: ${status.horarioHojeAbre} → ${status.horarioHojeFecha}.` : ''
        return Response.json(
          { error: `Estabelecimento fechado no momento. ${status.motivo}.${detalhe}` },
          { status: 400 }
        )
      }
    }
    const produtos = await prisma.produto.findMany({
      where: { id: { in: itens.map(i => i.produtoId) }, ativo: true, estabelecimentoId: est?.id || undefined }
    })
    if (produtos.length !== itens.length) {
      return Response.json({ error: 'produto inválido' }, { status: 400 })
    }
    const perfil = safePerfil(est?.perfil) || 'LANCHONETE'
    const itensData = []
    const itensCarrinho = []
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
      const precoUnit = base + extras
      const subtotal = precoUnit * i.quantidade
      itensData.push({ produtoId: p.id, quantidade: i.quantidade, subtotal })
      itensCarrinho.push({
        produtoId: p.id,
        quantidade: i.quantidade,
        precoUnitario: precoUnit,
        adicionaisPreco: extras
      })
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
    const config = await getConfiguracao(est?.id || null)
    const taxaBase =
      est && est.taxaEntregaPadrao != null ? Number(est.taxaEntregaPadrao) : Number(config?.taxaEntrega || 0)
    const taxaEntrega = formaEntrega === FormaEntrega.entrega ? taxaBase : 0
    const cupom = await validarCupomUso({
      estId: est?.id || '',
      cupomCodigo,
      totalItens,
      taxaEntrega,
      clienteTelefone: typeof clienteTelefone === 'string' ? clienteTelefone : null,
      itensCarrinho
    })
    const desconto = Math.max(0, cupom.desconto)
    const total = Math.max(0, totalItens + taxaEntrega - desconto)
    if (total <= 0) return Response.json({ error: 'pedido com valor zero' }, { status: 400 })
    return Response.json({
      total,
      taxaEntrega,
      desconto,
      cupomAplicado: cupom.aplicado,
      cupomMotivo: cupom.motivo,
      cupomCodigo: cupom.codigo,
      cupomTipo: cupom.tipo,
      cupomValor: cupom.valor,
      baseCalculoElegivel: cupom.baseCalculoElegivel,
      categoriaLabel: cupom.categoriaLabel || null,
      produtoLabel: cupom.produtoLabel || null,
      itensAplicados: cupom.itensAplicados && cupom.itensAplicados.length > 0 ? cupom.itensAplicados : null
    })
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : 'quote_indisponivel'
    return Response.json({ error: msg, fallback: true, total: null }, { status: 503 })
  }
}
