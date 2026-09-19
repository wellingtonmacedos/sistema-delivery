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
  maxSabores?: number | null
  maxSorvetes?: number | null
  maxAcompanhamentos?: number | null
  maxCoberturas?: number | null
}

export default function AcaiteriaProdutosPage() {
  const [est, setEst] = useState<{ slug: string } | null>(null)
  const [rows, setRows] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [form, setForm] = useState<{
    nome: string
    descricao: string
    preco: number
    fotoDataUrl: string
    maxSabores: string
    maxSorvetes: string
    maxAcompanhamentos: string
    maxCoberturas: string
  }>({
    nome: '',
    descricao: '',
    preco: 0,
    fotoDataUrl: '',
    maxSabores: '',
    maxSorvetes: '',
    maxAcompanhamentos: '',
    maxCoberturas: ''
  })

  async function carregar() {
    try {
      setError(null)
      const params = new URLSearchParams()
      params.set('categoria', 'Açaiteria')
      const r = await fetch('/api/admin/produtos?' + params.toString(), { cache: 'no-store' as any })
      if (!r.ok) {
        const d = await r.json().catch(() => null)
        throw new Error(d?.error || 'Erro ao carregar produtos')
      }
      const d = await r.json()
      const list: Produto[] = d.produtos || []
      setRows(list)
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/admin/configuracoes/estabelecimento', { credentials: 'include' })
        const d = r.ok ? await r.json() : null
        if (d?.estabelecimento?.slug) setEst({ slug: d.estabelecimento.slug })
      } catch {}
      carregar()
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function salvar() {
    setSaving(true)
    setError(null)
    const body = {
      categoria: 'Açaiteria',
      nome: form.nome,
      descricao: form.descricao,
      preco: form.preco,
      adicionais: { fotoDataUrl: form.fotoDataUrl },
      ativo: true,
      maxSabores: form.maxSabores ? Number(form.maxSabores) : null,
      maxSorvetes: form.maxSorvetes ? Number(form.maxSorvetes) : null,
      maxAcompanhamentos: form.maxAcompanhamentos ? Number(form.maxAcompanhamentos) : null,
      maxCoberturas: form.maxCoberturas ? Number(form.maxCoberturas) : null
    }

    let r
    if (editingId) {
      r = await fetch('/api/admin/produtos/' + editingId, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
    } else {
      r = await fetch('/api/admin/produtos', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
    }

    setSaving(false)
    if (r.ok) {
      limparForm()
      carregar()
    } else {
      const d = await r.json().catch(() => null)
      setError(d?.error || 'Erro ao salvar produto')
    }
  }

  function limparForm() {
    setEditingId(null)
    setForm({
      nome: '',
      descricao: '',
      preco: 0,
      fotoDataUrl: '',
      maxSabores: '',
      maxSorvetes: '',
      maxAcompanhamentos: '',
      maxCoberturas: ''
    })
  }

  function iniciarEdicao(p: Produto) {
    setEditingId(p.id)
    setForm({
      nome: p.nome,
      descricao: p.descricao || '',
      preco: Number(p.preco),
      fotoDataUrl: (p.adicionais && (p.adicionais.fotoDataUrl || p.adicionais.fotoUrl)) || '',
      maxSabores: p.maxSabores != null ? String(p.maxSabores) : '',
      maxSorvetes: p.maxSorvetes != null ? String(p.maxSorvetes) : '',
      maxAcompanhamentos: p.maxAcompanhamentos != null ? String(p.maxAcompanhamentos) : '',
      maxCoberturas: p.maxCoberturas != null ? String(p.maxCoberturas) : ''
    })
  }

  async function excluir(id: string) {
    const r = await fetch('/api/admin/produtos/' + id, { method: 'DELETE', credentials: 'include' })
    if (r.ok) carregar()
  }

  async function toggleAtivo(p: Produto) {
    const r = await fetch('/api/admin/produtos/' + p.id, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !p.ativo })
    })
    if (r.ok) carregar()
  }

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <main className="p-2 md:p-4">
      <div className="text-xl font-semibold mb-3">Produtos — Açaiteria</div>
      {error && (
        <div className="mb-3 p-3 rounded bg-red-50 text-red-700 text-sm">
          {error.includes('relation') || error.includes('prisma')
            ? 'Estrutura ainda não migrada. Rode: npx prisma migrate dev'
            : error}
        </div>
      )}

      <section className="bg-white rounded-xl shadow p-4 max-w-xl">
        <div className="text-sm font-medium mb-2">{editingId ? 'Editar Produto' : 'Criar Produto'}</div>
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

          <div className="mt-2 border-t pt-2">
            <div className="text-sm font-medium mb-2 text-gray-800">Configuração de Componentes (Opcional)</div>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <div className="text-xs text-gray-600">Max. Sabores</div>
                <input
                  className="w-full border rounded px-2 py-1 text-sm"
                  type="number"
                  min="0"
                  placeholder="Ilimitado"
                  value={form.maxSabores}
                  onChange={e => setForm(f => ({ ...f, maxSabores: e.target.value }))}
                />
              </label>
              <label>
                <div className="text-xs text-gray-600">Max. Sorvetes</div>
                <input
                  className="w-full border rounded px-2 py-1 text-sm"
                  type="number"
                  min="0"
                  placeholder="Ilimitado"
                  value={form.maxSorvetes}
                  onChange={e => setForm(f => ({ ...f, maxSorvetes: e.target.value }))}
                />
              </label>
              <label>
                <div className="text-xs text-gray-600">Max. Acomp.</div>
                <input
                  className="w-full border rounded px-2 py-1 text-sm"
                  type="number"
                  min="0"
                  placeholder="Ilimitado"
                  value={form.maxAcompanhamentos}
                  onChange={e => setForm(f => ({ ...f, maxAcompanhamentos: e.target.value }))}
                />
              </label>
              <label>
                <div className="text-xs text-gray-600">Max. Coberturas</div>
                <input
                  className="w-full border rounded px-2 py-1 text-sm"
                  type="number"
                  min="0"
                  placeholder="Ilimitado"
                  value={form.maxCoberturas}
                  onChange={e => setForm(f => ({ ...f, maxCoberturas: e.target.value }))}
                />
              </label>
            </div>
          </div>

          <label>
            <div className="text-sm text-gray-700">Foto</div>
            <input className="w-full" type="file" accept="image/*" onChange={onFotoChange} />
            {form.fotoDataUrl && <img src={form.fotoDataUrl} alt="Preview" className="mt-2 h-24 w-24 object-cover rounded" />}
          </label>
          
          <div className="flex gap-2">
            <button className="flex-1 px-3 py-2 rounded-lg bg-black text-white disabled:opacity-60" onClick={salvar} disabled={saving}>
              {saving ? 'Salvando...' : (editingId ? 'Salvar' : 'Criar')}
            </button>
            {editingId && (
              <button className="px-3 py-2 rounded-lg border hover:bg-gray-100" onClick={limparForm}>
                Cancelar
              </button>
            )}
          </div>
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
                        <button onClick={() => iniciarEdicao(p)} className="px-2 py-1 rounded border text-xs hover:bg-gray-100 text-blue-600 border-blue-200">
                          Editar
                        </button>
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
