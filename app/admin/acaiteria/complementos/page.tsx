'use client'
import { useEffect, useState } from 'react'

type Row = { id: string; nome: string; valorAdicional: number; ativo: boolean }

export default function ComplementosPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [form, setForm] = useState<Partial<Row>>({ ativo: true, valorAdicional: 0 })
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Row>>({})
  async function carregar() {
    try {
      const r = await fetch('/api/admin/acaiteria/complementos')
      if (r.ok) {
        const d = await r.json()
        setRows(d.complementos || [])
      }
    } finally {
      setLoading(false)
    }
  }
  async function criar() {
    const r = await fetch('/api/admin/acaiteria/complementos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    if (r.ok) {
      setForm({ ativo: true, valorAdicional: 0 })
      carregar()
    }
  }
  async function excluir(id: string) {
    const r = await fetch('/api/admin/acaiteria/complementos/' + id, { method: 'DELETE' })
    if (r.ok) carregar()
  }
  async function salvarEdicao(id: string) {
    const body: any = {}
    if (typeof editForm.nome === 'string') body.nome = editForm.nome
    if (typeof editForm.valorAdicional === 'number') body.valorAdicional = editForm.valorAdicional
    const r = await fetch('/api/admin/acaiteria/complementos/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (r.ok) {
      setEditingId(null)
      setEditForm({})
      carregar()
    }
  }
  useEffect(() => { carregar() }, [])
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  return (
    <main className="p-2 md:p-4">
      <div className="text-xl font-semibold mb-3">Complementos</div>
      <section className="bg-white rounded-xl shadow p-4 max-w-xl">
        <div className="text-sm font-medium mb-2">Criar Complemento</div>
        <div className="grid gap-2">
          <label>
            <div className="text-sm text-gray-700">Nome</div>
            <input className="w-full border rounded-lg px-3 py-2" placeholder="Ex.: Leite Ninho" value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
          </label>
          <label>
            <div className="text-sm text-gray-700">Valor adicional</div>
            <input className="w-full border rounded-lg px-3 py-2" placeholder="0,00" type="number" step="0.01" value={form.valorAdicional as any} onChange={e => setForm(f => ({ ...f, valorAdicional: Number(e.target.value) }))} />
          </label>
          <button className="px-3 py-2 rounded-lg bg-black text-white" onClick={criar}>Criar</button>
        </div>
      </section>
      <section className="bg-white rounded-xl shadow mt-6 overflow-x-auto">
        <div className="text-sm font-medium p-4">Lista de Complementos</div>
        {loading ? (
          <div className="p-4 grid gap-2">
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">Nenhum complemento cadastrado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left">
                <th className="py-2 px-2">Nome</th>
                <th className="py-2 px-2">Valor adicional</th>
                <th className="py-2 px-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-2">
                    {editingId === r.id ? (
                      <input
                        className="w-full border rounded-lg px-2 py-1 text-sm"
                        value={editForm.nome ?? r.nome}
                        onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))}
                      />
                    ) : (
                      r.nome
                    )}
                  </td>
                  <td className="py-2 px-2">
                    {editingId === r.id ? (
                      <input
                        className="w-full border rounded-lg px-2 py-1 text-sm"
                        type="number"
                        step="0.01"
                        value={editForm.valorAdicional ?? Number(r.valorAdicional)}
                        onChange={e => setEditForm(f => ({ ...f, valorAdicional: Number(e.target.value) }))}
                      />
                    ) : (
                      currency.format(Number(r.valorAdicional))
                    )}
                  </td>
                  <td className="py-2 px-2">
                    {editingId === r.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => salvarEdicao(r.id)}
                          className="px-2 py-1 rounded border text-xs hover:bg-gray-100"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null)
                            setEditForm({})
                          }}
                          className="px-2 py-1 rounded border text-xs hover:bg-gray-100"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingId(r.id)
                            setEditForm({ nome: r.nome, valorAdicional: Number(r.valorAdicional) })
                          }}
                          className="px-2 py-1 rounded border text-xs hover:bg-gray-100"
                        >
                          Editar
                        </button>
                        <button onClick={() => excluir(r.id)} className="px-2 py-1 rounded border text-xs hover:bg-gray-100">
                          Excluir
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}
