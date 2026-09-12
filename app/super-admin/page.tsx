'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { safePerfil } from '@/lib/perfil'
import { calcularStatusAbertura } from '@/lib/horarioFuncionamento'
import { mascaraReal, mascaraRealToNumber, exibirTelefone } from '@/lib/mascaras'

type Perfil = 'LANCHONETE' | 'ACAITERIA' | 'PIZZARIA' | 'DISTRIBUIDORA'
type DiaSemana = 'dom' | 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab'

const DIAS_SEMANA: readonly { id: DiaSemana; label: string }[] = [
  { id: 'dom', label: 'Dom' },
  { id: 'seg', label: 'Seg' },
  { id: 'ter', label: 'Ter' },
  { id: 'qua', label: 'Qua' },
  { id: 'qui', label: 'Qui' },
  { id: 'sex', label: 'Sex' },
  { id: 'sab', label: 'Sáb' }
]

type Estabelecimento = {
  id: string
  nome: string
  slug: string
  perfil: Perfil
  ativo: boolean
  createdAt: string
  logoUrl?: string | null
  telefone?: string | null
  descricao?: string | null
  horarioAbertura?: string | null
  horarioFechamento?: string | null
  diasAtivos?: DiaSemana[] | null
  valorMinimoPedido?: number | string | null
  taxaEntregaPadrao?: number | string | null
  entregaHabilitada?: boolean
  permitirRetirada?: boolean
  raioAtendimentoKm?: number | string | null
  tempoEntregaMinutos?: number | null
  corPrimaria?: string | null
  nomeBot?: string | null
  mensagemBoasVindas?: string | null
  aberto?: boolean
  endereco?: {
    rua?: string
    numero?: string
    bairro?: string
    cidade?: string
    complemento?: string
  } | null
}

type Admin = {
  id: string
  email: string
  role: 'ADMIN_ESTABELECIMENTO' | 'SUPER_ADMIN'
  estabelecimentoId: string | null
  createdAt: string
  estabelecimento?: { id: string; nome: string; slug: string } | null
}

function mascaraTelefone(v: string) {
  const s = String(v || '').replace(/\D/g, '')
  if (s.length <= 2) return `(${s}`
  if (s.length <= 6) return `(${s.slice(0, 2)}) ${s.slice(2)}`
  if (s.length <= 10) return `(${s.slice(0, 2)}) ${s.slice(2, 6)}-${s.slice(6)}`
  return `(${s.slice(0, 2)}) ${s.slice(2, 7)}-${s.slice(7, 11)}`
}

const PERFIS: readonly Perfil[] = ['LANCHONETE', 'ACAITERIA', 'PIZZARIA', 'DISTRIBUIDORA'] as const

function perfilLabel(p: string | null | undefined) {
  const v = safePerfil(p)
  if (!v) return '—'
  if (v === 'LANCHONETE') return '🍔 Lanchonete'
  if (v === 'ACAITERIA') return '🍧 Açaiteria'
  if (v === 'PIZZARIA') return '🍕 Pizzaria'
  if (v === 'DISTRIBUIDORA') return '🥤 Distribuidora'
  return v
}

function perfilBadgeClass(p: string | null | undefined) {
  const v = safePerfil(p)
  if (v === 'LANCHONETE') return 'bg-amber-100 text-amber-800 border-amber-200'
  if (v === 'ACAITERIA') return 'bg-purple-100 text-purple-800 border-purple-200'
  if (v === 'PIZZARIA') return 'bg-red-100 text-red-800 border-red-200'
  if (v === 'DISTRIBUIDORA') return 'bg-sky-100 text-sky-800 border-sky-200'
  return 'bg-gray-100 text-gray-700 border-gray-200'
}

