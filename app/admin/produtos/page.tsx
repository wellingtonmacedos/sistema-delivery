'use client'
import { useEffect, useState, useRef } from 'react'

type Produto = {
  id: string
  categoria: string
  categoriaId?: string
  nome: string
  descricao?: string
  preco: number
  ativo: boolean
  fotoUrl?: string
  adicionais?: any
  maxSabores?: number | null
  maxSorvetes?: number | null
  maxAcompanhamentos?: number | null
  maxCoberturas?: number | null
}

export default function AdminProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([])
  const [form, setForm] = useState<{
    categoria: string
    categoriaId: string
    nome: string
    descricao: string
    preco: number
    adicionais: string
    maxSabores: string
    maxSorvetes: string
    maxAcompanhamentos: string
    maxCoberturas: string
  }>({
    categoria: '',
    categoriaId: '',
    nome: '',
    descricao: '',
    preco: 0,
    adicionais: '{}',
    maxSabores: '',
    maxSorvetes: '',
    maxAcompanhamentos: '',
    maxCoberturas: ''
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function carregar() {
    try {
      const [res, resCat] = await Promise.all([
        fetch('/api/produtos', { cache: 'no-store' }),
        fetch('/api/admin/lanchonete/categorias', { cache: 'no-store' })
      ])
      const data = await res.json()
      const dataCat = await resCat.json()
      setProdutos(data.produtos || [])
      setCategorias(dataCat.categorias || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  async function salvarProduto(e: React.FormEvent) {
    e.preventDefault()

    const payload = {
      ...form,
      categoriaId: form.categoriaId || undefined,
      adicionais: safeJson(form.adicionais),
      maxSabores: form.maxSabores ? Number(form.maxSabores) : null,
      maxSorvetes: form.maxSorvetes ? Number(form.maxSorvetes) : null,
      maxAcompanhamentos: form.maxAcompanhamentos ? Number(form.maxAcompanhamentos) : null,
      maxCoberturas: form.maxCoberturas ? Number(form.maxCoberturas) : null
    }

    if (editingId) {
      const res = await fetch('/api/produtos/' + editingId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert('Erro ao salvar produto: ' + (err.error || 'Erro desconhecido'))
        return
      }

      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        await fetch(`/api/admin/lanchonete/produtos/${editingId}/foto`, {
          method: 'POST',
          body: fd
        })
      }
    } else {
      const res = await fetch('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, ativo: true })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert('Erro ao criar produto: ' + (err.error || 'Erro desconhecido'))
        return
      }

      const data = await res.json()
      const produtoId = data.produto?.id

      if (produtoId && file) {
        const fd = new FormData()
        fd.append('file', file)
        await fetch(`/api/admin/lanchonete/produtos/${produtoId}/foto`, {
          method: 'POST',
          body: fd
        })
      }
    }

    cancelarEdicao()
    await carregar()
  }

  function cancelarEdicao() {
    setForm({
      categoria: '',
      categoriaId: '',
      nome: '',
      descricao: '',
      preco: 0,
      adicionais: '{}',
      maxSabores: '',
      maxSorvetes: '',
      maxAcompanhamentos: '',
      maxCoberturas: ''
    })
    setEditingId(null)
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function editar(p: Produto) {
    setForm({
      categoria: p.categoria,
      categoriaId: p.categoriaId || '',
      nome: p.nome,
      descricao: p.descricao || '',
      preco: p.preco,
      adicionais: JSON.stringify(p.adicionais || {}, null, 2),
      maxSabores: p.maxSabores !== null && p.maxSabores !== undefined ? String(p.maxSabores) : '',
      maxSorvetes: p.maxSorvetes !== null && p.maxSorvetes !== undefined ? String(p.maxSorvetes) : '',
      maxAcompanhamentos: p.maxAcompanhamentos !== null && p.maxAcompanhamentos !== undefined ? String(p.maxAcompanhamentos) : '',
      maxCoberturas: p.maxCoberturas !== null && p.maxCoberturas !== undefined ? String(p.maxCoberturas) : ''
    })
    setEditingId(p.id)
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
        <div className="text-sm font-medium mb-2">{editingId ? 'Editar Produto' : 'Criar Produto'}</div>
        <form onSubmit={salvarProduto} className="grid gap-2">
          <label>
            <div className="text-sm text-gray-700">Categoria</div>
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={form.categoriaId}
              onChange={e => {
                const id = e.target.value
                const cat = categorias.find(c => c.id === id)
                setForm(f => ({ ...f, categoriaId: id, categoria: cat?.nome || '' }))
              }}
            >
              <option value="">Selecione...</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
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
            <div className="text-sm text-gray-700">Imagem</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <div className="text-sm text-gray-700">Máx. Sabores</div>
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Padrão"
                type="number"
                value={form.maxSabores}
                onChange={e => setForm(f => ({ ...f, maxSabores: e.target.value }))}
              />
            </label>
            <label>
              <div className="text-sm text-gray-700">Máx. Sorvetes</div>
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Padrão"
                type="number"
                value={form.maxSorvetes}
                onChange={e => setForm(f => ({ ...f, maxSorvetes: e.target.value }))}
              />
            </label>
            <label>
              <div className="text-sm text-gray-700">Máx. Acompanhamentos</div>
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Padrão"
                type="number"
                value={form.maxAcompanhamentos}
                onChange={e => setForm(f => ({ ...f, maxAcompanhamentos: e.target.value }))}
              />
            </label>
            <label>
              <div className="text-sm text-gray-700">Máx. Coberturas</div>
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Padrão"
                type="number"
                value={form.maxCoberturas}
                onChange={e => setForm(f => ({ ...f, maxCoberturas: e.target.value }))}
              />
            </label>
          </div>
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
          <div className="flex gap-2">
            <button type="submit" className="px-3 py-2 rounded-lg bg-black text-white flex-1">
              {editingId ? 'Salvar alterações' : 'Criar produto'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelarEdicao}
                className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Cancelar
              </button>
            )}
          </div>
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
                <th className="py-2 px-2">Imagem</th>
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
                  <td className="py-2 px-2">
                    {p.fotoUrl ? (
                      <img src={p.fotoUrl} alt={p.nome} className="w-10 h-10 object-cover rounded" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
                        Sem foto
                      </div>
                    )}
                  </td>
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
                      <button onClick={() => editar(p)} className="px-2 py-1 rounded border text-xs hover:bg-gray-100">
                        Editar
                      </button>
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
