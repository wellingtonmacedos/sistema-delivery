'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Categoria = { id: string; nome: string; icone?: string | null }

const unidadesSugestao = [
  'Unidade',
  'Lata',
  'Garrafa',
  'Pack',
  'Fardo',
  'Caixa',
  'Litro',
  'Saco',
  'Outro'
]

export default function DistribuidoraNovoProduto() {
  const router = useRouter()
  const [cats, setCats] = useState<Categoria[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('')
  const [marca, setMarca] = useState('')
  const [unidade, setUnidade] = useState('')
  const [qtdPorEmbalagem, setQtdPorEmbalagem] = useState('')
  const [preco, setPreco] = useState('')
  const [precoEmbalagem, setPrecoEmbalagem] = useState('')
  const [tempoPreparoMinutos, setTempoPreparoMinutos] = useState('')
  const [ordemExibicao, setOrdemExibicao] = useState('')
  const [estoque, setEstoque] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [destaque, setDestaque] = useState(false)
  const [controlarEstoque, setControlarEstoque] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/distribuidora/categorias', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => setCats(d?.categorias || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      if (!nome || !preco) {
        throw new Error('Preencha pelo menos o nome e o preço')
      }
      const toNumOrNull = (v: string) => (v.trim() === '' ? null : Number(v))
      const catNome =
        categoria.trim() ||
        (cats.length && cats[0] ? cats[0].nome : '') ||
        'Outros'
      const body: any = {
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        categoria: catNome,
        marca: marca.trim() || null,
        unidade: unidade.trim() || null,
        qtdPorEmbalagem: toNumOrNull(qtdPorEmbalagem),
        preco: Number(preco),
        precoEmbalagem: toNumOrNull(precoEmbalagem),
        tempoPreparoMinutos: toNumOrNull(tempoPreparoMinutos),
        ordemExibicao: toNumOrNull(ordemExibicao),
        estoque: toNumOrNull(estoque),
        ativo,
        destaque,
        controlarEstoque,
        fotoUrl: null
      }
      const r = await fetch('/api/admin/produtos', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!r.ok) {
        const d = await r.json().catch(() => null)
        throw new Error(d?.error || 'Erro ao criar produto')
      }
      const d = await r.json()
      const produtoId = d?.produto?.id
      if (!produtoId) throw new Error('Produto criado, mas sem ID retornado')

      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        const ru = await fetch(`/api/admin/distribuidora/produtos/${produtoId}/foto`, {
          method: 'POST',
          body: fd
        })
        if (!ru.ok) {
          const du = await ru.json().catch(() => null)
          throw new Error('Produto criado. Erro no upload da foto: ' + (du?.error || ru.status))
        }
      }

      router.push(`/admin/distribuidora/produtos/${produtoId}`)
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xl font-semibold">Novo Produto · Distribuidora</div>
        <button
          type="button"
          className="px-3 py-2 rounded border bg-white"
          onClick={() => router.push('/admin/distribuidora/produtos')}
        >
          ← Voltar
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={salvar} className="rounded-xl shadow bg-white p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm font-medium mb-2">Foto do produto</div>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-3 bg-gray-50 min-h-[220px]">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-40 h-40 object-cover rounded" />
              ) : (
                <div className="w-40 h-40 rounded bg-white border border-gray-200 flex items-center justify-center text-4xl text-gray-300">
                  🥤
                </div>
              )}
              <label className="cursor-pointer px-3 py-1.5 rounded border bg-white text-xs font-medium hover:bg-gray-100">
                {previewUrl ? 'Trocar imagem' : 'Selecionar arquivo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                />
              </label>
              <p className="text-[10px] text-gray-400 text-center">
                JPG / PNG · até 2MB
              </p>
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Nome do produto *</label>
              <input
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="Ex: Heineken Lata 350ml"
                value={nome}
                onChange={e => setNome(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Categoria</label>
              <select
                className="border rounded-lg px-3 py-2 w-full"
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
              >
                <option value="">Selecione ou digite abaixo</option>
                {cats.map(c => (
                  <option key={c.id} value={c.nome}>
                    {c.icone ? `${c.icone} ` : ''}
                    {c.nome}
                  </option>
                ))}
              </select>
              <input
                className="border rounded-lg px-3 py-2 w-full mt-2"
                placeholder="Ou digite o nome da categoria..."
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Marca</label>
              <input
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="Ex: Heineken, Coca-Cola..."
                value={marca}
                onChange={e => setMarca(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Descrição</label>
              <textarea
                className="border rounded-lg px-3 py-2 w-full min-h-[70px]"
                placeholder="Informações extras sobre o produto..."
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Unidade de venda</label>
              <select
                className="border rounded-lg px-3 py-2 w-full"
                value={unidadesSugestao.includes(unidade) ? unidade : ''}
                onChange={e => setUnidade(e.target.value || unidade)}
              >
                <option value="">Selecione...</option>
                {unidadesSugestao.map(u => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <input
                className="border rounded-lg px-3 py-2 w-full mt-2"
                placeholder="Ou digite sua unidade..."
                value={unidade}
                onChange={e => setUnidade(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Qtd. por embalagem</label>
              <input
                type="number"
                min={1}
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="Ex: 12 (para fardo)"
                value={qtdPorEmbalagem}
                onChange={e => setQtdPorEmbalagem(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Preço unitário (R$) *</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="Ex: 6.50"
                value={preco}
                onChange={e => setPreco(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Preço da embalagem (R$)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="Ex: 72.00 (fardo 12 un)"
                value={precoEmbalagem}
                onChange={e => setPrecoEmbalagem(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Ordem exibição</label>
              <input
                type="number"
                min={0}
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="0 = primeiro"
                value={ordemExibicao}
                onChange={e => setOrdemExibicao(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tempo preparo (min)</label>
              <input
                type="number"
                min={0}
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="Ex: 5"
                value={tempoPreparoMinutos}
                onChange={e => setTempoPreparoMinutos(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Estoque</label>
              <input
                type="number"
                min={0}
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="Unidades em estoque"
                value={estoque}
                onChange={e => setEstoque(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={ativo}
                onChange={e => setAtivo(e.target.checked)}
                className="rounded"
              />
              Produto ativo
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={destaque}
                onChange={e => setDestaque(e.target.checked)}
                className="rounded"
              />
              Produto em destaque
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={controlarEstoque}
                onChange={e => setControlarEstoque(e.target.checked)}
                className="rounded"
              />
              Controlar estoque
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded-lg border bg-white"
              onClick={() => router.push('/admin/distribuidora/produtos')}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-gray-900 text-white disabled:opacity-60"
              disabled={saving}
            >
              {saving ? 'Criando...' : 'Criar produto'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
