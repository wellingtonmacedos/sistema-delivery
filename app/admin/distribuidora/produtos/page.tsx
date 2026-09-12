'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type Produto = {
  id: string
  nome: string
  categoria: string
  marca?: string | null
  unidade?: string | null
  preco: number
  qtdPorEmbalagem?: number | null
  precoEmbalagem?: number | null
  ativo: boolean
  fotoUrl?: string | null
}

const currency = (n: number | null | undefined) =>
  Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function DistribuidoraProdutos() {
  const [rows, setRows] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  async function carregar() {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/produtos', { cache: 'no-store', credentials: 'include' })
      const d = await r.json()
      setRows(d.produtos || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const filtered = rows.filter(p => {
    const s = (
      p.nome +
      ' ' +
      (p.categoria || '') +
      ' ' +
      (p.marca || '') +
      ' ' +
      (p.unidade || '')
    ).toLowerCase()
    return s.includes(q.toLowerCase())
  })

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="text-xl font-semibold">Produtos · Distribuidora</div>
        <div className="flex items-center gap-2">
          <input
            className="border rounded-lg px-3 py-2 w-64"
            placeholder="Buscar por nome, marca, categoria..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <Link
            href="/admin/distribuidora/produtos/novo"
            className="px-3 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700"
          >
            + Novo Produto
          </Link>
        </div>
      </div>
      <div className="rounded-xl shadow bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 w-12">Foto</th>
                <th className="text-left px-3 py-2">Nome</th>
                <th className="text-left px-3 py-2">Marca</th>
                <th className="text-left px-3 py-2">Categoria</th>
                <th className="text-left px-3 py-2">Unidade</th>
                <th className="text-right px-3 py-2">Preço Un.</th>
                <th className="text-right px-3 py-2">Preço Emb.</th>
                <th className="text-left px-3 py-2">Ativo</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                filtered.map(p => (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2">
                      {p.fotoUrl ? (
                        <img src={p.fotoUrl} alt="" className="w-10 h-10 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
                          —
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium">{p.nome}</td>
                    <td className="px-3 py-2">{p.marca || '—'}</td>
                    <td className="px-3 py-2">{p.categoria}</td>
                    <td className="px-3 py-2">{p.unidade || '—'}</td>
                    <td className="px-3 py-2 text-right">{currency(p.preco)}</td>
                    <td className="px-3 py-2 text-right">
                      {p.precoEmbalagem != null ? (
                        <div>
                          <div>{currency(p.precoEmbalagem)}</div>
                          {p.qtdPorEmbalagem ? (
                            <div className="text-[10px] text-gray-500">
                              {p.qtdPorEmbalagem} un/emb
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-1 rounded text-[11px] ${
                          p.ativo
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/admin/distribuidora/produtos/${p.id}`}
                        className="px-3 py-1 rounded bg-gray-900 text-white text-xs hover:bg-gray-800"
                      >
                        Gerenciar
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {loading && <div className="p-4 text-sm text-gray-600 text-center">Carregando...</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-8 text-sm text-gray-500 text-center">
            Nenhum produto cadastrado. Clique em "Novo Produto".
          </div>
        )}
      </div>
    </div>
  )
}
