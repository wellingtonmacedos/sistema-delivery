'use client'
import { useEffect, useState } from 'react'

export default function AdminConfiguracoes() {
  const [taxaEntrega, setTaxaEntrega] = useState<number>(0)
  const [tempoEstimado, setTempoEstimado] = useState<number>(30)
  const [pixApiKey, setPixApiKey] = useState<string>('')
  const [pixChave, setPixChave] = useState<string>('')
  const [saving, setSaving] = useState(false)

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
      })
  }, [])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch('/api/configuracoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxaEntrega, tempoEstimado, pixApiKey, pixChave })
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="p-2 md:p-4">
      <div className="text-xl font-semibold mb-3">Configurações</div>
      <section className="bg-white rounded-xl shadow p-4 max-w-xl">
        <form onSubmit={salvar} className="grid gap-2">
          <label>
            <div className="text-sm text-gray-700">Taxa de entrega</div>
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
          <label>
            <div className="text-sm text-gray-700">Pix API Key</div>
            <input className="w-full border rounded-lg px-3 py-2" value={pixApiKey} onChange={e => setPixApiKey(e.target.value)} />
          </label>
          <label>
            <div className="text-sm text-gray-700">Pix Chave</div>
            <input className="w-full border rounded-lg px-3 py-2" value={pixChave} onChange={e => setPixChave(e.target.value)} />
          </label>
          <button type="submit" className="px-3 py-2 rounded-lg bg-black text-white disabled:opacity-50" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </section>
    </main>
  )
}
