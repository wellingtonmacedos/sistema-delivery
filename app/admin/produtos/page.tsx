'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Perfil = 'LANCHONETE' | 'ACAITERIA' | 'PIZZARIA' | 'DISTRIBUIDORA'

export default function AdminProdutosRedirect() {
  const router = useRouter()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function carregar() {
      try {
        const r = await fetch('/api/admin/configuracoes/estabelecimento', { credentials: 'include' })
        if (!r.ok) {
          if (!cancelled) setErro('Sessão expirada. Faça login novamente.')
          return
        }
        const d = await r.json()
        const p: Perfil = d?.estabelecimento?.perfil || 'LANCHONETE'
        if (!cancelled) setPerfil(p)
        const rota =
          p === 'LANCHONETE'
            ? '/admin/lanchonete/produtos'
            : p === 'ACAITERIA'
            ? '/admin/acaiteria/produtos'
            : p === 'PIZZARIA'
            ? '/admin/lanchonete/produtos'
            : p === 'DISTRIBUIDORA'
            ? '/admin/distribuidora/produtos'
            : '/admin/lanchonete/produtos'
        if (!cancelled) router.replace(rota)
      } catch (e: any) {
        if (!cancelled) setErro('Não foi possível carregar o perfil. Tente novamente.')
      }
    }
    carregar()
    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <main className="p-4 md:p-8 max-w-xl mx-auto">
      <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6 space-y-3">
        <div className="text-sm text-slate-600">
          {erro ? (
            <>
              <div className="text-red-700 font-medium">{erro}</div>
              <div className="mt-2 flex gap-2">
                <Link href="/admin/login" className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm">
                  Ir para Login
                </Link>
                <Link href="/admin" className="px-3 py-1.5 rounded-lg border text-sm">
                  Voltar ao Dashboard
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="font-medium text-slate-900">Redirecionando para a página de Produtos do perfil {perfil || '…'}…</div>
              <div className="text-xs text-slate-500">
                Cada perfil do estabelecimento tem sua própria página de produtos.
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full w-1/2 animate-pulse bg-emerald-500" />
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
