'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { safePerfil } from '@/lib/perfil'

type PedidoItem = {
  id: string
  quantidade: number
  subtotal: number
  adicionais?: any
  observacoes?: string | null
  produto?: {
    id: string
    nome: string
    fotoUrl?: string | null
    categoria?: string | null
  } | null
}

type Pedido = {
  id: string
  status: string
  total: number
  valorDesconto?: number | null
  formaEntrega: 'entrega' | 'retirada'
  enderecoEntrega?: any | null
  createdAt: string
  cliente: { nome: string; telefone: string }
  itens: PedidoItem[]
  pagamento?: { status: string; txid?: string | null; tipo?: string | null } | null
  cupom?: { codigo?: string | null } | null
}

type Estabelecimento = {
  id: string
  nome: string
  slug: string
  perfil: string
  ativo: boolean
}

const STATUSES = [
  'aberto',
  'aguardando_pix',
  'pago',
  'preparando',
  'saiu_para_entrega',
  'entregue',
  'cancelado'
] as const

type StatusPedido = (typeof STATUSES)[number]

function pedidoCodigoCurto(id: string) {
  if (!id) return ''
  return id.length <= 6 ? id : id.slice(0, 6)
}

function badgeClass(s: string) {
  if (s === 'aberto') return 'bg-gray-100 text-gray-700'
  if (s === 'aguardando_pix') return 'bg-yellow-100 text-yellow-700'
  if (s === 'pago') return 'bg-blue-100 text-blue-700'
  if (s === 'preparando') return 'bg-orange-100 text-orange-700'
  if (s === 'saiu_para_entrega') return 'bg-purple-100 text-purple-700'
  if (s === 'entregue') return 'bg-emerald-100 text-emerald-700'
  if (s === 'cancelado') return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-700'
}

function statusLabel(s: string) {
  if (s === 'aberto') return 'Aberto'
  if (s === 'aguardando_pix') return 'Aguardando Pix'
  if (s === 'pago') return 'Pago'
  if (s === 'preparando') return 'Em preparação'
  if (s === 'saiu_para_entrega') return 'Saiu para entrega'
  if (s === 'entregue') return 'Entregue'
  if (s === 'cancelado') return 'Cancelado'
  return s
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

let newOrderAudio: HTMLAudioElement | null = null
let newOrderAudioEnabled = false
let notificationPermRequested = false

function initNewOrderSound() {
  if (typeof window === 'undefined') return
  try {
    const audio = new Audio('/sounds/beep.mp3')
    audio.volume = 1
    audio
      .play()
      .then(() => {
        audio.pause()
        audio.currentTime = 0
        newOrderAudio = audio
        newOrderAudioEnabled = true
        try {
          window.localStorage.setItem('adminSoundEnabled', '1')
        } catch {}
      })
      .catch(() => {})
  } catch {}
}

function requestBrowserNotificationPermission() {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted' || Notification.permission === 'denied') return
  if (notificationPermRequested) return
  notificationPermRequested = true
  try {
    Notification.requestPermission().catch(() => {})
  } catch {}
}

async function playNewOrderSound(playTwice = true) {
  if (typeof window === 'undefined') return
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(playTwice ? [300, 100, 300] : [250])
    } catch {}
  }
  if (!newOrderAudioEnabled || !newOrderAudio) return
  try {
    const playOnce = async () => {
      if (!newOrderAudio) return
      try {
        newOrderAudio.pause()
        newOrderAudio.currentTime = 0
        await newOrderAudio.play().catch(() => {})
      } catch {}
    }
    await playOnce()
    if (playTwice) {
      setTimeout(() => playOnce(), 450)
    }
  } catch {}
}

