'use client'
import { useEffect, useState } from 'react'

type Row = { id: string; nome: string; ativo: boolean }

export default function AcompanhamentosPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [form, setForm] = useState<Partial<Row>>({ ativo: true })
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Row>>({})
  const [cfg, setCfg] = useState<{ minAcompanhamentos: number; maxAcompanhamentos: number } | null>(null)
  async function carregar() {
    try {
      const r = await fetch('/api/admin/acaiteria/acompanhamentos')
      if (r.ok) {
        const d = await r.json()
        setRows(d.acompanhamentos || [])
      }
      const rc = await fetch('/api/admin/acaiteria/config')
      if (rc.ok) {
        const dc = await rc.json()
        setCfg({ minAcompanhamentos: dc.config.minAcompanhamentos, maxAcompanhamentos: dc.config.maxAcompanhamentos })
      }
    } finally {
      setLoading(false)
    }
  }
  async function criar() {
    const r = await fetch('/api/admin/acaiteria/acompanhamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    if (r.ok) {
      setForm({ ativo: true })
      carregar()
    }
  }
  async function excluir(id: string) {
    const r = await fetch('/api/admin/acaiteria/acompanhamentos/' + id, { method: 'DELETE' })
    if (r.ok) carregar()
  }
  async function salvarEdicao(id: string) {
    const body: any = {}
    if (typeof editForm.nome === 'string') body.nome = editForm.nome
    const r = await fetch('/api/admin/acaiteria/acompanhamentos/' + id, {
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
  return (
    <main className="p-2 md:p-4">
      <div className="text-xl font-semibold mb-3">Acompanhamentos</div>
      <section className="bg-white rounded-xl shadow p-4 max-w-xl mb-4">
        <div className="text-sm font-medium mb-2">Regras de escolha — Acompanhamentos</div>
        <div className="grid gap-2">
          <label>
            <div className="text-sm text-gray-700">Quantidade mínima</div>
            <input
              className="w-full border rounded-lg px-3 py-2"
              type="number"
              min={0}
              value={cfg?.minAcompanhamentos ?? 0}
              onChange={e => setCfg(c => ({ ...(c || { minAcompanhamentos: 0, maxAcompanhamentos: 4 }), minAcompanhamentos: Math.max(0, Number(e.target.value)) }))}
            />
          </label>
          <label>
            <div className="text-sm text-gray-700">Quantidade máxima</div>
            <input
              className="w-full border rounded-lg px-3 py-2"
              type="number"
              min={0}
              value={cfg?.maxAcompanhamentos ?? 4}
              onChange={e => setCfg(c => ({ ...(c || { minAcompanhamentos: 0, maxAcompanhamentos: 4 }), maxAcompanhamentos: Math.max(0, Number(e.target.value)) }))}
            />
          </label>
          <button
            className="px-3 py-2 rounded-lg bg-black text-white"
            onClick={async () => {
              if (!cfg) return
              await fetch('/api/admin/acaiteria/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ minAcompanhamentos: cfg.minAcompanhamentos, maxAcompanhamentos: cfg.maxAcompanhamentos })
              })
            }}
          >
            Salvar regras
          </button>
        </div>
      </section>
      <section className="bg-white rounded-xl shadow p-4 max-w-xl">
        <div className="text-sm font-medium mb-2">Criar Acompanhamento</div>
        <div className="grid gap-2">
          <label>
            <div className="text-sm text-gray-700">Nome</div>
            <input className="w-full border rounded-lg px-3 py-2" placeholder="Ex.: Granola, Paçoca" value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
          </label>
          <button className="px-3 py-2 rounded-lg bg-black text-white" onClick={criar}>Criar</button>
        </div>
      </section>
      <section className="bg-white rounded-xl shadow mt-6 overflow-x-auto">
        <div className="text-sm font-medium p-4">Lista de Acompanhamentos</div>
        {loading ? (
          <div className="p-4 grid gap-2">
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">Nenhum acompanhamento cadastrado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left">
                <th className="py-2 px-2">Nome</th>
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
                            setEditForm({ nome: r.nome })
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
