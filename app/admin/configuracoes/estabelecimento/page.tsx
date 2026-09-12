'use client'
import { useEffect, useMemo, useState } from 'react'
import { safePerfil } from '@/lib/perfil'
import { calcularStatusAbertura } from '@/lib/horarioFuncionamento'
import { mascaraReal, mascaraRealToNumber, exibirTelefone } from '@/lib/mascaras'

type DiasSemana = 'dom' | 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab'

type EstabelecimentoConfig = {
  id: string
  nome: string
  descricao: string
  telefone: string
  perfil?: 'LANCHONETE' | 'ACAITERIA' | 'PIZZARIA' | 'DISTRIBUIDORA'
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
  taxaEntregaPadrao: string
  permitirRetirada: boolean
  aberto: boolean
  entregaHabilitada: boolean
  raioAtendimentoKm: string
  tempoEntregaMinutos: string
  valorMinimoPedido: string
}

const DIAS_SEMANA: { id: DiasSemana; label: string }[] = [
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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function carregar() {
    setLoading(true)
    setSaved(false)
    setErro(null)
    const r = await fetch('/api/admin/configuracoes/estabelecimento', { credentials: 'include' })
    if (r.ok) {
      const d = await r.json()
      const e = d.estabelecimento || {}
      setIsSuperAdmin(d?.admin?.role === 'SUPER_ADMIN')
      setConfig({
        id: e.id,
        nome: e.nome || '',
        descricao: e.descricao || '',
        telefone: e.telefone || '',
        perfil: safePerfil(e.perfil) || 'LANCHONETE',
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
        taxaEntregaPadrao: mascaraReal(
          typeof e.taxaEntregaPadrao === 'number' ? e.taxaEntregaPadrao : 0
        ),
        permitirRetirada: e.permitirRetirada ?? true,
        aberto: e.aberto ?? true,
        entregaHabilitada: e.entregaHabilitada ?? true,
        raioAtendimentoKm:
          e.raioAtendimentoKm !== undefined && e.raioAtendimentoKm !== null && e.raioAtendimentoKm !== ''
            ? mascaraReal(String(e.raioAtendimentoKm))
            : '',
        tempoEntregaMinutos:
          e.tempoEntregaMinutos !== undefined && e.tempoEntregaMinutos !== null && e.tempoEntregaMinutos !== ''
            ? String(e.tempoEntregaMinutos)
            : '',
        valorMinimoPedido:
          e.valorMinimoPedido !== undefined && e.valorMinimoPedido !== null && e.valorMinimoPedido !== ''
            ? mascaraReal(String(e.valorMinimoPedido))
            : ''
      })
    } else {
      const d = await r.json().catch(() => ({}))
      setErro(d?.error || 'Erro ao carregar configurações.')
    }
    setLoading(false)
  }

  async function salvar() {
    if (!config) return
    setSaving(true)
    setSaved(false)
    setErro(null)
    const taxa = mascaraRealToNumber(config.taxaEntregaPadrao) ?? 0
    const valorMinimo = mascaraRealToNumber(config.valorMinimoPedido)
    const raioStr = config.raioAtendimentoKm.replace(/\D/g, '')
    const raio = raioStr ? Math.round(Number(raioStr)) / 100 : null
    const tempo = config.tempoEntregaMinutos ? Math.round(Number(config.tempoEntregaMinutos)) : null
    const endereco =
      config.endereco &&
      Object.values(config.endereco).some(v => v && String(v).trim().length > 0)
        ? config.endereco
        : null
    const diasAtivos = config.diasAtivos.length > 0 ? config.diasAtivos : null

    const body: Record<string, any> = {
      nome: config.nome,
      descricao: config.descricao,
      telefone: config.telefone,
      endereco,
      horarioAbertura: config.horarioAbertura || null,
      horarioFechamento: config.horarioFechamento || null,
      diasAtivos,
      taxaEntregaPadrao: taxa,
      permitirRetirada: config.permitirRetirada,
      aberto: config.aberto,
      entregaHabilitada: config.entregaHabilitada,
      raioAtendimentoKm: raio,
      tempoEntregaMinutos: tempo,
      valorMinimoPedido: valorMinimo
    }
    if (isSuperAdmin) {
      body.perfil = config.perfil
    }
    const r = await fetch('/api/admin/configuracoes/estabelecimento', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    setSaving(false)
    if (r.ok) {
      setSaved(true)
      carregar()
    } else {
      const d = await r.json().catch(() => ({}))
      let msg = d?.error || 'Erro ao salvar.'
      switch (msg) {
        case 'nome_obrigatorio':
          msg = 'Informe o nome do estabelecimento.'
          break
        case 'telefone_invalido':
          msg = 'Telefone inválido. Apenas números com DDD.'
          break
        case 'horario_invalido':
          msg = 'Horário inválido. Use HH:MM (ex: 18:00).'
          break
        case 'taxa_invalida':
          msg = 'Taxa de entrega inválida.'
          break
        case 'raio_invalido':
          msg = 'Raio de atendimento inválido.'
          break
        case 'tempo_invalido':
          msg = 'Tempo de entrega inválido.'
          break
        case 'valor_minimo_invalido':
          msg = 'Valor mínimo do pedido inválido.'
          break
        case 'perfil_somente_super_admin':
          msg = 'Apenas Super Admin pode trocar perfil.'
          break
        case 'perfil_invalido':
          msg = 'Perfil inválido.'
          break
      }
      setErro(msg)
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

  const statusFunc = useMemo(() => {
    if (!config) return null
    return calcularStatusAbertura({
      abertoManual: config.aberto,
      diasAtivos: config.diasAtivos as any,
      horarioAbertura: config.horarioAbertura || null,
      horarioFechamento: config.horarioFechamento || null
    })
  }, [config?.aberto, config?.diasAtivos, config?.horarioAbertura, config?.horarioFechamento, config])

  if (loading || !config) {
    return (
      <main className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="h-8 w-48 bg-slate-200 rounded mb-4 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-48 bg-slate-200 rounded-xl animate-pulse" />
            <div className="h-48 bg-slate-200 rounded-xl animate-pulse" />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Configurações do Estabelecimento</h1>
            <p className="text-sm text-slate-500 mt-1">Gerencie informações, funcionamento e status operacional.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {statusFunc?.aberto ? (
              <span
                title={statusFunc.motivo}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Aberto agora
              </span>
            ) : (
              <span
                title={statusFunc?.motivo || 'Status indisponível'}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 font-medium"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                Fechado
              </span>
            )}
            {statusFunc?.configurado === false && (
              <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 font-medium">
                ⚠️ Sem horário configurado
              </span>
            )}
          </div>
        </div>

        {saved && (
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-sm">
            <span>✅</span> Alterações salvas com sucesso.
          </div>
        )}
        {erro && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 shadow-sm">
            ⚠️ {erro}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-sm">ℹ️</div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Informações básicas</div>
                <div className="text-[11px] text-slate-500">Dados principais do seu estabelecimento.</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Perfil do estabelecimento</label>
                <select
                  disabled={!isSuperAdmin}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm transition ${
                    isSuperAdmin
                      ? 'border-slate-300 bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500'
                      : 'border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed'
                  }`}
                  value={safePerfil(config.perfil) || 'LANCHONETE'}
                  onChange={e =>
                    setConfig({
                      ...config,
                      perfil: e.target.value as 'LANCHONETE' | 'ACAITERIA' | 'PIZZARIA' | 'DISTRIBUIDORA'
                    })
                  }
                >
                  <option value="LANCHONETE">🍔 Lanchonete</option>
                  <option value="ACAITERIA">🍧 Açaiteria</option>
                  <option value="PIZZARIA">🍕 Pizzaria</option>
                  <option value="DISTRIBUIDORA">🥤 Distribuidora de Bebidas</option>
                </select>
                {!isSuperAdmin && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-1.5">
                    Apenas Super Admin pode alterar o perfil do estabelecimento. Contate o administrador geral se precisar trocar.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Nome do estabelecimento</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 transition"
                  value={config.nome}
                  onChange={e => setConfig({ ...config, nome: e.target.value })}
                  placeholder="Ex: Cantina da Esquina"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Descrição</label>
                <textarea
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm min-h-[84px] bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 transition"
                  value={config.descricao}
                  onChange={e => setConfig({ ...config, descricao: e.target.value })}
                  placeholder="Sobre o seu estabelecimento, aparece no topo do cardápio."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">WhatsApp / Telefone de contato</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 transition"
                  value={config.telefone}
                  onChange={e => setConfig({ ...config, telefone: e.target.value })}
                  placeholder="Apenas números com DDD. Ex: 11977778888"
                />
                {config.telefone && (
                  <div className="text-[11px] text-slate-500">
                    Aparecerá no chat como: <span className="font-mono">{exibirTelefone(config.telefone)}</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-sm">📍</div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Endereço principal</div>
                <div className="text-[11px] text-slate-500">Exibido na tela de confirmação do pedido.</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Rua / Av.</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 transition"
                  value={config.endereco.rua || ''}
                  onChange={e => setConfig({ ...config, endereco: { ...config.endereco, rua: e.target.value } })}
                  placeholder="Rua das Nações"
                />
              </div>
              <div className="grid grid-cols-[2fr_1fr] gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Bairro</label>
                  <input
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 transition"
                    value={config.endereco.bairro || ''}
                    onChange={e => setConfig({ ...config, endereco: { ...config.endereco, bairro: e.target.value } })}
                    placeholder="Centro"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Número</label>
                  <input
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 transition"
                    value={config.endereco.numero || ''}
                    onChange={e => setConfig({ ...config, endereco: { ...config.endereco, numero: e.target.value } })}
                    placeholder="123"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Cidade</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 transition"
                  value={config.endereco.cidade || ''}
                  onChange={e => setConfig({ ...config, endereco: { ...config.endereco, cidade: e.target.value } })}
                  placeholder="São Paulo"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Complemento</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 transition"
                  value={config.endereco.complemento || ''}
                  onChange={e =>
                    setConfig({ ...config, endereco: { ...config.endereco, complemento: e.target.value } })
                  }
                  placeholder="Apto 401 / Loja 2 / Esquina (opcional)"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-sm">⏰</div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Funcionamento</div>
                <div className="text-[11px] text-slate-500">Quando você recebe pedidos.</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Abre às</label>
                <input
                  type="time"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 transition"
                  value={config.horarioAbertura}
                  onChange={e => setConfig({ ...config, horarioAbertura: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Fecha às</label>
                <input
                  type="time"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 transition"
                  value={config.horarioFechamento}
                  onChange={e => setConfig({ ...config, horarioFechamento: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Dias da semana</label>
              <div className="flex flex-wrap gap-1.5">
                {DIAS_SEMANA.map(d => {
                  const on = config.diasAtivos.includes(d.id)
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDia(d.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                        on
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm hover:bg-emerald-800'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>
              {config.diasAtivos.length === 0 && (
                <div className="text-[11px] text-slate-500">
                  ⚠️ Nenhum dia selecionado — escolha pelo menos 1.
                </div>
              )}
            </div>

            <div className="mt-2 pt-3 border-t border-slate-100 space-y-2">
              <label className="inline-flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                <span className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={config.aberto}
                    onChange={e => setConfig({ ...config, aberto: e.target.checked })}
                    className="sr-only peer"
                  />
                  <span className="w-10 h-5 rounded-full bg-slate-200 peer-checked:bg-emerald-600 transition" />
                  <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                </span>
                <span className="text-sm font-medium text-slate-800">🏪 Permitir pedidos agora</span>
              </label>
              <div className="text-[11px] text-slate-500 leading-relaxed">
                Desligue para fechar manualmente (feriado, manutenção, recesso) — <strong className="text-slate-700">override</strong> de dias e horários.
              </div>
              {!config.aberto && (
                <div className="mt-2.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  ⚠️ Loja fechada MANUALMENTE. Nenhum pedido será aceito no chat enquanto isso estiver desligado.
                </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-sm">🚚</div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Entrega</div>
                <div className="text-[11px] text-slate-500">Regras e valores de entrega.</div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="inline-flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                <span className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={config.entregaHabilitada}
                    onChange={e => setConfig({ ...config, entregaHabilitada: e.target.checked })}
                    className="sr-only peer"
                  />
                  <span className="w-10 h-5 rounded-full bg-slate-200 peer-checked:bg-slate-900 transition" />
                  <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                </span>
                <span className="text-sm font-medium">Habilitar entrega</span>
              </label>

              <label className="inline-flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                <span className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={config.permitirRetirada}
                    onChange={e => setConfig({ ...config, permitirRetirada: e.target.checked })}
                    className="sr-only peer"
                  />
                  <span className="w-10 h-5 rounded-full bg-slate-200 peer-checked:bg-slate-900 transition" />
                  <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                </span>
                <span className="text-sm font-medium">🧍 Permitir retirada no local</span>
              </label>

              <div className={`space-y-1.5 ${!config.entregaHabilitada ? 'opacity-60' : ''}`}>
                <label className="text-xs font-medium text-slate-600">Taxa de entrega padrão</label>
                <input
                  disabled={!config.entregaHabilitada}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 transition ${
                    !config.entregaHabilitada ? 'border-slate-200 bg-slate-50 cursor-not-allowed' : 'border-slate-300'
                  }`}
                  placeholder="R$ 0,00"
                  value={config.taxaEntregaPadrao}
                  onChange={e => setConfig({ ...config, taxaEntregaPadrao: mascaraReal(e.target.value) })}
                />
              </div>

              <div className={`space-y-1.5 ${!config.entregaHabilitada ? 'opacity-60' : ''}`}>
                <label className="text-xs font-medium text-slate-600">Valor mínimo do pedido</label>
                <input
                  disabled={!config.entregaHabilitada}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 transition ${
                    !config.entregaHabilitada ? 'border-slate-200 bg-slate-50 cursor-not-allowed' : 'border-slate-300'
                  }`}
                  placeholder="Deixe vazio = sem mínimo"
                  value={config.valorMinimoPedido}
                  onChange={e => setConfig({ ...config, valorMinimoPedido: mascaraReal(e.target.value) })}
                />
              </div>

              <div className={`grid grid-cols-2 gap-3 ${!config.entregaHabilitada ? 'opacity-60' : ''}`}>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Raio (km)</label>
                  <input
                    disabled={!config.entregaHabilitada}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 transition ${
                      !config.entregaHabilitada ? 'border-slate-200 bg-slate-50 cursor-not-allowed' : 'border-slate-300'
                    }`}
                    placeholder="5,0"
                    value={config.raioAtendimentoKm}
                    onChange={e => setConfig({ ...config, raioAtendimentoKm: mascaraReal(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Tempo (min)</label>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    disabled={!config.entregaHabilitada}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 transition ${
                      !config.entregaHabilitada ? 'border-slate-200 bg-slate-50 cursor-not-allowed' : 'border-slate-300'
                    }`}
                    placeholder="30"
                    value={config.tempoEntregaMinutos}
                    onChange={e => setConfig({ ...config, tempoEntregaMinutos: e.target.value })}
                  />
                </div>
              </div>

              {!config.entregaHabilitada && !config.permitirRetirada && (
                <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  ⚠️ Você desligou entrega e retirada — nenhum pedido será possível.
                </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-sm">🟢</div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Status operacional</div>
                <div className="text-[11px] text-slate-500">Atualização em tempo real.</div>
              </div>
            </div>

            <div className="space-y-3">
              {statusFunc?.aberto ? (
                <div title={statusFunc.motivo} className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Aberto agora
                  </div>
                  <div className="text-[11px] text-emerald-700 leading-relaxed">{statusFunc.motivo}</div>
                  {statusFunc.configurado && statusFunc.horarioHojeAbre && statusFunc.horarioHojeFecha && (
                    <div className="text-[11px] text-emerald-700 font-mono pt-0.5">
                      Hoje: {statusFunc.horarioHojeAbre} → {statusFunc.horarioHojeFecha}
                    </div>
                  )}
                </div>
              ) : (
                <div title={statusFunc?.motivo || ''} className="rounded-xl bg-red-50 border border-red-200 p-3.5 space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    Fechado
                  </div>
                  <div className="text-[11px] text-red-700 leading-relaxed">{statusFunc?.motivo || 'Status indisponível.'}</div>
                </div>
              )}

              {statusFunc?.configurado === false && config.aberto && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-1">
                  <div className="text-[11px] font-semibold text-amber-800">⚠️ Sem horário configurado</div>
                  <div className="text-[11px] text-amber-700 leading-relaxed">
                    Sem horários e dias configurados — o sistema considera sua loja <strong>aberta</strong> por padrão
                    para evitar bugs acidentais. Defina horários para controle automático.
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-2 space-y-0.5">
                    <div className="text-slate-500">Entrega</div>
                    <div className={`font-semibold ${config.entregaHabilitada ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                      {config.entregaHabilitada ? 'Ativa' : 'Desligada'}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-2 space-y-0.5">
                    <div className="text-slate-500">Retirada</div>
                    <div className={`font-semibold ${config.permitirRetirada ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                      {config.permitirRetirada ? 'Permitida' : 'Não permite'}
                    </div>
                  </div>
                  {config.taxaEntregaPadrao && config.entregaHabilitada && (
                    <div className="rounded-lg bg-slate-50 border border-slate-100 p-2 space-y-0.5 col-span-1">
                      <div className="text-slate-500">Taxa</div>
                      <div className="font-semibold text-slate-900 font-mono">{config.taxaEntregaPadrao}</div>
                    </div>
                  )}
                  {config.valorMinimoPedido && config.entregaHabilitada && (
                    <div className="rounded-lg bg-slate-50 border border-slate-100 p-2 space-y-0.5 col-span-1">
                      <div className="text-slate-500">Mínimo</div>
                      <div className="font-semibold text-slate-900 font-mono">{config.valorMinimoPedido}</div>
                    </div>
                  )}
                  {config.tempoEntregaMinutos && config.entregaHabilitada && (
                    <div className="rounded-lg bg-slate-50 border border-slate-100 p-2 space-y-0.5 col-span-1">
                      <div className="text-slate-500">Tempo</div>
                      <div className="font-semibold text-slate-900">{config.tempoEntregaMinutos} min</div>
                    </div>
                  )}
                  {config.raioAtendimentoKm && config.entregaHabilitada && (
                    <div className="rounded-lg bg-slate-50 border border-slate-100 p-2 space-y-0.5 col-span-1">
                      <div className="text-slate-500">Raio</div>
                      <div className="font-semibold text-slate-900 font-mono">{config.raioAtendimentoKm} km</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={salvar}
            disabled={saving || !config}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium shadow-sm hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {saving ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Salvando...
              </>
            ) : (
              <>💾 Salvar alterações</>
            )}
          </button>
          <button
            type="button"
            onClick={carregar}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            ↺ Atualizar
          </button>
          {saved && (
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 font-medium">
              ✅ Alterações salvas com sucesso.
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