async function notifyNewOrder(labels: { titulo: string; body?: string } | null) {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    if (labels) {
      const n = new Notification(labels.titulo, {
        body: labels.body || undefined,
        tag: 'sistema-delivery-novos-pedidos',
        renotify: true,
        requireInteraction: true
      })
      n.onclick = () => {
        try {
          window.focus()
        } catch {}
        n.close()
      }
    }
  } catch {}
}

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroRapido, setFiltroRapido] = useState<
    'todos' | 'hoje' | 'ontem' | 'pagos' | 'preparando' | 'finalizados' | 'cancelados'
  >('todos')
  const [viewMode, setViewMode] = useState<'cards' | 'kanban'>('cards')
  const [acaiOpcoes, setAcaiOpcoes] = useState<any | null>(null)
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([])
  const [selectedEstId, setSelectedEstId] = useState<string>('')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const carregadoRef = useRef(false)
  const knownIdsRef = useRef<Set<string>>(new Set())
  const [somAtivo, setSomAtivo] = useState(false)

  async function carregarAdmin(): Promise<{ estId: string | null } | null> {
    try {
      const r = await fetch('/api/admin/configuracoes/estabelecimento', { credentials: 'include' })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setErro(d?.error || 'Sessão expirada. Faça login novamente.')
        return null
      }
      const d = await r.json()
      const role = d?.admin?.role || ''
      const adminOwnEstId = d?.estabelecimento?.id || ''
      setIsSuperAdmin(role === 'SUPER_ADMIN')
      if (role === 'SUPER_ADMIN') {
        let arr: Estabelecimento[] = []
        try {
          const estsR = await fetch('/api/super-admin/estabelecimentos', { credentials: 'include' })
          if (estsR.ok) {
            const data = await estsR.json()
            arr = Array.isArray(data?.estabelecimentos) ? data.estabelecimentos : []
          }
        } catch (e) {
          console.error('Super Admin: falha ao carregar estabelecimentos', e)
        }
        setEstabelecimentos(arr)
        let chosen = ''
        if (!chosen && arr.length > 0) {
          chosen =
            arr.find(e => e.id === adminOwnEstId)?.id ||
            [...arr].sort((a: any, b: any) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')))[0]?.id ||
            arr[0].id || ''
        }
        if (!chosen) {
          chosen = adminOwnEstId
        }
        if (!selectedEstId) {
          setSelectedEstId(chosen)
        }
        return { estId: selectedEstId || chosen }
      } else {
        if (!selectedEstId) {
          setSelectedEstId(adminOwnEstId)
        }
        return { estId: selectedEstId || adminOwnEstId }
      }
    } catch (e: any) {
      setErro('Não foi possível carregar o usuário administrador.')
      return null
    }
  }

  async function carregar(estIdOverride?: string) {
    const estId = estIdOverride || selectedEstId
    if (!estId) {
      setPedidos([])
      setLoading(false)
      return
    }
    try {
      setErro(null)
      const url = `/api/admin/pedidos?estId=${encodeURIComponent(estId)}`
      const res = await fetch(url, { credentials: 'include', cache: 'no-store' as any })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        if (res.status === 401) {
          setErro('Sessão expirada. Faça login novamente.')
        } else {
          setErro(d?.error || 'Erro ao carregar pedidos.')
        }
        setPedidos([])
        return
      }
      const data = await res.json()
      const lista: Pedido[] = data?.pedidos || []
      const novos: Pedido[] = []
      if (carregadoRef.current) {
        const known = knownIdsRef.current
        for (const p of lista) {
          if (!known.has(p.id)) {
            novos.push(p)
          }
        }
        if (novos.length > 0) {
          playNewOrderSound(true)
          try {
            const body = novos.slice(0, 3).map((p, i) => {
              const fmt = (n: number) =>
                n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
              const total = fmt(Number(p.total || 0))
              const nome = p.cliente?.nome || 'Cliente'
              return `${i + 1}. ${nome} · ${total}`
            }).join('\n')
            await notifyNewOrder({
              titulo:
                novos.length === 1
                  ? `🔔 Novo pedido #${pedidoCodigoCurto(novos[0].id)}`
                  : `🔔 ${novos.length} novos pedidos chegaram!`,
              body: novos.length <= 3 ? body : `${body}\n... e mais ${novos.length - 3}.`
            })
          } catch {}
        }
      } else {
        // Primeiro carregamento: tocar som se houver pedidos pendentes (aberto ou aguardando_pix)
        // para evitar o cenário do admin entrar na tela e não perceber que já tinha pedido novo esperando.
        const pendentes = lista.filter(
          p => p.status === 'aberto' || p.status === 'aguardando_pix'
        )
        if (pendentes.length > 0 && newOrderAudioEnabled) {
          try {
            playNewOrderSound(pendentes.length > 1)
          } catch {}
        }
      }
      knownIdsRef.current = new Set(lista.map(p => p.id))
      setPedidos(lista)
      carregadoRef.current = true
    } catch {
      setErro('Erro de rede ao carregar pedidos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function carregarAcaiOpcoes() {
    try {
      const r = await fetch('/api/acaiteria/opcoes')
      if (!r.ok) return
      const js = await r.json()
      setAcaiOpcoes(js)
    } catch {}
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      const admin = await carregarAdmin()
      if (!cancelled) {
        carregar(admin?.estId || undefined)
        carregarAcaiOpcoes()
      }
      if (typeof window !== 'undefined' && !cancelled) {
        try {
          const flag = window.localStorage.getItem('adminSoundEnabled')
          if (flag === '1') {
            newOrderAudioEnabled = true
            if (!newOrderAudio) {
              newOrderAudio = new Audio('/sounds/beep.mp3')
            }
            setSomAtivo(true)
            requestBrowserNotificationPermission()
          }
        } catch {}
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (selectedEstId) carregar()
    const t = setInterval(() => {
      if (selectedEstId) carregar()
    }, 10_000)
    return () => clearInterval(t)
  }, [selectedEstId])

  function handleEstChange(id: string) {
    setSelectedEstId(id)
    try {
      window.localStorage.setItem('adminSelectedEstId', id)
    } catch {}
    carregadoRef.current = false
    setPedidos([])
    setLoading(true)
  }

  function toggleSom() {
    if (somAtivo) {
      setSomAtivo(false)
      newOrderAudioEnabled = false
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem('adminSoundEnabled')
        } catch {}
      }
      return
    }
    initNewOrderSound()
    requestBrowserNotificationPermission()
    setSomAtivo(true)
  }

  async function alterarStatus(id: string, status: StatusPedido) {
    try {
      const r = await fetch('/api/admin/pedidos/' + id, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setErro(d?.error || 'Não foi possível alterar o status.')
      }
    } catch {
      setErro('Erro de rede ao alterar status.')
    }
    await carregar()
  }

  function filtrarPedidos(lista: Pedido[]) {
    const hoje = new Date()
    const dHoje = hoje.toISOString().slice(0, 10)
    const dOntem = new Date(hoje.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    return lista.filter(p => {
      const data = new Date(p.createdAt)
      const d = data.toISOString().slice(0, 10)
      if (filtroRapido === 'hoje' && d !== dHoje) return false
      if (filtroRapido === 'ontem' && d !== dOntem) return false
      if (filtroRapido === 'pagos' && p.status !== 'pago') return false
      if (filtroRapido === 'preparando' && p.status !== 'preparando') return false
      if (filtroRapido === 'finalizados' && p.status !== 'entregue') return false
      if (filtroRapido === 'cancelados' && p.status !== 'cancelado') return false
      if (!busca.trim()) return true
      const term = busca.trim().toLowerCase()
      return (
        p.id.toLowerCase().includes(term) ||
        p.cliente?.nome?.toLowerCase().includes(term) ||
        p.cliente?.telefone?.toLowerCase().includes(term)
      )
    })
  }

  const pedidosFiltrados = useMemo(() => filtrarPedidos(pedidos), [pedidos, filtroRapido, busca])

  function resumoFinanceiro(p: Pedido) {
    const subtotal = (p.itens || []).reduce((acc, i) => acc + Number(i.subtotal || 0), 0)
    const desconto = Number(p.valorDesconto || 0)
    const taxaEntrega = Number(p.total || 0) - subtotal + desconto
    return { subtotal, desconto, taxaEntrega }
  }

  function renderItem(i: PedidoItem) {
    const foto = i.produto?.fotoUrl || null
    const nome = i.produto?.nome || 'Produto'
    const adicionais = i.adicionais || {}

    const sabIds = Array.isArray(adicionais.sabores)
      ? adicionais.sabores
      : adicionais.saborId
      ? [adicionais.saborId]
      : []
    const sabores =
      acaiOpcoes && Array.isArray(acaiOpcoes.sabores)
        ? sabIds.map((id: string) => acaiOpcoes.sabores.find((s: any) => s.id === id)?.nome || id)
        : sabIds
    if (sabores.length === 0 && adicionais.saborNome) sabores.push(adicionais.saborNome)

    const sorvIds = Array.isArray(adicionais.sorvetes)
      ? adicionais.sorvetes
      : adicionais.sorveteId
      ? [adicionais.sorveteId]
      : []
    const sorvetes =
      acaiOpcoes && Array.isArray(acaiOpcoes.sorvetes)
        ? sorvIds.map((id: string) => acaiOpcoes.sorvetes.find((s: any) => s.id === id)?.nome || id)
        : sorvIds
    if (sorvetes.length === 0 && adicionais.sorveteNome) sorvetes.push(adicionais.sorveteNome)
    if (sorvetes.length === 0 && adicionais.sorveteEscolhido === true) sorvetes.push('Sem sorvete')

    const acompIds = Array.isArray(adicionais.acompanhamentos) ? adicionais.acompanhamentos : []
    const acompanhamentos =
      acaiOpcoes && Array.isArray(acaiOpcoes.acompanhamentos)
        ? acaiOpcoes.acompanhamentos
            .filter((a: any) => acompIds.includes(a.id))
            .map((a: any) => a.nome)
        : acompIds

    const cobIds = Array.isArray(adicionais.coberturas)
      ? adicionais.coberturas
      : adicionais.coberturaId
      ? [adicionais.coberturaId]
      : []
    const coberturas =
      acaiOpcoes && Array.isArray(acaiOpcoes.coberturas)
        ? acaiOpcoes.coberturas
            .filter((c: any) => cobIds.includes(c.id))
            .map((c: any) => c.nome)
        : cobIds

    const compIds = Array.isArray(adicionais.complementos) ? adicionais.complementos : []
    const complementos =
      acaiOpcoes && Array.isArray(acaiOpcoes.complementos)
        ? acaiOpcoes.complementos
            .filter((c: any) => compIds.includes(c.id))
            .map((c: any) => c.nome)
        : compIds

    return (
      <div key={i.id} className="flex gap-3 py-2 border-t border-dashed first:border-t-0">
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
          {foto ? (
            <img src={foto} alt={nome} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] text-gray-500 text-center px-1">Sem foto</span>
          )}
        </div>
        <div className="flex-1 text-xs text-gray-800 space-y-0.5">
          <div className="font-semibold text-sm">
            {nome} x{i.quantidade}
          </div>
          {sabores.length > 0 && <div>Sabores: {sabores.join(', ')}</div>}
          {sorvetes.length > 0 && <div>Sorvetes: {sorvetes.join(', ')}</div>}
          {acompanhamentos.length > 0 && <div>Acompanhamentos: {acompanhamentos.join(', ')}</div>}
          {coberturas.length > 0 && <div>Coberturas: {coberturas.join(', ')}</div>}
          {complementos.length > 0 && <div>Complementos: {complementos.join(', ')}</div>}
          {i.observacoes && <div className="text-[11px] text-gray-600">Obs: {i.observacoes}</div>}
        </div>
        <div className="text-xs font-semibold text-gray-900 flex-shrink-0">
          {currency.format(Number(i.subtotal || 0))}
        </div>
      </div>
    )
  }

  function renderTimeline(status: StatusPedido) {
    const steps: { id: StatusPedido; label: string }[] = [
      { id: 'pago', label: 'Aprovado' },
      { id: 'preparando', label: 'Em preparação' },
      { id: 'saiu_para_entrega', label: 'Saiu para entrega' },
      { id: 'entregue', label: 'Entregue' }
    ]
    return (
      <div className="flex items-center gap-2 text-[11px]">
        {steps.map((s, idx) => {
          const active = STATUSES.indexOf(status) >= STATUSES.indexOf(s.id)
          return (
            <div key={s.id} className="flex items-center gap-1">
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] ${
                  active ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                ✓
              </div>
              <span className={active ? 'text-emerald-700' : 'text-gray-400'}>{s.label}</span>
              {idx < steps.length - 1 && <span className="text-gray-300 mx-1">→</span>}
            </div>
          )
        })}
      </div>
    )
  }

  function renderCard(p: Pedido) {
    const { subtotal, desconto, taxaEntrega } = resumoFinanceiro(p)
    const pagamentoStatus = p.pagamento?.status || 'desconhecido'
    const pagamentoTipo = p.pagamento?.tipo || 'n/d'
    const data = new Date(p.createdAt)
    const pedidoPendente = p.status === 'aberto' || p.status === 'aguardando_pix'
    return (
      <div
        key={p.id}
        className={`bg-white rounded-xl shadow-sm border p-3 md:p-4 space-y-3 transition ${
          pedidoPendente ? 'border-red-300 ring-2 ring-red-50 ring-offset-0 hover:border-red-400' : 'border-gray-100'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-gray-900">Pedido #{pedidoCodigoCurto(p.id)}</span>
              {pedidoPendente && (
                <span
                  title="Aguardando atendimento"
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-600 text-white animate-pulse shadow-sm shadow-red-500/30"
                >
                  🔔 Novo
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass(p.status)}`}>
                {statusLabel(p.status)}
              </span>
            </div>
            <div className="text-xs text-gray-600">
              {p.cliente?.nome} ·{' '}
              <a href={`https://wa.me/${p.cliente?.telefone}`} target="_blank" className="underline">
                {p.cliente?.telefone}
              </a>
            </div>
            <div className="text-[11px] text-gray-500">
              {data.toLocaleDateString()} {data.toLocaleTimeString()} ·{' '}
              {p.formaEntrega === 'entrega' ? 'Entrega' : 'Retirada no balcão'} · Pagamento: {pagamentoTipo}
            </div>
          </div>
          <div className="text-right space-y-1">
            <div className="text-xs text-gray-500">Total</div>
            <div className="text-lg font-semibold text-gray-900">{currency.format(Number(p.total || 0))}</div>
            <div className="text-[11px] text-gray-500">
              Status pagto: <span className="font-medium">{pagamentoStatus}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-dashed pt-2">
          {(p.itens || []).map(renderItem)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="space-y-1">
            <div className="font-semibold text-gray-800">Resumo financeiro</div>
            <div>Subtotal: {currency.format(subtotal)}</div>
            {p.cupom?.codigo && (
              <div>
                Cupom: <span className="font-medium">{p.cupom.codigo}</span>
              </div>
            )}
            {desconto > 0 && <div>Desconto: -{currency.format(desconto)}</div>}
            {taxaEntrega > 0 && <div>Taxa de entrega: {currency.format(taxaEntrega)}</div>}
            <div className="font-semibold text-gray-900">
              Total: {currency.format(Number(p.total || 0))}
            </div>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-gray-800">Dados do cliente</div>
            <div>{p.cliente?.nome}</div>
            <div>{p.cliente?.telefone}</div>
            {p.formaEntrega === 'entrega' && p.enderecoEntrega && (
              <div className="text-[11px] text-gray-600">
                {p.enderecoEntrega.rua} {p.enderecoEntrega.numero} - {p.enderecoEntrega.bairro}
                {p.enderecoEntrega.complemento ? ` · ${p.enderecoEntrega.complemento}` : ''}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-gray-800">Linha do tempo</div>
            {renderTimeline(p.status as StatusPedido)}
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-2 pt-2 border-t border-dashed mt-1">
          <div className="flex flex-wrap gap-1">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => alterarStatus(p.id, s)}
                disabled={p.status === s}
                className="px-2 py-1 rounded border text-xs hover:bg-gray-50 disabled:opacity-50"
              >
                {statusLabel(s)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="px-3 py-1 rounded border text-xs hover:bg-gray-50"
              onClick={() =>
                window.open(
                  `/admin/pedidos/${p.id}/imprimir?m=comanda`,
                  `imp-comanda-${p.id.slice(0, 6)}`,
                  'popup=yes,width=420,height=820,top=40,left=80,menubar=no,toolbar=no,location=no,status=no'
                )
              }
            >
              🖨️ Imprimir comanda
            </button>
            <button
              className="px-3 py-1 rounded border text-xs hover:bg-gray-50"
              onClick={() =>
                window.open(
                  `/admin/pedidos/${p.id}/imprimir?m=completo`,
                  `imp-completo-${p.id.slice(0, 6)}`,
                  'popup=yes,width=620,height=900,top=40,left=540,menubar=no,toolbar=no,location=no,status=no'
                )
              }
            >
              🖨️ Imprimir pedido completo
            </button>
          </div>
        </div>
      </div>
    )
  }

  function agrupadoPorStatus(lista: Pedido[]) {
    const grupos: Record<StatusPedido, Pedido[]> = {
      aberto: [],
      aguardando_pix: [],
      pago: [],
      preparando: [],
      saiu_para_entrega: [],
      entregue: [],
      cancelado: []
    }
    for (const p of lista) {
      const s = (p.status as StatusPedido) || 'aberto'
      if (!grupos[s]) grupos.aberto.push(p)
      else grupos[s].push(p)
    }
    return grupos
  }

  const pedidosAgrupados = useMemo(() => agrupadoPorStatus(pedidosFiltrados), [pedidosFiltrados])
  const pedidosPendentesCount = useMemo(
    () => pedidosFiltrados.filter(p => p.status === 'aberto' || p.status === 'aguardando_pix').length,
    [pedidosFiltrados]
  )
  const perfilLabelEst = (perfil: any) =>
    perfil === 'ACAITERIA'
      ? 'Açaiteria'
      : perfil === 'PIZZARIA'
      ? 'Pizzaria'
      : perfil === 'DISTRIBUIDORA'
      ? 'Distribuidora'
      : 'Lanchonete'

  return (
    <main className="p-4 md:p-8 flex-1 overflow-auto bg-gray-50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">Gerenciar Pedidos</h1>
            {pedidosPendentesCount > 0 && (
              <span
                title={`${pedidosPendentesCount} pedido(s) aguardando atendimento`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold uppercase tracking-wide shadow-md shadow-red-500/30 animate-pulse"
              >
                🔔 {pedidosPendentesCount} Pendente{pedidosPendentesCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
          {erro && (
            <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
              {erro}
            </div>
          )}
          {estabelecimentos.length > 1 && isSuperAdmin && (
            <div className="mt-2">
              <select
                value={selectedEstId}
                onChange={e => handleEstChange(e.target.value)}
                className="bg-white border border-gray-300 rounded px-3 py-1 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                {estabelecimentos.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.nome} ({perfilLabelEst(safePerfil(e.perfil))})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, telefone ou número do pedido"
            className="border rounded-lg px-3 py-1.5 text-sm min-w-[220px]"
          />
          <div className="flex flex-wrap gap-1">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'hoje', label: 'Hoje' },
              { id: 'ontem', label: 'Ontem' },
              { id: 'pagos', label: 'Pagos' },
              { id: 'preparando', label: 'Em preparação' },
              { id: 'finalizados', label: 'Finalizados' },
              { id: 'cancelados', label: 'Cancelados' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFiltroRapido(f.id as any)}
                className={`px-2 py-1 rounded-full text-xs border ${
                  filtroRapido === f.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 ml-auto items-center">
            <button
              type="button"
              onClick={toggleSom}
              className={`px-2 py-1 rounded-full text-xs border ${
                somAtivo ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700'
              }`}
            >
              {somAtivo ? 'Som: ligado' : 'Som: desligado'}
            </button>
            <button
              className={`px-2 py-1 rounded-full text-xs border ${
                viewMode === 'cards' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700'
              }`}
              onClick={() => setViewMode('cards')}
            >
              Cards
            </button>
            <button
              className={`px-2 py-1 rounded-full text-xs border ${
                viewMode === 'kanban' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700'
              }`}
              onClick={() => setViewMode('kanban')}
            >
              Kanban
            </button>
          </div>
        </div>
      </div>

      {loading && !pedidos.length ? (
        <div className="grid gap-2">
          <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="text-sm text-gray-600">
          Nenhum pedido encontrado com os filtros atuais.
        </div>
      ) : viewMode === 'cards' ? (
        <div className="space-y-3">
          {pedidosFiltrados.map(renderCard)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(['aberto', 'preparando', 'entregue'] as StatusPedido[]).map(col => (
            <div key={col} className="bg-gray-50 rounded-xl border border-gray-100 p-2 md:p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-semibold">
                  {col === 'aberto' && 'Novos'}
                  {col === 'preparando' && 'Preparando'}
                  {col === 'entregue' && 'Finalizados'}
                </div>
                <div className="text-[11px] text-gray-500">
                  {pedidosAgrupados[col].length} pedidos
                </div>
              </div>
              {pedidosAgrupados[col].length === 0 ? (
                <div className="text-[11px] text-gray-500">Nenhum pedido nesta coluna.</div>
              ) : (
                pedidosAgrupados[col].map(p => (
                  <div
                    key={p.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-gray-900 text-xs">#{pedidoCodigoCurto(p.id)}</div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${badgeClass(p.status)}`}>
                        {statusLabel(p.status)}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-600 truncate">
                      {p.cliente?.nome} · {p.cliente?.telefone}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {new Date(p.createdAt).toLocaleTimeString()} · {currency.format(Number(p.total || 0))}
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-dashed mt-1">
                      {STATUSES.map(s => (
                        <button
                          key={s}
                          onClick={() => alterarStatus(p.id, s)}
                          disabled={p.status === s}
                          className="px-1.5 py-0.5 rounded border text-[10px] hover:bg-gray-50 disabled:opacity-40"
                        >
                          {statusLabel(s)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
