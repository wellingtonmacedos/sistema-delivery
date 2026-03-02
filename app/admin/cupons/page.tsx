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
}

export default function AdminCupons() {
  const [rows, setRows] = useState<Cupom[]>([])
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
    ativo: true
  })

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
      ativo: !!form.ativo
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
        ativo: true
      })
      carregar()
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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-xl font-semibold mb-4">Cupons</div>
      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
          {error.includes('relation') || error.includes('prisma')
            ? 'Estrutura de cupons ainda não migrada. Rode: npx prisma migrate dev'
            : error}
        </div>
      )}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="rounded-xl shadow bg-white p-4">
          <div className="text-sm font-medium mb-2">Criar novo</div>
          <form onSubmit={criar} className="grid grid-cols-2 gap-3">
            <input className="border rounded px-3 py-2 col-span-2" placeholder="CÓDIGO"
              value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} required />
            <select className="border rounded px-3 py-2"
              value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
              <option value="PERCENTUAL">Percentual (%)</option>
              <option value="VALOR_FIXO">Valor fixo (R$)</option>
              <option value="FRETE_GRATIS">Frete grátis</option>
            </select>
            <input className="border rounded px-3 py-2" type="number" step="0.01" placeholder="Valor"
              value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} required />
            <input className="border rounded px-3 py-2 col-span-2" placeholder="Descrição"
              value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
            <input className="border rounded px-3 py-2" type="number" step="0.01" placeholder="Valor mínimo"
              value={form.valorMinimoPedido} onChange={e => setForm({ ...form, valorMinimoPedido: e.target.value })} />
            <input className="border rounded px-3 py-2" type="number" step="1" placeholder="Limite total usos"
              value={form.limiteTotalUso} onChange={e => setForm({ ...form, limiteTotalUso: e.target.value })} />
            <input className="border rounded px-3 py-2" type="number" step="1" placeholder="Limite por cliente"
              value={form.limitePorCliente} onChange={e => setForm({ ...form, limitePorCliente: e.target.value })} />
            <label className="text-xs">
              Início
              <input className="border rounded px-3 py-2 w-full" type="datetime-local"
                value={form.dataInicio} onChange={e => setForm({ ...form, dataInicio: e.target.value })} />
            </label>
            <label className="text-xs">
              Fim
              <input className="border rounded px-3 py-2 w-full" type="datetime-local"
                value={form.dataFim} onChange={e => setForm({ ...form, dataFim: e.target.value })} />
            </label>
            <label className="flex items-center gap-2 col-span-2 text-sm">
              <input type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} />
              Ativo
            </label>
            <button className="px-3 py-2 rounded bg-gray-900 text-white col-span-2">Criar</button>
          </form>
        </div>
        <div className="md:col-span-2 rounded-xl shadow bg-white p-4">
          <div className="text-sm font-medium mb-2">Lista</div>
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
                    <th className="text-left px-3 py-2">Validade</th>
                    <th className="text-left px-3 py-2">Ativo</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(c => (
                    <tr key={c.id} className="border-t">
                      <td className="px-3 py-2 font-mono">{c.codigo}</td>
                      <td className="px-3 py-2">{c.tipo}</td>
                      <td className="px-3 py-2">
                        {c.tipo === 'PERCENTUAL' ? `${Number(c.valor)}%` : `R$ ${Number(c.valor).toFixed(2)}`}
                      </td>
                      <td className="px-3 py-2">
                        {new Date(c.dataInicio).toLocaleDateString()} - {new Date(c.dataFim).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2">{c.ativo ? 'Sim' : 'Não'}</td>
                      <td className="px-3 py-2 text-right">
                        <button className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 mr-2" onClick={() => toggleAtivo(c)}>
                          {c.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button className="px-2 py-1 rounded bg-red-600 text-white" onClick={() => remover(c.id)}>
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
