'use client'
import { useEffect, useState } from 'react'

type Categoria = {
  id: string
  nome: string
  icone?: string | null
  imagemUrl?: string | null
  ordemExibicao?: number | null
  ativo: boolean
}

const endpoint = '/api/admin/distribuidora/categorias'

export default function DistribuidoraCategorias() {
  const [rows, setRows] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<{
    nome: string
    icone?: string
    ordemExibicao?: number
    ativo: boolean
  }>({
    nome: '',
    icone: '',
    ordemExibicao: undefined,
    ativo: true
  })

  async function carregar() {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(endpoint, { cache: 'no-store', credentials: 'include' })
      if (!r.ok) {
        const d = await r.json().catch(() => null)
        throw new Error(d?.error || 'Erro ao carregar')
      }
      const d = await r.json()
      setRows(d.categorias || [])
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  function editar(cat: Categoria) {
    setEditingId(cat.id)
    setForm({
      nome: cat.nome,
      icone: cat.icone || '',
      ordemExibicao: cat.ordemExibicao || undefined,
      ativo: cat.ativo
    })
    setError(null)
  }

  function cancelarEdicao() {
    setEditingId(null)
    setForm({ nome: '', icone: '', ordemExibicao: undefined, ativo: true })
    setError(null)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const method = editingId ? 'PUT' : 'POST'
      const body = editingId ? { id: editingId, ...form } : form
      const r = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      })
      if (!r.ok) {
        const d = await r.json().catch(() => null)
        throw new Error(d?.error || 'Erro ao salvar')
      }
      cancelarEdicao()
      carregar()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function atualizarAtivo(cat: Categoria, ativo: boolean) {
    const r = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: cat.id, ativo })
    })
    if (r.ok) carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return
    const r = await fetch(`${endpoint}?id=${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (r.ok) {
      if (editingId === id) cancelarEdicao()
      carregar()
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-xl font-semibold mb-4">Categorias · Distribuidora</div>
      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
          {error.includes('relation') || error.includes('prisma')
            ? 'Estrutura ainda não migrada. Rode: npx prisma migrate dev'
            : error}
        </div>
      )}

      <form onSubmit={salvar} className="rounded-xl shadow bg-white p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-gray-700">{editingId ? 'Editar Categoria' : 'Nova Categoria'}</h3>
          {editingId && (
            <button type="button" onClick={cancelarEdicao} className="text-sm text-gray-500 hover:text-gray-700">
              Cancelar Edição
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Nome</label>
            <input
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="Ex: Refrigerantes"
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Ícone (Emoji)</label>
            <input
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="Ex: 🥤"
              value={form.icone || ''}
              onChange={e => setForm(f => ({ ...f, icone: e.target.value }))}
              maxLength={8}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Ordem de Exibição</label>
            <input
              type="number"
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="Ex: 1"
              value={form.ordemExibicao ?? ''}
              onChange={e =>
                setForm(f => ({ ...f, ordemExibicao: e.target.value ? Number(e.target.value) : undefined }))
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
              className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            Categoria Ativa
          </label>

          <button
            className="px-4 py-2 rounded-lg text-white bg-gray-900 hover:bg-gray-800 transition-colors disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Categoria'}
          </button>
        </div>
      </form>

      <div className="rounded-xl shadow bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 w-16">Ícone</th>
                <th className="text-left px-4 py-2">Nome</th>
                <th className="text-left px-4 py-2">Ordem</th>
                <th className="text-left px-4 py-2">Ativo</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                rows.map(cat => (
                  <tr key={cat.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-base">
                        {cat.icone || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-2 font-medium">{cat.nome}</td>
                    <td className="px-4 py-2">{cat.ordemExibicao ?? '—'}</td>
                    <td className="px-4 py-2">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cat.ativo}
                          onChange={e => atualizarAtivo(cat, e.target.checked)}
                          className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                        />
                        <span className={cat.ativo ? 'text-green-600' : 'text-gray-400'}>{cat.ativo ? 'Sim' : 'Não'}</span>
                      </label>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="px-3 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium text-xs"
                          onClick={() => editar(cat)}
                        >
                          Editar
                        </button>
                        <button
                          className="px-3 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 font-medium text-xs"
                          onClick={() => excluir(cat.id)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {loading && <div className="p-4 text-sm text-gray-600 text-center">Carregando...</div>}
        {!loading && rows.length === 0 && (
          <div className="p-8 text-sm text-gray-500 text-center">Nenhuma categoria cadastrada.</div>
        )}
      </div>
    </div>
  )
}
