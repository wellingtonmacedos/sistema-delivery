'use client'
import { useEffect, useState } from 'react'

type Cliente = {
  id: string
  nome: string
  telefone: string
}

export default function AdminClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)

  async function carregar() {
    try {
      const res = await fetch('/api/clientes/list')
      const data = await res.json()
      setClientes(data.clientes || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  return (
    <main className="p-2 md:p-4">
      <div className="text-xl font-semibold mb-3">Clientes</div>
      {loading ? (
        <div className="grid gap-2">
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
        </div>
      ) : clientes.length === 0 ? (
        <div className="text-sm text-gray-600">Nenhum cliente encontrado.</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl shadow">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left">
                <th className="py-2 px-2">Nome</th>
                <th className="py-2 px-2">Telefone</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map(c => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-2">{c.nome}</td>
                  <td className="py-2 px-2">{c.telefone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
