'use client'
import { useEffect, useState } from 'react'

type Produto = {
  id: string
  categoria: string
  nome: string
  descricao?: string
  preco: number
  ativo: boolean
}

export default function AdminProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [form, setForm] = useState({ categoria: '', nome: '', descricao: '', preco: 0, adicionais: '{}' })
  const [loading, setLoading] = useState(true)

  async function carregar() {
    try {
      const res = await fetch('/api/produtos')
      const data = await res.json()
      setProdutos(data.produtos || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  async function criarProduto(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/produtos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, adicionais: safeJson(form.adicionais), ativo: true })
    })
    setForm({ categoria: '', nome: '', descricao: '', preco: 0, adicionais: '{}' })
    await carregar()
  }

  async function remover(id: string) {
    await fetch('/api/produtos/' + id, { method: 'DELETE' })
    await carregar()
  }

  function safeJson(str: string) {
    try {
      return JSON.parse(str)
    } catch {
      return {}
    }
  }

  async function toggleAtivo(p: Produto) {
    await fetch('/api/produtos/' + p.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !p.ativo })
    })
    await carregar()
  }

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  return (
    <main className="p-2 md:p-4">
      <div className="text-xl font-semibold mb-3">Produtos</div>
      <section className="bg-white rounded-xl shadow p-4 max-w-xl">
        <div className="text-sm font-medium mb-2">Criar Produto</div>
        <form onSubmit={criarProduto} className="grid gap-2">
          <label>
            <div className="text-sm text-gray-700">Categoria</div>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Categoria"
              value={form.categoria}
              onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
            />
          </label>
          <label>
            <div className="text-sm text-gray-700">Nome</div>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Nome"
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            />
          </label>
          <label>
            <div className="text-sm text-gray-700">Descrição</div>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Descrição"
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
            />
          </label>
          <label>
            <div className="text-sm text-gray-700">Preço</div>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Preço"
              type="number"
              step="0.01"
              value={form.preco}
              onChange={e => setForm(f => ({ ...f, preco: Number(e.target.value) }))}
            />
          </label>
          <label>
            <div className="text-sm text-gray-700">Adicionais (JSON)</div>
            <textarea
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Adicionais (JSON)"
              value={form.adicionais}
              onChange={e => setForm(f => ({ ...f, adicionais: e.target.value }))}
              rows={4}
            />
          </label>
          <button type="submit" className="px-3 py-2 rounded-lg bg-black text-white">
            Criar produto
          </button>
        </form>
      </section>
      <section className="bg-white rounded-xl shadow mt-6 overflow-x-auto">
        <div className="text-sm font-medium p-4">Lista de Produtos</div>
        {loading ? (
          <div className="p-4 grid gap-2">
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
          </div>
        ) : produtos.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">Nenhum produto cadastrado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left">
                <th className="py-2 px-2">Categoria</th>
                <th className="py-2 px-2">Nome</th>
                <th className="py-2 px-2">Preço</th>
                <th className="py-2 px-2">Ativo</th>
                <th className="py-2 px-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map(p => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-2">{p.categoria}</td>
                  <td className="py-2 px-2">{p.nome}</td>
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
                      <button onClick={() => remover(p.id)} className="px-2 py-1 rounded border text-xs hover:bg-gray-100">
                        Excluir
                      </button>
                    </div>
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
