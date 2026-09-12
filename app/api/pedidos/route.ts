import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { StatusPedido, FormaEntrega } from '@prisma/client'
import { PedidoCreateSchema } from '@/lib/validate'
import { rateLimit, keyFromRequestHeaders } from '@/lib/rateLimit'
import { logSistema } from '@/lib/log'
import { revalidateTag } from 'next/cache'
import { resolveTenant, safePerfil } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const telefone = (searchParams.get('telefone') || '').trim()
  const limit = Math.min(Number(searchParams.get('limit') || 5), 20)
  const ultimo = ['1', 'true', 'yes'].includes(String(searchParams.get('ultimo') || '').toLowerCase())
  const est = await resolveTenant(req)
  // Modo compatível com o painel: sem telefone => retornar listagem completa (como antes)
  if (!telefone) {
    const pedidos = await prisma.pedido.findMany({
      where: est?.id ? { estabelecimentoId: est.id } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        itens: {
          select: {
            id: true,
            quantidade: true,
            subtotal: true,
            produtoId: true,
            adicionais: true,
            observacoes: true,
            produto: { select: { id: true, nome: true, fotoUrl: true, categoria: true } }
          }
        },
        cliente: { select: { nome: true, telefone: true } },
        pagamento: { select: { status: true, txid: true, tipo: true } },
        cupom: { select: { codigo: true } }
      }
    })
    return Response.json({ pedidos })
  }
  // Filtro por telefone: usado pelo chat em "Meus Pedidos"
  const where: any = {}
  const cliente = await prisma.cliente.findFirst({
    where: { telefone, estabelecimentoId: est?.id || undefined }
  })
  if (cliente) {
    where.clienteId = cliente.id
  } else {
    const clienteGlobal = await prisma.cliente.findFirst({ where: { telefone } })
    if (clienteGlobal) where.clienteId = clienteGlobal.id
    else return Response.json({ pedidos: [] })
  }
  if (est?.id) where.estabelecimentoId = est.id
  if (ultimo) {
    const pedido = await prisma.pedido.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        itens: {
          select: {
            id: true,
            quantidade: true,
            subtotal: true,
            produtoId: true,
            adicionais: true,
            observacoes: true,
            produto: {
              select: {
                id: true,
                nome: true,
                descricao: true,
                preco: true,
                categoria: true,
                fotoUrl: true,
                adicionais: true,
                maxSabores: true,
                maxSorvetes: true,
                maxAcompanhamentos: true,
                maxCoberturas: true
              }
            }
          }
        },
        cliente: { select: { nome: true, telefone: true } },
        pagamento: { select: { status: true, txid: true, tipo: true } },
        cupom: { select: { codigo: true } }
      }
    })
    return Response.json({ pedido })
  }
  const pedidos = await prisma.pedido.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      itens: {
        select: {
          id: true,
          quantidade: true,
          subtotal: true,
          produtoId: true,
          adicionais: true,
          observacoes: true,
          produto: { select: { id: true, nome: true, fotoUrl: true, categoria: true } }
        }
      },
      cliente: { select: { nome: true, telefone: true } },
      pagamento: { select: { status: true, txid: true, tipo: true } },
      cupom: { select: { codigo: true } }
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
  const cupomCodigo: string = (body?.cupomCodigo ? String(body.cupomCodigo).trim().toUpperCase() : '') || ''
  const est = await resolveTenant(req)
  let cliente = await prisma.cliente.findFirst({
    where: { telefone: clienteTelefone, estabelecimentoId: est?.id || undefined }
  })
  if (!cliente) {
    cliente = await prisma.cliente.findFirst({ where: { telefone: clienteTelefone } })
  }
  if (!cliente) {
    return Response.json({ error: 'cliente não encontrado' }, { status: 404 })
  }
  const estId = est?.id || (cliente.estabelecimentoId as string | null) || null
  let produtos = await prisma.produto.findMany({
    where: { id: { in: itens.map((i: any) => i.produtoId) }, ativo: true, estabelecimentoId: estId || undefined }
  })
  if (produtos.length !== itens.length) {
    produtos = await prisma.produto.findMany({
      where: { id: { in: itens.map((i: any) => i.produtoId) }, ativo: true }
    })
    if (produtos.length !== itens.length) {
      return Response.json({ error: 'produto inválido' }, { status: 400 })
    }
  }
  const perfil = safePerfil(est?.perfil) || 'LANCHONETE'
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
    if (perfil === 'DISTRIBUIDORA' && i.adicionais?.tipoCompra === 'embalagem' && p.precoEmbalagem != null) {
      base = Number(p.precoEmbalagem)
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
  let cupomId: string | null = null
  if (cupomCodigo && estId) {
    const now = new Date()
    const cupom = await prisma.cupom.findFirst({
      where: {
        estabelecimentoId: estId,
        codigo: cupomCodigo,
        ativo: true,
        dataInicio: { lte: now },
        dataFim: { gte: now }
      }
    })
    if (cupom) {
      const totalUsos = await prisma.cupomUso.count({ where: { cupomId: cupom.id } })
      const limiteTotalOk = cupom.limiteTotalUso == null || totalUsos < cupom.limiteTotalUso
      if (limiteTotalOk && (cupom.valorMinimoPedido == null || totalItens >= Number(cupom.valorMinimoPedido))) {
        if (cupom.tipo === 'PERCENTUAL') desconto = (totalItens + taxaEntrega) * (Number(cupom.valor) / 100)
        else if (cupom.tipo === 'VALOR_FIXO') desconto = Number(cupom.valor)
        else if (cupom.tipo === 'FRETE_GRATIS') desconto = taxaEntrega
        cupomId = cupom.id
      }
    }
  }
  if (desconto < 0) desconto = 0
  const total = Math.max(0, totalItens + taxaEntrega - desconto)
  if (total <= 0) {
    return Response.json({ error: 'pedido com valor zero' }, { status: 400 })
  }
  const pedido = await prisma.pedido.create({
    data: {
      clienteId: cliente.id,
      status: metodoPagamento && metodoPagamento !== 'pix' ? StatusPedido.preparando : StatusPedido.aberto,
      total,
      valorDesconto: desconto || null,
      formaEntrega,
      enderecoEntrega,
      itens: { create: itensData },
      estabelecimentoId: estId,
      cupomId: cupomId || null
    },
    include: { itens: true }
  })
  if (formaEntrega === FormaEntrega.entrega && enderecoEntrega) {
    try {
      const current: any = cliente.enderecos as any
      let lista: any[] = []
      if (Array.isArray(current)) lista = [...current]
      else if (current && typeof current === 'object') lista = [current]
      const base = {
        rua: String((enderecoEntrega as any).rua || '').trim(),
        numero: String((enderecoEntrega as any).numero || '').trim(),
        bairro: String((enderecoEntrega as any).bairro || '').trim(),
        complemento: (enderecoEntrega as any).complemento
          ? String((enderecoEntrega as any).complemento).trim()
          : undefined,
        referencia: (enderecoEntrega as any).referencia
          ? String((enderecoEntrega as any).referencia).trim()
          : undefined
      }
      if (base.rua && base.numero && base.bairro) {
        const exists = lista.some(
          e => e && e.rua === base.rua && e.numero === base.numero && e.bairro === base.bairro
        )
        if (!exists) {
          for (const e of lista) {
            if (e && typeof e === 'object') (e as any).padrao = false
          }
          const novo = { ...base, padrao: true }
          lista = [novo, ...lista]
          await prisma.cliente.update({
            where: { id: cliente.id },
            data: { enderecos: lista }
          })
        }
      }
    } catch {}
  }
  if (cupomId) {
    await prisma.cupomUso.create({
      data: { cupomId, clienteId: cliente.id, pedidoId: pedido.id }
    })
  }
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
