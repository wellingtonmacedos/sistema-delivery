'use client'
import { useEffect, useState } from 'react'

type Est = {
  id: string
  nome: string
  slug: string
  logoUrl?: string | null
  corPrimaria: string
  corBot: string
  corTexto: string
  corFundoChat: string
}

export default function ChatConfigPage() {
  const [est, setEst] = useState<Est | null>(null)
  const [form, setForm] = useState<Partial<Est>>({})
  const [preview, setPreview] = useState<Partial<Est>>({})
  const [uploading, setUploading] = useState(false)

  async function carregar() {
    const r = await fetch('/api/admin/configuracoes/chat')
    if (r.ok) {
      const d = await r.json()
      setEst(d.estabelecimento)
      setForm(d.estabelecimento)
      setPreview(d.estabelecimento)
    }
  }
  async function salvar() {
    const r = await fetch('/api/admin/configuracoes/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corPrimaria: preview.corPrimaria,
        corBot: preview.corBot,
        corTexto: preview.corTexto,
        corFundoChat: preview.corFundoChat
      })
    })
    if (r.ok) carregar()
  }
  async function uploadLogo(f: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', f)
    const r = await fetch('/api/admin/configuracoes/chat/logo', { method: 'POST', body: fd })
    setUploading(false)
    if (r.ok) {
      const d = await r.json()
      setPreview(p => ({ ...p, logoUrl: d.logoUrl }))
      setForm(f => ({ ...f, logoUrl: d.logoUrl }))
    }
  }

  useEffect(() => { carregar() }, [])

  const corPrimaria = preview.corPrimaria || '#22c55e'
  const corBot = preview.corBot || '#f3f4f6'
  const corTexto = preview.corTexto || '#111827'
  const corFundoChat = preview.corFundoChat || '#f9fafb'

  return (
    <main style={{ padding: 24 }}>
      <h1>Personalização do Chat</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
        <section>
          <div style={{ display: 'grid', gap: 8 }}>
            <label>
              Logo
              <div style={{ marginTop: 6 }}>
                <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
              </div>
            </label>
            <label>
              Cor do balão do usuário
              <input type="color" value={corPrimaria} onChange={e => setPreview(p => ({ ...p, corPrimaria: e.target.value }))} />
            </label>
            <label>
              Cor do balão do bot
              <input type="color" value={corBot} onChange={e => setPreview(p => ({ ...p, corBot: e.target.value }))} />
            </label>
            <label>
              Cor do texto
              <input type="color" value={corTexto} onChange={e => setPreview(p => ({ ...p, corTexto: e.target.value }))} />
            </label>
            <label>
              Cor do fundo do chat
              <input type="color" value={corFundoChat} onChange={e => setPreview(p => ({ ...p, corFundoChat: e.target.value }))} />
            </label>
            <button onClick={salvar} disabled={uploading} style={{ padding: '8px 12px', borderRadius: 8, backgroundColor: '#111', color: '#fff' }}>
              Salvar Personalização
            </button>
          </div>
        </section>
        <section>
          <div style={{ border: '1px solid #ddd', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: 12, textAlign: 'center' }}>
              {preview.logoUrl ? (
                <img src={preview.logoUrl} alt="Logo" style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ fontWeight: 600 }}>{est?.nome || 'Estabelecimento'}</div>
              )}
              <div style={{ fontSize: 12, color: '#777' }}>{est?.slug}</div>
            </div>
            <div style={{ height: 480, backgroundColor: corFundoChat, display: 'flex', flexDirection: 'column', padding: 16, gap: 8 }}>
              <div style={{ alignSelf: 'flex-start', backgroundColor: corBot, color: corTexto, borderRadius: 16, padding: '8px 12px' }}>Olá! Em que posso ajudar?</div>
              <div style={{ alignSelf: 'flex-end', backgroundColor: corPrimaria, color: '#fff', borderRadius: 16, padding: '8px 12px' }}>Quero pedir uma pizza grande.</div>
              <div style={{ alignSelf: 'flex-start', backgroundColor: corBot, color: corTexto, borderRadius: 16, padding: '8px 12px' }}>Perfeito! Qual sabor você prefere?</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
