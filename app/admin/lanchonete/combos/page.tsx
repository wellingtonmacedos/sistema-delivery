'use client'
import { useEffect, useState } from 'react'

type Produto = { id: string; nome: string }
type Combo = { id: string; nome: string; descricao?: string | null; precoFixo: number; ativo: boolean }
type ComboItem = { id: string; produtoId: string; produto?: Produto }

export default function LanchoneteCombos() {
  const [combos, setCombos] = useState<(Combo & { itens: ComboItem[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<{ nome: string; descricao?: string; precoFixo: number; ativo: boolean }>({
    nome: '',
    descricao: '',
    precoFixo: 0,
    ativo: true
  })
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [addItem, setAddItem] = useState<{ comboId: string; produtoId: string }>({ comboId: '', produtoId: '' })

  async function carregar() {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/admin/lanchonete/combos', { cache: 'no-store' })
      if (!r.ok) {
        const d = await r.json().catch(() => null)
        throw new Error(d?.error || 'Erro ao carregar')
      }
      const d = await r.json()
      setCombos(d.combos || [])
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar')
    } finally {
      setLoading(false)
    }
  }

  async function carregarProdutos() {
    try {
      const r = await fetch('/api/produtos')
      const d = await r.json()
      const list: Produto[] = (d.produtos || []).map((p: any) => ({ id: p.id, nome: p.nome }))
      setProdutos(list)
    } catch {}
  }

  useEffect(() => {
    carregar()
    carregarProdutos()
  }, [])

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    const r = await fetch('/api/admin/lanchonete/combos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    if (r.ok) {
      setForm({ nome: '', descricao: '', precoFixo: 0, ativo: true })
      carregar()
    } else {
      const d = await r.json().catch(() => null)
      setError(d?.error || 'Erro ao salvar')
    }
  }

  async function excluir(id: string) {
    const r = await fetch('/api/admin/lanchonete/combos?id=' + id, { method: 'DELETE' })
    if (r.ok) carregar()
  }

  async function adicionarItem() {
    if (!addItem.comboId || !addItem.produtoId) return
    const r = await fetch('/api/admin/lanchonete/combos/itens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addItem)
    })
    if (r.ok) {
      setAddItem({ comboId: '', produtoId: '' })
      carregar()
    }
  }

  async function removerItem(id: string) {
    const r = await fetch('/api/admin/lanchonete/combos/itens?id=' + id, { method: 'DELETE' })
    if (r.ok) carregar()
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-xl font-semibold mb-4">Combos</div>
      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
          {error.includes('relation') || error.includes('prisma') ? 'Estrutura ainda não migrada. Rode: npx prisma migrate dev' : error}
        </div>
      )}
      <form onSubmit={criar} className="rounded-xl shadow bg-white p-4 mb-6 grid grid-cols-1 md:grid-cols-6 gap-3">
        <input
          className="border rounded-lg px-3 py-2 md:col-span-2"
          placeholder="Nome"
          value={form.nome}
          onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
          required
        />
        <input
          className="border rounded-lg px-3 py-2 md:col-span-2"
          placeholder="Descrição"
          value={form.descricao}
          onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
        />
        <input
          type="number"
          step="0.01"
          className="border rounded-lg px-3 py-2"
          placeholder="Preço fixo"
          value={form.precoFixo}
          onChange={e => setForm(f => ({ ...f, precoFixo: Number(e.target.value || 0) }))}
          required
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.ativo}
            onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
          />
          Ativo
        </label>
        <button className="px-3 py-2 rounded-lg text-white md:col-span-6" style={{ backgroundColor: '#111827' }}>
          Criar
        </button>
      </form>

      <div className="rounded-xl shadow bg-white">
        {loading && <div className="p-4 text-sm text-gray-600">Carregando...</div>}
        {!loading && combos.length === 0 && <div className="p-4 text-sm text-gray-600">Nenhum combo</div>}
        {!loading &&
          combos.map(c => (
            <div key={c.id} className="border-t p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.nome}</div>
                  <div className="text-xs text-gray-600">{c.descricao || '—'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium">R$ {Number(c.precoFixo).toFixed(2)}</div>
                  <button className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200" onClick={() => excluir(c.id)}>
                    Excluir
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <div className="text-sm font-medium mb-2">Itens</div>
                <div className="flex items-center gap-2 mb-2">
                  <select
                    className="border rounded-lg px-3 py-2"
                    value={addItem.produtoId}
                    onChange={e => setAddItem(s => ({ ...s, produtoId: e.target.value, comboId: c.id }))}
                  >
                    <option value="">Selecionar produto</option>
                    {produtos.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                  <button className="px-3 py-2 rounded bg-gray-900 text-white" onClick={adicionarItem}>
                    Adicionar
                  </button>
                </div>
                <ul className="text-sm">
                  {c.itens.map(it => (
                    <li key={it.id} className="flex items-center justify-between py-1">
                      <span>{it.produto?.nome || it.produtoId}</span>
                      <button className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200" onClick={() => removerItem(it.id)}>
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

