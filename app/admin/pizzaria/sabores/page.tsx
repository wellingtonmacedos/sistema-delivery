'use client'
import { useEffect, useState } from 'react'

type Row = { id: string; nome: string; descricao?: string | null; ativo: boolean }

export default function SaboresPizzaPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [form, setForm] = useState<Partial<Row>>({ ativo: true })
  async function carregar() {
    const r = await fetch('/api/admin/pizzaria/sabores')
    if (r.ok) {
      const d = await r.json()
      setRows(d.sabores || [])
    }
  }
  async function criar() {
    const r = await fetch('/api/admin/pizzaria/sabores', {
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
    const r = await fetch('/api/admin/pizzaria/sabores/' + id, { method: 'DELETE' })
    if (r.ok) carregar()
  }
  useEffect(() => { carregar() }, [])
  return (
    <main style={{ padding: 24 }}>
      <h1>Sabores de Pizza</h1>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input placeholder="Nome" value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
        <input placeholder="Descrição" value={form.descricao || ''} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
        <button onClick={criar}>Criar</button>
      </div>
      <ul style={{ marginTop: 16 }}>
        {rows.map(r => (
          <li key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>{r.nome}</span>
            {r.descricao && <span style={{ color: '#666' }}>— {r.descricao}</span>}
            <button onClick={() => excluir(r.id)}>Excluir</button>
          </li>
        ))}
      </ul>
    </main>
  )
}
