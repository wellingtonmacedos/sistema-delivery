'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type Produto = { id: string; nome: string; categoria: string; descricao?: string | null; preco: number; ativo: boolean }

export default function LanchoneteProdutos() {
  const [rows, setRows] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  async function carregar() {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/produtos', { cache: 'no-store' })
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
    const s = (p.nome + ' ' + (p.categoria || '')).toLowerCase()
    return s.includes(q.toLowerCase())
  })

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xl font-semibold">Produtos</div>
        <input
          className="border rounded-lg px-3 py-2 w-64"
          placeholder="Buscar"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>
      <div className="rounded-xl shadow bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2">Nome</th>
                <th className="text-left px-4 py-2">Categoria</th>
                <th className="text-left px-4 py-2">Preço</th>
                <th className="text-left px-4 py-2">Ativo</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                filtered.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-2">{p.nome}</td>
                    <td className="px-4 py-2">{p.categoria}</td>
                    <td className="px-4 py-2">R$ {Number(p.preco).toFixed(2)}</td>
                    <td className="px-4 py-2">{p.ativo ? 'Sim' : 'Não'}</td>
                    <td className="px-4 py-2 text-right">
                      <Link href={`/admin/lanchonete/produtos/${p.id}`} className="px-2 py-1 rounded bg-gray-900 text-white">
                        Gerenciar
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {loading && <div className="p-4 text-sm text-gray-600">Carregando...</div>}
        {!loading && filtered.length === 0 && <div className="p-4 text-sm text-gray-600">Nenhum produto</div>}
      </div>
    </div>
  )
}
