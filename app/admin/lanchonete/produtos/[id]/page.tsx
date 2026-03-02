'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Variacao = { id: string; nome: string; valorAdicional: number; obrigatoria: boolean; ativo: boolean }
type Adicional = { id: string; nome: string; valor: number; maximoPermitido?: number | null; obrigatorio: boolean; ativo: boolean }
type ProdutoInfo = { id: string; nome: string; fotoUrl?: string | null }

export default function ProdutoGerenciar() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id || '')
  const [nome, setNome] = useState<string>('')
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [variacoes, setVariacoes] = useState<Variacao[]>([])
  const [adicionais, setAdicionais] = useState<Adicional[]>([])
  const [vForm, setVForm] = useState<{ nome: string; valorAdicional: number; obrigatoria: boolean; ativo: boolean }>({
    nome: '',
    valorAdicional: 0,
    obrigatoria: false,
    ativo: true
  })
  const [aForm, setAForm] = useState<{ nome: string; valor: number; maximoPermitido?: number; obrigatorio: boolean; ativo: boolean }>({
    nome: '',
    valor: 0,
    maximoPermitido: undefined,
    obrigatorio: false,
    ativo: true
  })

  async function carregar() {
    setLoading(true)
    try {
      // tenta obter nome/foto do produto pela lista pública
      try {
        const rp = await fetch('/api/produtos', { cache: 'no-store' })
        const dp = await rp.json()
        const p = (dp.produtos || []).find((pp: ProdutoInfo) => pp.id === id)
        if (p) {
          setNome(p.nome || '')
          setFotoUrl((p as any).fotoUrl || null)
        }
      } catch {}
      const rv = await fetch('/api/admin/lanchonete/variacoes?produtoId=' + id)
      const ra = await fetch('/api/admin/lanchonete/adicionais?produtoId=' + id)
      const dv = await rv.json()
      const da = await ra.json()
      setVariacoes(dv.variacoes || [])
      setAdicionais(da.adicionais || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [id])

  async function criarVariacao(e: React.FormEvent) {
    e.preventDefault()
    const r = await fetch('/api/admin/lanchonete/variacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...vForm, produtoId: id })
    })
    if (r.ok) {
      setVForm({ nome: '', valorAdicional: 0, obrigatoria: false, ativo: true })
      carregar()
    }
  }

  async function excluirVariacao(vid: string) {
    const r = await fetch('/api/admin/lanchonete/variacoes?id=' + vid, { method: 'DELETE' })
    if (r.ok) carregar()
  }

  async function criarAdicional(e: React.FormEvent) {
    e.preventDefault()
    const r = await fetch('/api/admin/lanchonete/adicionais', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...aForm, produtoId: id })
    })
    if (r.ok) {
      setAForm({ nome: '', valor: 0, maximoPermitido: undefined, obrigatorio: false, ativo: true })
      carregar()
    }
  }

  async function excluirAdicional(aid: string) {
    const r = await fetch('/api/admin/lanchonete/adicionais?id=' + aid, { method: 'DELETE' })
    if (r.ok) carregar()
  }

  // Crop quadrado simples (zoom/offset) no client
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [savingFoto, setSavingFoto] = useState(false)
  const canvasId = 'crop-canvas'

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        setImgObj(img)
        requestAnimationFrame(drawCanvas)
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(f)
  }

  function drawCanvas() {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const size = 320
    canvas.width = size
    canvas.height = size
    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(0, 0, size, size)
    if (!imgObj) return
    const iw = imgObj.width
    const ih = imgObj.height
    const scale = zoom * (Math.max(size / iw, size / ih))
    const drawW = iw * scale
    const drawH = ih * scale
    const dx = (size - drawW) / 2 + offsetX
    const dy = (size - drawH) / 2 + offsetY
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(imgObj, dx, dy, drawW, drawH)
  }

  useEffect(() => {
    drawCanvas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgObj, zoom, offsetX, offsetY])

  async function salvarCorte() {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null
    if (!canvas) return
    setSavingFoto(true)
    canvas.toBlob(async blob => {
      try {
        if (!blob) return
        const fd = new FormData()
        fd.append('file', new File([blob], 'crop.jpg', { type: 'image/jpeg' }))
        const r = await fetch(`/api/admin/lanchonete/produtos/${id}/foto`, { method: 'POST', body: fd })
        const d = await r.json().catch(() => null)
        if (r.ok && d?.fotoUrl) {
          setFotoUrl(d.fotoUrl)
          setImgObj(null)
        }
      } finally {
        setSavingFoto(false)
      }
    }, 'image/jpeg', 0.9)
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xl font-semibold">Gerenciar Produto {nome ? `· ${nome}` : ''}</div>
        <button className="px-3 py-2 rounded bg-gray-900 text-white" onClick={() => router.push('/admin/lanchonete/produtos')}>
          Voltar
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="rounded-xl shadow bg-white p-4 md:col-span-1">
          <div className="text-sm font-medium mb-2">Imagem do Produto</div>
          {fotoUrl ? (
            <div className="mb-3">
              <img src={fotoUrl} alt="Foto do produto" className="w-40 h-40 object-cover rounded" />
            </div>
          ) : (
            <div className="mb-3 text-sm text-gray-600">Sem imagem</div>
          )}
          <input type="file" accept="image/*" onChange={onFileChange} />
          {imgObj && (
            <div className="mt-3">
              <canvas id={canvasId} className="border rounded" width={320} height={320} />
              <div className="mt-2 grid grid-cols-3 gap-2">
                <label className="text-xs">
                  Zoom
                  <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))} />
                </label>
                <label className="text-xs">
                  X
                  <input type="range" min={-160} max={160} step={1} value={offsetX} onChange={e => setOffsetX(Number(e.target.value))} />
                </label>
                <label className="text-xs">
                  Y
                  <input type="range" min={-160} max={160} step={1} value={offsetY} onChange={e => setOffsetY(Number(e.target.value))} />
                </label>
              </div>
              <button className="mt-2 px-3 py-2 rounded bg-gray-900 text-white disabled:opacity-50" onClick={salvarCorte} disabled={savingFoto}>
                {savingFoto ? 'Salvando...' : 'Salvar recorte'}
              </button>
            </div>
          )}
        </div>
        <div className="rounded-xl shadow bg-white p-4">
          <div className="text-sm font-medium mb-2">Variações</div>
          <form onSubmit={criarVariacao} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <input
              className="border rounded-lg px-3 py-2 md:col-span-2"
              placeholder="Nome"
              value={vForm.nome}
              onChange={e => setVForm(f => ({ ...f, nome: e.target.value }))}
              required
            />
            <input
              type="number"
              step="0.01"
              className="border rounded-lg px-3 py-2"
              placeholder="Valor adicional"
              value={vForm.valorAdicional}
              onChange={e => setVForm(f => ({ ...f, valorAdicional: Number(e.target.value || 0) }))}
              required
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={vForm.obrigatoria} onChange={e => setVForm(f => ({ ...f, obrigatoria: e.target.checked }))} />
              Obrigatória
            </label>
            <button className="px-3 py-2 rounded bg-gray-900 text-white md:col-span-4">Adicionar</button>
          </form>
          <ul className="text-sm">
            {loading && <li className="text-gray-600">Carregando...</li>}
            {!loading &&
              variacoes.map(v => (
                <li key={v.id} className="flex items-center justify-between py-1 border-t">
                  <span>
                    {v.nome} · R$ {Number(v.valorAdicional).toFixed(2)} {v.obrigatoria ? '· obrigatória' : ''}
                  </span>
                  <button className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200" onClick={() => excluirVariacao(v.id)}>
                    Remover
                  </button>
                </li>
              ))}
          </ul>
        </div>
        <div className="rounded-xl shadow bg-white p-4 md:col-span-2">
          <div className="text-sm font-medium mb-2">Adicionais</div>
          <form onSubmit={criarAdicional} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
            <input
              className="border rounded-lg px-3 py-2 md:col-span-2"
              placeholder="Nome"
              value={aForm.nome}
              onChange={e => setAForm(f => ({ ...f, nome: e.target.value }))}
              required
            />
            <input
              type="number"
              step="0.01"
              className="border rounded-lg px-3 py-2"
              placeholder="Valor"
              value={aForm.valor}
              onChange={e => setAForm(f => ({ ...f, valor: Number(e.target.value || 0) }))}
              required
            />
            <input
              type="number"
              className="border rounded-lg px-3 py-2"
              placeholder="Máximo"
              value={aForm.maximoPermitido ?? ''}
              onChange={e => setAForm(f => ({ ...f, maximoPermitido: e.target.value ? Number(e.target.value) : undefined }))}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={aForm.obrigatorio} onChange={e => setAForm(f => ({ ...f, obrigatorio: e.target.checked }))} />
              Obrigatório
            </label>
            <button className="px-3 py-2 rounded bg-gray-900 text-white md:col-span-5">Adicionar</button>
          </form>
          <ul className="text-sm">
            {loading && <li className="text-gray-600">Carregando...</li>}
            {!loading &&
              adicionais.map(a => (
                <li key={a.id} className="flex items-center justify-between py-1 border-t">
                  <span>
                    {a.nome} · R$ {Number(a.valor).toFixed(2)} {a.maximoPermitido ? `· máximo ${a.maximoPermitido}` : ''}{' '}
                    {a.obrigatorio ? '· obrigatório' : ''}
                  </span>
                  <button className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200" onClick={() => excluirAdicional(a.id)}>
                    Remover
                  </button>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
