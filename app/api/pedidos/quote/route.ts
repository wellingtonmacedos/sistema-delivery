import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { FormaEntrega } from '@prisma/client'
import { PedidoCreateSchema } from '@/lib/validate'
import { rateLimit, keyFromRequestHeaders } from '@/lib/rateLimit'
import { resolveTenant } from '@/lib/tenant'
const fallback = [
  { id: 'x-burger', nome: 'X-Burger', preco: 18.9, categoria: 'Lanches', ativo: true },
  { id: 'x-salada', nome: 'X-Salada', preco: 20.9, categoria: 'Lanches', ativo: true },
  { id: 'batata', nome: 'Batata Frita', preco: 16.0, categoria: 'Porções', ativo: true },
  { id: 'refri', nome: 'Refrigerante Lata', preco: 6.0, categoria: 'Bebidas', ativo: true },
  { id: 'pudim', nome: 'Pudim', preco: 8.0, categoria: 'Sobremesas', ativo: true }
]

export async function POST(req: NextRequest) {
  const key = 'pedidos:quote:' + keyFromRequestHeaders(req.headers)
  if (!rateLimit(key, 60, 60_000)) return Response.json({ error: 'rate limit' }, { status: 429 })
  const body = await req.json()
  const parsed = PedidoCreateSchema.pick({
    clienteTelefone: true,
    itens: true,
    formaEntrega: true
  }).safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const { itens, formaEntrega } = parsed.data
  try {
    const est = await resolveTenant(req)
    const produtos = await prisma.produto.findMany({
      where: { id: { in: itens.map(i => i.produtoId) }, ativo: true, estabelecimentoId: est?.id || undefined }
    })
    if (produtos.length !== itens.length) {
      return Response.json({ error: 'produto inválido' }, { status: 400 })
    }
    const perfil = est?.perfil || 'LANCHONETE'
    const itensData = []
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
      itensData.push({ produtoId: p.id, quantidade: i.quantidade, subtotal })
    }
    const totalItens = itensData.reduce((acc, cur) => acc + cur.subtotal, 0)
    const config = await prisma.configuracao.findUnique({ where: { id: 1 } })
    const taxaEntrega = formaEntrega === FormaEntrega.entrega ? Number(config?.taxaEntrega || 0) : 0
    const total = totalItens + taxaEntrega
    if (total <= 0) return Response.json({ error: 'pedido com valor zero' }, { status: 400 })
    return Response.json({ total, taxaEntrega })
  } catch {
    const itensData = itens.map(i => {
      const p = fallback.find(pp => pp.id === i.produtoId && pp.ativo)
      if (!p) return { subtotal: 0, quantidade: 0 }
      const subtotal = Number(p.preco) * i.quantidade
      return { subtotal, quantidade: i.quantidade }
    })
    const totalItens = itensData.reduce((acc, cur) => acc + cur.subtotal, 0)
    const taxaEntrega = formaEntrega === FormaEntrega.entrega ? 0 : 0
    const total = totalItens + taxaEntrega
    if (total <= 0) return Response.json({ error: 'pedido com valor zero' }, { status: 400 })
    return Response.json({ total, taxaEntrega })
  }
}
