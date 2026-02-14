import Link from 'next/link'
import { getCurrentAdminWithEstabelecimento } from '@/lib/authAdmin'
import { prisma } from '@/lib/db'

export default async function AdminHome() {
  const ctx = await getCurrentAdminWithEstabelecimento()
  const perfil = ctx?.estabelecimento?.perfil || 'LANCHONETE'
  const estId = ctx?.estabelecimento?.id || null
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  let pedidosHoje = 0
  let faturamentoHoje = 0
  let produtosAtivos = 0
  let clientes = 0
  let pedidosPorStatus: Record<string, number> = {}
  if (estId) {
    pedidosHoje = await prisma.pedido.count({ where: { estabelecimentoId: estId, createdAt: { gte: start, lte: end } } })
    const sum = await prisma.pedido.aggregate({
      where: { estabelecimentoId: estId, createdAt: { gte: start, lte: end } },
      _sum: { total: true }
    })
    faturamentoHoje = Number(sum._sum.total || 0)
    produtosAtivos = await prisma.produto.count({ where: { estabelecimentoId: estId, ativo: true } })
    clientes = await prisma.cliente.count({ where: { estabelecimentoId: estId } })
    const statuses = ['aberto', 'aguardando_pix', 'pago', 'preparando', 'saiu_para_entrega', 'entregue', 'cancelado']
    for (const s of statuses) {
      const c = await prisma.pedido.count({ where: { estabelecimentoId: estId, status: s as any, createdAt: { gte: start, lte: end } } })
      pedidosPorStatus[s] = c
    }
  }
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  const cor = ctx?.estabelecimento?.corPrimaria || '#111827'
  return (
    <main className="min-h-screen p-6" style={{ backgroundColor: '#f7f7f7' }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="text-2xl font-semibold">Painel Administrativo</div>
          <div className="text-sm text-gray-600">Estabelecimento: {ctx?.estabelecimento?.nome || '—'} ({perfil})</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl shadow bg-white p-4">
            <div className="text-sm text-gray-500">Pedidos Hoje</div>
            <div className="text-2xl font-semibold">{pedidosHoje}</div>
          </div>
          <div className="rounded-xl shadow bg-white p-4">
            <div className="text-sm text-gray-500">Faturamento Hoje</div>
            <div className="text-2xl font-semibold">{currency.format(faturamentoHoje)}</div>
          </div>
          <div className="rounded-xl shadow bg-white p-4">
            <div className="text-sm text-gray-500">Produtos Ativos</div>
            <div className="text-2xl font-semibold">{produtosAtivos}</div>
          </div>
          <div className="rounded-xl shadow bg-white p-4">
            <div className="text-sm text-gray-500">Clientes</div>
            <div className="text-2xl font-semibold">{clientes}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="rounded-xl shadow bg-white p-4">
            <div className="text-sm font-medium mb-2">Status dos Pedidos (Hoje)</div>
            <ul className="text-sm">
              {Object.entries(pedidosPorStatus).map(([s, c]) => (
                <li key={s} className="flex justify-between py-1">
                  <span>{s}</span>
                  <span className="font-medium">{c}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl shadow bg-white p-4">
            <div className="text-sm font-medium mb-2">Ações Rápidas</div>
            {perfil === 'LANCHONETE' && (
              <div className="grid gap-2">
                <Link className="px-3 py-2 rounded-lg text-white" href="/admin/produtos" style={{ backgroundColor: cor }}>Produtos</Link>
                <Link className="px-3 py-2 rounded-lg text-white" href="/admin/pedidos" style={{ backgroundColor: cor }}>Pedidos</Link>
                <Link className="px-3 py-2 rounded-lg text-white" href="/admin/clientes" style={{ backgroundColor: cor }}>Clientes</Link>
                <Link className="px-3 py-2 rounded-lg text-white" href="/admin/configuracoes" style={{ backgroundColor: cor }}>Configurações</Link>
              </div>
            )}
            {perfil === 'ACAITERIA' && (
              <div className="grid gap-2">
                <Link className="px-3 py-2 rounded-lg text-white" href="/admin/acaiteria/produtos" style={{ backgroundColor: cor }}>Produtos</Link>
                <Link className="px-3 py-2 rounded-lg text-white" href="/admin/acaiteria/sabores" style={{ backgroundColor: cor }}>Sabores</Link>
                <Link className="px-3 py-2 rounded-lg text-white" href="/admin/acaiteria/sorvetes" style={{ backgroundColor: cor }}>Sorvetes</Link>
                <Link className="px-3 py-2 rounded-lg text-white" href="/admin/acaiteria/acompanhamentos" style={{ backgroundColor: cor }}>Acompanhamentos</Link>
                <Link className="px-3 py-2 rounded-lg text-white" href="/admin/acaiteria/coberturas" style={{ backgroundColor: cor }}>Coberturas</Link>
                <Link className="px-3 py-2 rounded-lg text-white" href="/admin/acaiteria/complementos" style={{ backgroundColor: cor }}>Complementos</Link>
                <Link className="px-3 py-2 rounded-lg text-white" href="/admin/pedidos" style={{ backgroundColor: cor }}>Pedidos</Link>
                <Link className="px-3 py-2 rounded-lg text-white" href="/admin/clientes" style={{ backgroundColor: cor }}>Clientes</Link>
                <Link className="px-3 py-2 rounded-lg text-white" href="/admin/configuracoes" style={{ backgroundColor: cor }}>Configurações</Link>
              </div>
            )}
            {perfil === 'PIZZARIA' && (
              <div className="grid gap-2">
                <Link className="px-3 py-2 rounded-lg text-white" href="/admin/pizzaria/tamanhos" style={{ backgroundColor: cor }}>Tamanhos</Link>
                <Link className="px-3 py-2 rounded-lg text-white" href="/admin/pizzaria/sabores" style={{ backgroundColor: cor }}>Sabores</Link>
                <Link className="px-3 py-2 rounded-lg text-white" href="/admin/pedidos" style={{ backgroundColor: cor }}>Pedidos</Link>
                <Link className="px-3 py-2 rounded-lg text-white" href="/admin/clientes" style={{ backgroundColor: cor }}>Clientes</Link>
                <Link className="px-3 py-2 rounded-lg text-white" href="/admin/configuracoes" style={{ backgroundColor: cor }}>Configurações</Link>
              </div>
            )}
          </div>
          <div className="rounded-xl shadow bg-white p-4">
            <div className="text-sm font-medium mb-2">Configurações Visuais</div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded" style={{ backgroundColor: ctx?.estabelecimento?.corPrimaria || '#22c55e' }} />
              <div className="w-10 h-10 rounded" style={{ backgroundColor: ctx?.estabelecimento?.corBot || '#f3f4f6' }} />
              <div className="w-10 h-10 rounded" style={{ backgroundColor: ctx?.estabelecimento?.corFundoChat || '#f9fafb' }} />
            </div>
            <div className="mt-3">
              <Link className="px-3 py-2 rounded-lg text-white" href="/admin/configuracoes/chat" style={{ backgroundColor: cor }}>
                Ajustar Visual do Chat
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
