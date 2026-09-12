import Link from 'next/link'
import { getCurrentAdminWithEstabelecimento } from '@/lib/authAdmin'
import { prisma } from '@/lib/db'
import { safePerfil, perfilLabel } from '@/lib/perfil'

export default async function AdminHome() {
  const ctx = await getCurrentAdminWithEstabelecimento()
  const perfil = safePerfil(ctx?.estabelecimento?.perfil) || 'LANCHONETE'
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
  const perfilLabelText = perfilLabel(ctx?.estabelecimento?.perfil)
  return (
    <main className="min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visão geral</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">Painel Administrativo</div>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              <span>{ctx?.estabelecimento?.nome || '—'}</span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
                {perfilLabelText}
              </span>
            </div>
          </div>
          <div className="flex gap-2 text-xs text-slate-500">
            <span>{new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="group rounded-2xl border border-slate-100 bg-white/60 p-4 shadow-sm shadow-slate-100 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Pedidos hoje</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{pedidosHoje}</div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-lg">
                📦
              </div>
            </div>
          </div>
          <div className="group rounded-2xl border border-slate-100 bg-white/60 p-4 shadow-sm shadow-slate-100 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Faturamento hoje</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{currency.format(faturamentoHoje)}</div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-600 text-lg">
                💰
              </div>
            </div>
          </div>
          <div className="group rounded-2xl border border-slate-100 bg-white/60 p-4 shadow-sm shadow-slate-100 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Produtos ativos</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{produtosAtivos}</div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-lg">
                🛒
              </div>
            </div>
          </div>
          <div className="group rounded-2xl border border-slate-100 bg-white/60 p-4 shadow-sm shadow-slate-100 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Clientes</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{clientes}</div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-50 text-pink-600 text-lg">
                👥
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status dos pedidos (hoje)
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(pedidosPorStatus).map(([s, c]) => {
                const map: Record<string, { label: string; className: string }> = {
                  aberto: { label: 'Aberto', className: 'bg-sky-50 text-sky-700 border-sky-100' },
                  aguardando_pix: { label: 'Aguardando Pix', className: 'bg-amber-50 text-amber-700 border-amber-100' },
                  pago: { label: 'Pago', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                  preparando: { label: 'Preparando', className: 'bg-violet-50 text-violet-700 border-violet-100' },
                  saiu_para_entrega: { label: 'Saiu para entrega', className: 'bg-orange-50 text-orange-700 border-orange-100' },
                  entregue: { label: 'Entregue', className: 'bg-slate-50 text-slate-700 border-slate-100' },
                  cancelado: { label: 'Cancelado', className: 'bg-rose-50 text-rose-700 border-rose-100' }
                }
                const cfg = map[s] || { label: s, className: 'bg-slate-50 text-slate-700 border-slate-100' }
                return (
                  <div
                    key={s}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${cfg.className}`}
                  >
                    <span className="font-medium">{cfg.label}</span>
                    <span className="text-sm font-semibold">{c}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-100">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
              Ações rápidas
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {perfil === 'LANCHONETE' && (
                <>
                  <QuickLink href="/admin/lanchonete/categorias" label="Categorias" icon="🗂️" cor={cor} />
                  <QuickLink href="/admin/lanchonete/produtos" label="Produtos" icon="🛒" cor={cor} />
                  <QuickLink href="/admin/lanchonete/combos" label="Combos" icon="🍱" cor={cor} />
                  <QuickLink href="/admin/pedidos" label="Pedidos" icon="🧾" cor={cor} />
                  <QuickLink href="/admin/clientes" label="Clientes" icon="👥" cor={cor} />
                  <QuickLink href="/admin/configuracoes" label="Configurações" icon="⚙️" cor={cor} />
                  <QuickLink href="/admin/configuracoes/estabelecimento" label="Estabelecimento" icon="🏪" cor={cor} />
                </>
              )}
              {perfil === 'ACAITERIA' && (
                <>
                  <QuickLink href="/admin/acaiteria/produtos" label="Produtos" icon="🍦" cor={cor} />
                  <QuickLink href="/admin/acaiteria/sabores" label="Sabores" icon="🥣" cor={cor} />
                  <QuickLink href="/admin/acaiteria/sorvetes" label="Sorvetes" icon="🍨" cor={cor} />
                  <QuickLink href="/admin/acaiteria/acompanhamentos" label="Acomp." icon="🍪" cor={cor} />
                  <QuickLink href="/admin/acaiteria/coberturas" label="Coberturas" icon="🍫" cor={cor} />
                  <QuickLink href="/admin/acaiteria/complementos" label="Complementos" icon="➕" cor={cor} />
                  <QuickLink href="/admin/pedidos" label="Pedidos" icon="🧾" cor={cor} />
                  <QuickLink href="/admin/clientes" label="Clientes" icon="👥" cor={cor} />
                  <QuickLink href="/admin/configuracoes" label="Configurações" icon="⚙️" cor={cor} />
                  <QuickLink href="/admin/configuracoes/estabelecimento" label="Estabelecimento" icon="🏪" cor={cor} />
                </>
              )}
              {perfil === 'PIZZARIA' && (
                <>
                  <QuickLink href="/admin/pizzaria/tamanhos" label="Tamanhos" icon="🍕" cor={cor} />
                  <QuickLink href="/admin/pizzaria/sabores" label="Sabores" icon="🧀" cor={cor} />
                  <QuickLink href="/admin/pedidos" label="Pedidos" icon="🧾" cor={cor} />
                  <QuickLink href="/admin/clientes" label="Clientes" icon="👥" cor={cor} />
                  <QuickLink href="/admin/configuracoes" label="Configurações" icon="⚙️" cor={cor} />
                  <QuickLink href="/admin/configuracoes/estabelecimento" label="Estabelecimento" icon="🏪" cor={cor} />
                </>
              )}
              {perfil === 'DISTRIBUIDORA' && (
                <>
                  <QuickLink href="/admin/distribuidora/categorias" label="Categorias" icon="🗂️" cor={cor} />
                  <QuickLink href="/admin/distribuidora/produtos" label="Produtos" icon="🛒" cor={cor} />
                  <QuickLink href="/admin/pedidos" label="Pedidos" icon="🧾" cor={cor} />
                  <QuickLink href="/admin/clientes" label="Clientes" icon="👥" cor={cor} />
                  <QuickLink href="/admin/configuracoes" label="Configurações" icon="⚙️" cor={cor} />
                  <QuickLink href="/admin/configuracoes/estabelecimento" label="Estabelecimento" icon="🏪" cor={cor} />
                </>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-100">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
              Visual do chat
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className="h-8 w-8 rounded-full border border-slate-200"
                  style={{ backgroundColor: ctx?.estabelecimento?.corPrimaria || '#22c55e' }}
                />
                <div
                  className="h-8 w-8 rounded-full border border-slate-200"
                  style={{ backgroundColor: ctx?.estabelecimento?.corBot || '#f3f4f6' }}
                />
                <div
                  className="h-8 w-8 rounded-full border border-slate-200"
                  style={{ backgroundColor: ctx?.estabelecimento?.corFundoChat || '#f9fafb' }}
                />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
                <div className="mb-1 h-2 w-16 rounded-full bg-slate-300" />
                <div className="h-6 w-32 rounded-2xl bg-white shadow-sm shadow-slate-200" />
              </div>
              <Link
                className="inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-medium text-white shadow-sm"
                href="/admin/configuracoes/chat"
                style={{ backgroundColor: cor }}
              >
                Ajustar visual do chat
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function QuickLink({ href, label, icon, cor }: { href: string; label: string; icon: string; cor: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-start gap-1 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-left shadow-sm shadow-slate-100 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-sm">
        {icon}
      </span>
      <span className="text-[11px] font-medium text-slate-700 group-hover:text-slate-900">{label}</span>
      <span
        className="mt-0.5 h-0.5 w-8 rounded-full opacity-0 transition group-hover:opacity-100"
        style={{ backgroundColor: cor }}
      />
    </Link>
  )
}
