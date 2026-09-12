'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [session, setSession] = useState<{ email: string; role: string } | null>(null)
  const [est, setEst] = useState<{ nome?: string; slug?: string; perfil?: 'LANCHONETE' | 'ACAITERIA' | 'PIZZARIA' | 'DISTRIBUIDORA' } | null>(null)
  useEffect(() => {
    if (pathname === '/admin/login') return
    fetch('/api/admin/session', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.ok) setSession({ email: d.email, role: d.role })
      })
      .catch(() => {})
    fetch('/api/admin/configuracoes/estabelecimento', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.estabelecimento)
          setEst({
            nome: d.estabelecimento.nome,
            slug: d.estabelecimento.slug,
            perfil: d.estabelecimento.perfil
          })
      })
      .catch(() => {})
  }, [pathname])

  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  async function fazerLogout() {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {}
    router.push('/admin/login')
    router.refresh()
  }
  const items = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/pedidos', label: 'Pedidos', icon: '🧾' },
    { href: '/admin/clientes', label: 'Clientes', icon: '👥' },
    { href: '/admin/cupons', label: 'Cupons', icon: '🎟️' },
    { href: '/admin/configuracoes', label: 'Configurações gerais', icon: '⚙️' },
    { href: '/admin/configuracoes/chat', label: 'Chatbot', icon: '💬' },
    { href: '/admin/configuracoes/estabelecimento', label: 'Estabelecimento', icon: '🏪' }
  ]
  const title = (() => {
    const map: Record<string, string> = {
      '/admin': 'Dashboard',
      '/admin/pedidos': 'Pedidos',
      '/admin/produtos': 'Produtos',
      '/admin/clientes': 'Clientes',
      '/admin/cupons': 'Cupons',
      '/admin/configuracoes': 'Configurações',
      '/admin/configuracoes/chat': 'Configurações do Chat',
      '/admin/configuracoes/estabelecimento': 'Estabelecimento'
    }
    if (pathname.startsWith('/admin/acaiteria')) return 'Açaiteria'
    if (pathname.startsWith('/admin/pizzaria')) return 'Pizzaria'
    if (pathname.startsWith('/admin/distribuidora')) return 'Distribuidora'
    return map[pathname] || 'Admin'
  })()
  const perfilLabel =
    est?.perfil === 'ACAITERIA'
      ? 'Açaiteria'
      : est?.perfil === 'PIZZARIA'
      ? 'Pizzaria'
      : est?.perfil === 'DISTRIBUIDORA'
      ? 'Distribuidora'
      : 'Lanchonete'
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white shadow-xl ${
          open ? '' : 'hidden md:flex'
        } flex-col`}
      >
        <div className="px-5 py-4 flex items-center gap-3 border-b border-white/5">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-sm font-semibold">
            {(est?.nome || 'E')[0]?.toUpperCase()}
          </div>
          <div className="flex flex-col">
            <div className="text-sm font-semibold truncate">{est?.nome || 'Estabelecimento'}</div>
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <span className="truncate">{est?.slug || '—'}</span>
              {est?.perfil && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/10 text-gray-100 border border-white/10">
                  {perfilLabel}
                </span>
              )}
            </div>
          </div>
        </div>
        <nav className="mt-3 flex-1 overflow-y-auto pb-16">
          {items.map(it => {
            const active = pathname === it.href
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`group relative flex items-center gap-3 px-5 py-2.5 text-sm transition-all ${
                  active
                    ? 'bg-white/5 text-white'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
                onClick={() => setOpen(false)}
              >
                {active && <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-emerald-400" />}
                <span className="text-lg">{it.icon}</span>
                <span>{it.label}</span>
              </Link>
            )
          })}
          {est?.perfil === 'ACAITERIA' && (
            <>
              <div className="mt-4 mb-1 text-[11px] px-5 text-gray-400 uppercase tracking-wide">
                Açaiteria
              </div>
              <Link
                href="/admin/acaiteria/produtos"
                className={`group relative flex items-center gap-3 px-5 py-2.5 text-sm transition-all ${
                  pathname.startsWith('/admin/acaiteria/produtos')
                    ? 'bg-white/5 text-white'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
                onClick={() => setOpen(false)}
              >
                {pathname.startsWith('/admin/acaiteria/produtos') && (
                  <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-emerald-400" />
                )}
                <span className="text-lg">🛒</span>
                <span>Produtos</span>
              </Link>
              <Link
                href="/admin/acaiteria/sabores"
                className={`flex items-center gap-3 px-4 py-2 text-sm transition ${
                  pathname.startsWith('/admin/acaiteria/sabores') ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
                onClick={() => setOpen(false)}
              >
                <span>🥤</span>
                <span>Sabores</span>
              </Link>
              <Link
                href="/admin/acaiteria/sorvetes"
                className={`flex items-center gap-3 px-4 py-2 text-sm transition ${
                  pathname.startsWith('/admin/acaiteria/sorvetes') ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
                onClick={() => setOpen(false)}
              >
                <span>🍨</span>
                <span>Sorvetes</span>
              </Link>
              <Link
                href="/admin/acaiteria/acompanhamentos"
                className={`flex items-center gap-3 px-4 py-2 text-sm transition ${
                  pathname.startsWith('/admin/acaiteria/acompanhamentos') ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
                onClick={() => setOpen(false)}
              >
                <span>🍪</span>
                <span>Acompanhamentos</span>
              </Link>
              <Link
                href="/admin/acaiteria/coberturas"
                className={`flex items-center gap-3 px-4 py-2 text-sm transition ${
                  pathname.startsWith('/admin/acaiteria/coberturas') ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
                onClick={() => setOpen(false)}
              >
                <span>🍫</span>
                <span>Coberturas</span>
              </Link>
              <Link
                href="/admin/acaiteria/complementos"
                className={`flex items-center gap-3 px-4 py-2 text-sm transition ${
                  pathname.startsWith('/admin/acaiteria/complementos') ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
                onClick={() => setOpen(false)}
              >
                <span>➕</span>
                <span>Complementos</span>
              </Link>
            </>
          )}
          {est?.perfil === 'LANCHONETE' && (
            <>
              <div className="mt-4 mb-1 text-[11px] px-5 text-gray-400 uppercase tracking-wide">
                Lanchonete
              </div>
              <Link
                href="/admin/lanchonete/categorias"
                className={`group relative flex items-center gap-3 px-5 py-2.5 text-sm transition-all ${
                  pathname.startsWith('/admin/lanchonete/categorias')
                    ? 'bg-white/5 text-white'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
                onClick={() => setOpen(false)}
              >
                {pathname.startsWith('/admin/lanchonete/categorias') && (
                  <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-emerald-400" />
                )}
                <span className="text-lg">🗂️</span>
                <span>Categorias</span>
              </Link>
              <Link
                href="/admin/lanchonete/produtos"
                className={`flex items-center gap-3 px-4 py-2 text-sm transition ${
                  pathname.startsWith('/admin/lanchonete/produtos') ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
                onClick={() => setOpen(false)}
              >
                <span>🛒</span>
                <span>Produtos</span>
              </Link>
              <Link
                href="/admin/lanchonete/combos"
                className={`flex items-center gap-3 px-4 py-2 text-sm transition ${
                  pathname.startsWith('/admin/lanchonete/combos') ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
                onClick={() => setOpen(false)}
              >
                <span>🍱</span>
                <span>Combos</span>
              </Link>
            </>
          )}
          {est?.perfil === 'PIZZARIA' && (
            <>
              <div className="mt-4 mb-1 text-[11px] px-5 text-gray-400 uppercase tracking-wide">
                Pizzaria
              </div>
              <Link
                href="/admin/pizzaria/tamanhos"
                className={`group relative flex items-center gap-3 px-5 py-2.5 text-sm transition-all ${
                  pathname.startsWith('/admin/pizzaria/tamanhos')
                    ? 'bg-white/5 text-white'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
                onClick={() => setOpen(false)}
              >
                {pathname.startsWith('/admin/pizzaria/tamanhos') && (
                  <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-emerald-400" />
                )}
                <span className="text-lg">🍕</span>
                <span>Tamanhos</span>
              </Link>
              <Link
                href="/admin/pizzaria/sabores"
                className={`flex items-center gap-3 px-4 py-2 text-sm transition ${
                  pathname.startsWith('/admin/pizzaria/sabores') ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
                onClick={() => setOpen(false)}
              >
                <span>🧀</span>
                <span>Sabores</span>
              </Link>
            </>
          )}
          {est?.perfil === 'DISTRIBUIDORA' && (
            <>
              <div className="mt-4 mb-1 text-[11px] px-5 text-gray-400 uppercase tracking-wide">
                Distribuidora
              </div>
              <Link
                href="/admin/distribuidora/categorias"
                className={`group relative flex items-center gap-3 px-5 py-2.5 text-sm transition-all ${
                  pathname.startsWith('/admin/distribuidora/categorias')
                    ? 'bg-white/5 text-white'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
                onClick={() => setOpen(false)}
              >
                {pathname.startsWith('/admin/distribuidora/categorias') && (
                  <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-emerald-400" />
                )}
                <span className="text-lg">🗂️</span>
                <span>Categorias</span>
              </Link>
              <Link
                href="/admin/distribuidora/produtos"
                className={`group relative flex items-center gap-3 px-5 py-2.5 text-sm transition-all ${
                  pathname.startsWith('/admin/distribuidora/produtos')
                    ? 'bg-white/5 text-white'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
                onClick={() => setOpen(false)}
              >
                {pathname.startsWith('/admin/distribuidora/produtos') && (
                  <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-emerald-400" />
                )}
                <span className="text-lg">🛒</span>
                <span>Produtos</span>
              </Link>
            </>
          )}
        </nav>
        <div className="mt-auto px-5 py-4 text-xs text-gray-400 border-t border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-200">{session?.email || 'admin'}</div>
              <div className="text-[11px] text-gray-500">{session?.role || ''}</div>
            </div>
            <button
              onClick={fazerLogout}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-gray-100 hover:bg-white/10 transition"
            >
              <span>⏏</span>
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="h-14 px-4 md:px-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                className="md:hidden inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm hover:bg-slate-50 transition"
                onClick={() => setOpen(o => !o)}
              >
                ☰
              </button>
              <div className="flex flex-col">
                <div className="text-sm font-semibold text-slate-900">{title}</div>
                {est?.nome && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="truncate max-w-[180px]">{est.nome}</span>
                    {est?.perfil && (
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px]">
                        {perfilLabel.toUpperCase()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {session && (
              <div className="hidden md:flex items-center gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-medium text-slate-700">
                    {session.email[0]?.toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">{session.email}</span>
                    <span className="text-[11px] capitalize">{session.role.toLowerCase()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
