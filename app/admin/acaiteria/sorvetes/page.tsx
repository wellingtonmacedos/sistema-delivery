'use client'
import { useEffect, useState } from 'react'

type Row = { id: string; nome: string; ativo: boolean }

export default function SorvetesPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [form, setForm] = useState<Partial<Row>>({ ativo: true })
  const [loading, setLoading] = useState(true)
  const [cfg, setCfg] = useState<{ minSorvetes: number; maxSorvetes: number } | null>(null)
  async function carregar() {
    try {
      const r = await fetch('/api/admin/acaiteria/sorvetes')
      if (r.ok) {
        const d = await r.json()
        setRows(d.sorvetes || [])
      }
      const rc = await fetch('/api/admin/acaiteria/config')
      if (rc.ok) {
        const dc = await rc.json()
        setCfg({ minSorvetes: dc.config.minSorvetes, maxSorvetes: dc.config.maxSorvetes })
      }
    } finally {
      setLoading(false)
    }
  }
  async function criar() {
    const r = await fetch('/api/admin/acaiteria/sorvetes', {
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
    const r = await fetch('/api/admin/acaiteria/sorvetes/' + id, { method: 'DELETE' })
    if (r.ok) carregar()
  }
  useEffect(() => { carregar() }, [])
  return (
    <main className="p-2 md:p-4">
      <div className="text-xl font-semibold mb-3">Sorvetes</div>
      <section className="bg-white rounded-xl shadow p-4 max-w-xl mb-4">
        <div className="text-sm font-medium mb-2">Regras de escolha — Sorvetes</div>
        <div className="grid gap-2">
          <label>
            <div className="text-sm text-gray-700">Quantidade mínima</div>
            <input
              className="w-full border rounded-lg px-3 py-2"
              type="number"
              min={0}
              value={cfg?.minSorvetes ?? 0}
              onChange={e => setCfg(c => ({ ...(c || { minSorvetes: 0, maxSorvetes: 2 }), minSorvetes: Math.max(0, Number(e.target.value)) }))}
            />
          </label>
          <label>
            <div className="text-sm text-gray-700">Quantidade máxima</div>
            <input
              className="w-full border rounded-lg px-3 py-2"
              type="number"
              min={0}
              value={cfg?.maxSorvetes ?? 2}
              onChange={e => setCfg(c => ({ ...(c || { minSorvetes: 0, maxSorvetes: 2 }), maxSorvetes: Math.max(0, Number(e.target.value)) }))}
            />
          </label>
          <button
            className="px-3 py-2 rounded-lg bg-black text-white"
            onClick={async () => {
              if (!cfg) return
              await fetch('/api/admin/acaiteria/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ minSorvetes: cfg.minSorvetes, maxSorvetes: cfg.maxSorvetes })
              })
            }}
          >
            Salvar regras
          </button>
        </div>
      </section>
      <section className="bg-white rounded-xl shadow p-4 max-w-xl">
        <div className="text-sm font-medium mb-2">Criar Sorvete</div>
        <div className="grid gap-2">
          <label>
            <div className="text-sm text-gray-700">Nome</div>
            <input className="w-full border rounded-lg px-3 py-2" placeholder="Ex.: Creme, Chocolate" value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
          </label>
          <button className="px-3 py-2 rounded-lg bg-black text-white" onClick={criar}>Criar</button>
        </div>
      </section>
      <section className="bg-white rounded-xl shadow mt-6 overflow-x-auto">
        <div className="text-sm font-medium p-4">Lista de Sorvetes</div>
        {loading ? (
          <div className="p-4 grid gap-2">
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">Nenhum sorvete cadastrado.</div>
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
