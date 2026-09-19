'use client'
import { useEffect, useState } from 'react'
import type { MetodosPagamentoCfg } from '@/lib/config'

const METODOS_DEFAULT: MetodosPagamentoCfg = {
  dinheiro: true,
  cartao: true,
  pix_online: true,
  pix_entrega: false
}

export default function AdminConfiguracoes() {
  const [taxaEntrega, setTaxaEntrega] = useState<number>(0)
  const [tempoEstimado, setTempoEstimado] = useState<number>(30)
  const [pixApiKey, setPixApiKey] = useState<string>('')
  const [pixChave, setPixChave] = useState<string>('')
  const [pixBeneficiario, setPixBeneficiario] = useState<string>('')
  const [pixCidade, setPixCidade] = useState<string>('')
  const [metodosPagamento, setMetodosPagamento] = useState<MetodosPagamentoCfg>({ ...METODOS_DEFAULT })
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [erro, setErro] = useState<string>('')

  useEffect(() => {
    fetch('/api/configuracoes')
      .then(r => r.json())
      .then(d => {
        const c = d.config
        if (!c) return
        setTaxaEntrega(Number(c.taxaEntrega || 0))
        setTempoEstimado(Number(c.tempoEstimado || 30))
        setPixApiKey(c.pixApiKey || '')
        setPixChave(c.pixChave || '')
        setPixBeneficiario(c.pixBeneficiario || '')
        setPixCidade(c.pixCidade || '')
        if (c.metodosPagamento && typeof c.metodosPagamento === 'object') {
          setMetodosPagamento({
            dinheiro: typeof c.metodosPagamento.dinheiro === 'boolean' ? c.metodosPagamento.dinheiro : METODOS_DEFAULT.dinheiro,
            cartao: typeof c.metodosPagamento.cartao === 'boolean' ? c.metodosPagamento.cartao : METODOS_DEFAULT.cartao,
            pix_online: typeof c.metodosPagamento.pix_online === 'boolean' ? c.metodosPagamento.pix_online : METODOS_DEFAULT.pix_online,
            pix_entrega: typeof c.metodosPagamento.pix_entrega === 'boolean' ? c.metodosPagamento.pix_entrega : METODOS_DEFAULT.pix_entrega
          })
        }
      })
  }, [])

  function toggleMetodo(chave: keyof MetodosPagamentoCfg) {
    setMetodosPagamento(prev => ({ ...prev, [chave]: !prev[chave] }))
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSavedOk(false)
    setErro('')
    const peloMenosUm =
      metodosPagamento.dinheiro || metodosPagamento.cartao || metodosPagamento.pix_online || metodosPagamento.pix_entrega
    if (!peloMenosUm) {
      setErro('Habilite pelo menos um método de pagamento.')
      setSaving(false)
      return
    }
    try {
      const res = await fetch('/api/configuracoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxaEntrega, tempoEstimado, pixApiKey, pixChave, pixBeneficiario, pixCidade, metodosPagamento })
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d?.error || 'Erro ao salvar configurações.')
      }
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 3000)
    } catch (err: any) {
      setErro(err?.message || 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const SwitchToggle = ({ enabled, onToggle, label, hint }: { enabled: boolean; onToggle: () => void; label: string; hint?: string }) => (
    <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer select-none">
      <div
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        className={`mt-0.5 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-800">{label}</div>
        {hint && <div className="text-xs text-gray-500 mt-0.5 leading-snug">{hint}</div>}
      </div>
      <input
        type="checkbox"
        className="sr-only"
        checked={enabled}
        onChange={onToggle}
      />
    </label>
  )

  return (
    <main className="p-2 md:p-4">
      <div className="text-xl font-semibold mb-3">Configurações</div>

      <section className="bg-white rounded-xl shadow p-4 max-w-2xl mb-4">
        <div className="text-sm font-semibold text-gray-700 mb-2">🛵 Entrega</div>
        <form onSubmit={salvar} className="grid gap-2">
          <label>
            <div className="text-sm text-gray-700">Taxa de entrega (R$)</div>
            <input
              className="w-full border rounded-lg px-3 py-2"
              type="number"
              step="0.01"
              value={taxaEntrega}
              onChange={e => setTaxaEntrega(Number(e.target.value))}
            />
          </label>
          <label>
            <div className="text-sm text-gray-700">Tempo estimado (minutos)</div>
            <input
              className="w-full border rounded-lg px-3 py-2"
              type="number"
              value={tempoEstimado}
              onChange={e => setTempoEstimado(Number(e.target.value))}
            />
          </label>
          <div className="pt-3" />
          <div className="border-t border-gray-100 pt-4 pb-2">
            <div className="text-sm font-semibold text-gray-700 mb-3">💳 Métodos de Pagamento Habilitados</div>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              Ative apenas as opções que deseja exibir no atendimento. Deixe pelo menos um método ligado.
            </p>
            <div className="grid gap-2">
              <SwitchToggle
                enabled={metodosPagamento.dinheiro}
                onToggle={() => toggleMetodo('dinheiro')}
                label="💵 Dinheiro"
                hint="Pagamento em espécie na entrega ou retirada."
              />
              <SwitchToggle
                enabled={metodosPagamento.cartao}
                onToggle={() => toggleMetodo('cartao')}
                label="💳 Cartão na entrega"
                hint="Crédito ou débito via maquininha no momento da entrega."
              />
              <SwitchToggle
                enabled={metodosPagamento.pix_online}
                onToggle={() => toggleMetodo('pix_online')}
                label="📱 Pix online (QR Code Mercado Pago)"
                hint="Gera QR Code e cobrança imediata via API do Mercado Pago."
              />
              <SwitchToggle
                enabled={metodosPagamento.pix_entrega}
                onToggle={() => toggleMetodo('pix_entrega')}
                label="📱 Pix na entrega (sem QR Code)"
                hint="Cliente paga Pix no balcão/entregador. Não gera QR Code."
              />
            </div>
          </div>
          <div className="pt-2" />
          <div className="border-t border-gray-100 py-3">
            <div className="text-sm font-semibold text-gray-700 mb-2">🔑 Pix (Mercado Pago)</div>
            <p className="text-xs text-gray-500 mb-2 leading-relaxed">
              Cole abaixo seu <span className="font-semibold">Access Token</span> do Mercado Pago (começa com <code className="bg-gray-100 px-1 rounded">APP_USR-...</code>).
              Ao salvar, o sistema passa a gerar Pix <b>reais</b> no lugar do modo demonstração.
              Se houver qualquer erro de conexão/credencial, ele cai automaticamente no simulador.
            </p>
            <label className="block mb-2">
              <div className="text-sm text-gray-700">Mercado Pago · Access Token <span className="text-amber-600 font-medium">*</span></div>
              <input
                className="w-full border rounded-lg px-3 py-2 font-mono text-xs"
                placeholder="APP_USR-1234567890123456-010101-abcdef..."
                value={pixApiKey}
                onChange={e => setPixApiKey(e.target.value.trim())}
                type="password"
              />
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <label>
                <div className="text-sm text-gray-700">Sua chave Pix</div>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="ex: 12345678909 ou pix@sualoja.com"
                  value={pixChave}
                  onChange={e => setPixChave(e.target.value.trim())}
                />
              </label>
              <label>
                <div className="text-sm text-gray-700">Cidade (UF)</div>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="ex: SAO PAULO"
                  value={pixCidade}
                  onChange={e => setPixCidade(e.target.value.toUpperCase())}
                />
              </label>
              <label className="md:col-span-2">
                <div className="text-sm text-gray-700">Nome do beneficiário (seu nome / razão social)</div>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="ex: LOJA DEMONSTRACAO LTDA"
                  value={pixBeneficiario}
                  onChange={e => setPixBeneficiario(e.target.value.toUpperCase())}
                />
              </label>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            <button type="submit" className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50 font-semibold" disabled={saving}>
              {saving ? 'Salvando...' : '💾 Salvar'}
            </button>
            {savedOk && (
              <span className="text-sm text-emerald-600 font-semibold">✅ Salvo com sucesso!</span>
            )}
            {erro && (
              <span className="text-sm text-red-600 font-semibold">⚠️ {erro}</span>
            )}
          </div>
        </form>
      </section>
    </main>
  )
}
