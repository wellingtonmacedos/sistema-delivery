'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Categoria = { id: string; nome: string; icone?: string | null }
type ProdutoForm = {
  id: string
  nome: string
  descricao: string | null
  categoria: string
  marca: string | null
  unidade: string | null
  qtdPorEmbalagem: number | null
  preco: number
  precoEmbalagem: number | null
  fotoUrl: string | null
  tempoPreparoMinutos: number | null
  ordemExibicao: number | null
  estoque: number | null
  ativo: boolean
  destaque: boolean
  controlarEstoque: boolean
}

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

const emptyString = (v: any) => (v == null || v === undefined ? '' : String(v))

export default function DistribuidoraEditarProduto() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id || '')

  const [cats, setCats] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [salvoOk, setSalvoOk] = useState(false)

  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [savingFoto, setSavingFoto] = useState(false)

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

  async function carregarCats() {
    try {
      const r = await fetch('/api/admin/distribuidora/categorias', { credentials: 'include' })
      const d = await r.json()
      setCats(d?.categorias || [])
    } catch {}
  }

  async function carregar() {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/produtos/${id}`, { cache: 'no-store' })
      if (!r.ok) throw new Error('Produto não encontrado')
      const d = await r.json()
      const p = d.produto as ProdutoForm
      if (!p) throw new Error('Produto não encontrado')
      setNome(p.nome || '')
      setDescricao(p.descricao || '')
      setCategoria(p.categoria || '')
      setMarca(p.marca || '')
      setUnidade(p.unidade || '')
      setQtdPorEmbalagem(emptyString(p.qtdPorEmbalagem))
      setPreco(emptyString(p.preco))
      setPrecoEmbalagem(emptyString(p.precoEmbalagem))
      setTempoPreparoMinutos(emptyString(p.tempoPreparoMinutos))
      setOrdemExibicao(emptyString(p.ordemExibicao))
      setEstoque(emptyString(p.estoque))
      setAtivo(p.ativo ?? true)
      setDestaque(!!p.destaque)
      setControlarEstoque(!!p.controlarEstoque)
      setFotoUrl(p.fotoUrl || null)
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarCats()
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const toNumOrNull = (v: string) => (v.trim() === '' ? null : Number(v))

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    setSalvoOk(false)
    try {
      if (!nome || !preco) throw new Error('Nome e preço são obrigatórios')
      const body: any = {
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        categoria: categoria.trim() || 'Outros',
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
        controlarEstoque
      }
      const r = await fetch(`/api/produtos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!r.ok) {
        const d = await r.json().catch(() => null)
        throw new Error(d?.error || 'Erro ao salvar')
      }
      setSalvoOk(true)
      carregar()
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function salvarFoto() {
    if (!file) return
    setSavingFoto(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch(`/api/admin/distribuidora/produtos/${id}/foto`, {
        method: 'POST',
        body: fd
      })
      if (!r.ok) {
        const d = await r.json().catch(() => null)
        throw new Error(d?.error || 'Erro no upload')
      }
      const d = await r.json()
      setFotoUrl(d?.fotoUrl || null)
      setFile(null)
      setPreviewUrl(null)
    } catch (e: any) {
      setError(e?.message || 'Erro no upload')
    } finally {
      setSavingFoto(false)
    }
  }

  async function excluir() {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return
    try {
      const r = await fetch(`/api/produtos/${id}`, { method: 'DELETE' })
      if (r.ok) router.push('/admin/distribuidora/produtos')
    } catch {}
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-sm text-gray-500">Carregando produto...</div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div>
          <div className="text-xl font-semibold">Gerenciar Produto</div>
          {nome && <div className="text-sm text-gray-500">{nome}</div>}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded border bg-white"
            onClick={() => router.push('/admin/distribuidora/produtos')}
          >
            ← Voltar
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded bg-red-50 text-red-700 hover:bg-red-100 text-sm"
            onClick={excluir}
          >
            Excluir produto
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
      )}
      {salvoOk && !error && (
        <div className="mb-4 p-3 rounded bg-green-50 text-green-700 text-sm">
          Alterações salvas com sucesso.
        </div>
      )}

      <form onSubmit={salvar} className="rounded-xl shadow bg-white p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm font-medium mb-2">Foto do produto</div>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-3 bg-gray-50 min-h-[260px]">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-40 h-40 object-cover rounded" />
              ) : fotoUrl ? (
                <img src={fotoUrl} alt="Foto" className="w-40 h-40 object-cover rounded" />
              ) : (
                <div className="w-40 h-40 rounded bg-white border border-gray-200 flex items-center justify-center text-4xl text-gray-300">
                  🥤
                </div>
              )}
              <label className="cursor-pointer px-3 py-1.5 rounded border bg-white text-xs font-medium hover:bg-gray-100">
                {previewUrl ? 'Trocar imagem' : fotoUrl ? 'Atualizar foto' : 'Selecionar arquivo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                />
              </label>
              {file && (
                <button
                  type="button"
                  className="px-3 py-1.5 rounded bg-gray-900 text-white text-xs hover:bg-gray-800 disabled:opacity-50"
                  onClick={salvarFoto}
                  disabled={savingFoto}
                >
                  {savingFoto ? 'Enviando...' : 'Enviar nova foto'}
                </button>
              )}
              {(fotoUrl || previewUrl) && !file && (
                <button
                  type="button"
                  className="text-xs text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    setPreviewUrl(null)
                    setFile(null)
                  }}
                >
                  Cancelar seleção
                </button>
              )}
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
                value={cats.some(c => c.nome === categoria) ? categoria : ''}
                onChange={e => setCategoria(e.target.value || categoria)}
              >
                <option value="">Selecione...</option>
                {cats.map(c => (
                  <option key={c.id} value={c.nome}>
                    {c.icone ? `${c.icone} ` : ''}
                    {c.nome}
                  </option>
                ))}
              </select>
              <input
                className="border rounded-lg px-3 py-2 w-full mt-2"
                placeholder="Ou digite a categoria..."
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Marca</label>
              <input
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="Ex: Heineken"
                value={marca}
                onChange={e => setMarca(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Descrição</label>
              <textarea
                className="border rounded-lg px-3 py-2 w-full min-h-[70px]"
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
                placeholder="Ex: 12"
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
                placeholder="Vazio = não usa"
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
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-gray-900 text-white disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}
