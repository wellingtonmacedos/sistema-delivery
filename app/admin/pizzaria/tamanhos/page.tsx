'use client'
import { useEffect, useState } from 'react'

type Row = { id: string; nome: string; precoBase: number; ativo: boolean }

export default function TamanhosPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [form, setForm] = useState<Partial<Row>>({ ativo: true, precoBase: 0 })
  async function carregar() {
    const r = await fetch('/api/admin/pizzaria/tamanhos')
    if (r.ok) {
      const d = await r.json()
      setRows(d.tamanhos || [])
    }
  }
  async function criar() {
    const r = await fetch('/api/admin/pizzaria/tamanhos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    if (r.ok) {
      setForm({ ativo: true, precoBase: 0 })
      carregar()
    }
  }
  async function excluir(id: string) {
    const r = await fetch('/api/admin/pizzaria/tamanhos/' + id, { method: 'DELETE' })
    if (r.ok) carregar()
  }
  useEffect(() => { carregar() }, [])
  return (
    <main style={{ padding: 24 }}>
      <h1>Tamanhos de Pizza</h1>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input placeholder="Nome" value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
        <input placeholder="Preço base" type="number" step="0.01" value={form.precoBase as any} onChange={e => setForm(f => ({ ...f, precoBase: Number(e.target.value) }))} />
        <button onClick={criar}>Criar</button>
      </div>
      <ul style={{ marginTop: 16 }}>
        {rows.map(r => (
          <li key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>{r.nome}</span>
            <span style={{ color: '#666' }}>R$ {r.precoBase.toFixed(2)}</span>
            <button onClick={() => excluir(r.id)}>Excluir</button>
          </li>
        ))}
      </ul>
    </main>
  )
}
