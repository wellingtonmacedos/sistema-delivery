'use client'
import { useEffect, useState } from 'react'

type Row = { id: string; nome: string; ativo: boolean }

export default function CoberturasPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [form, setForm] = useState<Partial<Row>>({ ativo: true })
  const [loading, setLoading] = useState(true)
  const [cfg, setCfg] = useState<{ minCoberturas: number; maxCoberturas: number } | null>(null)
  async function carregar() {
    try {
      const r = await fetch('/api/admin/acaiteria/coberturas')
      if (r.ok) {
        const d = await r.json()
        setRows(d.coberturas || [])
      }
      const rc = await fetch('/api/admin/acaiteria/config')
      if (rc.ok) {
        const dc = await rc.json()
        setCfg({ minCoberturas: dc.config.minCoberturas, maxCoberturas: dc.config.maxCoberturas })
      }
    } finally {
      setLoading(false)
    }
  }
  async function criar() {
    const r = await fetch('/api/admin/acaiteria/coberturas', {
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
    const r = await fetch('/api/admin/acaiteria/coberturas/' + id, { method: 'DELETE' })
    if (r.ok) carregar()
  }
  useEffect(() => { carregar() }, [])
  return (
    <main className="p-2 md:p-4">
      <div className="text-xl font-semibold mb-3">Coberturas</div>
      <section className="bg-white rounded-xl shadow p-4 max-w-xl mb-4">
        <div className="text-sm font-medium mb-2">Regras de escolha — Coberturas</div>
        <div className="grid gap-2">
          <label>
            <div className="text-sm text-gray-700">Quantidade mínima</div>
            <input
              className="w-full border rounded-lg px-3 py-2"
              type="number"
              min={0}
              value={cfg?.minCoberturas ?? 0}
              onChange={e => setCfg(c => ({ ...(c || { minCoberturas: 0, maxCoberturas: 2 }), minCoberturas: Math.max(0, Number(e.target.value)) }))}
            />
          </label>
          <label>
            <div className="text-sm text-gray-700">Quantidade máxima</div>
            <input
              className="w-full border rounded-lg px-3 py-2"
              type="number"
              min={0}
              value={cfg?.maxCoberturas ?? 2}
              onChange={e => setCfg(c => ({ ...(c || { minCoberturas: 0, maxCoberturas: 2 }), maxCoberturas: Math.max(0, Number(e.target.value)) }))}
            />
          </label>
          <button
            className="px-3 py-2 rounded-lg bg-black text-white"
            onClick={async () => {
              if (!cfg) return
              await fetch('/api/admin/acaiteria/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ minCoberturas: cfg.minCoberturas, maxCoberturas: cfg.maxCoberturas })
              })
            }}
          >
            Salvar regras
          </button>
        </div>
      </section>
      <section className="bg-white rounded-xl shadow p-4 max-w-xl">
        <div className="text-sm font-medium mb-2">Criar Cobertura</div>
        <div className="grid gap-2">
          <label>
            <div className="text-sm text-gray-700">Nome</div>
            <input className="w-full border rounded-lg px-3 py-2" placeholder="Ex.: Chocolate, Morango" value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
          </label>
          <button className="px-3 py-2 rounded-lg bg-black text-white" onClick={criar}>Criar</button>
        </div>
      </section>
      <section className="bg-white rounded-xl shadow mt-6 overflow-x-auto">
        <div className="text-sm font-medium p-4">Lista de Coberturas</div>
        {loading ? (
          <div className="p-4 grid gap-2">
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">Nenhuma cobertura cadastrada.</div>
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
                  <td className="py-2 px-2">{r.nome}</td>
                  <td className="py-2 px-2">
                    <button onClick={() => excluir(r.id)} className="px-2 py-1 rounded border text-xs hover:bg-gray-100">Excluir</button>
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
