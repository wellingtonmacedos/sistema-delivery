'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [session, setSession] = useState<{ email: string; role: string } | null>(null)
  const [est, setEst] = useState<{ nome?: string; slug?: string; perfil?: 'LANCHONETE' | 'ACAITERIA' | 'PIZZARIA' } | null>(null)
  useEffect(() => {
    fetch('/api/admin/session', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.ok) setSession({ email: d.email, role: d.role })
      })
      .catch(() => {})
    fetch('/api/estabelecimento', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.estabelecimento) setEst({ nome: d.estabelecimento.nome, slug: d.estabelecimento.slug, perfil: d.estabelecimento.perfil })
      })
      .catch(() => {})
  }, [])
  const items = (() => {
    const base = [
      { href: '/admin', label: 'Dashboard', icon: '📊' },
      { href: '/admin/pedidos', label: 'Pedidos', icon: '🧾' },
      { href: '/admin/clientes', label: 'Clientes', icon: '👥' },
      { href: '/admin/configuracoes', label: 'Configurações', icon: '⚙️' }
    ]
    if (est?.perfil === 'LANCHONETE') {
      return [{ href: '/admin/produtos', label: 'Produtos', icon: '🛒' }, ...base]
    }
    return base
  })()
  const title = (() => {
    const map: Record<string, string> = {
      '/admin': 'Dashboard',
      '/admin/pedidos': 'Pedidos',
      '/admin/produtos': 'Produtos',
      '/admin/clientes': 'Clientes',
      '/admin/configuracoes': 'Configurações'
    }
    if (pathname.startsWith('/admin/acaiteria')) return 'Açaiteria'
    if (pathname.startsWith('/admin/pizzaria')) return 'Pizzaria'
    return map[pathname] || 'Admin'
  })()
  return (
    <div className="min-h-screen bg-gray-100">
      <aside className={`fixed inset-y-0 left-0 w-60 bg-gray-900 text-white ${open ? '' : 'hidden md:block'}`}>
        <div className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-gray-700" />
          <div>
            <div className="text-sm font-semibold">{est?.nome || 'Estabelecimento'}</div>
            <div className="text-xs text-gray-300">{est?.slug || '—'}</div>
          </div>
        </div>
        <nav className="mt-2">
          {items.map(it => {
            const active = pathname === it.href
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`flex items-center gap-3 px-4 py-2 text-sm transition ${
                  active ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
                onClick={() => setOpen(false)}
              >
                <span>{it.icon}</span>
                <span>{it.label}</span>
              </Link>
            )
          })}
          {est?.perfil === 'ACAITERIA' && (
            <>
              <div className="mt-2 text-xs px-4 text-gray-400">Açaiteria</div>
              <Link
                href="/admin/acaiteria/produtos"
                className={`flex items-center gap-3 px-4 py-2 text-sm transition ${
                  pathname.startsWith('/admin/acaiteria/produtos') ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
                onClick={() => setOpen(false)}
              >
                <span>🛒</span>
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
          {est?.perfil === 'PIZZARIA' && (
            <>
              <div className="mt-2 text-xs px-4 text-gray-400">Pizzaria</div>
              <Link
                href="/admin/pizzaria/tamanhos"
                className={`flex items-center gap-3 px-4 py-2 text-sm transition ${
                  pathname.startsWith('/admin/pizzaria/tamanhos') ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
                onClick={() => setOpen(false)}
              >
                <span>🍕</span>
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
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 text-xs text-gray-400">
          <div>{session?.email || 'admin'}</div>
          <div className="text-gray-500">{session?.role || ''}</div>
        </div>
      </aside>
      <div className="md:pl-60">
        <header className="sticky top-0 z-20 bg-white border-b shadow-sm">
          <div className="h-14 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button className="md:hidden px-2 py-1 rounded bg-gray-100" onClick={() => setOpen(o => !o)}>Menu</button>
              <div className="text-lg font-semibold">{title}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-600">{est?.nome || 'Estabelecimento'}</div>
              <Link href="/admin/login" className="text-sm text-gray-500 hover:text-black">Sair</Link>
            </div>
          </div>
        </header>
        <main className="p-4">{children}</main>
      </div>
    </div>
  )
}
