'use client'
import { useEffect, useState } from 'react'

export default function AdminConfiguracoes() {
  const [taxaEntrega, setTaxaEntrega] = useState<number>(0)
  const [tempoEstimado, setTempoEstimado] = useState<number>(30)
  const [pixApiKey, setPixApiKey] = useState<string>('')
  const [pixChave, setPixChave] = useState<string>('')
  const [pixBeneficiario, setPixBeneficiario] = useState<string>('')
  const [pixCidade, setPixCidade] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)

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
      })
  }, [])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSavedOk(false)
    try {
      await fetch('/api/configuracoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxaEntrega, tempoEstimado, pixApiKey, pixChave, pixBeneficiario, pixCidade })
      })
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 3000)
    } finally {
      setSaving(false)
    }
  }

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
          <div className="pt-4" />
          <div className="border-t border-gray-100 py-3">
            <div className="text-sm font-semibold text-gray-700 mb-2">💳 Pix (Mercado Pago)</div>
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
          <div className="flex items-center gap-3 pt-1">
            <button type="submit" className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50 font-semibold" disabled={saving}>
              {saving ? 'Salvando...' : '💾 Salvar'}
            </button>
            {savedOk && (
              <span className="text-sm text-emerald-600 font-semibold">✅ Salvo com sucesso!</span>
            )}
          </div>
        </form>
      </section>
    </main>
  )
}