function roleBadgeClass(role: string) {
  if (role === 'SUPER_ADMIN') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function roleLabel(role: string) {
  if (role === 'SUPER_ADMIN') return 'Super Admin'
  if (role === 'ADMIN_ESTABELECIMENTO') return 'Admin do Estab.'
  return role
}

function dt(d: string) {
  try {
    return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return d
  }
}

type Aba = 'estabelecimentos' | 'admins'

type Toast = { id: number; tipo: 'sucesso' | 'erro' | 'info'; mensagem: string }

export default function SuperAdminDashboard() {
  const router = useRouter()
  const [aba, setAba] = useState<Aba>('estabelecimentos')
  const [session, setSession] = useState<{ email: string; role: string } | null>(null)
  const [carregandoSessao, setCarregandoSessao] = useState(true)
  const [toasts, setToasts] = useState<Toast[]>([])

  const [ests, setEsts] = useState<Estabelecimento[]>([])
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)

  const [estForm, setEstForm] = useState<{
    nome: string
    slug: string
    perfil: Perfil
    ativo: boolean
    criarCategoriasPadrao: boolean
    telefone: string
    descricao: string
    horarioAbertura: string
    horarioFechamento: string
    diasAtivos: DiaSemana[]
    valorMinimoPedido: string
    taxaEntregaPadrao: string
    entregaHabilitada: boolean
    permitirRetirada: boolean
    raioAtendimentoKm: string
    tempoEntregaMinutos: string
    logoUrl: string
    corPrimaria: string
    nomeBot: string
    mensagemBoasVindas: string
    aberto: boolean
    endereco: { rua: string; numero: string; bairro: string; cidade: string; complemento: string }
  }>({
    nome: '',
    slug: '',
    perfil: 'LANCHONETE',
    ativo: true,
    criarCategoriasPadrao: true,
    telefone: '',
    descricao: '',
    horarioAbertura: '',
    horarioFechamento: '',
    diasAtivos: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'],
    valorMinimoPedido: '',
    taxaEntregaPadrao: '',
    entregaHabilitada: true,
    permitirRetirada: true,
    raioAtendimentoKm: '',
    tempoEntregaMinutos: '',
    logoUrl: '',
    corPrimaria: '#22c55e',
    nomeBot: 'Atendimento',
    mensagemBoasVindas: '',
    aberto: true,
    endereco: { rua: '', numero: '', bairro: '', cidade: '', complemento: '' }
  })
  const [estEdit, setEstEdit] = useState<Estabelecimento | null>(null)
  const [uploadingLogoEst, setUploadingLogoEst] = useState(false)

  const [adminForm, setAdminForm] = useState<{
    email: string
    password: string
    estabelecimentoId: string
    role: 'ADMIN_ESTABELECIMENTO' | 'SUPER_ADMIN'
  }>({ email: '', password: '', estabelecimentoId: '', role: 'ADMIN_ESTABELECIMENTO' })
  const [adminEdit, setAdminEdit] = useState<any | null>(null)

  const statusFuncByEstId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calcularStatusAbertura>>()
    for (const e of ests) {
      map.set(
        e.id,
        calcularStatusAbertura({
          abertoManual: e.aberto,
          diasAtivos: e.diasAtivos,
          horarioAbertura: e.horarioAbertura,
          horarioFechamento: e.horarioFechamento
        })
      )
    }
    return map
  }, [ests])

  function toast(tipo: Toast['tipo'], mensagem: string) {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, tipo, mensagem }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }

  async function validarSessao() {
    try {
      const r = await fetch('/api/admin/session', { credentials: 'include' })
      if (!r.ok) {
        router.replace('/admin/login')
        return
      }
      const d = await r.json()
      if (d?.role !== 'SUPER_ADMIN') {
        toast('erro', 'Acesso restrito a Super Administradores.')
        setTimeout(() => router.replace('/admin/login'), 1200)
        return
      }
      setSession({ email: d.email, role: d.role })
    } catch {
      router.replace('/admin/login')
    } finally {
      setCarregandoSessao(false)
    }
  }

  async function carregarDados() {
    setLoading(true)
    try {
      const [re, ra] = await Promise.all([
        fetch('/api/super-admin/estabelecimentos', { credentials: 'include' }),
        fetch('/api/super-admin/admins', { credentials: 'include' })
      ])
      if (!re.ok) {
        if (re.status === 401) {
          toast('erro', 'Sessão expirada. Faça login novamente.')
          setTimeout(() => router.replace('/admin/login'), 1000)
          return
        }
        const d = await re.json().catch(() => ({}))
        toast('erro', d?.error || 'Erro ao carregar estabelecimentos.')
        return
      }
      if (!ra.ok) {
        const d = await ra.json().catch(() => ({}))
        toast('erro', d?.error || 'Erro ao carregar administradores.')
        return
      }
      const de = await re.json()
      const da = await ra.json()
      setEsts(Array.isArray(de?.estabelecimentos) ? de.estabelecimentos : [])
      setAdmins(Array.isArray(da?.admins) ? da.admins : [])
    } catch {
      toast('erro', 'Erro de rede. Verifique a conexão.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    validarSessao()
  }, [])

  useEffect(() => {
    if (session) carregarDados()
  }, [session])

  async function logout() {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {}
    router.push('/admin/login')
    router.refresh()
  }

  async function uploadLogoParaEstabelecimento(estId: string, file: File): Promise<string | null> {
    try {
      setUploadingLogoEst(true)
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch(`/api/super-admin/estabelecimentos/${encodeURIComponent(estId)}/logo`, {
        method: 'POST',
        credentials: 'include',
        body: fd
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        toast('erro', d?.error || 'Erro ao enviar logomarca.')
        return null
      }
      toast('sucesso', 'Logomarca enviada!')
      return d.logoUrl || null
    } finally {
      setUploadingLogoEst(false)
    }
  }

  async function criarEstabelecimento() {
    if (!estForm.nome.trim()) {
      toast('erro', 'Informe o nome do estabelecimento.')
      return
    }
    const payload: any = {
      ...estForm,
      valorMinimoPedido: mascaraRealToNumber(estForm.valorMinimoPedido),
      taxaEntregaPadrao: mascaraRealToNumber(estForm.taxaEntregaPadrao),
      raioAtendimentoKm: mascaraRealToNumber(estForm.raioAtendimentoKm),
      tempoEntregaMinutos: estForm.tempoEntregaMinutos ? Number(String(estForm.tempoEntregaMinutos).replace(/\D/g, '')) || null : null,
      endereco: Object.values(estForm.endereco).some(v => String(v).trim() !== '') ? estForm.endereco : null
    }
    const logoPendente = (estForm as any)._arquivoLogo as File | undefined
    delete payload._arquivoLogo
    try {
      const r = await fetch('/api/super-admin/estabelecimentos', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        toast('erro', d?.error || 'Não foi possível criar.')
        return
      }
      const est = d.estabelecimento as Estabelecimento | undefined
      if (est && logoPendente) {
        const urlL = await uploadLogoParaEstabelecimento(est.id, logoPendente)
        if (urlL) est.logoUrl = urlL
      }
      setEstForm({
        nome: '',
        slug: '',
        perfil: 'LANCHONETE',
        ativo: true,
        criarCategoriasPadrao: true,
        telefone: '',
        descricao: '',
        horarioAbertura: '',
        horarioFechamento: '',
        diasAtivos: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'],
        valorMinimoPedido: '',
        taxaEntregaPadrao: '',
        entregaHabilitada: true,
        permitirRetirada: true,
        raioAtendimentoKm: '',
        tempoEntregaMinutos: '',
        logoUrl: '',
        corPrimaria: '#22c55e',
        nomeBot: 'Atendimento',
        mensagemBoasVindas: '',
        aberto: true,
        endereco: { rua: '', numero: '', bairro: '', cidade: '', complemento: '' }
      })
      toast('sucesso', 'Estabelecimento criado com sucesso!')
      await carregarDados()
    } catch {
      toast('erro', 'Erro de rede.')
    }
  }

  async function salvarEdicaoEstabelecimento() {
    if (!estEdit) return
    if (!estEdit.nome.trim()) {
      toast('erro', 'Nome não pode ser vazio.')
      return
    }
    const tempoMin = estEdit.tempoEntregaMinutos != null && String(estEdit.tempoEntregaMinutos).trim() !== ''
      ? Number(String(estEdit.tempoEntregaMinutos).replace(/\D/g, '')) || null
      : null
    const temEndereco = estEdit.endereco && Object.values(estEdit.endereco).some(v => String(v || '').trim() !== '')
    const payload: any = {
      id: estEdit.id,
      nome: estEdit.nome,
      slug: estEdit.slug,
      perfil: estEdit.perfil,
      ativo: estEdit.ativo,
      telefone: estEdit.telefone,
      descricao: estEdit.descricao,
      horarioAbertura: estEdit.horarioAbertura,
      horarioFechamento: estEdit.horarioFechamento,
      diasAtivos: Array.isArray(estEdit.diasAtivos) && estEdit.diasAtivos.length > 0 ? estEdit.diasAtivos : null,
      valorMinimoPedido: mascaraRealToNumber(String(estEdit.valorMinimoPedido || '')),
      taxaEntregaPadrao: mascaraRealToNumber(String(estEdit.taxaEntregaPadrao || '')),
      entregaHabilitada: Boolean(estEdit.entregaHabilitada),
      permitirRetirada: estEdit.permitirRetirada,
      raioAtendimentoKm: mascaraRealToNumber(String(estEdit.raioAtendimentoKm || '')),
      tempoEntregaMinutos: tempoMin,
      logoUrl: estEdit.logoUrl,
      corPrimaria: estEdit.corPrimaria,
      nomeBot: estEdit.nomeBot,
      mensagemBoasVindas: estEdit.mensagemBoasVindas,
      aberto: estEdit.aberto,
      endereco: temEndereco ? estEdit.endereco : null
    }
    try {
      const r = await fetch('/api/super-admin/estabelecimentos', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        toast('erro', d?.error || 'Não foi possível salvar.')
        return
      }
      setEstEdit(null)
      toast('sucesso', 'Estabelecimento atualizado.')
      await carregarDados()
    } catch {
      toast('erro', 'Erro de rede.')
    }
  }

  async function toggleAtivoEstabelecimento(est: Estabelecimento) {
    try {
      const r = await fetch('/api/super-admin/estabelecimentos', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: est.id, nome: est.nome, slug: est.slug, perfil: est.perfil, ativo: !est.ativo })
      })
      if (r.ok) {
        toast('sucesso', est.ativo ? 'Estabelecimento desativado.' : 'Estabelecimento ativado.')
        await carregarDados()
      } else {
        toast('erro', 'Não foi possível alterar status.')
      }
    } catch {
      toast('erro', 'Erro de rede.')
    }
  }

  async function criarAdmin() {
    const email = adminForm.email.trim().toLowerCase()
    const senha = adminForm.password.trim()
    const role = adminForm.role
    const ehSuper = role === 'SUPER_ADMIN'
    if (!email || !email.includes('@')) {
      toast('erro', 'Informe um email válido.')
      return
    }
    if (!senha || senha.length < 4) {
      toast('erro', 'Senha com no mínimo 4 caracteres.')
      return
    }
    if (!ehSuper && !adminForm.estabelecimentoId) {
      toast('erro', 'Selecione um estabelecimento para admin comum.')
      return
    }
    try {
      const r = await fetch('/api/super-admin/admins', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: senha,
          estabelecimentoId: ehSuper ? null : adminForm.estabelecimentoId,
          role
        })
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        toast('erro', d?.error || 'Não foi possível criar admin.')
        return
      }
      setAdminForm({ email: '', password: '', estabelecimentoId: '', role: 'ADMIN_ESTABELECIMENTO' })
      toast('sucesso', 'Usuário admin criado!')
      await carregarDados()
    } catch {
      toast('erro', 'Erro de rede.')
    }
  }

  async function salvarEdicaoAdmin() {
    if (!adminEdit) return
    const email = String(adminEdit.email || '').trim().toLowerCase()
    if (!email || !email.includes('@')) {
      toast('erro', 'Informe um email válido.')
      return
    }
    const ehSuper = adminEdit.role === 'SUPER_ADMIN'
    const payload: any = {
      id: adminEdit.id,
      email,
      role: adminEdit.role,
      estabelecimentoId: ehSuper ? null : adminEdit.estabelecimentoId || null
    }
    const novaSenha = String(adminEdit.password || '').trim()
    if (novaSenha) {
      if (novaSenha.length < 4) {
        toast('erro', 'Nova senha com no mínimo 4 caracteres.')
        return
      }
      payload.password = novaSenha
    }
    try {
      const r = await fetch('/api/super-admin/admins', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        toast('erro', d?.error || 'Não foi possível salvar.')
        return
      }
      setAdminEdit(null)
      toast('sucesso', 'Usuário atualizado.')
      await carregarDados()
    } catch {
      toast('erro', 'Erro de rede.')
    }
  }

  async function excluirAdmin(admin: Admin) {
    if (!window.confirm(`Excluir admin "${admin.email}"? Esta ação não pode ser desfeita.`)) return
    try {
      const r = await fetch('/api/super-admin/admins', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: admin.id })
      })
      if (r.ok) {
        toast('sucesso', 'Admin excluído.')
        await carregarDados()
      } else {
        const d = await r.json().catch(() => ({}))
        toast('erro', d?.error || 'Não foi possível excluir.')
      }
    } catch {
      toast('erro', 'Erro de rede.')
    }
  }

  const stats = useMemo(() => {
    const totalEsts = ests.length
    const estsAtivos = ests.filter(e => e.ativo).length
    const totalAdmins = admins.length
    const superAdmins = admins.filter(a => a.role === 'SUPER_ADMIN').length
    return { totalEsts, estsAtivos, totalAdmins, superAdmins }
  }, [ests, admins])

  if (carregandoSessao) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-sm text-slate-500">Carregando sessão...</div>
      </div>
    )
  }

  const emailInicial = session?.email?.[0]?.toUpperCase() || 'S'
  const navItems: { key: Aba; label: string; icon: string }[] = [
    { key: 'estabelecimentos', label: 'Estabelecimentos', icon: '🏪' },
    { key: 'admins', label: 'Administradores', icon: '🛡️' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* TOASTS */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-2 md:px-0">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`rounded-xl border px-4 py-3 shadow-lg backdrop-blur text-sm flex items-start gap-3 animate-in slide-in-from-top ${
              t.tipo === 'sucesso'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900'
                : t.tipo === 'erro'
                ? 'bg-red-50/95 border-red-200 text-red-900'
                : 'bg-sky-50/95 border-sky-200 text-sky-900'
            }`}
          >
            <span className="text-lg leading-none">
              {t.tipo === 'sucesso' ? '✅' : t.tipo === 'erro' ? '⛔' : 'ℹ️'}
            </span>
            <span className="flex-1">{t.mensagem}</span>
          </div>
        ))}
      </div>

      {/* SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white shadow-xl hidden md:flex flex-col z-30">
        <div className="px-5 py-4 flex items-center gap-3 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-sm font-bold text-gray-900 shadow-lg shadow-emerald-500/20">
            W
          </div>
          <div className="flex flex-col">
            <div className="text-sm font-semibold">Super Admin</div>
            <div className="text-[11px] text-gray-400">Painel Global</div>
          </div>
        </div>
        <nav className="mt-4 flex-1 overflow-y-auto pb-16">
          <div className="px-5 mb-2 text-[11px] text-gray-400 uppercase tracking-wide">Navegação</div>
          {navItems.map(it => {
            const ativo = aba === it.key
            return (
              <button
                key={it.key}
                onClick={() => setAba(it.key)}
                className={`group relative flex w-full items-center gap-3 px-5 py-2.5 text-sm transition-all text-left ${
                  ativo ? 'bg-white/5 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {ativo && <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-emerald-400" />}
                <span className="text-lg">{it.icon}</span>
                <span>{it.label}</span>
                {it.key === 'estabelecimentos' && (
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-200">
                    {stats.totalEsts}
                  </span>
                )}
                {it.key === 'admins' && (
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-200">
                    {stats.totalAdmins}
                  </span>
                )}
              </button>
            )
          })}
          <div className="mt-6 px-5 mb-2 text-[11px] text-gray-400 uppercase tracking-wide">Acesso Rápido</div>
          <button
            onClick={() => router.push('/admin/pedidos')}
            className="group relative flex w-full items-center gap-3 px-5 py-2.5 text-sm transition-all text-left text-gray-300 hover:bg-white/5 hover:text-white"
          >
            <span className="text-lg">🧾</span>
            <span>Ver pedidos (admin)</span>
          </button>
        </nav>
        {/* SIDEBAR FOOTER */}
        <div className="mt-auto px-5 py-4 text-xs text-gray-400 border-t border-white/5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[11px] font-bold text-gray-900">
              {emailInicial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-200 truncate">{session?.email || ''}</div>
              <div className="text-[11px] text-emerald-300">Super Admin</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-gray-100 hover:bg-red-500/20 hover:border-red-400/30 hover:text-red-100 transition"
          >
            <span>⏏</span>
            <span>Sair do painel</span>
          </button>
          <div className="pt-2 border-t border-white/5 text-[10px] text-gray-500 leading-relaxed text-center">
            Desenvolvido por<br />
            <span className="text-gray-300 font-medium">W-Tech Solutions</span>
          </div>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* HEADER */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="h-16 px-4 md:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="md:hidden inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm">
                ☰
              </div>
              <div>
                <h1 className="text-base md:text-lg font-semibold text-slate-900">
                  {aba === 'estabelecimentos' ? 'Estabelecimentos' : 'Administradores'}
                </h1>
                <p className="text-xs text-slate-500">
                  {aba === 'estabelecimentos'
                    ? `${stats.estsAtivos} de ${stats.totalEsts} ativos no momento`
                    : `${stats.superAdmins} super admin(s) · ${stats.totalAdmins - stats.superAdmins} admin(s) de estabelecimento`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex md:hidden lg:flex items-center gap-3 text-xs">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[11px] font-bold text-gray-900">
                  {emailInicial}
                </div>
                <div className="hidden sm:flex flex-col leading-tight">
                  <span className="font-medium text-slate-800">{session?.email}</span>
                  <span className="text-[11px] text-emerald-600">Super Admin</span>
                </div>
              </div>
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition md:hidden lg:inline-flex"
              >
                <span>⏏</span>
                <span className="sm:inline hidden">Sair</span>
              </button>
            </div>
          </div>
          {/* ABAS MOBILE */}
          <div className="md:hidden px-4 pb-3 flex items-center gap-2 overflow-x-auto border-t border-slate-100">
            {navItems.map(it => {
              const ativo = aba === it.key
              return (
                <button
                  key={it.key}
                  onClick={() => setAba(it.key)}
                  className={`whitespace-nowrap inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition ${
                    ativo
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{it.icon}</span>
                  <span>{it.label}</span>
                </button>
              )
            })}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          {/* CARDS DE ESTATÍSTICAS */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
              <div className="text-xs text-slate-500 mb-1">Estabelecimentos</div>
              <div className="flex items-end justify-between">
                <div className="text-2xl font-bold text-slate-900">{stats.totalEsts}</div>
                <div className="text-xl">🏪</div>
              </div>
              <div className="mt-2 text-[11px] text-emerald-600">{stats.estsAtivos} ativos</div>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
              <div className="text-xs text-slate-500 mb-1">Inativos</div>
              <div className="flex items-end justify-between">
                <div className="text-2xl font-bold text-slate-900">{stats.totalEsts - stats.estsAtivos}</div>
                <div className="text-xl">⏸️</div>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">Bloqueados / desativados</div>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
              <div className="text-xs text-slate-500 mb-1">Total Admins</div>
              <div className="flex items-end justify-between">
                <div className="text-2xl font-bold text-slate-900">{stats.totalAdmins}</div>
                <div className="text-xl">👤</div>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">Credenciais ativas</div>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
              <div className="text-xs text-slate-500 mb-1">Super Admins</div>
              <div className="flex items-end justify-between">
                <div className="text-2xl font-bold text-slate-900">{stats.superAdmins}</div>
                <div className="text-xl">🛡️</div>
              </div>
              <div className="mt-2 text-[11px] text-emerald-600">Acesso global</div>
            </div>
          </section>

          {/* ABA ESTABELECIMENTOS */}
          {aba === 'estabelecimentos' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* CRIAR */}
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Novo Estabelecimento</h3>
                      <p className="text-xs text-slate-500">Provisione uma nova unidade</p>
                    </div>
                    <div className="text-xl">✨</div>
                  </div>
                  <div className="p-5 space-y-4">
                    {/* Linha básica: nome + slug */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div className="md:col-span-3">
                        <label className="text-xs font-medium text-slate-700 block mb-1.5">Nome comercial</label>
                        <input
                          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 transition"
                          placeholder="Ex: Distribuidora Centro"
                          value={estForm.nome}
                          onChange={e =>
                            setEstForm(f => ({
                              ...f,
                              nome: e.target.value,
                              slug: f.slug || e.target.value.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                            }))
                          }
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-medium text-slate-700 block mb-1.5">Slug (URL única)</label>
                        <input
                          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 transition"
                          placeholder="distribuidora-centro"
                          value={estForm.slug}
                          onChange={e =>
                            setEstForm(f => ({
                              ...f,
                              slug: e.target.value.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                            }))
                          }
                        />
                        <div className="text-[11px] text-slate-400 mt-1">/chat/{estForm.slug || '<slug>'}</div>
                      </div>
                    </div>

                    {/* Perfil + Telefone WhatsApp (colunas juntas) */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div className="md:col-span-2">
                        <label className="text-xs font-medium text-slate-700 block mb-1.5">Perfil</label>
                        <select
                          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 transition bg-white"
                          value={estForm.perfil}
                          onChange={e => setEstForm(f => ({ ...f, perfil: e.target.value as Perfil }))}
                        >
                          {PERFIS.map(p => (
                            <option key={p} value={p}>{perfilLabel(p)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-3">
                        <label className="text-xs font-medium text-slate-700 block mb-1.5">
                          📱 WhatsApp (para onde irão os pedidos)
                        </label>
                        <input
                          type="tel"
                          inputMode="numeric"
                          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 transition"
                          placeholder="(11) 90000-0000 (com DDD)"
                          value={mascaraTelefone(estForm.telefone)}
                          onChange={e =>
                            setEstForm(f => ({ ...f, telefone: String(e.target.value || '').replace(/\D/g, '').slice(0, 11) }))
                          }
                        />
                        {estForm.telefone && (
                          <div className="text-[11px] text-emerald-600 mt-1">
                            ✅ Vai receber pedidos em: {mascaraTelefone(estForm.telefone)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Logomarca upload + preview + Cor primária */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div className="md:col-span-2">
                        <label className="text-xs font-medium text-slate-700 block mb-1.5">🖼️ Logomarca</label>
                        <div className="flex items-start gap-3">
                          <div className="relative shrink-0 h-20 w-20 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                            {estForm.logoUrl ? (
                              <img src={estForm.logoUrl} alt="preview" className="h-full w-full object-contain p-1" />
                            ) : (
                              <div className="text-2xl text-slate-400">🏪</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition">
                              <span>⬆️</span>
                              <span>{estForm.logoUrl ? 'Trocar logo' : 'Selecionar arquivo'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async e => {
                                  const file = e.target.files?.[0]
                                  if (!file) return
                                  if (!file.type.startsWith('image/')) {
                                    toast('erro', 'Selecione uma imagem válida.')
                                    return
                                  }
                                  if (file.size > 2 * 1024 * 1024) {
                                    toast('erro', 'Imagem maior que 2MB.')
                                    return
                                  }
                                  const reader = new FileReader()
                                  reader.onload = () => {
                                    const result = typeof reader.result === 'string' ? reader.result : ''
                                    setEstForm(f => {
                                      const next = { ...f, logoUrl: result }
                                      ;(next as any)._arquivoLogo = file
                                      return next
                                    })
                                  }
                                  reader.readAsDataURL(file)
                                  ;(estForm as any)._arquivoLogo = file
                                }}
                              />
                            </label>
                            {estForm.logoUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEstForm(f => ({ ...f, logoUrl: '' }))
                                  const anyF = estForm as any
                                  if (anyF._arquivoLogo) delete anyF._arquivoLogo
                                }}
                                className="block text-[11px] text-slate-500 hover:text-red-600"
                              >
                                Remover logo
                              </button>
                            )}
                            <div className="text-[11px] text-slate-400 leading-snug">
                              PNG/JPG. Até 2MB. Enviada após criar o estabelecimento.
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="md:col-span-1">
                        <label className="text-xs font-medium text-slate-700 block mb-1.5">🎨 Cor</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            className="h-10 w-12 rounded-lg border border-slate-200 bg-white p-1 cursor-pointer"
                            value={estForm.corPrimaria || '#22c55e'}
                            onChange={e => setEstForm(f => ({ ...f, corPrimaria: e.target.value }))}
                          />
                          <input
                            className="w-full border border-slate-200 rounded-xl px-2 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                            value={estForm.corPrimaria || '#22c55e'}
                            onChange={e => setEstForm(f => ({ ...f, corPrimaria: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-medium text-slate-700 block mb-1.5">🤖 Nome do atendente (bot)</label>
                        <input
                          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                          placeholder="Ex: Atendimento"
                          value={estForm.nomeBot}
                          onChange={e => setEstForm(f => ({ ...f, nomeBot: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Descrição curta */}
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1.5">Descrição curta (exibida no chat)</label>
                      <textarea
                        rows={2}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 resize-none"
                        placeholder="Ex: A melhor hamburgueria da cidade!"
                        value={estForm.descricao}
                        onChange={e => setEstForm(f => ({ ...f, descricao: e.target.value }))}
                      />
                    </div>

                    {/* Endereço */}
                    <div>
                      <div className="text-xs font-semibold text-slate-700 mb-1.5">📍 Endereço principal</div>
                      <div className="grid grid-cols-1 md:grid-cols-10 gap-3">
                        <div className="md:col-span-6">
                          <label className="text-[11px] text-slate-500 block mb-1">Rua</label>
                          <input
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                            placeholder="Rua Exemplo, 123"
                            value={estForm.endereco.rua}
                            onChange={e => setEstForm(f => ({ ...f, endereco: { ...f.endereco, rua: e.target.value } }))}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-[11px] text-slate-500 block mb-1">Número</label>
                          <input
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                            placeholder="123"
                            value={estForm.endereco.numero}
                            onChange={e => setEstForm(f => ({ ...f, endereco: { ...f.endereco, numero: e.target.value } }))}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-[11px] text-slate-500 block mb-1">Bairro</label>
                          <input
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                            placeholder="Centro"
                            value={estForm.endereco.bairro}
                            onChange={e => setEstForm(f => ({ ...f, endereco: { ...f.endereco, bairro: e.target.value } }))}
                          />
                        </div>
                        <div className="md:col-span-4">
                          <label className="text-[11px] text-slate-500 block mb-1">Cidade</label>
                          <input
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                            placeholder="São Paulo"
                            value={estForm.endereco.cidade}
                            onChange={e => setEstForm(f => ({ ...f, endereco: { ...f.endereco, cidade: e.target.value } }))}
                          />
                        </div>
                        <div className="md:col-span-6">
                          <label className="text-[11px] text-slate-500 block mb-1">Complemento</label>
                          <input
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                            placeholder="Sala 2, ap 301, ao lado da padaria..."
                            value={estForm.endereco.complemento}
                            onChange={e => setEstForm(f => ({ ...f, endereco: { ...f.endereco, complemento: e.target.value } }))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Funcionamento: Dias + Horários + Status Override */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="text-xs font-semibold text-slate-800">⏰ Dias e horários de funcionamento</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Marque os dias que abre e o horário. O chat automaticamente fica "fechado" fora desses dias/horários.
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-500 hidden md:block text-right">
                          ⚠️ Desmarque "Permitir pedidos agora" para fechar a loja por feriado ou manutenção (ignora os horários abaixo)
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-6">
                          <label className="text-[11px] text-slate-500 block mb-1.5">Dias da semana</label>
                          <div className="flex flex-wrap gap-1.5">
                            {DIAS_SEMANA.map(d => {
                              const on = estForm.diasAtivos.includes(d.id)
                              return (
                                <label
                                  key={d.id}
                                  className={`cursor-pointer select-none px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                                    on
                                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={on}
                                    onChange={e => {
                                      const checked = e.target.checked
                                      setEstForm(f => ({
                                        ...f,
                                        diasAtivos: checked
                                          ? [...f.diasAtivos, d.id]
                                          : f.diasAtivos.filter(x => x !== d.id)
                                      }))
                                    }}
                                  />
                                  {d.label}
                                </label>
                              )
                            })}
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-[11px] text-slate-500 block mb-1.5">Abre às</label>
                          <input
                            type="time"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                            value={estForm.horarioAbertura}
                            onChange={e => setEstForm(f => ({ ...f, horarioAbertura: e.target.value }))}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-[11px] text-slate-500 block mb-1.5">Fecha às</label>
                          <input
                            type="time"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                            value={estForm.horarioFechamento}
                            onChange={e => setEstForm(f => ({ ...f, horarioFechamento: e.target.value }))}
                          />
                        </div>
                        <label className="md:col-span-2 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:bg-slate-50">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300"
                            checked={!!estForm.aberto}
                            onChange={e => setEstForm(f => ({ ...f, aberto: e.target.checked }))}
                          />
                          <span className="text-xs font-medium text-slate-700 whitespace-nowrap">🏪 Permitir pedidos agora</span>
                        </label>
                      </div>
                      {!estForm.aberto && (
                        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                          ⚠️ Loja fechada MANUALMENTE. Clientes não vão conseguir pedir, mesmo se estiver dentro do horário configurado acima.
                        </div>
                      )}
                    </div>

                    {/* Entrega + Financeiro */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-6 rounded-xl border border-slate-200 p-4 space-y-3 bg-white">
                        <div className="text-xs font-semibold text-slate-800">🚚 Entrega</div>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300"
                            checked={!!estForm.entregaHabilitada}
                            onChange={e => setEstForm(f => ({ ...f, entregaHabilitada: e.target.checked }))}
                          />
                          <span className="text-slate-700">Habilitar opção de entrega</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300"
                            checked={!!estForm.permitirRetirada}
                            onChange={e => setEstForm(f => ({ ...f, permitirRetirada: e.target.checked }))}
                          />
                          <span className="text-slate-700">🧍 Permitir retirada no balcão</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="text-[11px] text-slate-500 block mb-1">Taxa entrega padrão</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                              <input
                                inputMode="decimal"
                                disabled={!estForm.entregaHabilitada}
                                className={`w-full border rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 ${!estForm.entregaHabilitada ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-200'}`}
                                placeholder="0,00"
                                value={mascaraReal(estForm.taxaEntregaPadrao)}
                                onChange={e => {
                                  const raw = String(e.target.value || '').replace(/\D/g, '')
                                  setEstForm(f => ({ ...f, taxaEntregaPadrao: mascaraReal(raw) }))
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-500 block mb-1">Valor mínimo p/ pedido</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                              <input
                                inputMode="decimal"
                                className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                                placeholder="0,00"
                                value={mascaraReal(estForm.valorMinimoPedido)}
                                onChange={e => {
                                  const raw = String(e.target.value || '').replace(/\D/g, '')
                                  setEstForm(f => ({ ...f, valorMinimoPedido: mascaraReal(raw) }))
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-500 block mb-1">Raio atendimento (km)</label>
                            <div className="relative">
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">km</span>
                              <input
                                inputMode="decimal"
                                disabled={!estForm.entregaHabilitada}
                                className={`w-full border rounded-xl px-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 ${!estForm.entregaHabilitada ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-200'}`}
                                placeholder="5,00"
                                value={mascaraReal(estForm.raioAtendimentoKm)}
                                onChange={e => {
                                  const raw = String(e.target.value || '').replace(/\D/g, '')
                                  setEstForm(f => ({ ...f, raioAtendimentoKm: mascaraReal(raw) }))
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-500 block mb-1">Tempo estimado (min)</label>
                            <div className="relative">
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">min</span>
                              <input
                                inputMode="numeric"
                                disabled={!estForm.entregaHabilitada}
                                className={`w-full border rounded-xl px-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 ${!estForm.entregaHabilitada ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-200'}`}
                                placeholder="45"
                                value={estForm.tempoEntregaMinutos}
                                onChange={e => setEstForm(f => ({ ...f, tempoEntregaMinutos: String(e.target.value || '').replace(/\D/g, '') }))}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Msg boas-vindas + checkboxes */}
                      <div className="md:col-span-6 space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-800 block mb-1.5">👋 Mensagem de boas-vindas</label>
                          <textarea
                            rows={3}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 resize-none"
                            placeholder="Olá! Seja bem-vindo a nossa loja virtual..."
                            value={estForm.mensagemBoasVindas}
                            onChange={e => setEstForm(f => ({ ...f, mensagemBoasVindas: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-700 block mb-1.5">Descrição curta (chat)</label>
                          <textarea
                            rows={2}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 resize-none"
                            placeholder="Ex: A melhor hamburgueria da cidade!"
                            value={estForm.descricao}
                            onChange={e => setEstForm(f => ({ ...f, descricao: e.target.value }))}
                          />
                        </div>
                        <div className="flex flex-col gap-2 pt-1">
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              className="rounded border-slate-300"
                              checked={estForm.ativo}
                              onChange={e => setEstForm(f => ({ ...f, ativo: e.target.checked }))}
                            />
                            <span>Estabelecimento ativo imediatamente</span>
                          </label>
                          {estForm.perfil === 'DISTRIBUIDORA' && (
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                className="rounded border-slate-300"
                                checked={estForm.criarCategoriasPadrao}
                                onChange={e => setEstForm(f => ({ ...f, criarCategoriasPadrao: e.target.checked }))}
                              />
                              <span>Criar categorias padrão (Cervejas, Refrigerantes etc.)</span>
                            </label>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={criarEstabelecimento}
                        className="w-full rounded-xl bg-slate-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-slate-800 shadow-sm transition"
                      >
                        Criar estabelecimento
                      </button>
                    </div>
                  </div>
                </div>

                {/* EDITAR */}
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Editar Estabelecimento</h3>
                      <p className="text-xs text-slate-500">
                        {estEdit ? `${estEdit.nome} · ${perfilLabel(estEdit.perfil)}` : 'Selecione um item na lista abaixo'}
                      </p>
                    </div>
                    <div className="text-xl">{estEdit ? '✏️' : '📋'}</div>
                  </div>
                  <div className="p-5 space-y-4">
                    {!estEdit ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                        <div className="text-3xl mb-2">👇</div>
                        <div className="text-sm text-slate-500">
                          Clique em <strong>Editar</strong> em qualquer estabelecimento da lista
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Nome + Slug */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                          <div className="md:col-span-3">
                            <label className="text-xs font-medium text-slate-700 block mb-1.5">Nome comercial</label>
                            <input
                              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                              value={estEdit.nome}
                              onChange={e => setEstEdit(s => (s ? { ...s, nome: e.target.value } : s))}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-xs font-medium text-slate-700 block mb-1.5">Slug</label>
                            <input
                              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                              value={estEdit.slug}
                              onChange={e => setEstEdit(s => (s ? { ...s, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') } : s))}
                            />
                          </div>
                        </div>

                        {/* Perfil + WhatsApp */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                          <div className="md:col-span-2">
                            <label className="text-xs font-medium text-slate-700 block mb-1.5">Perfil</label>
                            <select
                              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                              value={estEdit.perfil}
                              onChange={e => setEstEdit(s => (s ? { ...s, perfil: e.target.value as Perfil } : s))}
                            >
                              {PERFIS.map(p => (
                                <option key={p} value={p}>{perfilLabel(p)}</option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-3">
                            <label className="text-xs font-medium text-slate-700 block mb-1.5">📱 WhatsApp de recebimento</label>
                            <input
                              type="tel"
                              inputMode="numeric"
                              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                              placeholder="(11) 90000-0000"
                              value={mascaraTelefone(String(estEdit.telefone || ''))}
                              onChange={e => setEstEdit(s => (s ? { ...s, telefone: String(e.target.value || '').replace(/\D/g, '').slice(0, 11) } : s))}
                            />
                          </div>
                        </div>

                        {/* Logo upload + Cor + Nome Bot */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                          <div className="md:col-span-2">
                            <label className="text-xs font-medium text-slate-700 block mb-1.5">🖼️ Logomarca</label>
                            <div className="flex items-start gap-3">
                              <div className="relative shrink-0 h-20 w-20 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                                {estEdit.logoUrl ? (
                                  <img src={estEdit.logoUrl} alt="logo" className="h-full w-full object-contain p-1" />
                                ) : (
                                  <div className="text-2xl text-slate-400">🏪</div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 space-y-2">
                                <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition">
                                  <span>{uploadingLogoEst ? '⏳ Enviando...' : '⬆️ Enviar nova'}</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    disabled={uploadingLogoEst}
                                    className="hidden"
                                    onChange={async e => {
                                      const file = e.target.files?.[0]
                                      if (!file) return
                                      const urlL = await uploadLogoParaEstabelecimento(estEdit.id, file)
                                      if (urlL) {
                                        setEstEdit(s => (s ? { ...s, logoUrl: urlL } : s))
                                        await carregarDados()
                                      }
                                    }}
                                  />
                                </label>
                                {estEdit.logoUrl && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        const r = await fetch('/api/super-admin/estabelecimentos', {
                                          method: 'PUT',
                                          credentials: 'include',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ id: estEdit.id, logoUrl: null })
                                        })
                                        if (r.ok) {
                                          setEstEdit(s => (s ? { ...s, logoUrl: null } : s))
                                          toast('sucesso', 'Logomarca removida.')
                                          await carregarDados()
                                        } else toast('erro', 'Não foi possível remover.')
                                      } catch {
                                        toast('erro', 'Erro de rede.')
                                      }
                                    }}
                                    className="block text-[11px] text-slate-500 hover:text-red-600"
                                  >
                                    Remover logo atual
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="md:col-span-1">
                            <label className="text-xs font-medium text-slate-700 block mb-1.5">🎨 Cor</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                className="h-10 w-12 rounded-lg border border-slate-200 bg-white p-1 cursor-pointer"
                                value={estEdit.corPrimaria || '#22c55e'}
                                onChange={e => setEstEdit(s => (s ? { ...s, corPrimaria: e.target.value } : s))}
                              />
                              <input
                                className="w-full border border-slate-200 rounded-xl px-2 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                                value={estEdit.corPrimaria || '#22c55e'}
                                onChange={e => setEstEdit(s => (s ? { ...s, corPrimaria: e.target.value } : s))}
                              />
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-xs font-medium text-slate-700 block mb-1.5">🤖 Nome atendente</label>
                            <input
                              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                              value={estEdit.nomeBot || ''}
                              onChange={e => setEstEdit(s => (s ? { ...s, nomeBot: e.target.value } : s))}
                            />
                          </div>
                        </div>

                        {/* Endereço */}
                        <div>
                          <div className="text-xs font-semibold text-slate-700 mb-1.5">📍 Endereço principal</div>
                          <div className="grid grid-cols-1 md:grid-cols-10 gap-3">
                            <div className="md:col-span-6">
                              <label className="text-[11px] text-slate-500 block mb-1">Rua</label>
                              <input
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                                placeholder="Rua Exemplo, 123"
                                value={estEdit.endereco?.rua || ''}
                                onChange={e => setEstEdit(s => (s ? { ...s, endereco: { ...s.endereco!, rua: e.target.value } } : s))}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-[11px] text-slate-500 block mb-1">Número</label>
                              <input
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                                placeholder="123"
                                value={estEdit.endereco?.numero || ''}
                                onChange={e => setEstEdit(s => (s ? { ...s, endereco: { ...s.endereco!, numero: e.target.value } } : s))}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-[11px] text-slate-500 block mb-1">Bairro</label>
                              <input
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                                placeholder="Centro"
                                value={estEdit.endereco?.bairro || ''}
                                onChange={e => setEstEdit(s => (s ? { ...s, endereco: { ...s.endereco!, bairro: e.target.value } } : s))}
                              />
                            </div>
                            <div className="md:col-span-4">
                              <label className="text-[11px] text-slate-500 block mb-1">Cidade</label>
                              <input
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                                placeholder="São Paulo"
                                value={estEdit.endereco?.cidade || ''}
                                onChange={e => setEstEdit(s => (s ? { ...s, endereco: { ...s.endereco!, cidade: e.target.value } } : s))}
                              />
                            </div>
                            <div className="md:col-span-6">
                              <label className="text-[11px] text-slate-500 block mb-1">Complemento</label>
                              <input
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                                placeholder="Sala 2, ao lado da padaria..."
                                value={estEdit.endereco?.complemento || ''}
                                onChange={e => setEstEdit(s => (s ? { ...s, endereco: { ...s.endereco!, complemento: e.target.value } } : s))}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Funcionamento Dias + Horarios + Override */}
                        <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <div className="text-xs font-semibold text-slate-800">⏰ Funcionamento</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Os dias e horários abaixo controlam automaticamente o status "aberto/fechado" no chat cliente.
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-slate-300"
                                  checked={!!estEdit.ativo}
                                  onChange={e => setEstEdit(s => (s ? { ...s, ativo: e.target.checked } : s))}
                                />
                                <span className="text-xs font-medium text-slate-700 whitespace-nowrap">✨ Estabelecimento ativo</span>
                              </label>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div className="md:col-span-6">
                              <label className="text-[11px] text-slate-500 block mb-1.5">Dias da semana que abre</label>
                              <div className="flex flex-wrap gap-1.5">
                                {DIAS_SEMANA.map(d => {
                                  const diasAtuais = Array.isArray(estEdit.diasAtivos) ? estEdit.diasAtivos : []
                                  const on = diasAtuais.includes(d.id)
                                  return (
                                    <label
                                      key={d.id}
                                      className={`cursor-pointer select-none px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                                        on
                                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={on}
                                        onChange={ev => {
                                          const checked = ev.target.checked
                                          setEstEdit(s => {
                                            if (!s) return s
                                            const curr = Array.isArray(s.diasAtivos) ? [...s.diasAtivos] : []
                                            const prox = checked ? [...curr, d.id] : curr.filter(x => x !== d.id)
                                            return { ...s, diasAtivos: prox }
                                          })
                                        }}
                                      />
                                      {d.label}
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-[11px] text-slate-500 block mb-1.5">Abre às</label>
                              <input
                                type="time"
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                                value={estEdit.horarioAbertura || ''}
                                onChange={e => setEstEdit(s => (s ? { ...s, horarioAbertura: e.target.value } : s))}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-[11px] text-slate-500 block mb-1.5">Fecha às</label>
                              <input
                                type="time"
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                                value={estEdit.horarioFechamento || ''}
                                onChange={e => setEstEdit(s => (s ? { ...s, horarioFechamento: e.target.value } : s))}
                              />
                            </div>
                            <label className="md:col-span-2 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:bg-slate-50">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300"
                                checked={!!estEdit.aberto}
                                onChange={e => setEstEdit(s => (s ? { ...s, aberto: e.target.checked } : s))}
                              />
                              <span className="text-xs font-medium text-slate-700 whitespace-nowrap">🏪 Permitir pedidos</span>
                            </label>
                          </div>
                          {!estEdit.aberto && (
                            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                              ⚠️ Fechado MANUALMENTE (override). Nenhum cliente vai conseguir pedir, mesmo se estiver dentro do horário/dia de funcionamento acima.
                            </div>
                          )}
                        </div>

                        {/* Entrega + Financeiro + Descrições */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                          <div className="md:col-span-7 rounded-xl border border-slate-200 p-4 space-y-3 bg-white">
                            <div className="text-xs font-semibold text-slate-800">🚚 Entrega e financeiro</div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <label className="col-span-2 md:col-span-1 flex items-start gap-2 pt-1">
                                <input
                                  type="checkbox"
                                  className="mt-0.5 rounded border-slate-300"
                                  checked={!!estEdit.entregaHabilitada}
                                  onChange={e => setEstEdit(s => (s ? { ...s, entregaHabilitada: e.target.checked } : s))}
                                />
                                <span className="text-xs text-slate-700">Entrega habilitada</span>
                              </label>
                              <label className="col-span-2 md:col-span-1 flex items-start gap-2 pt-1">
                                <input
                                  type="checkbox"
                                  className="mt-0.5 rounded border-slate-300"
                                  checked={!!estEdit.permitirRetirada}
                                  onChange={e => setEstEdit(s => (s ? { ...s, permitirRetirada: e.target.checked } : s))}
                                />
                                <span className="text-xs text-slate-700">🧍 Retirada balcão</span>
                              </label>
                              <div className="col-span-2 md:col-span-1">
                                <label className="text-[11px] text-slate-500 block mb-1">Taxa entrega</label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">R$</span>
                                  <input
                                    inputMode="decimal"
                                    disabled={!estEdit.entregaHabilitada}
                                    className={`w-full border rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 ${!estEdit.entregaHabilitada ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-200'}`}
                                    placeholder="0,00"
                                    value={mascaraReal(String(estEdit.taxaEntregaPadrao || ''))}
                                    onChange={ev => {
                                      const raw = String(ev.target.value || '').replace(/\D/g, '')
                                      setEstEdit(s => (s ? { ...s, taxaEntregaPadrao: mascaraReal(raw) } : s))
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="col-span-2 md:col-span-1">
                                <label className="text-[11px] text-slate-500 block mb-1">Valor mín pedido</label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">R$</span>
                                  <input
                                    inputMode="decimal"
                                    className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                                    placeholder="0,00"
                                    value={mascaraReal(String(estEdit.valorMinimoPedido || ''))}
                                    onChange={ev => {
                                      const raw = String(ev.target.value || '').replace(/\D/g, '')
                                      setEstEdit(s => (s ? { ...s, valorMinimoPedido: mascaraReal(raw) } : s))
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="col-span-2 md:col-span-1">
                                <label className="text-[11px] text-slate-500 block mb-1">Raio (km)</label>
                                <div className="relative">
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">km</span>
                                  <input
                                    inputMode="decimal"
                                    disabled={!estEdit.entregaHabilitada}
                                    className={`w-full border rounded-xl px-3 pr-10 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 ${!estEdit.entregaHabilitada ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-200'}`}
                                    placeholder="5,00"
                                    value={mascaraReal(String(estEdit.raioAtendimentoKm || ''))}
                                    onChange={ev => {
                                      const raw = String(ev.target.value || '').replace(/\D/g, '')
                                      setEstEdit(s => (s ? { ...s, raioAtendimentoKm: mascaraReal(raw) } : s))
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="col-span-2 md:col-span-1">
                                <label className="text-[11px] text-slate-500 block mb-1">Tempo (min)</label>
                                <div className="relative">
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">min</span>
                                  <input
                                    inputMode="numeric"
                                    disabled={!estEdit.entregaHabilitada}
                                    className={`w-full border rounded-xl px-3 pr-10 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 ${!estEdit.entregaHabilitada ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-200'}`}
                                    placeholder="45"
                                    value={estEdit.tempoEntregaMinutos ?? ''}
                                    onChange={ev =>
                                      setEstEdit(s =>
                                        s
                                          ? {
                                              ...s,
                                              tempoEntregaMinutos:
                                                String(ev.target.value || '').trim() === '' ? null : Number(String(ev.target.value || '').replace(/\D/g, '')) || null
                                            }
                                          : s
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="md:col-span-5 space-y-3">
                            <div>
                              <label className="text-xs font-semibold text-slate-800 block mb-1.5">Descrição curta</label>
                              <textarea
                                rows={2}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 resize-none"
                                value={estEdit.descricao || ''}
                                onChange={e => setEstEdit(s => (s ? { ...s, descricao: e.target.value } : s))}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-800 block mb-1.5">👋 Boas-vindas</label>
                              <textarea
                                rows={2}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 resize-none"
                                value={estEdit.mensagemBoasVindas || ''}
                                onChange={e => setEstEdit(s => (s ? { ...s, mensagemBoasVindas: e.target.value } : s))}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={salvarEdicaoEstabelecimento}
                            className="flex-1 rounded-xl bg-slate-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-slate-800 shadow-sm transition"
                          >
                            Salvar alterações
                          </button>
                          <button
                            onClick={() => setEstEdit(null)}
                            className="rounded-xl border border-slate-200 text-sm font-medium text-slate-700 px-4 py-2.5 hover:bg-slate-50 transition"
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* TABELA LISTAGEM */}
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Todos os Estabelecimentos</h3>
                    <p className="text-xs text-slate-500">
                      {loading ? 'Carregando...' : `${ests.length} registros`}
                    </p>
                  </div>
                  <button
                    onClick={carregarDados}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition"
                  >
                    <span>↻</span> Atualizar
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 bg-slate-50/60">
                        <th className="py-3 px-5 font-medium">Estabelecimento</th>
                        <th className="py-3 px-4 font-medium">WhatsApp</th>
                        <th className="py-3 px-4 font-medium">Perfil</th>
                        <th className="py-3 px-4 font-medium hidden lg:table-cell">Mínimo</th>
                        <th className="py-3 px-4 font-medium hidden xl:table-cell">Horário</th>
                        <th className="py-3 px-4 font-medium">Status</th>
                        <th className="py-3 px-5 font-medium text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading && (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-xs text-slate-400">
                            Carregando estabelecimentos...
                          </td>
                        </tr>
                      )}
                      {!loading && ests.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-xs text-slate-500">
                            Nenhum estabelecimento cadastrado.
                          </td>
                        </tr>
                      )}
                      {ests.map(e => {
                        const statusFunc = statusFuncByEstId.get(e.id)
                        return (
                        <tr key={e.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-sm overflow-hidden shrink-0">
                                {e.logoUrl ? (
                                  <img src={e.logoUrl} alt={e.nome} className="h-full w-full object-contain bg-white" />
                                ) : (
                                  <span>{e.nome[0]?.toUpperCase() || 'E'}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-slate-900 truncate">{e.nome}</div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                                  <span className="font-mono">/{e.slug}</span>
                                  {statusFunc && !statusFunc.aberto && (
                                    <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-medium">
                                      Fechado agora
                                    </span>
                                  )}
                                  {statusFunc && !statusFunc.configurado && e.ativo && statusFunc.aberto && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                      ⚠️ Sem horário
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {e.telefone ? (
                              <div className="text-sm text-slate-700 font-medium">
                                {exibirTelefone(String(e.telefone))}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-red-50 border border-red-200 text-red-600">
                                ⚠️ Sem WhatsApp
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full border ${perfilBadgeClass(e.perfil)}`}>
                              {perfilLabel(e.perfil)}
                            </span>
                          </td>
                          <td className="py-3 px-4 hidden lg:table-cell">
                            {e.valorMinimoPedido && Number(e.valorMinimoPedido) > 0 ? (
                              <div className="text-sm text-slate-700">
                                R$ {Number(e.valorMinimoPedido).toFixed(2).replace('.', ',')}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">Sem mínimo</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 hidden xl:table-cell max-w-[280px]">
                            {statusFunc?.configurado ? (
                              <div title={statusFunc.motivo}>
                                <div className="font-mono">
                                  {statusFunc.horarioHojeAbre && statusFunc.horarioHojeFecha
                                    ? `${statusFunc.horarioHojeAbre} → ${statusFunc.horarioHojeFecha}`
                                    : e.horarioAbertura && e.horarioFechamento
                                    ? `${e.horarioAbertura} → ${e.horarioFechamento}`
                                    : '—'}
                                </div>
                                {Array.isArray(e.diasAtivos) && e.diasAtivos.length > 0 && (
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    {e.diasAtivos.map(d => DIAS_SEMANA.find(x => x.id === d)?.label).filter(Boolean).join(', ')}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">Não configurado</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1 min-w-[120px]">
                              {statusFunc?.aberto ? (
                                <span
                                  title={statusFunc.motivo}
                                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700"
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  Aberto agora
                                </span>
                              ) : (
                                <span
                                  title={statusFunc?.motivo || 'Status indisponível'}
                                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700"
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                  Fechado
                                </span>
                              )}
                              {e.ativo ? (
                                <span className="text-[10px] text-slate-500">Cadastro ativo</span>
                              ) : (
                                <span className="text-[10px] text-slate-500">❌ Cadastro inativo</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-5">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => router.push(`/chat/${e.slug}`)}
                                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition hidden sm:inline-flex"
                                title="Abrir chat do cliente"
                              >
                                Ver loja
                              </button>
                              <button
                                onClick={() => {
                                  const end = e.endereco || {}
                                  setEstEdit({
                                    ...e,
                                    diasAtivos: Array.isArray(e.diasAtivos) && e.diasAtivos.length > 0 ? e.diasAtivos : ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'],
                                    endereco: {
                                      rua: String(end.rua || ''),
                                      numero: String(end.numero || ''),
                                      bairro: String(end.bairro || ''),
                                      cidade: String(end.cidade || ''),
                                      complemento: String(end.complemento || '')
                                    }
                                  })
                                }}
                                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => toggleAtivoEstabelecimento(e)}
                                className={`text-xs px-2.5 py-1.5 rounded-lg border transition ${
                                  e.ativo
                                    ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                {e.ativo ? 'Desativar' : 'Ativar'}
                              </button>
                            </div>
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ABA ADMINS */}
          {aba === 'admins' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* CRIAR ADMIN */}
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Novo Administrador</h3>
                      <p className="text-xs text-slate-500">Conceda acesso ao painel</p>
                    </div>
                    <div className="text-xl">🔐</div>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1.5">E-mail</label>
                      <input
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 transition"
                        placeholder="nome@empresa.com"
                        value={adminForm.email}
                        onChange={e => setAdminForm(f => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1.5">Senha inicial</label>
                      <input
                        type="password"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 transition"
                        placeholder="mín. 4 caracteres"
                        value={adminForm.password}
                        onChange={e => setAdminForm(f => ({ ...f, password: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1.5">Papel / Permissão</label>
                      <select
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition"
                        value={adminForm.role}
                        onChange={e =>
                          setAdminForm(f => ({
                            ...f,
                            role: e.target.value as any,
                            estabelecimentoId: e.target.value === 'SUPER_ADMIN' ? '' : f.estabelecimentoId
                          }))
                        }
                      >
                        <option value="ADMIN_ESTABELECIMENTO">Admin do Estabelecimento</option>
                        <option value="SUPER_ADMIN">Super Admin (acesso global)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1.5">
                        Estabelecimento vinculado
                      </label>
                      <select
                        disabled={adminForm.role === 'SUPER_ADMIN'}
                        className={`w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition ${
                          adminForm.role === 'SUPER_ADMIN'
                            ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                            : 'border-slate-200'
                        }`}
                        value={adminForm.estabelecimentoId}
                        onChange={e => setAdminForm(f => ({ ...f, estabelecimentoId: e.target.value }))}
                      >
                        <option value="">
                          {adminForm.role === 'SUPER_ADMIN'
                            ? 'Super Admin não possui vínculo (global)'
                            : 'Selecione um estabelecimento'}
                        </option>
                        {ests.map(e => (
                          <option key={e.id} value={e.id}>
                            {e.nome} ({perfilLabel(e.perfil)})
                          </option>
                        ))}
                      </select>
                      {adminForm.role === 'SUPER_ADMIN' && (
                        <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-[11px] text-emerald-700">
                          ℹ️ Super Admin enxerga todos os estabelecimentos e não fica vinculado a nenhum.
                        </div>
                      )}
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={criarAdmin}
                        className="w-full rounded-xl bg-slate-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-slate-800 shadow-sm transition"
                      >
                        Criar usuário admin
                      </button>
                    </div>
                  </div>
                </div>

                {/* EDITAR ADMIN */}
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Editar Administrador</h3>
                      <p className="text-xs text-slate-500">
                        {adminEdit ? 'Ajuste permissões e credenciais' : 'Selecione um usuário na lista'}
                      </p>
                    </div>
                    <div className="text-xl">{adminEdit ? '🛠️' : '📋'}</div>
                  </div>
                  <div className="p-5 space-y-4">
                    {!adminEdit ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                        <div className="text-3xl mb-2">👈</div>
                        <div className="text-sm text-slate-500">
                          Clique em <strong>Editar</strong> ao lado de um usuário
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="text-xs font-medium text-slate-700 block mb-1.5">E-mail</label>
                          <input
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                            value={adminEdit.email || ''}
                            onChange={e => setAdminEdit((s: any) => (s ? { ...s, email: e.target.value } : s))}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-700 block mb-1.5">
                            Nova senha (opcional)
                          </label>
                          <input
                            type="password"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                            placeholder="Deixe em branco para manter"
                            value={adminEdit.password || ''}
                            onChange={e => setAdminEdit((s: any) => (s ? { ...s, password: e.target.value } : s))}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-700 block mb-1.5">Papel</label>
                          <select
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                            value={adminEdit.role || 'ADMIN_ESTABELECIMENTO'}
                            onChange={e =>
                              setAdminEdit((s: any) =>
                                s ? { ...s, role: e.target.value, estabelecimentoId: e.target.value === 'SUPER_ADMIN' ? null : s.estabelecimentoId } : s
                              )
                            }
                          >
                            <option value="ADMIN_ESTABELECIMENTO">Admin do Estabelecimento</option>
                            <option value="SUPER_ADMIN">Super Admin</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-700 block mb-1.5">Estabelecimento</label>
                          <select
                            disabled={adminEdit.role === 'SUPER_ADMIN'}
                            className={`w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition ${
                              adminEdit.role === 'SUPER_ADMIN'
                                ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                                : 'border-slate-200'
                            }`}
                            value={adminEdit.estabelecimentoId || ''}
                            onChange={e => setAdminEdit((s: any) => (s ? { ...s, estabelecimentoId: e.target.value } : s))}
                          >
                            <option value="">
                              {adminEdit.role === 'SUPER_ADMIN' ? 'Nenhum (acesso global)' : 'Selecione'}
                            </option>
                            {ests.map(e => (
                              <option key={e.id} value={e.id}>
                                {e.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={salvarEdicaoAdmin}
                            className="flex-1 rounded-xl bg-slate-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-slate-800 shadow-sm transition"
                          >
                            Salvar alterações
                          </button>
                          <button
                            onClick={() => setAdminEdit(null)}
                            className="rounded-xl border border-slate-200 text-sm font-medium text-slate-700 px-4 py-2.5 hover:bg-slate-50 transition"
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* TABELA ADMINS */}
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Usuários Administradores</h3>
                    <p className="text-xs text-slate-500">
                      {loading ? 'Carregando...' : `${admins.length} contas`}
                    </p>
                  </div>
                  <button
                    onClick={carregarDados}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition"
                  >
                    <span>↻</span> Atualizar
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 bg-slate-50/60">
                        <th className="py-3 px-5 font-medium">Usuário</th>
                        <th className="py-3 px-4 font-medium">Papel</th>
                        <th className="py-3 px-4 font-medium hidden md:table-cell">Estabelecimento</th>
                        <th className="py-3 px-4 font-medium hidden lg:table-cell">Criado em</th>
                        <th className="py-3 px-5 font-medium text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading && (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-xs text-slate-400">
                            Carregando administradores...
                          </td>
                        </tr>
                      )}
                      {!loading && admins.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-xs text-slate-500">
                            Nenhum admin cadastrado.
                          </td>
                        </tr>
                      )}
                      {admins.map(a => (
                        <tr key={a.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center text-xs font-bold">
                                {a.email[0]?.toUpperCase() || 'A'}
                              </div>
                              <div>
                                <div className="font-medium text-slate-900">{a.email}</div>
                                <div className="text-[11px] text-slate-500 lg:hidden">
                                  {a.estabelecimento ? a.estabelecimento.nome : a.role === 'SUPER_ADMIN' ? 'Acesso global' : '—'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full border ${roleBadgeClass(a.role)}`}>
                              {roleLabel(a.role)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 hidden md:table-cell">
                            {a.estabelecimento ? (
                              <div>
                                <div className="font-medium text-slate-700">{a.estabelecimento.nome}</div>
                                <div className="text-[11px] text-slate-400">{perfilLabel(ests.find(x => x.id === a.estabelecimento!.id)?.perfil)}</div>
                              </div>
                            ) : (
                              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-500">
                                🌐 Global
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 hidden lg:table-cell">{dt(a.createdAt)}</td>
                          <td className="py-3 px-5">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setAdminEdit({ ...a, password: '' })
                                  setAba('admins')
                                }}
                                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => excluirAdmin(a)}
                                className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition"
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* RODAPÉ CRÉDITOS */}
          <footer className="mt-10 pt-6 border-t border-slate-200 text-center text-xs text-slate-500 leading-relaxed">
            Painel Super Admin · Versão 1.0 · <span className="text-slate-400">Desenvolvido por</span>{' '}
            <span className="font-semibold text-slate-700">W-Tech Solutions</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
