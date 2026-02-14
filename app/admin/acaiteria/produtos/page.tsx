'use client'
import { useEffect, useState } from 'react'

type Produto = {
  id: string
  categoria: string
  nome: string
  descricao?: string
  preco: number
  ativo: boolean
  adicionais?: any
}

export default function AcaiteriaProdutosPage() {
  const [rows, setRows] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<{ nome: string; descricao: string; preco: number; fotoDataUrl: string }>({
    nome: '',
    descricao: '',
    preco: 0,
    fotoDataUrl: ''
  })

  async function carregar() {
    try {
      const r = await fetch('/api/produtos')
      const d = await r.json()
      const list: Produto[] = (d.produtos || []).filter((p: any) => (p.categoria || '').toLowerCase().includes('aça'))
      setRows(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  function onFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) {
      setForm(f => ({ ...f, fotoDataUrl: '' }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setForm(f => ({ ...f, fotoDataUrl: String(reader.result || '') }))
    }
    reader.readAsDataURL(file)
  }

  async function criar() {
    const body = {
      categoria: 'Açaiteria',
      nome: form.nome,
      descricao: form.descricao,
      preco: form.preco,
      adicionais: { fotoDataUrl: form.fotoDataUrl },
      ativo: true
    }
    const r = await fetch('/api/produtos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (r.ok) {
      setForm({ nome: '', descricao: '', preco: 0, fotoDataUrl: '' })
      carregar()
    }
  }

  async function excluir(id: string) {
    const r = await fetch('/api/produtos/' + id, { method: 'DELETE' })
    if (r.ok) carregar()
  }

  async function toggleAtivo(p: Produto) {
    const r = await fetch('/api/produtos/' + p.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !p.ativo })
    })
    if (r.ok) carregar()
  }

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <main className="p-2 md:p-4">
      <div className="text-xl font-semibold mb-3">Produtos — Açaiteria</div>

      <section className="bg-white rounded-xl shadow p-4 max-w-xl">
        <div className="text-sm font-medium mb-2">Criar Produto</div>
        <div className="grid gap-2">
          <label>
            <div className="text-sm text-gray-700">Nome do Produto</div>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Ex.: Taça 500ml"
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            />
          </label>
          <label>
            <div className="text-sm text-gray-700">Descrição</div>
            <textarea
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Descrição breve"
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              rows={3}
            />
          </label>
          <label>
            <div className="text-sm text-gray-700">Preço</div>
            <input
              className="w-full border rounded-lg px-3 py-2"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={form.preco}
              onChange={e => setForm(f => ({ ...f, preco: Number(e.target.value) }))}
            />
          </label>
          <label>
            <div className="text-sm text-gray-700">Foto</div>
            <input className="w-full" type="file" accept="image/*" onChange={onFotoChange} />
            {form.fotoDataUrl && <img src={form.fotoDataUrl} alt="Preview" className="mt-2 h-24 w-24 object-cover rounded" />}
          </label>
          <button className="px-3 py-2 rounded-lg bg-black text-white" onClick={criar}>
            Criar
          </button>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow mt-6 overflow-x-auto">
        <div className="text-sm font-medium p-4">Lista de Produtos</div>
        {loading ? (
          <div className="p-4 grid gap-2">
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">Nenhum produto cadastrado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left">
                <th className="py-2 px-2">Foto</th>
                <th className="py-2 px-2">Nome</th>
                <th className="py-2 px-2">Descrição</th>
                <th className="py-2 px-2">Preço</th>
                <th className="py-2 px-2">Ativo</th>
                <th className="py-2 px-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(p => {
                const foto = (p.adicionais && (p.adicionais.fotoDataUrl || p.adicionais.fotoUrl)) || ''
                return (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="py-2 px-2">{foto ? <img src={foto} alt="" className="h-12 w-12 object-cover rounded" /> : '-'}</td>
                    <td className="py-2 px-2">{p.nome}</td>
                    <td className="py-2 px-2">{p.descricao || '-'}</td>
                    <td className="py-2 px-2">{currency.format(Number(p.preco))}</td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-1 rounded ${p.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex gap-2">
                        <button onClick={() => toggleAtivo(p)} className="px-2 py-1 rounded border text-xs hover:bg-gray-100">
                          {p.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button onClick={() => excluir(p.id)} className="px-2 py-1 rounded border text-xs hover:bg-gray-100">
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}
