import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { StatusPedido, FormaEntrega } from '@prisma/client'
import { PedidoCreateSchema } from '@/lib/validate'
import { rateLimit, keyFromRequestHeaders } from '@/lib/rateLimit'
import { logSistema } from '@/lib/log'
import { revalidateTag } from 'next/cache'
import { resolveTenant } from '@/lib/tenant'

export async function GET() {
  const pedidos = await prisma.pedido.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      itens: {
        select: { id: true, quantidade: true, subtotal: true, produtoId: true }
      },
      cliente: { select: { nome: true, telefone: true } },
      pagamento: { select: { status: true, txid: true } }
    }
  })
  return Response.json({ pedidos })
}

export async function POST(req: NextRequest) {
  const key = 'pedidos:' + keyFromRequestHeaders(req.headers)
  if (!rateLimit(key, 30, 60_000)) return Response.json({ error: 'rate limit' }, { status: 429 })
  const body = await req.json()
  const parsed = PedidoCreateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const { clienteTelefone, itens, formaEntrega, enderecoEntrega, metodoPagamento, trocoPara } = parsed.data as any
  const est = await resolveTenant(req)
  const cliente = await prisma.cliente.findFirst({
    where: { telefone: clienteTelefone, estabelecimentoId: est?.id || undefined }
  })
  if (!cliente) {
    return Response.json({ error: 'cliente não encontrado' }, { status: 404 })
  }
  const produtos = await prisma.produto.findMany({
    where: { id: { in: itens.map((i: any) => i.produtoId) }, ativo: true, estabelecimentoId: est?.id || undefined }
  })
  if (produtos.length !== itens.length) {
    return Response.json({ error: 'produto inválido' }, { status: 400 })
  }
  const perfil = est?.perfil || 'LANCHONETE'
  const itensData: any[] = []
  for (const i of itens as any[]) {
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
    const subtotal = (base + extras) * i.quantidade
    itensData.push({
      produtoId: p.id,
      quantidade: i.quantidade,
      adicionais: i.adicionais,
      observacoes: i.observacoes,
      subtotal
    })
  }
  const totalItens = itensData.reduce((acc, cur) => acc + cur.subtotal, 0)
  const config = await prisma.configuracao.findUnique({ where: { id: 1 } })
  const taxaEntrega = formaEntrega === FormaEntrega.entrega ? Number(config?.taxaEntrega || 0) : 0
  const total = totalItens + taxaEntrega
  if (total <= 0) {
    return Response.json({ error: 'pedido com valor zero' }, { status: 400 })
  }
  const pedido = await prisma.pedido.create({
    data: {
      clienteId: cliente.id,
      status: metodoPagamento && metodoPagamento !== 'pix' ? StatusPedido.preparando : StatusPedido.aberto,
      total,
      formaEntrega,
      enderecoEntrega,
      itens: { create: itensData },
      estabelecimentoId: est?.id || null
    },
    include: { itens: true }
  })
  if (metodoPagamento && metodoPagamento !== 'pix') {
    await prisma.pagamento.upsert({
      where: { pedidoId: pedido.id },
      update: { tipo: metodoPagamento, valor: pedido.total, status: 'pendente' },
      create: { pedidoId: pedido.id, tipo: metodoPagamento, valor: pedido.total, status: 'pendente' }
    })
  }
  await logSistema('pedido_criado', `Pedido ${pedido.id} total=${total}`)
  revalidateTag('pedidos')
  return Response.json({ pedido, taxaEntrega })
}
