'use client'
import { useEffect, useState } from 'react'

type DiasSemana = 'dom' | 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab'

type EstabelecimentoConfig = {
  id: string
  nome: string
  descricao: string
  telefone: string
  perfil?: 'LANCHONETE' | 'ACAITERIA' | 'PIZZARIA'
  endereco: {
    rua?: string
    numero?: string
    bairro?: string
    cidade?: string
    complemento?: string
  }
  horarioAbertura: string
  horarioFechamento: string
  diasAtivos: DiasSemana[]
  taxaEntregaPadrao: number
  permitirRetirada: boolean
  aberto: boolean
}

const diasLabels: { id: DiasSemana; label: string }[] = [
  { id: 'dom', label: 'Dom' },
  { id: 'seg', label: 'Seg' },
  { id: 'ter', label: 'Ter' },
  { id: 'qua', label: 'Qua' },
  { id: 'qui', label: 'Qui' },
  { id: 'sex', label: 'Sex' },
  { id: 'sab', label: 'Sáb' }
]

export default function EstabelecimentoConfigPage() {
  const [config, setConfig] = useState<EstabelecimentoConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function carregar() {
    setLoading(true)
    setSaved(false)
    const r = await fetch('/api/admin/configuracoes/estabelecimento')
    if (r.ok) {
      const d = await r.json()
      const e = d.estabelecimento || {}
      setConfig({
        id: e.id,
        nome: e.nome || '',
        descricao: e.descricao || '',
        telefone: e.telefone || '',
        perfil: e.perfil || 'LANCHONETE',
        endereco: {
          rua: e.endereco?.rua || '',
          numero: e.endereco?.numero || '',
          bairro: e.endereco?.bairro || '',
          cidade: e.endereco?.cidade || '',
          complemento: e.endereco?.complemento || ''
        },
        horarioAbertura: e.horarioAbertura || '',
        horarioFechamento: e.horarioFechamento || '',
        diasAtivos: Array.isArray(e.diasAtivos) ? e.diasAtivos : [],
        taxaEntregaPadrao: typeof e.taxaEntregaPadrao === 'number' ? e.taxaEntregaPadrao : 0,
        permitirRetirada: e.permitirRetirada ?? true,
        aberto: e.aberto ?? true
      })
    }
    setLoading(false)
  }

  async function salvar() {
    if (!config) return
    setSaving(true)
    setSaved(false)
    const body = {
      nome: config.nome,
      descricao: config.descricao,
      telefone: config.telefone,
      perfil: config.perfil,
      endereco: config.endereco,
      horarioAbertura: config.horarioAbertura,
      horarioFechamento: config.horarioFechamento,
      diasAtivos: config.diasAtivos,
      taxaEntregaPadrao: config.taxaEntregaPadrao,
      permitirRetirada: config.permitirRetirada,
      aberto: config.aberto
    }
    const r = await fetch('/api/admin/configuracoes/estabelecimento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    setSaving(false)
    if (r.ok) {
      setSaved(true)
      carregar()
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  function toggleDia(id: DiasSemana) {
    if (!config) return
    const on = config.diasAtivos.includes(id)
    setConfig({
      ...config,
      diasAtivos: on ? config.diasAtivos.filter(d => d !== id) : [...config.diasAtivos, id]
    })
  }

  if (loading || !config) {
    return (
      <main className="min-h-screen p-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="h-8 w-48 bg-gray-200 rounded mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-48 bg-gray-200 rounded-xl" />
            <div className="h-48 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <div className="text-2xl font-semibold">Configurações do Estabelecimento</div>
          <div className="text-sm text-gray-600">Gerencie informações, funcionamento e status operacional.</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="bg-white rounded-xl shadow p-4 space-y-3">
            <div className="text-sm font-medium">Informações básicas</div>
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="text-xs text-gray-600">Perfil do estabelecimento</div>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={config.perfil || 'LANCHONETE'}
                  onChange={e =>
                    setConfig({ ...config, perfil: e.target.value as 'LANCHONETE' | 'ACAITERIA' | 'PIZZARIA' })
                  }
                >
                  <option value="LANCHONETE">Lanchonete</option>
                  <option value="ACAITERIA">Açaiteria</option>
                  <option value="PIZZARIA">Pizzaria</option>
                </select>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-600">Nome do estabelecimento</div>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={config.nome}
                  onChange={e => setConfig({ ...config, nome: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-600">Descrição</div>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[72px]"
                  value={config.descricao}
                  onChange={e => setConfig({ ...config, descricao: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-600">Telefone de contato</div>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={config.telefone}
                  onChange={e => setConfig({ ...config, telefone: e.target.value })}
                  placeholder="Apenas números, com DDD"
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow p-4 space-y-3">
            <div className="text-sm font-medium">Endereço principal</div>
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="text-xs text-gray-600">Rua</div>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={config.endereco.rua || ''}
                  onChange={e => setConfig({ ...config, endereco: { ...config.endereco, rua: e.target.value } })}
                />
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">Bairro</div>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={config.endereco.bairro || ''}
                    onChange={e => setConfig({ ...config, endereco: { ...config.endereco, bairro: e.target.value } })}
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">Número</div>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={config.endereco.numero || ''}
                    onChange={e => setConfig({ ...config, endereco: { ...config.endereco, numero: e.target.value } })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-600">Cidade</div>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={config.endereco.cidade || ''}
                  onChange={e => setConfig({ ...config, endereco: { ...config.endereco, cidade: e.target.value } })}
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-600">Complemento</div>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={config.endereco.complemento || ''}
                  onChange={e =>
                    setConfig({ ...config, endereco: { ...config.endereco, complemento: e.target.value } })
                  }
                />
              </div>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <section className="bg-white rounded-xl shadow p-4 space-y-3">
            <div className="text-sm font-medium">Funcionamento</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="text-xs text-gray-600">Abertura</div>
                <input
                  type="time"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={config.horarioAbertura}
                  onChange={e => setConfig({ ...config, horarioAbertura: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-600">Fechamento</div>
                <input
                  type="time"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={config.horarioFechamento}
                  onChange={e => setConfig({ ...config, horarioFechamento: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-600">Dias da semana ativos</div>
              <div className="flex flex-wrap gap-1">
                {diasLabels.map(d => {
                  const on = config.diasAtivos.includes(d.id)
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDia(d.id)}
                      className={`px-2 py-1 rounded-full text-xs border ${
                        on ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow p-4 space-y-3">
            <div className="text-sm font-medium">Entrega</div>
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="text-xs text-gray-600">Taxa de entrega padrão (R$)</div>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={config.taxaEntregaPadrao}
                  onChange={e => setConfig({ ...config, taxaEntregaPadrao: Number(e.target.value || 0) })}
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={config.permitirRetirada}
                  onChange={e => setConfig({ ...config, permitirRetirada: e.target.checked })}
                  className="rounded border-gray-300"
                />
                Permitir retirada no local
              </label>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow p-4 space-y-3">
            <div className="text-sm font-medium">Status</div>
            <div className="space-y-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={config.aberto}
                  onChange={e => setConfig({ ...config, aberto: e.target.checked })}
                  className="rounded border-gray-300"
                />
                Estabelecimento aberto (recebendo pedidos)
              </label>
              <p className="text-xs text-gray-500">
                Quando fechado, o chat público exibirá uma mensagem avisando que o estabelecimento está fechado e não
                permitirá novos pedidos.
              </p>
            </div>
          </section>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={salvar}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
          {saved && <div className="text-xs text-green-600">Alterações salvas com sucesso.</div>}
        </div>
      </div>
    </main>
  )
}
