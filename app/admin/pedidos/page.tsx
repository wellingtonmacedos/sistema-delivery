'use client'
import { useEffect, useState } from 'react'

type Pedido = {
  id: string
  status: string
  total: number
  cliente: { nome: string; telefone: string }
}

const statuses = [
  'aberto',
  'aguardando_pix',
  'pago',
  'preparando',
  'saiu_para_entrega',
  'entregue',
  'cancelado'
]

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)

  async function carregar() {
    try {
      const res = await fetch('/api/pedidos')
      const data = await res.json()
      setPedidos(data.pedidos || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
    const t = setInterval(carregar, 5000)
    return () => clearInterval(t)
  }, [])

  async function alterarStatus(id: string, status: string) {
    await fetch('/api/pedidos/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    await carregar()
  }

  function badgeClass(s: string) {
    if (s === 'pago') return 'bg-green-100 text-green-700'
    if (s === 'aguardando_pix') return 'bg-yellow-100 text-yellow-700'
    if (s === 'cancelado') return 'bg-red-100 text-red-700'
    if (s === 'preparando') return 'bg-blue-100 text-blue-700'
    if (s === 'saiu_para_entrega') return 'bg-purple-100 text-purple-700'
    if (s === 'entregue') return 'bg-emerald-100 text-emerald-700'
    return 'bg-gray-100 text-gray-700'
  }
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  return (
    <main className="p-2 md:p-4">
      <div className="text-xl font-semibold mb-3">Pedidos</div>
      {loading ? (
        <div className="grid gap-2">
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
        </div>
      ) : pedidos.length === 0 ? (
        <div className="text-sm text-gray-600">
          Nenhum pedido encontrado ainda. Assim que chegar o primeiro, ele aparecerá aqui.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl shadow">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left">
                <th className="py-2 px-2">Cliente</th>
                <th className="py-2 px-2">Telefone</th>
                <th className="py-2 px-2">Total</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map(p => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-2">{p.cliente?.nome}</td>
                  <td className="py-2 px-2">{p.cliente?.telefone}</td>
                  <td className="py-2 px-2">{currency.format(Number(p.total || 0))}</td>
                  <td className="py-2 px-2">
                    <span className={`px-2 py-1 rounded ${badgeClass(p.status)}`}>{p.status}</span>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex flex-wrap gap-2">
                      {statuses.map(s => (
                        <button
                          key={s}
                          onClick={() => alterarStatus(p.id, s)}
                          disabled={p.status === s}
                          className="px-2 py-1 rounded border text-xs hover:bg-gray-100 disabled:opacity-50"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
