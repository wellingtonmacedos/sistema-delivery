'use client'
import { useEffect, useState } from 'react'

type TemaChat = 'PADRAO' | 'DARK' | 'MODERNO' | 'MINIMAL'
type BordaBalao = 'ARREDONDADO' | 'MEDIO' | 'RETO'

type Est = {
  id: string
  nome: string
  slug: string
  logoUrl?: string | null
  corPrimaria: string
  corBot: string
  corTexto: string
  corFundoChat: string
  nomeBot: string
  mensagemBoasVindas?: string | null
  avatarBotUrl?: string | null
  temaChat: TemaChat
  bordaBaloes: BordaBalao
  sombraBaloes: boolean
}

type Aba = 'aparencia' | 'identidade' | 'mensagens' | 'tema' | 'avancado'

const defaultWelcome = 'Olá 👋 Seja bem-vindo!\nInforme seu telefone para começarmos.'

const temasPresets: Record<TemaChat, { corPrimaria: string; corBot: string; corTexto: string; corFundoChat: string }> = {
  PADRAO: {
    corPrimaria: '#22c55e',
    corBot: '#f3f4f6',
    corTexto: '#111827',
    corFundoChat: '#f9fafb'
  },
  DARK: {
    corPrimaria: '#22c55e',
    corBot: '#1f2933',
    corTexto: '#e5e7eb',
    corFundoChat: '#020617'
  },
  MODERNO: {
    corPrimaria: '#6366f1',
    corBot: '#eef2ff',
    corTexto: '#111827',
    corFundoChat: '#f9fafb'
  },
  MINIMAL: {
    corPrimaria: '#111827',
    corBot: '#f3f4f6',
    corTexto: '#111827',
    corFundoChat: '#ffffff'
  }
}

