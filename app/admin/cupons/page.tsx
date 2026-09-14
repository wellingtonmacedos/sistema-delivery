'use client'
import { useEffect, useState } from 'react'

type Cupom = {
  id: string
  codigo: string
  descricao?: string | null
  tipo: 'PERCENTUAL' | 'VALOR_FIXO' | 'FRETE_GRATIS'
  valor: number
  valorMinimoPedido?: number | null
  limiteTotalUso?: number | null
  limitePorCliente?: number | null
  dataInicio: string
  dataFim: string
  ativo: boolean
  categoriasAplicaveis?: { categoria: { id: string; nome: string } }[] | null
  produtosAplicaveis?: { produto: { id: string; nome: string; categoria: string } }[] | null
}
type CategoriaOpcao = { id: string; nome: string }
type ProdutoOpcao = { id: string; nome: string; categoria: string; categoriaId?: string | null }

export default function AdminCupons() {
  const [rows, setRows] = useState<Cupom[]>([])
  const [categorias, setCategorias] = useState<CategoriaOpcao[]>([])
  const [produtos, setProdutos] = useState<ProdutoOpcao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<any>({
    codigo: '',
    descricao: '',
    tipo: 'PERCENTUAL',
    valor: 10,
    valorMinimoPedido: '',
    limiteTotalUso: '',
    limitePorCliente: '',
    dataInicio: new Date().toISOString().slice(0, 16),
    dataFim: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
    ativo: true,
    categoriaIds: [] as string[],
    produtoIds: [] as string[]
  })
  const [filtroCatId, setFiltroCatId] = useState<string>('')

  async function carregar() {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/admin/cupons', { cache: 'no-store' })
      if (!r.ok) {
        const d = await r.json().catch(() => null)
        throw new Error(d?.error || 'Erro ao carregar')
      }
      const ct = r.headers.get('content-type') || ''
      if (!ct.includes('application/json')) {
        throw new Error('Resposta inválida do servidor')
      }
      const d = await r.json()
      setRows(d.cupons || [])
      setCategorias(d.categorias || [])
      setProdutos(d.produtos || [])
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar')
      setRows([])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    carregar()
  }, [])

  function toggleId(list: string[], id: string): string[] {
    const s = new Set(list)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    return Array.from(s)
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      codigo: String(form.codigo || '').trim().toUpperCase(),
      descricao: form.descricao || undefined,
      tipo: form.tipo,
      valor: Number(form.valor),
      valorMinimoPedido: form.valorMinimoPedido ? Number(form.valorMinimoPedido) : undefined,
      limiteTotalUso: form.limiteTotalUso ? Number(form.limiteTotalUso) : undefined,
      limitePorCliente: form.limitePorCliente ? Number(form.limitePorCliente) : undefined,
      dataInicio: new Date(form.dataInicio).toISOString(),
      dataFim: new Date(form.dataFim).toISOString(),
      ativo: !!form.ativo,
      categoriaIds: Array.isArray(form.categoriaIds) ? form.categoriaIds : undefined,
      produtoIds: Array.isArray(form.produtoIds) ? form.produtoIds : undefined
    }
    const r = await fetch('/api/admin/cupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (r.ok) {
      setForm({
        codigo: '',
        descricao: '',
        tipo: 'PERCENTUAL',
        valor: 10,
        valorMinimoPedido: '',
        limiteTotalUso: '',
        limitePorCliente: '',
        dataInicio: new Date().toISOString().slice(0, 16),
        dataFim: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
        ativo: true,
        categoriaIds: [],
        produtoIds: []
      })
      carregar()
    } else {
      const d = await r.json().catch(() => ({}))
      setError(d?.error || 'Erro ao criar cupom')
    }
  }

  async function toggleAtivo(c: Cupom) {
    const r = await fetch('/api/admin/cupons/' + c.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !c.ativo })
    })
    if (r.ok) carregar()
  }
  async function remover(id: string) {
    const ok = confirm('Remover cupom?')
    if (!ok) return
    const r = await fetch('/api/admin/cupons/' + id, { method: 'DELETE' })
    if (r.ok) carregar()
  }

  const produtosFiltrados = filtroCatId
    ? produtos.filter(p => p.categoriaId === filtroCatId)
    : produtos

  const totalSelecionados =
    (form.categoriaIds?.length || 0) + (form.produtoIds?.length || 0)
  const semFiltroAplicavel = totalSelecionados === 0
  const produtosSelecionadosAgrupados = (() => {
    const byCat: Record<string, ProdutoOpcao[]> = {}
    for (const pid of form.produtoIds || []) {
      const p = produtos.find(x => x.id === pid)
      if (!p) continue
      const k = p.categoriaId || p.categoria || 'Outros'
      if (!byCat[k]) byCat[k] = []
      byCat[k].push(p)
    }
    return byCat
  })()

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-xl font-semibold mb-4">Cupons</div>
      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
          {error.includes('relation') || error.includes('prisma')
            ? 'Estrutura de cupons ainda não migrada. Rode: npx prisma migrate dev'
            : error}
        </div>
      )}
      <div className="grid md:grid-cols-5 gap-6">
        <div className="md:col-span-2 rounded-xl shadow bg-white p-4">
          <div className="text-sm font-medium mb-2">Criar novo cupom</div>
          <form onSubmit={criar} className="grid grid-cols-2 gap-3">
            <input
              className="border rounded px-3 py-2 col-span-2"
              placeholder="CÓDIGO (ex: PROMO10)"
              value={form.codigo}
              onChange={e => setForm({ ...form, codigo: e.target.value })}
              required
            />
            <select
              className="border rounded px-3 py-2"
              value={form.tipo}
              onChange={e => setForm({ ...form, tipo: e.target.value })}
            >
              <option value="PERCENTUAL">Percentual (%)</option>
              <option value="VALOR_FIXO">Valor fixo (R$)</option>
              <option value="FRETE_GRATIS">Frete grátis</option>
            </select>
            <input
              className="border rounded px-3 py-2"
              type="number"
              step="0.01"
              placeholder="Valor"
              value={form.valor}
              onChange={e => setForm({ ...form, valor: e.target.value })}
              required
            />
            <input
              className="border rounded px-3 py-2 col-span-2"
              placeholder="Descrição (opcional)"
              value={form.descricao}
              onChange={e => setForm({ ...form, descricao: e.target.value })}
            />
            <input
              className="border rounded px-3 py-2"
              type="number"
              step="0.01"
              placeholder="Valor mínimo"
              value={form.valorMinimoPedido}
              onChange={e => setForm({ ...form, valorMinimoPedido: e.target.value })}
            />
            <input
              className="border rounded px-3 py-2"
              type="number"
              step="1"
              placeholder="Limite total usos"
              value={form.limiteTotalUso}
              onChange={e => setForm({ ...form, limiteTotalUso: e.target.value })}
            />
            <input
              className="border rounded px-3 py-2 col-span-2"
              type="number"
              step="1"
              placeholder="Limite por cliente (usos por mesmo telefone)"
              value={form.limitePorCliente}
              onChange={e => setForm({ ...form, limitePorCliente: e.target.value })}
            />
            <label className="text-xs">
              Início
              <input
                className="border rounded px-3 py-2 w-full"
                type="datetime-local"
                value={form.dataInicio}
                onChange={e => setForm({ ...form, dataInicio: e.target.value })}
              />
            </label>
            <label className="text-xs">
              Fim
              <input
                className="border rounded px-3 py-2 w-full"
                type="datetime-local"
                value={form.dataFim}
                onChange={e => setForm({ ...form, dataFim: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 col-span-2 text-sm">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={e => setForm({ ...form, ativo: e.target.checked })}
              />
              Ativo
            </label>

            <div className="col-span-2 border-t pt-3 mt-1">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-slate-800">
                  Aplicável em <span className="text-[11px] font-normal text-slate-500">(opcional)</span>
                </div>
                <span
                  className={`text-[11px] rounded-full px-2 py-0.5 border ${
                    semFiltroAplicavel
                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                      : 'bg-violet-50 text-violet-700 border-violet-200'
                  }`}
                >
                  {semFiltroAplicavel
                    ? 'Vale para todos os produtos'
                    : `${totalSelecionados} restrição(ões) aplicada(s)`}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="text-xs font-semibold text-slate-700 mb-1.5">
                    Categorias ({form.categoriaIds?.length || 0} selecionadas)
                  </div>
                  <div className="max-h-52 overflow-auto space-y-1 pr-1">
                    {categorias.length === 0 && (
                      <div className="text-xs text-slate-500">Cadastre categorias primeiro.</div>
                    )}
                    {categorias.map(c => {
                      const sel = (form.categoriaIds || []).includes(c.id)
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer border ${
                            sel
                              ? 'bg-violet-50 border-violet-200 text-violet-800'
                              : 'border-transparent hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={sel}
                            onChange={() =>
                              setForm({
                                ...form,
                                categoriaIds: toggleId(form.categoriaIds || [], c.id)
                              })
                            }
                          />
                          <span className="font-medium">{c.nome}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-xs font-semibold text-slate-700">
                      Produtos ({form.produtoIds?.length || 0} selecionados)
                    </div>
                    <select
                      value={filtroCatId}
                      onChange={e => setFiltroCatId(e.target.value)}
                      className="text-[11px] border rounded px-1.5 py-0.5"
                    >
                      <option value="">Todas categorias</option>
                      {categorias.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="max-h-52 overflow-auto space-y-1 pr-1">
                    {produtosFiltrados.length === 0 && (
                      <div className="text-xs text-slate-500">Cadastre produtos primeiro.</div>
                    )}
                    {produtosFiltrados.map(p => {
                      const sel = (form.produtoIds || []).includes(p.id)
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer border ${
                            sel
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'border-transparent hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={sel}
                            onChange={() =>
                              setForm({
                                ...form,
                                produtoIds: toggleId(form.produtoIds || [], p.id)
                              })
                            }
                          />
                          <span className="font-medium flex-1">{p.nome}</span>
                          <span className="text-[10px] text-slate-500">{p.categoria}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="text-[11px] mt-2 text-slate-600 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5">
                💡 <strong>Dica:</strong> Marque uma categoria para o cupom valer em
                TODOS os produtos dela. Marque produtos específicos para o cupom valer
                <em> só </em>naqueles itens. Se nenhum for marcado, vale para tudo.
              </div>
            </div>

            <button className="px-3 py-2 rounded bg-gray-900 text-white col-span-2 mt-1">
              Criar cupom
            </button>
          </form>
        </div>
        <div className="md:col-span-3 rounded-xl shadow bg-white p-4">
          <div className="text-sm font-medium mb-2">Lista de cupons</div>
          {loading && <div className="text-sm text-gray-600">Carregando...</div>}
          {!loading && rows.length === 0 && <div className="text-sm text-gray-600">Nenhum cupom</div>}
          {!loading && rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2">Código</th>
                    <th className="text-left px-3 py-2">Tipo</th>
                    <th className="text-left px-3 py-2">Valor</th>
                    <th className="text-left px-3 py-2">Vale em</th>
                    <th className="text-left px-3 py-2">Validade</th>
                    <th className="text-left px-3 py-2">Ativo</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(c => {
                    const categoriasCupom = c.categoriasAplicaveis?.map(j => j.categoria.nome) || []
                    const produtosCupom = c.produtosAplicaveis?.map(j => j.produto.nome) || []
                    const numRestricoes = categoriasCupom.length + produtosCupom.length
                    return (
                      <tr key={c.id} className="border-t align-top">
                        <td className="px-3 py-2">
                          <div className="font-mono font-semibold">{c.codigo}</div>
                          {c.descricao && (
                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{c.descricao}</div>
                          )}
                        </td>
                        <td className="px-3 py-2">{c.tipo}</td>
                        <td className="px-3 py-2">
                          {c.tipo === 'PERCENTUAL'
                            ? `${Number(c.valor)}%`
                            : `R$ ${Number(c.valor).toFixed(2)}`}
                          {c.valorMinimoPedido ? (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              min. R$ {Number(c.valorMinimoPedido).toFixed(2)}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          {numRestricoes === 0 ? (
                            <span className="inline-flex text-[11px] rounded-full px-2 py-0.5 bg-sky-50 border border-sky-200 text-sky-700">
                              Todos produtos
                            </span>
                          ) : (
                            <div className="space-y-0.5 max-w-sm">
                              {categoriasCupom.length > 0 && (
                                <div className="text-[11px]">
                                  <span className="font-semibold text-violet-700">Categorias:</span>{' '}
                                  <span className="text-slate-700">{categoriasCupom.join(', ')}</span>
                                </div>
                              )}
                              {produtosCupom.length > 0 && (
                                <div className="text-[11px]">
                                  <span className="font-semibold text-emerald-700">Produtos:</span>{' '}
                                  <span className="text-slate-700 line-clamp-2">{produtosCupom.join(', ')}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div>{new Date(c.dataInicio).toLocaleDateString()}</div>
                          <div className="text-[11px] text-slate-500">
                            até {new Date(c.dataFim).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-3 py-2">{c.ativo ? 'Sim' : 'Não'}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button
                            className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 mr-2"
                            onClick={() => toggleAtivo(c)}
                          >
                            {c.ativo ? 'Desativar' : 'Ativar'}
                          </button>
                          <button
                            className="px-2 py-1 rounded bg-red-600 text-white"
                            onClick={() => remover(c.id)}
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-dashed grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="text-[11px] text-slate-600 bg-violet-50 border border-violet-100 rounded-lg p-2.5">
              <div className="font-semibold text-violet-800 mb-0.5">🏷️ Cupons de categoria</div>
              Ex: "10% OFF em todas <em>Bebidas</em>". Marque a categoria e todos produtos dela entram.
            </div>
            <div className="text-[11px] text-slate-600 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
              <div className="font-semibold text-emerald-800 mb-0.5">🎁 Cupom produto específico</div>
              Ex: "Compre X-Burger ganhe R$5". Marque <em>só</em> o X-Burger nos produtos.
            </div>
            <div className="text-[11px] text-slate-600 bg-sky-50 border border-sky-100 rounded-lg p-2.5">
              <div className="font-semibold text-sky-800 mb-0.5">🌍 Cupom geral</div>
              Não marque nenhuma categoria e nenhum produto. Vale para <em>todo o pedido</em>.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