export default function ChatConfigPage() {
  const [est, setEst] = useState<Est | null>(null)
  const [config, setConfig] = useState<Est | null>(null)
  const [aba, setAba] = useState<Aba>('aparencia')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [publicUrl, setPublicUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function carregar() {
    const r = await fetch('/api/admin/configuracoes/chat')
    if (!r.ok) return
    const d = await r.json()
    const e = d.estabelecimento as Est
    const merged: Est = {
      id: e.id,
      nome: e.nome,
      slug: e.slug,
      logoUrl: e.logoUrl || null,
      corPrimaria: e.corPrimaria || '#22c55e',
      corBot: e.corBot || '#f3f4f6',
      corTexto: e.corTexto || '#111827',
      corFundoChat: e.corFundoChat || '#f9fafb',
      nomeBot: e.nomeBot || 'Atendimento',
      mensagemBoasVindas: e.mensagemBoasVindas || null,
      avatarBotUrl: e.avatarBotUrl || null,
      temaChat: e.temaChat || 'PADRAO',
      bordaBaloes: e.bordaBaloes || 'ARREDONDADO',
      sombraBaloes: e.sombraBaloes ?? false
    }
    setEst(merged)
    setConfig(merged)
    setSaved(false)
  }

  async function salvar() {
    if (!config) return
    setSaving(true)
    setSaved(false)
    const r = await fetch('/api/admin/configuracoes/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corPrimaria: config.corPrimaria,
        corBot: config.corBot,
        corTexto: config.corTexto,
        corFundoChat: config.corFundoChat,
        nomeBot: config.nomeBot,
        mensagemBoasVindas: config.mensagemBoasVindas ?? '',
        avatarBotUrl: config.avatarBotUrl || '',
        temaChat: config.temaChat,
        bordaBaloes: config.bordaBaloes,
        sombraBaloes: config.sombraBaloes
      })
    })
    setSaving(false)
    if (r.ok) {
      setSaved(true)
      carregar()
    }
  }

  async function uploadLogo(f: File) {
    setUploadingLogo(true)
    const fd = new FormData()
    fd.append('file', f)
    const r = await fetch('/api/admin/configuracoes/chat/logo', { method: 'POST', body: fd })
    setUploadingLogo(false)
    if (r.ok) {
      const d = await r.json()
      setConfig(c => (c ? { ...c, logoUrl: d.logoUrl } : c))
    }
  }

  async function uploadAvatar(f: File) {
    setUploadingAvatar(true)
    const fd = new FormData()
    fd.append('file', f)
    const r = await fetch('/api/admin/configuracoes/chat/avatar', { method: 'POST', body: fd })
    setUploadingAvatar(false)
    if (r.ok) {
      const d = await r.json()
      setConfig(c => (c ? { ...c, avatarBotUrl: d.avatarBotUrl } : c))
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  useEffect(() => {
    if (est?.slug && typeof window !== 'undefined') {
      setPublicUrl(`${window.location.origin}/chat/${est.slug}`)
    }
  }, [est?.slug])

  const corPrimaria = config?.corPrimaria || '#22c55e'
  const corBot = config?.corBot || '#f3f4f6'
  const corTexto = config?.corTexto || '#111827'
  const corFundoChat = config?.corFundoChat || '#f9fafb'

  const borderRadiusBot =
    config?.bordaBaloes === 'RETO' ? 8 : config?.bordaBaloes === 'MEDIO' ? 16 : 24
  const borderRadiusUser = borderRadiusBot
  const boxShadow = config?.sombraBaloes ? '0 4px 10px rgba(15,23,42,0.12)' : 'none'

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-semibold">Personalização do Chatbot</div>
            <div className="text-sm text-gray-600">
              Configure identidade visual, nome do bot, mensagens e tema.
            </div>
          </div>
          <div className="flex items-center gap-2">
            {publicUrl && (
              <button
                type="button"
                className="px-3 py-2 rounded-lg text-sm border border-gray-300 bg-white"
                onClick={() => publicUrl && navigator.clipboard.writeText(publicUrl)}
              >
                Copiar link do atendimento
              </button>
            )}
            <button
              type="button"
              onClick={salvar}
              disabled={saving || !config}
              className="px-4 py-2 rounded-lg text-sm text-white bg-gray-900 disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </div>
        {saved && <div className="text-xs text-green-600">Alterações salvas com sucesso.</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-xl shadow p-4 space-y-4">
            <div className="flex gap-2 border-b pb-2 text-sm">
              <button
                type="button"
                onClick={() => setAba('aparencia')}
                className={`px-3 py-1 rounded-full ${
                  aba === 'aparencia' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Aparência
              </button>
              <button
                type="button"
                onClick={() => setAba('identidade')}
                className={`px-3 py-1 rounded-full ${
                  aba === 'identidade' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Identidade
              </button>
              <button
                type="button"
                onClick={() => setAba('mensagens')}
                className={`px-3 py-1 rounded-full ${
                  aba === 'mensagens' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Mensagens
              </button>
              <button
                type="button"
                onClick={() => setAba('tema')}
                className={`px-3 py-1 rounded-full ${
                  aba === 'tema' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Tema
              </button>
              <button
                type="button"
                onClick={() => setAba('avancado')}
                className={`px-3 py-1 rounded-full ${
                  aba === 'avancado' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Avançado
              </button>
            </div>

            {aba === 'identidade' && config && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">Nome do bot</div>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={config.nomeBot}
                    onChange={e =>
                      setConfig(c => (c ? { ...c, nomeBot: e.target.value } : c))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">Avatar do bot</div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden text-sm font-medium text-gray-700">
                      {config.avatarBotUrl ? (
                        <img
                          src={config.avatarBotUrl}
                          alt="Avatar bot"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (config.nomeBot || 'A')[0]?.toUpperCase()
                      )}
                    </div>
                    <label className="text-xs text-gray-700 cursor-pointer">
                      <span className="underline">
                        {uploadingAvatar ? 'Enviando...' : 'Enviar novo avatar'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0]
                          if (f) uploadAvatar(f)
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">Logo</div>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-lg border border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                      {config.logoUrl ? (
                        <img
                          src={config.logoUrl}
                          alt="Logo"
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-gray-500">Sem logo</span>
                      )}
                    </div>
                    <label className="text-xs text-gray-700 cursor-pointer">
                      <span className="underline">
                        {uploadingLogo ? 'Enviando...' : 'Enviar logo'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0]
                          if (f) uploadLogo(f)
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {aba === 'aparencia' && config && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-xs text-gray-600">
                    Cor do balão do usuário
                    <input
                      type="color"
                      className="h-9 w-full rounded-md border border-gray-300"
                      value={corPrimaria}
                      onChange={e =>
                        setConfig(c => (c ? { ...c, corPrimaria: e.target.value } : c))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-600">
                    Cor do balão do bot
                    <input
                      type="color"
                      className="h-9 w-full rounded-md border border-gray-300"
                      value={corBot}
                      onChange={e =>
                        setConfig(c => (c ? { ...c, corBot: e.target.value } : c))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-600">
                    Cor do texto
                    <input
                      type="color"
                      className="h-9 w-full rounded-md border border-gray-300"
                      value={corTexto}
                      onChange={e =>
                        setConfig(c => (c ? { ...c, corTexto: e.target.value } : c))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-600">
                    Cor do fundo
                    <input
                      type="color"
                      className="h-9 w-full rounded-md border border-gray-300"
                      value={corFundoChat}
                      onChange={e =>
                        setConfig(c => (c ? { ...c, corFundoChat: e.target.value } : c))
                      }
                    />
                  </label>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">Estilo dos balões</div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {[
                      { id: 'ARREDONDADO', label: 'Muito arredondado' },
                      { id: 'MEDIO', label: 'Médio' },
                      { id: 'RETO', label: 'Quadrado' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setConfig(c =>
                            c ? { ...c, bordaBaloes: opt.id as BordaBalao } : c
                          )
                        }
                        className={`px-3 py-1 rounded-full border ${
                          config.bordaBaloes === opt.id
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-700 border-gray-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={config.sombraBaloes}
                    onChange={e =>
                      setConfig(c =>
                        c ? { ...c, sombraBaloes: e.target.checked } : c
                      )
                    }
                  />
                  Ativar sombra nos balões
                </label>
              </div>
            )}

            {aba === 'mensagens' && config && (
              <div className="space-y-2">
                <div className="text-xs text-gray-600">Mensagem inicial do chatbot</div>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[120px]"
                  value={config.mensagemBoasVindas ?? defaultWelcome}
                  onChange={e =>
                    setConfig(c =>
                      c
                        ? {
                            ...c,
                            mensagemBoasVindas: e.target.value
                          }
                        : c
                    )
                  }
                />
                <div className="text-[11px] text-gray-500">
                  Essa mensagem substitui o texto padrão “Olá 👋 Seja bem-vindo! Informe seu telefone para
                  começarmos.”
                </div>
              </div>
            )}

            {aba === 'tema' && config && (
              <div className="space-y-3">
                <div className="text-xs text-gray-600">Tema pronto</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {([
                    { id: 'PADRAO', label: 'Clássico' },
                    { id: 'DARK', label: 'Dark' },
                    { id: 'MODERNO', label: 'Moderno' },
                    { id: 'MINIMAL', label: 'Minimalista' }
                  ] as { id: TemaChat; label: string }[]).map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        const preset = temasPresets[opt.id]
                        setConfig(c =>
                          c
                            ? {
                                ...c,
                                temaChat: opt.id,
                                corPrimaria: preset.corPrimaria,
                                corBot: preset.corBot,
                                corTexto: preset.corTexto,
                                corFundoChat: preset.corFundoChat
                              }
                            : c
                        )
                      }}
                      className={`px-3 py-2 rounded-lg border ${
                        config.temaChat === opt.id
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-gray-500">
                  Ao trocar o tema, as cores são preenchidas automaticamente. Você pode ajustar manualmente na aba
                  Aparência.
                </div>
              </div>
            )}

            {aba === 'avancado' && (
              <div className="space-y-2 text-xs text-gray-600">
                <div>Link público de atendimento</div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={publicUrl}
                      readOnly
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => publicUrl && navigator.clipboard.writeText(publicUrl)}
                      className="px-3 py-2 rounded-lg text-xs bg-gray-900 text-white"
                    >
                      Copiar
                    </button>
                  </div>
                  {publicUrl && (
                    <div className="flex items-center gap-4">
                      <img
                        alt="QR Code do atendimento"
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                          publicUrl
                        )}`}
                        className="w-20 h-20"
                      />
                      <a
                        href={`https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(
                          publicUrl
                        )}`}
                        download={`qr-${est?.slug || 'atendimento'}.png`}
                        className="underline text-xs text-gray-700"
                      >
                        Baixar QR Code (PNG)
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="bg-white rounded-xl shadow p-4">
            <div className="text-sm font-medium mb-2">Preview em tempo real</div>
            <div className="border border-gray-200 rounded-2xl overflow-hidden max-w-md mx-auto">
              <div className="px-4 py-3 border-b flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden text-xs font-medium text-gray-700">
                  {config?.avatarBotUrl ? (
                    <img
                      src={config.avatarBotUrl}
                      alt="Avatar bot"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (config?.nomeBot || 'A')[0]?.toUpperCase()
                  )}
                </div>
                <div className="flex flex-col">
                  <div className="text-sm font-semibold">
                    {config?.nomeBot || 'Atendimento'}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {est?.nome || 'Estabelecimento'} · Chat automático
                  </div>
                </div>
              </div>
              <div
                className="h-[420px] flex flex-col gap-3 p-4 overflow-hidden"
                style={{ backgroundColor: corFundoChat }}
              >
                <div
                  className="self-start text-sm"
                  style={{
                    backgroundColor: corBot,
                    color: corTexto,
                    borderRadius: borderRadiusBot,
                    padding: '8px 12px',
                    boxShadow
                  }}
                >
                  {(config?.mensagemBoasVindas || defaultWelcome).split('\n').map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                </div>
                <div
                  className="self-end text-sm"
                  style={{
                    backgroundColor: corPrimaria,
                    color: '#ffffff',
                    borderRadius: borderRadiusUser,
                    padding: '8px 12px',
                    boxShadow
                  }}
                >
                  Quero fazer um pedido.
                </div>
                <div
                  className="self-start text-sm"
                  style={{
                    backgroundColor: corBot,
                    color: corTexto,
                    borderRadius: borderRadiusBot,
                    padding: '8px 12px',
                    boxShadow
                  }}
                >
                  Perfeito! Vou te pedir alguns dados rápidos e já montamos seu pedido.
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
