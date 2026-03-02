'use client'
import { useEffect, useRef, useState } from 'react'

type Produto = {
  id: string
  nome: string
  descricao?: string
  preco: number
  categoria: string
  adicionais?: any
  fotoUrl?: string | null
  maxSabores?: number | null
  maxSorvetes?: number | null
  maxAcompanhamentos?: number | null
  maxCoberturas?: number | null
}
type ItemCarrinho = { produto: Produto; quantidade: number; adicionais?: any }
type Estado =
  | 'aguardando_telefone'
  | 'aguardando_nome'
  | 'menu_principal'
  | 'escolhendo_categoria'
  | 'escolhendo_produto'
  | 'escolhendo_quantidade'
  | 'escolhendo_adicionais'
  | 'confirmando_itens'
  | 'confirmando_endereco'
  | 'cadastrando_endereco'
  | 'escolhendo_pagamento'
  | 'informando_troco'
  | 'finalizado'

type TemaChatCfg = {
  bordaBaloes?: 'ARREDONDADO' | 'MEDIO' | 'RETO'
  sombraBaloes?: boolean
}

export default function ChatPage({ tenantSlug }: { tenantSlug?: string }) {
  const [estado, setEstado] = useState<Estado>('aguardando_telefone')
  const [mensagens, setMensagens] = useState<{ de: 'bot' | 'user'; texto: string }[]>([])
  const [telefone, setTelefone] = useState('')
  const [nome, setNome] = useState('')
  const [sobrenome, setSobrenome] = useState('')
  const [clienteOk, setClienteOk] = useState(false)
  const [categorias, setCategorias] = useState<string[]>([])
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [quantidade, setQuantidade] = useState<number>(1)
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [formaEntrega, setFormaEntrega] = useState<'entrega' | 'retirada'>('retirada')
  const [endereco, setEndereco] = useState<any | null>(null)
  const [resumoTotal, setResumoTotal] = useState<{ total: number; taxaEntrega: number; desconto?: number } | null>(null)
  const [cupomCodigo, setCupomCodigo] = useState<string>('')
  const [pedidoId, setPedidoId] = useState<string | null>(null)
  const [pix, setPix] = useState<{ txid: string; qrcode: string; copiaECola: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [perfil, setPerfil] = useState<'LANCHONETE' | 'ACAITERIA' | 'PIZZARIA'>('LANCHONETE')
  const [acaiOpcoes, setAcaiOpcoes] = useState<any | null>(null)
  const [pizzaOpcoes, setPizzaOpcoes] = useState<any | null>(null)
  const [adicionaisSelecionados, setAdicionaisSelecionados] = useState<any>({})
  const [trocoValor, setTrocoValor] = useState<string>('')
  const [meusPedidos, setMeusPedidos] = useState<any[]>([])
  const [meusPedidosAberto, setMeusPedidosAberto] = useState(false)
  const [meusPedidosLoading, setMeusPedidosLoading] = useState(false)
  const [pedidoDetalhe, setPedidoDetalhe] = useState<any | null>(null)
  const [pedidoDetalheLoading, setPedidoDetalheLoading] = useState(false)
  const [enderecosCliente, setEnderecosCliente] = useState<any[]>([])
  const [clienteNomeDb, setClienteNomeDb] = useState<string>('')
  const [theme, setTheme] = useState<{
    corPrimaria: string
    corBot: string
    corTexto: string
    corFundoChat: string
    logoUrl?: string | null
    nome?: string
    nomeBot?: string
    avatarBotUrl?: string | null
    bordaBaloes?: 'ARREDONDADO' | 'MEDIO' | 'RETO'
    sombraBaloes?: boolean
  }>({
    corPrimaria: '#22c55e',
    corBot: '#f3f4f6',
    corTexto: '#111827',
    corFundoChat: '#f9fafb',
    logoUrl: null,
    nome: undefined,
    nomeBot: undefined,
    avatarBotUrl: null,
    bordaBaloes: 'ARREDONDADO',
    sombraBaloes: false
  })

  const limitSabores = produtoSelecionado?.maxSabores ?? acaiOpcoes?.config?.maxSabores ?? 1
  const limitSorvetes = produtoSelecionado?.maxSorvetes ?? acaiOpcoes?.config?.maxSorvetes ?? 1
  const limitAcompanhamentos = produtoSelecionado?.maxAcompanhamentos ?? acaiOpcoes?.config?.maxAcompanhamentos ?? 3
  const limitCoberturas = produtoSelecionado?.maxCoberturas ?? acaiOpcoes?.config?.maxCoberturas ?? 1

  useEffect(() => {
    setMensagens([
      {
        de: 'bot',
        texto:
          'Olá 👋 Seja bem-vindo!\nPara começarmos, informe seu telefone com DDD.'
      }
    ])
  }, [])

  useEffect(() => {
    carregarPerfil()
  }, [tenantSlug])

  function headersWith(extra?: HeadersInit) {
    const base: Record<string, string> = tenantSlug ? { 'x-estabelecimento-slug': tenantSlug } : {}
    return { ...(extra as any), ...base }
  }

  async function iniciarCliente() {
    if (!telefone) return
    setLoading(true)
    try {
      if (!/^\d{10,13}$/.test(telefone)) {
        setMensagens(m => [...m, { de: 'bot', texto: 'Telefone inválido. Informe somente números com DDD.' }])
        setLoading(false)
        return
      }
      const r = await fetch('/api/clientes?telefone=' + encodeURIComponent(telefone), { headers: headersWith() })
      if (!r.ok) {
        setMensagens(m => [
          ...m,
          { de: 'bot', texto: 'Não encontrei seu cadastro.\nInforme seu nome e sobrenome.' }
        ])
        setEstado('aguardando_nome')
        return
      }
      const ct = r.headers.get('content-type') || ''
      if (!ct.includes('application/json')) {
        setMensagens(m => [
          ...m,
          { de: 'bot', texto: 'Não encontrei seu cadastro.\nInforme seu nome e sobrenome.' }
        ])
        setEstado('aguardando_nome')
        return
      }
      const d = await r.json()
      if (d?.cliente) {
        setClienteOk(true)
        setClienteNomeDb(String(d.cliente.nome || ''))
        const rawEnd = (d.cliente as any).enderecos
        let lista: any[] = []
        if (Array.isArray(rawEnd)) lista = rawEnd
        else if (rawEnd && typeof rawEnd === 'object') lista = [rawEnd]
        setEnderecosCliente(lista)
        setMensagens(m => [...m, { de: 'bot', texto: `Olá, ${d.cliente.nome}! 😊\nVamos fazer seu pedido.` }])
        const aberto = await carregarPerfil()
        if (!aberto) {
          setMensagens(m => [
            ...m,
            { de: 'bot', texto: 'Estamos fechados no momento. Volte mais tarde 😊' }
          ])
          setEstado('finalizado')
        } else {
          await carregarCategorias()
          setEstado('escolhendo_categoria')
        }
      } else {
        setMensagens(m => [
          ...m,
          { de: 'bot', texto: 'Não encontrei seu cadastro.\nInforme seu nome e sobrenome.' }
        ])
        setEstado('aguardando_nome')
      }
    } finally {
      setLoading(false)
    }
  }

  async function salvarNovoCliente() {
    if (!nome.trim() || !sobrenome.trim()) return
    setLoading(true)
    await fetch('/api/clientes', {
      method: 'POST',
      headers: headersWith({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ nome: `${nome.trim()} ${sobrenome.trim()}`, telefone })
    })
    setClienteNomeDb(`${nome.trim()} ${sobrenome.trim()}`)
    setClienteOk(true)
    setMensagens(m => [...m, { de: 'bot', texto: `Cadastro realizado.\nVamos fazer seu pedido, ${nome} ${sobrenome}.` }])
    const aberto = await carregarPerfil()
    if (!aberto) {
      setMensagens(m => [
        ...m,
        { de: 'bot', texto: 'Estamos fechados no momento. Volte mais tarde 😊' }
      ])
      setEstado('finalizado')
      setLoading(false)
      return
    }
    await carregarCategorias()
    setEstado('escolhendo_categoria')
    setLoading(false)
  }

  function enderecoPreferencial(): any | null {
    if (!enderecosCliente || (Array.isArray(enderecosCliente) && enderecosCliente.length === 0)) return null
    const lista = Array.isArray(enderecosCliente) ? enderecosCliente : [enderecosCliente as any]
    const pad = lista.find((e: any) => e && e.padrao)
    return pad || lista[0]
  }

  async function salvarEnderecoComoPadrao() {
    if (!endereco || !String(endereco.rua || '').trim() || !String(endereco.numero || '').trim() || !String(endereco.bairro || '').trim()) {
      setMensagens(m => [...m, { de: 'bot', texto: 'Informe rua, número e bairro para continuar.' }])
      return
    }
    const lista = Array.isArray(enderecosCliente) ? [...enderecosCliente] : []
    for (const e of lista) {
      if (e && typeof e === 'object') (e as any).padrao = false
    }
    const novo = {
      rua: String(endereco.rua || '').trim(),
      numero: String(endereco.numero || '').trim(),
      bairro: String(endereco.bairro || '').trim(),
      complemento: String(endereco.complemento || '').trim() || undefined,
      referencia: String(endereco.referencia || '').trim() || undefined,
      padrao: true
    }
    const atualizados = [novo, ...lista]
    try {
      await fetch('/api/clientes', {
        method: 'POST',
        headers: headersWith({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          nome: clienteNomeDb || `${nome} ${sobrenome}`.trim() || 'Cliente',
          telefone,
          enderecos: atualizados
        })
      })
      setEnderecosCliente(atualizados)
      setEndereco(novo)
      await mostrarResumoTotal()
    } catch {
      setMensagens(m => [...m, { de: 'bot', texto: 'Não foi possível salvar seu endereço agora. Tente novamente.' }])
    }
  }

  async function carregarPerfil(): Promise<boolean> {
    try {
      const r = await fetch('/api/estabelecimento', { headers: headersWith(), cache: 'no-store' as any })
      if (r.ok) {
        const d = await r.json()
        const t = d?.estabelecimento
        const pf = t?.perfil || 'LANCHONETE'
        setPerfil(pf)
        setTheme({
          corPrimaria: t?.corPrimaria || '#22c55e',
          corBot: t?.corBot || '#f3f4f6',
          corTexto: t?.corTexto || '#111827',
          corFundoChat: t?.corFundoChat || '#f9fafb',
          logoUrl: t?.logoUrl || null,
          nome: t?.nome || undefined,
          nomeBot: t?.nomeBot || 'Atendimento',
          avatarBotUrl: t?.avatarBotUrl || null,
          bordaBaloes: t?.bordaBaloes || 'ARREDONDADO',
          sombraBaloes: t?.sombraBaloes ?? false
        })
        if (t && t.aberto === false) {
          return false
        }
        // Robust profile detection: favor Açaíteria if endpoint is available or slug hints it
        const slugHintsAcai =
          (tenantSlug || '').toLowerCase().includes('acai') ||
          (tenantSlug || '').toLowerCase().includes('açai') ||
          (tenantSlug || '').toLowerCase().includes('acaiteria')
        const tryAcaiFirst = pf === 'ACAITERIA' || slugHintsAcai
        if (tryAcaiFirst) {
          try {
            const ra = await fetch('/api/acaiteria/opcoes', { headers: headersWith() })
            if (ra.ok) {
              const oa = await ra.json()
              setAcaiOpcoes(oa)
              setPerfil('ACAITERIA')
              return true
            }
          } catch {}
        }
        if (pf === 'PIZZARIA') {
          try {
            const rp = await fetch('/api/pizzaria/opcoes', { headers: headersWith() })
            if (rp.ok) {
              const op = await rp.json()
              setPizzaOpcoes(op)
            }
          } catch {}
        }
        return true
      }
    } catch {}
    return true
  }

  async function carregarCategorias() {
    try {
      const res = await fetch('/api/produtos/categorias', { headers: headersWith() })
      if (!res.ok) {
        setCategorias([])
        return
      }
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('application/json')) {
        setCategorias([])
        return
      }
      const data = await res.json()
      setCategorias(data.categorias || [])
    } catch {
      setCategorias([])
    }
  }

  async function carregarProdutos(cat: string) {
    setCategoriaSelecionada(cat)
    setLoading(true)
    try {
      const res = await fetch('/api/produtos?categoria=' + encodeURIComponent(cat), { headers: headersWith() })
      if (!res.ok) throw new Error('Falha ao carregar produtos')
      const data = await res.json()
      setProdutos(data.produtos || [])
      setEstado('escolhendo_produto')
    } catch {
      // mantém fluxo sem travar
    } finally {
      setLoading(false)
    }
  }

  function pedidoCodigoCurto(id: string) {
    if (!id) return ''
    return id.length <= 6 ? id : id.slice(0, 6)
  }

  async function carregarMeusPedidos() {
    if (!telefone) {
      setMensagens(m => [...m, { de: 'bot', texto: 'Informe seu telefone para ver seus pedidos.' }])
      setEstado('aguardando_telefone')
      return
    }
    setMeusPedidosLoading(true)
    try {
      // 1ª tentativa: restringe ao estabelecimento atual (quando houver slug)
      let r = await fetch('/api/pedidos?telefone=' + encodeURIComponent(telefone) + '&limit=5', {
        headers: headersWith()
      })
      const ct = r.headers.get('content-type') || ''
      if (!r.ok || !ct.includes('application/json')) {
        setMensagens(m => [...m, { de: 'bot', texto: 'Não foi possível carregar seus pedidos agora.' }])
        return
      }
      let d = await r.json()
      let rows = Array.isArray(d.pedidos) ? d.pedidos : []
      // Se não houver pedidos para o estabelecimento atual, tentar buscar globalmente (sem slug),
      // para contemplar pedidos antigos criados sem tenant definido.
      if (rows.length === 0) {
        r = await fetch('/api/pedidos?telefone=' + encodeURIComponent(telefone) + '&limit=5')
        const ct2 = r.headers.get('content-type') || ''
        if (r.ok && ct2.includes('application/json')) {
          d = await r.json()
          rows = Array.isArray(d.pedidos) ? d.pedidos : []
        }
      }
      setMeusPedidos(rows)
      setPedidoDetalhe(null)
      setMeusPedidosAberto(true)
    } finally {
      setMeusPedidosLoading(false)
    }
  }

  async function mostrarDetalhesPedido(id: string) {
    setPedidoDetalheLoading(true)
    try {
      const r = await fetch(`/api/pedidos/${id}`, { headers: headersWith() })
      const ct = r.headers.get('content-type') || ''
      if (!r.ok || !ct.includes('application/json')) {
        setMensagens(m => [...m, { de: 'bot', texto: 'Não foi possível carregar os detalhes do pedido.' }])
        return
      }
      const d = await r.json()
      const p = d.pedido
      setPedidoDetalhe(p)
    } finally {
      setPedidoDetalheLoading(false)
    }
  }

  function formatarStatus(s: string) {
    const map: Record<string, string> = {
      aberto: '⏳ Aguardando pagamento',
      aguardando_pix: '⏳ Aguardando pagamento',
      pago: '✅ Aprovado',
      preparando: '👨‍🍳 Em preparação',
      saiu_para_entrega: '🚚 Saiu para entrega',
      entregue: '📦 Entregue',
      cancelado: '❌ Cancelado'
    }
    return map[s] || s
  }

  function badgeStatusClasse(s: string) {
    const map: Record<string, string> = {
      aberto: 'bg-yellow-100 text-yellow-800',
      aguardando_pix: 'bg-yellow-100 text-yellow-800',
      pago: 'bg-green-100 text-green-800',
      preparando: 'bg-blue-100 text-blue-800',
      saiu_para_entrega: 'bg-purple-100 text-purple-800',
      entregue: 'bg-gray-100 text-gray-800',
      cancelado: 'bg-red-100 text-red-800'
    }
    return map[s] || 'bg-gray-100 text-gray-800'
  }

  async function selecionarProduto(p: Produto) {
    setProdutoSelecionado(p)
    if (perfil === 'ACAITERIA') {
      setQuantidade(1)
      setAdicionaisSelecionados({})
      try {
        if (!acaiOpcoes || !Array.isArray(acaiOpcoes.sabores) || acaiOpcoes.sabores.length === 0) {
          const ra = await fetch('/api/acaiteria/opcoes', { headers: headersWith() })
          if (ra.ok) {
            const oa = await ra.json()
            setAcaiOpcoes(oa)
          } else {
            try {
              const rs = await fetch('/api/admin/acaiteria/sabores', { headers: headersWith() })
              if (rs.ok) {
                const js = await rs.json()
                setAcaiOpcoes((prev: any) => ({ ...(prev || {}), sabores: js.sabores || [] }))
              }
            } catch {}
          }
        }
      } finally {
        setEstado('escolhendo_adicionais')
      }
    } else {
      setEstado('escolhendo_quantidade')
    }
  }

  function adicionarItem() {
    if (!produtoSelecionado || quantidade < 1) return
    const adicionais = perfil === 'ACAITERIA' || perfil === 'PIZZARIA' ? adicionaisSelecionados : undefined
    setCarrinho(c => [...c, { produto: produtoSelecionado, quantidade, adicionais }])
    setProdutoSelecionado(null)
    setQuantidade(1)
    setAdicionaisSelecionados({})
    setEstado('confirmando_itens')
  }

  async function mostrarResumoTotal() {
    setLoading(true)
    const itens = carrinho.map(i => ({ produtoId: i.produto.id, quantidade: i.quantidade, adicionais: i.adicionais }))
    try {
      const r = await fetch('/api/pedidos/quote', {
        method: 'POST',
        headers: headersWith({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ clienteTelefone: telefone, itens, formaEntrega, cupomCodigo: cupomCodigo.trim() || undefined })
      })
      if (r.ok) {
        const ct = r.headers.get('content-type') || ''
        if (ct.includes('application/json')) {
          const d = await r.json()
          setResumoTotal(
            typeof d?.total === 'number'
              ? { total: d.total, taxaEntrega: Number(d.taxaEntrega || 0), desconto: Number(d.desconto || 0) }
              : null
          )
        } else {
          setResumoTotal(null)
        }
      } else {
        setResumoTotal(null)
      }
    } catch {
      setResumoTotal(null)
    }
    setEstado('escolhendo_pagamento')
    setLoading(false)
  }

  async function finalizarPedido(metodo: 'pix' | 'dinheiro' | 'cartao', trocoPara?: number) {
    setLoading(true)
    const itens = carrinho.map(i => ({
      produtoId: i.produto.id,
      quantidade: i.quantidade,
      adicionais: i.adicionais
    }))
    try {
      const r = await fetch('/api/pedidos', {
        method: 'POST',
        headers: headersWith({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          clienteTelefone: telefone,
          itens,
          formaEntrega,
          enderecoEntrega: formaEntrega === 'entrega' ? endereco : null,
          metodoPagamento: metodo,
          trocoPara,
          cupomCodigo: cupomCodigo.trim() || undefined
        })
      })
      if (!r.ok) {
        let msg = 'Não foi possível finalizar seu pedido. Tente novamente.'
        try {
          const err = await r.json()
          if (err?.error) msg = 'Erro ao finalizar pedido: ' + err.error
        } catch {}
        setMensagens(m => [...m, { de: 'bot', texto: msg }])
        return
      }
      const ct = r.headers.get('content-type') || ''
      if (!ct.includes('application/json')) {
        setMensagens(m => [...m, { de: 'bot', texto: 'Não foi possível finalizar seu pedido. Tente novamente.' }])
        return
      }
      const d = await r.json()
      setPedidoId(d.pedido.id)
      if (metodo === 'pix') {
        const rp = await fetch('/api/pix', {
          method: 'POST',
          headers: headersWith({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ pedidoId: d.pedido.id })
        })
        if (!rp.ok) {
          setMensagens(m => [
            ...m,
            { de: 'bot', texto: 'Seu pedido foi criado, mas houve erro ao gerar o Pix. Tente outra forma de pagamento.' }
          ])
          setEstado('finalizado')
          return
        }
        const pct = rp.headers.get('content-type') || ''
        if (pct.includes('application/json')) {
          const pixData = await rp.json()
          setPix(pixData)
        }
      } else {
        const total = Number(d?.pedido?.total || resumoTotal?.total || 0)
        const entregaTxt = formaEntrega === 'entrega' ? 'Entrega' : 'Retirada no balcão'
        let pagamentoTxt =
          metodo === 'dinheiro' ? 'Pagamento em dinheiro na entrega/retirada.' : 'Pagamento em cartão na entrega.'
        if (metodo === 'dinheiro' && typeof trocoPara === 'number' && trocoPara > 0 && total > 0) {
          const troco = Math.max(0, trocoPara - total)
          pagamentoTxt += `\nTroco para R$ ${trocoPara.toFixed(2)} (troco: R$ ${troco.toFixed(2)}).`
        }
        const msg =
          total > 0
            ? `Pedido ${d.pedido.id} registrado!\nTotal: R$ ${total.toFixed(
                2
              )}\n${entregaTxt} selecionada.\n${pagamentoTxt}`
            : `Pedido ${d.pedido.id} registrado!\n${entregaTxt} selecionada.\n${pagamentoTxt}`
        setMensagens(m => [...m, { de: 'bot', texto: msg }])
      }
      setEstado('finalizado')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [mensagens, estado, produtos, carrinho, pix])

  useEffect(() => {
    if (perfil === 'ACAITERIA' && estado === 'escolhendo_categoria' && categorias.length === 1) {
      carregarProdutos(categorias[0])
    }
  }, [perfil, estado, categorias])

  useEffect(() => {
    async function ensureAcaiOpcoes() {
      if (perfil !== 'ACAITERIA') return
      if (estado !== 'escolhendo_adicionais') return
      const empty =
        !acaiOpcoes ||
        !Array.isArray(acaiOpcoes.sabores) ||
        acaiOpcoes.sabores.length === 0
      if (!empty) return
      try {
        const ra = await fetch('/api/acaiteria/opcoes', { headers: headersWith() })
        if (ra.ok) {
          const oa = await ra.json()
          if (Array.isArray(oa?.sabores) && oa.sabores.length > 0) {
            setAcaiOpcoes(oa)
            return
          }
        }
      } catch {}
      try {
        const rs = await fetch('/api/admin/acaiteria/sabores', { headers: headersWith() })
        if (rs.ok) {
          const js = await rs.json()
          if (Array.isArray(js?.sabores) && js.sabores.length > 0) {
            setAcaiOpcoes((prev: any) => ({ ...(prev || {}), sabores: js.sabores }))
          }
        }
      } catch {}
    }
    ensureAcaiOpcoes()
  }, [perfil, estado, acaiOpcoes, tenantSlug])

  const pedidosEmAberto = meusPedidos.filter(p => p.status !== 'entregue' && p.status !== 'cancelado').length

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: theme.corFundoChat }}>
      <div className="w-full max-w-[480px] h-[80vh] rounded-2xl shadow-xl bg-white flex flex-col overflow-hidden relative">
        <div className="px-4 py-3 border-b flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden text-xs font-medium text-gray-700">
              {theme.logoUrl ? (
                <img src={theme.logoUrl} alt={theme.nome || 'Logo'} className="w-full h-full object-cover" />
              ) : theme.avatarBotUrl ? (
                <img src={theme.avatarBotUrl} alt="Avatar bot" className="w-full h-full object-cover" />
              ) : (
                (theme.nome || theme.nomeBot || 'A')[0]?.toUpperCase()
              )}
            </div>
            <div className="flex flex-col">
              <div className="text-sm font-semibold">
                {theme.nome || theme.nomeBot || 'Atendimento'}
              </div>
              <div className="text-xs" style={{ color: '#777' }}>
                {theme.nomeBot || 'Atendimento'} · Chat automático
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={carregarMeusPedidos}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border border-gray-300 bg-white"
          >
            <span>📦</span>
            <span className="font-medium">Meus Pedidos</span>
            {pedidosEmAberto > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-emerald-500 text-[10px] text-white">
                {pedidosEmAberto}
              </span>
            )}
          </button>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 p-4">
          {mensagens.map((m, i) => {
            const isBot = m.de === 'bot'
            const radius =
              theme.bordaBaloes === 'RETO'
                ? 8
                : theme.bordaBaloes === 'MEDIO'
                ? 16
                : 24
            const shadow = theme.sombraBaloes
              ? '0 4px 10px rgba(15,23,42,0.12)'
              : 'none'
            return (
              <div key={i} className={`flex ${isBot ? '' : 'justify-end'}`}>
                <div
                  className="max-w-[85%] px-3 py-2"
                  style={{
                    borderRadius: radius,
                    backgroundColor: isBot ? theme.corBot : theme.corPrimaria,
                    color: isBot ? theme.corTexto : '#ffffff',
                    boxShadow: shadow
                  }}
                >
                  {m.texto}
                </div>
              </div>
            )
          })}
          {estado === 'menu_principal' && (
            <div className="flex">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 text-gray-900 px-3 py-2">
                Menu principal:
                <div className="mt-2 text-sm">Vamos direto ao seu pedido 😊</div>
              </div>
            </div>
          )}
          {estado === 'escolhendo_categoria' && (
            <div className="flex">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 text-gray-900 px-3 py-2">
                O que você deseja pedir?
                <div className="mt-2 flex gap-2 flex-wrap">
                  {categorias.map(cat => (
                    <button
                      key={cat}
                      onClick={() => carregarProdutos(cat)}
                      className="px-3 py-1 rounded-full border border-gray-300 hover:bg-gray-200 transition"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {estado === 'informando_troco' && (
            <div className="flex">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 text-gray-900 px-3 py-2 w-full">
                <div className="text-sm">Você precisa de troco?</div>
                {resumoTotal && (
                  <div className="mt-1 text-xs text-gray-700">
                    Total do pedido: R$ {Number(resumoTotal.total).toFixed(2)}
                  </div>
                )}
                <div className="mt-2 text-xs text-gray-700">
                  Se precisar, informe quanto terá em dinheiro para calcular o troco:
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={trocoValor}
                    onChange={e => setTrocoValor(e.target.value)}
                    className="w-32 border rounded-lg px-2 py-1"
                    placeholder="Ex.: 50,00"
                  />
                  <button
                    className="px-3 py-1 rounded-full text-xs"
                    style={{ backgroundColor: theme.corPrimaria, color: '#fff' }}
                    onClick={() => {
                      const v = Number(String(trocoValor).replace(',', '.'))
                      if (!isNaN(v) && v > 0) {
                        finalizarPedido('dinheiro', v)
                      } else {
                        finalizarPedido('dinheiro')
                      }
                    }}
                  >
                    Confirmar
                  </button>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    className="px-3 py-1 rounded-full border text-xs"
                    onClick={() => finalizarPedido('dinheiro')}
                  >
                    Não preciso de troco
                  </button>
                </div>
              </div>
            </div>
          )}
          {estado === 'escolhendo_produto' && (
            <div className="flex">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 text-gray-900 px-3 py-2">
                {perfil === 'ACAITERIA' ? (
                  <>
                    <div>Qual tamanho de açaí você deseja?</div>
                    <div className="mt-2 -mx-3 overflow-x-auto">
                      <div className="flex gap-3 px-1 pb-2">
                        {produtos.map(p => {
                          const foto =
                            (p as any).fotoUrl ||
                            (p.adicionais && ((p.adicionais as any).fotoDataUrl || (p.adicionais as any).fotoUrl)) ||
                            null
                          return (
                            <div
                              key={p.id}
                              className="flex-none w-64 flex gap-3 rounded-xl bg-white border border-gray-200 p-2"
                            >
                              {foto ? (
                                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                                  <img src={foto} alt={p.nome} className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                                  Sem foto
                                </div>
                              )}
                              <div className="flex-1 flex flex-col">
                                <div className="text-sm font-semibold">{p.nome}</div>
                                {p.descricao && (
                                  <div className="text-xs text-gray-600 line-clamp-2">{p.descricao}</div>
                                )}
                                <div className="mt-1 text-sm font-semibold text-gray-900">
                                  R$ {Number(p.preco).toFixed(2)}
                                </div>
                                <div className="mt-2">
                                  <button
                                    onClick={() => selecionarProduto(p)}
                                    className="px-3 py-1 rounded-full text-xs font-medium hover:opacity-90 transition"
                                    style={{ backgroundColor: theme.corPrimaria, color: '#fff' }}
                                  >
                                    Selecionar
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>Selecione um produto:</div>
                    <ul className="mt-2 space-y-2">
                      {produtos.map(p => (
                        <li key={p.id} className="flex items-center justify-between gap-2">
                          <span>
                            {p.nome} — R$ {Number(p.preco).toFixed(2)}
                          </span>
                          <button
                            onClick={() => selecionarProduto(p)}
                            className="px-3 py-1 rounded-full hover:opacity-90 transition"
                            style={{ backgroundColor: theme.corPrimaria, color: '#fff' }}
                          >
                            Escolher
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          )}
          {estado === 'escolhendo_quantidade' && produtoSelecionado && perfil !== 'ACAITERIA' && (
            <div className="flex">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 text-gray-900 px-3 py-2">
                Quantas unidades você deseja?
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={quantidade}
                    onChange={e => setQuantidade(Math.max(1, Number(e.target.value)))}
                    className="w-24 border rounded-lg px-2 py-1"
                  />
                  <button
                    onClick={() => {
                      const precisaAdicionais = perfil !== 'LANCHONETE'
                      setEstado(precisaAdicionais ? 'escolhendo_adicionais' : 'confirmando_itens')
                      if (!precisaAdicionais) adicionarItem()
                    }}
                    className="px-3 py-1 rounded-lg"
                    style={{ backgroundColor: theme.corPrimaria, color: '#fff' }}
                  >
                    Continuar
                  </button>
                </div>
              </div>
            </div>
          )}
          {estado === 'confirmando_itens' && (
            <div className="flex">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 text-gray-900 px-3 py-2">
                Itens selecionados:
                <ul className="mt-2 space-y-1">
                  {carrinho.map((i, idx) => (
                    <li key={idx} className="text-sm">
                      <div className="font-medium">
                        {i.produto.nome} x {i.quantidade}
                      </div>
                      {perfil === 'ACAITERIA' && acaiOpcoes && i.adicionais && (
                        <div className="mt-1 text-xs text-gray-700 space-y-0.5">
                          <div>
                            Sabor:{' '}
                            {acaiOpcoes.sabores?.find((s: any) => s.id === i.adicionais.saborId)?.nome || 'Não informado'}
                          </div>
                          <div>
                            Sorvete:{' '}
                            {i.adicionais.sorveteId
                              ? acaiOpcoes.sorvetes?.find((s: any) => s.id === i.adicionais.sorveteId)?.nome || 'Não informado'
                              : 'Sem sorvete'}
                          </div>
                          <div>
                            Acompanhamentos:{' '}
                            {Array.isArray(i.adicionais.acompanhamentos) && i.adicionais.acompanhamentos.length > 0
                              ? acaiOpcoes.acompanhamentos
                                  ?.filter((a: any) => i.adicionais.acompanhamentos.includes(a.id))
                                  .map((a: any) => a.nome)
                                  .join(', ')
                              : 'Nenhum'}
                          </div>
                          <div>
                            Cobertura:{' '}
                            {i.adicionais.coberturaId
                              ? acaiOpcoes.coberturas?.find((c: any) => c.id === i.adicionais.coberturaId)?.nome ||
                                'Não informada'
                              : 'Não informada'}
                          </div>
                          <div>
                            Complementos:{' '}
                            {Array.isArray(i.adicionais.complementos) && i.adicionais.complementos.length > 0
                              ? acaiOpcoes.complementos
                                  ?.filter((c: any) => i.adicionais.complementos.includes(c.id))
                                  .map((c: any) => c.nome)
                                  .join(', ')
                              : 'Nenhum'}
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex gap-2">
                  <button
                    className="px-3 py-1 rounded-full border border-gray-300 hover:bg-gray-200"
                    onClick={() => {
                      setCategoriaSelecionada(null)
                      setEstado('escolhendo_categoria')
                    }}
                  >
                    Adicionar mais
                  </button>
                  <button
                    className="px-3 py-1 rounded-full bg-primary text-white"
                    onClick={() => {
                      setMensagens(m => [...m, { de: 'bot', texto: 'Deseja retirada no balcão ou entrega?' }])
                      setEstado('confirmando_endereco')
                    }}
                  >
                    Continuar
                  </button>
                </div>
              </div>
            </div>
          )}
          {estado === 'confirmando_endereco' && (
            <div className="flex">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 text-gray-900 px-3 py-2">
                Escolha a forma de entrega:
                <div className="mt-2 flex gap-2">
                  <button className="px-3 py-1 rounded-full border" onClick={() => (setFormaEntrega('retirada'), mostrarResumoTotal())}>
                    Retirada
                  </button>
                  <button className="px-3 py-1 rounded-full border" onClick={() => setFormaEntrega('entrega')}>
                    Entrega
                  </button>
                </div>
                {formaEntrega === 'entrega' && (() => {
                  const pref = enderecoPreferencial()
                  if (pref) {
                    return (
                      <div className="mt-3 space-y-2">
                        <div className="text-sm">
                          Encontrei este endereço cadastrado:
                        </div>
                        <div className="text-xs text-gray-800">
                          📍 {pref.rua} {pref.numero}{' '}
                          {pref.bairro ? `- ${pref.bairro}` : ''}
                          {pref.complemento ? ` · ${pref.complemento}` : ''}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button
                            className="px-3 py-1 rounded-full border"
                            onClick={() => {
                              setEndereco(pref)
                              mostrarResumoTotal()
                            }}
                          >
                            ✅ Sim, usar este endereço
                          </button>
                          <button
                            className="px-3 py-1 rounded-full border"
                            onClick={() => setEstado('cadastrando_endereco')}
                          >
                            ➕ Cadastrar novo endereço
                          </button>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div className="mt-3 space-y-2">
                      <div className="text-sm">Para finalizar seu pedido, preciso do endereço de entrega 😊</div>
                      <input className="w-full border rounded-lg px-2 py-1" placeholder="Rua" onChange={e => setEndereco((prev: any) => ({ ...(prev || {}), rua: e.target.value }))} />
                      <input className="w-full border rounded-lg px-2 py-1" placeholder="Número" onChange={e => setEndereco((prev: any) => ({ ...(prev || {}), numero: e.target.value }))} />
                      <input className="w-full border rounded-lg px-2 py-1" placeholder="Bairro" onChange={e => setEndereco((prev: any) => ({ ...(prev || {}), bairro: e.target.value }))} />
                      <input className="w-full border rounded-lg px-2 py-1" placeholder="Complemento (opcional)" onChange={e => setEndereco((prev: any) => ({ ...(prev || {}), complemento: e.target.value }))} />
                      <input className="w-full border rounded-lg px-2 py-1" placeholder="Referência (opcional)" onChange={e => setEndereco((prev: any) => ({ ...(prev || {}), referencia: e.target.value }))} />
                      <button className="px-3 py-1 rounded-full" onClick={salvarEnderecoComoPadrao} style={{ backgroundColor: theme.corPrimaria, color: '#fff' }}>
                        Continuar
                      </button>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
          {estado === 'cadastrando_endereco' && (
            <div className="flex">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 text-gray-900 px-3 py-2">
                <div className="text-sm">Informe o novo endereço de entrega</div>
                <div className="mt-3 space-y-2">
                  <input className="w-full border rounded-lg px-2 py-1" placeholder="Rua" onChange={e => setEndereco((prev: any) => ({ ...(prev || {}), rua: e.target.value }))} />
                  <input className="w-full border rounded-lg px-2 py-1" placeholder="Número" onChange={e => setEndereco((prev: any) => ({ ...(prev || {}), numero: e.target.value }))} />
                  <input className="w-full border rounded-lg px-2 py-1" placeholder="Bairro" onChange={e => setEndereco((prev: any) => ({ ...(prev || {}), bairro: e.target.value }))} />
                  <input className="w-full border rounded-lg px-2 py-1" placeholder="Complemento (opcional)" onChange={e => setEndereco((prev: any) => ({ ...(prev || {}), complemento: e.target.value }))} />
                  <input className="w-full border rounded-lg px-2 py-1" placeholder="Referência (opcional)" onChange={e => setEndereco((prev: any) => ({ ...(prev || {}), referencia: e.target.value }))} />
                  <div className="flex gap-2">
                    <button className="px-3 py-1 rounded-full border" onClick={() => setEstado('confirmando_endereco')}>
                      Voltar
                    </button>
                    <button className="px-3 py-1 rounded-full text-white" onClick={salvarEnderecoComoPadrao} style={{ backgroundColor: theme.corPrimaria }}>
                      Salvar e continuar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {estado === 'escolhendo_pagamento' && (
            <div className="flex">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 text-gray-900 px-3 py-2">
                {resumoTotal ? (
                  <>
                    <div>Total final:</div>
                    <div className="mt-1 text-sm">Taxa de entrega: R$ {Number(resumoTotal.taxaEntrega).toFixed(2)}</div>
                {typeof resumoTotal.desconto === 'number' && resumoTotal.desconto > 0 && (
                  <div className="mt-1 text-sm">Desconto aplicado: -R$ {Number(resumoTotal.desconto).toFixed(2)}</div>
                )}
                    <div className="mt-1 font-medium">Total: R$ {Number(resumoTotal.total).toFixed(2)}</div>
                <div className="mt-3">
                  <div className="text-sm mb-1">Possui cupom de desconto?</div>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 border rounded-lg px-3 py-2"
                      placeholder="CUPOM"
                      value={cupomCodigo}
                      onChange={e => setCupomCodigo(e.target.value.toUpperCase())}
                    />
                    <button className="px-3 py-2 rounded-lg border" onClick={mostrarResumoTotal}>
                      Aplicar
                    </button>
                  </div>
                </div>
                  </>
                ) : (
                  <div className="text-sm">Não foi possível calcular o total agora.</div>
                )}
                <div className="mt-3">Como deseja pagar?</div>
                <div className="mt-2 flex gap-2 flex-wrap">
                  <button
                    className="px-3 py-1 rounded-full border"
                    onClick={() => {
                      setTrocoValor('')
                      setEstado('informando_troco')
                    }}
                  >
                    Dinheiro
                  </button>
                  <button className="px-3 py-1 rounded-full border" onClick={() => finalizarPedido('cartao')}>
                    Cartão
                  </button>
                  <button className="px-3 py-1 rounded-full" onClick={() => finalizarPedido('pix')} style={{ backgroundColor: theme.corPrimaria, color: '#fff' }}>
                    Pix
                  </button>
                </div>
              </div>
            </div>
          )}
          {pix && (
            <div className="flex">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-3 py-2" style={{ backgroundColor: theme.corBot, color: theme.corTexto }}>
                <div className="font-medium">Pagamento Pix</div>
                <div className="text-sm mt-1">TxID: {pix.txid}</div>
                <div className="mt-2">
                  {pix.qrcode && pix.qrcode.startsWith('data:') ? (
                    <img src={pix.qrcode} alt="QR Code Pix" className="w-60 h-60 rounded-lg" />
                  ) : (
                    <div className="text-sm">QRCode: {pix.qrcode}</div>
                  )}
                </div>
                <div className="mt-2 text-sm">Copia e cola: {pix.copiaECola}</div>
              </div>
            </div>
          )}
          {loading && (
            <div className="flex">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-3 py-2" style={{ backgroundColor: theme.corBot, color: theme.corTexto }}>
                Digitando...
              </div>
            </div>
          )}
        </div>
        <div className="border-t p-3">
          {estado === 'aguardando_telefone' && (
            <div className="flex gap-2">
              <input
                placeholder="Telefone (WhatsApp)"
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && telefone.trim()) iniciarCliente()
                }}
                className="flex-1 border rounded-xl px-3 py-2"
              />
              <button
                onClick={iniciarCliente}
                disabled={!telefone.trim()}
                className="px-4 py-2 rounded-xl disabled:opacity-50"
                style={{ backgroundColor: theme.corPrimaria, color: '#fff' }}
              >
                Enviar
              </button>
            </div>
          )}
          {estado === 'aguardando_nome' && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                placeholder="Nome"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="flex-1 border rounded-xl px-3 py-2"
              />
              <input
                placeholder="Sobrenome"
                value={sobrenome}
                onChange={e => setSobrenome(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && nome.trim() && sobrenome.trim()) salvarNovoCliente()
                }}
                className="flex-1 border rounded-xl px-3 py-2"
              />
              <button
                onClick={salvarNovoCliente}
                disabled={!nome.trim() || !sobrenome.trim()}
                className="px-4 py-2 rounded-xl disabled:opacity-50"
                style={{ backgroundColor: theme.corPrimaria, color: '#fff' }}
              >
                Continuar
              </button>
            </div>
          )}
          {estado === 'escolhendo_adicionais' && produtoSelecionado && (
            <div className="flex">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 text-gray-900 px-3 py-2 w-full">
                {perfil === 'ACAITERIA' && acaiOpcoes && (
                  <>
                    {!adicionaisSelecionados.saboresOk && (
                      <>
                        <div className="text-sm">Escolha {limitSabores > 1 ? `até ${limitSabores} sabores` : 'o sabor'}:</div>
                        {Array.isArray(acaiOpcoes.sabores) && acaiOpcoes.sabores.length > 0 ? (
                          <div className="mt-2 flex gap-2 flex-wrap">
                            {acaiOpcoes.sabores.map((s: any) => {
                              const cur = Array.isArray(adicionaisSelecionados.sabores) ? adicionaisSelecionados.sabores : []
                              const selected = cur.includes(s.id)
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => {
                                    if (limitSabores === 1) {
                                      setAdicionaisSelecionados((prev: any) => ({ ...prev, sabores: [s.id], saborId: s.id, saboresOk: true }))
                                    } else {
                                      setAdicionaisSelecionados((prev: any) => {
                                        const arr = Array.isArray(prev.sabores) ? prev.sabores.slice() : []
                                        if (selected) return { ...prev, sabores: arr.filter((x: string) => x !== s.id) }
                                        if (arr.length >= limitSabores) return prev
                                        return { ...prev, sabores: [...arr, s.id] }
                                      })
                                    }
                                  }}
                                  className={`px-3 py-1 rounded-full border ${selected ? 'bg-primary text-white' : ''}`}
                                  style={selected ? { backgroundColor: theme.corPrimaria, color: '#fff' } : undefined}
                                >
                                  {s.nome}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="mt-2 text-sm">Sem sabores cadastrados no momento.</div>
                        )}
                        {limitSabores > 1 && (
                          <div className="mt-3 flex justify-end">
                            <button
                              className="px-3 py-1 rounded-full"
                              onClick={() => setAdicionaisSelecionados((prev: any) => ({ ...prev, saboresOk: true }))}
                              disabled={!Array.isArray(adicionaisSelecionados.sabores) || adicionaisSelecionados.sabores.length === 0}
                              style={{
                                backgroundColor:
                                  !Array.isArray(adicionaisSelecionados.sabores) || adicionaisSelecionados.sabores.length === 0
                                    ? '#d1d5db'
                                    : theme.corPrimaria,
                                color: '#fff'
                              }}
                            >
                              Continuar
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    {adicionaisSelecionados.saboresOk && !adicionaisSelecionados.sorvetesOk && (
                      <>
                        <div className="mt-3 text-sm">Deseja adicionar sorvete? {limitSorvetes > 1 ? `(até ${limitSorvetes})` : ''}</div>
                        <div className="mt-2 flex gap-2 flex-wrap">
                          <button
                            className="px-3 py-1 rounded-full border"
                            onClick={() =>
                              setAdicionaisSelecionados((prev: any) => ({ ...prev, sorvetes: [], sorveteId: null, sorvetesOk: true }))
                            }
                          >
                            Sem sorvete
                          </button>
                          {acaiOpcoes.sorvetes.map((s: any) => {
                            const cur = Array.isArray(adicionaisSelecionados.sorvetes) ? adicionaisSelecionados.sorvetes : []
                            const selected = cur.includes(s.id)
                            return (
                              <button
                                key={s.id}
                                className={`px-3 py-1 rounded-full border ${selected ? 'bg-primary text-white' : ''}`}
                                style={selected ? { backgroundColor: theme.corPrimaria, color: '#fff' } : undefined}
                                onClick={() => {
                                  if (limitSorvetes === 1) {
                                    setAdicionaisSelecionados((prev: any) => ({ ...prev, sorvetes: [s.id], sorveteId: s.id, sorvetesOk: true }))
                                  } else {
                                    setAdicionaisSelecionados((prev: any) => {
                                      const arr = Array.isArray(prev.sorvetes) ? prev.sorvetes.slice() : []
                                      if (selected) return { ...prev, sorvetes: arr.filter((x: string) => x !== s.id) }
                                      if (arr.length >= limitSorvetes) return prev
                                      return { ...prev, sorvetes: [...arr, s.id] }
                                    })
                                  }
                                }}
                              >
                                {s.nome}
                              </button>
                            )
                          })}
                        </div>
                        {limitSorvetes > 1 && (
                          <div className="mt-3 flex justify-end">
                            <button
                              className="px-3 py-1 rounded-full"
                              onClick={() => setAdicionaisSelecionados((prev: any) => ({ ...prev, sorvetesOk: true }))}
                              style={{ backgroundColor: theme.corPrimaria, color: '#fff' }}
                            >
                              Continuar
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    {adicionaisSelecionados.sorvetesOk && !adicionaisSelecionados.acompanhamentosOk && (
                      <>
                        <div className="mt-3 text-sm">
                          Escolha acompanhamentos (mín. {acaiOpcoes.config.minAcompanhamentos}, máx. {limitAcompanhamentos}):
                        </div>
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {acaiOpcoes.acompanhamentos.map((a: any) => {
                            const cur = Array.isArray(adicionaisSelecionados.acompanhamentos) ? adicionaisSelecionados.acompanhamentos : []
                            const selected = cur.includes(a.id)
                            return (
                              <button
                                key={a.id}
                                onClick={() => {
                                  setAdicionaisSelecionados((prev: any) => {
                                    const arr = Array.isArray(prev.acompanhamentos) ? prev.acompanhamentos.slice() : []
                                    if (selected) return { ...prev, acompanhamentos: arr.filter((x: string) => x !== a.id) }
                                    if (arr.length >= limitAcompanhamentos) return prev
                                    return { ...prev, acompanhamentos: [...arr, a.id] }
                                  })
                                }}
                                className={`px-3 py-1 rounded-full border ${selected ? 'bg-primary text-white' : ''}`}
                                style={selected ? { backgroundColor: theme.corPrimaria, color: '#fff' } : undefined}
                              >
                                {a.nome}
                              </button>
                            )
                          })}
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button
                            className="px-3 py-1 rounded-full"
                            onClick={() => setAdicionaisSelecionados((prev: any) => ({ ...prev, acompanhamentosOk: true }))}
                            disabled={
                              !Array.isArray(adicionaisSelecionados.acompanhamentos) ||
                              adicionaisSelecionados.acompanhamentos.length < (acaiOpcoes.config.minAcompanhamentos || 0)
                            }
                            style={{
                              backgroundColor:
                                !Array.isArray(adicionaisSelecionados.acompanhamentos) ||
                                adicionaisSelecionados.acompanhamentos.length < (acaiOpcoes.config.minAcompanhamentos || 0)
                                  ? '#d1d5db'
                                  : theme.corPrimaria,
                              color: '#fff'
                            }}
                          >
                            Continuar
                          </button>
                        </div>
                      </>
                    )}
                    {adicionaisSelecionados.acompanhamentosOk && !adicionaisSelecionados.coberturasOk && (
                      <>
                        <div className="mt-3 text-sm">Escolha cobertura {limitCoberturas > 1 ? `(até ${limitCoberturas})` : ''}:</div>
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {acaiOpcoes.coberturas.map((c: any) => {
                            const cur = Array.isArray(adicionaisSelecionados.coberturas) ? adicionaisSelecionados.coberturas : []
                            const selected = cur.includes(c.id)
                            return (
                              <button
                                key={c.id}
                                onClick={() => {
                                  if (limitCoberturas === 1) {
                                    setAdicionaisSelecionados((prev: any) => ({
                                      ...prev,
                                      coberturas: [c.id],
                                      coberturaId: c.id,
                                      coberturasOk: true
                                    }))
                                  } else {
                                    setAdicionaisSelecionados((prev: any) => {
                                      const arr = Array.isArray(prev.coberturas) ? prev.coberturas.slice() : []
                                      if (selected) return { ...prev, coberturas: arr.filter((x: string) => x !== c.id) }
                                      if (arr.length >= limitCoberturas) return prev
                                      return { ...prev, coberturas: [...arr, c.id] }
                                    })
                                  }
                                }}
                                className={`px-3 py-1 rounded-full border ${selected ? 'bg-primary text-white' : ''}`}
                                style={selected ? { backgroundColor: theme.corPrimaria, color: '#fff' } : undefined}
                              >
                                {c.nome}
                              </button>
                            )
                          })}
                        </div>
                        {limitCoberturas > 1 && (
                          <div className="mt-3 flex justify-end">
                            <button
                              className="px-3 py-1 rounded-full"
                              onClick={() => setAdicionaisSelecionados((prev: any) => ({ ...prev, coberturasOk: true }))}
                              style={{ backgroundColor: theme.corPrimaria, color: '#fff' }}
                            >
                              Continuar
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    {adicionaisSelecionados.coberturasOk && (
                      <>
                        <div className="mt-3 text-sm">Selecione complementos (opcional):</div>
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {acaiOpcoes.complementos.map((c: any) => {
                            const selected =
                              Array.isArray(adicionaisSelecionados.complementos) && adicionaisSelecionados.complementos.includes(c.id)
                            return (
                              <button
                                key={c.id}
                                onClick={() => {
                                  setAdicionaisSelecionados((prev: any) => {
                                    const cur = Array.isArray(prev.complementos) ? prev.complementos.slice() : []
                                    if (selected) {
                                      return { ...prev, complementos: cur.filter((x: string) => x !== c.id) }
                                    } else {
                                      // Complementos ilimitados
                                      return { ...prev, complementos: [...cur, c.id] }
                                    }
                                  })
                                }}
                                className={`px-3 py-1 rounded-full border ${selected ? 'bg-primary text-white' : ''}`}
                                style={selected ? { backgroundColor: theme.corPrimaria, color: '#fff' } : undefined}
                              >
                                {c.nome} (+R$ {Number(c.valorAdicional).toFixed(2)})
                              </button>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </>
                )}
                {perfil === 'PIZZARIA' && pizzaOpcoes && (
                  <>
                    <div className="text-sm">Escolha o tamanho:</div>
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {pizzaOpcoes.tamanhos.map((t: any) => {
                        const selected = adicionaisSelecionados.tamanhoId === t.id
                        return (
                          <button
                            key={t.id}
                            onClick={() => setAdicionaisSelecionados((prev: any) => ({ ...prev, tamanhoId: t.id }))}
                            className={`px-3 py-1 rounded-full border ${selected ? 'bg-primary text-white' : ''}`}
                            style={selected ? { backgroundColor: theme.corPrimaria, color: '#fff' } : undefined}
                          >
                            {t.nome} (R$ {Number(t.precoBase).toFixed(2)})
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-3 text-sm">Selecione sabores (até {pizzaOpcoes.config.maxSaboresPorPizza}):</div>
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {pizzaOpcoes.sabores.map((s: any) => {
                        const cur = Array.isArray(adicionaisSelecionados.sabores) ? adicionaisSelecionados.sabores : []
                        const selected = cur.includes(s.id)
                        return (
                          <button
                            key={s.id}
                            onClick={() => {
                              setAdicionaisSelecionados((prev: any) => {
                                const arr = Array.isArray(prev.sabores) ? prev.sabores.slice() : []
                                if (selected) return { ...prev, sabores: arr.filter((x: string) => x !== s.id) }
                                if (arr.length >= pizzaOpcoes.config.maxSaboresPorPizza) return prev
                                return { ...prev, sabores: [...arr, s.id] }
                              })
                            }}
                            className={`px-3 py-1 rounded-full border ${selected ? 'bg-primary text-white' : ''}`}
                            style={selected ? { backgroundColor: theme.corPrimaria, color: '#fff' } : undefined}
                          >
                            {s.nome}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
                {perfil === 'ACAITERIA' ? (
                  <div className="mt-3 flex justify-end">
                    <button
                      className="px-3 py-1 rounded-full"
                      onClick={() => {
                        setAdicionaisSelecionados((prev: any) => prev)
                        adicionarItem()
                      }}
                      disabled={false}
                      style={{
                        backgroundColor: theme.corPrimaria,
                        color: '#fff'
                      }}
                    >
                      Confirmar
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex justify-end">
                    <button className="px-3 py-1 rounded-full" onClick={adicionarItem} style={{ backgroundColor: theme.corPrimaria, color: '#fff' }}>
                      Confirmar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {meusPedidosAberto && (
          <div className="absolute inset-0 bg-white/95 z-20 flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="text-sm font-semibold">Meus pedidos</div>
              <div className="flex items-center gap-2 text-xs">
                {pedidoDetalhe && (
                  <button
                    type="button"
                    className="px-2 py-1 rounded-full border border-gray-300"
                    onClick={() => setPedidoDetalhe(null)}
                  >
                    Voltar
                  </button>
                )}
                <button
                  type="button"
                  className="px-2 py-1 rounded-full border border-gray-300"
                  onClick={() => {
                    setMeusPedidosAberto(false)
                    setPedidoDetalhe(null)
                  }}
                >
                  Fechar
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {meusPedidosLoading && (
                <div className="text-sm text-gray-600">Carregando seus pedidos...</div>
              )}
              {!meusPedidosLoading && !pedidoDetalhe && meusPedidos.length === 0 && (
                <div className="text-sm text-gray-600">Você ainda não possui pedidos cadastrados.</div>
              )}
              {!meusPedidosLoading && !pedidoDetalhe && meusPedidos.length > 0 && (
                <div className="space-y-2">
                  {meusPedidos.map(p => (
                    <div key={p.id} className="border rounded-lg px-3 py-2 text-xs text-gray-800">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold">
                            Pedido {pedidoCodigoCurto(p.id)}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {new Date(p.createdAt).toLocaleDateString()} ·{' '}
                            {new Date(p.createdAt).toLocaleTimeString()}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${badgeStatusClasse(
                                p.status
                              )}`}
                            >
                              {formatarStatus(p.status)}
                            </span>
                            <span className="text-[11px] text-gray-700">
                              Total: R$ {Number(p.total).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <button
                            type="button"
                            className="px-2 py-1 rounded-full border border-gray-300 text-[11px]"
                            onClick={() => mostrarDetalhesPedido(p.id)}
                          >
                            Ver detalhes
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!meusPedidosLoading && pedidoDetalhe && (
                <div className="space-y-3 text-xs text-gray-800">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">
                        Pedido {pedidoCodigoCurto(pedidoDetalhe.id)}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {new Date(pedidoDetalhe.createdAt).toLocaleDateString()} ·{' '}
                        {new Date(pedidoDetalhe.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${badgeStatusClasse(
                        pedidoDetalhe.status
                      )}`}
                    >
                      {formatarStatus(pedidoDetalhe.status)}
                    </span>
                  </div>
                  <div className="border-t pt-2 space-y-1">
                    <div className="text-xs font-semibold">Itens</div>
                    {Array.isArray(pedidoDetalhe.itens) && pedidoDetalhe.itens.length > 0 ? (
                      pedidoDetalhe.itens.map((i: any) => (
                        <div key={i.id} className="flex items-center justify-between gap-2 py-1">
                          <div className="flex-1">
                            <div className="text-xs font-medium">
                              {i.quantidade}x {i.produto?.nome || 'Item'}
                            </div>
                            {i.observacoes && (
                              <div className="text-[11px] text-gray-500">Obs: {i.observacoes}</div>
                            )}
                          </div>
                          <div className="text-xs font-semibold">
                            R$ {Number(i.subtotal).toFixed(2)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-600">Sem itens.</div>
                    )}
                  </div>
                  {(() => {
                    const itens = Array.isArray(pedidoDetalhe.itens) ? pedidoDetalhe.itens : []
                    const subtotal = itens.reduce(
                      (acc: number, i: any) => acc + Number(i.subtotal || 0),
                      0
                    )
                    const desconto = Number(pedidoDetalhe.valorDesconto || 0)
                    const total = Number(pedidoDetalhe.total || 0)
                    const taxaEntrega = total - subtotal + desconto
                    return (
                      <div className="border-t pt-2 space-y-1 text-xs text-gray-800">
                        <div>Subtotal: R$ {subtotal.toFixed(2)}</div>
                        {desconto > 0 && (
                          <div>Desconto: -R$ {desconto.toFixed(2)}</div>
                        )}
                        {taxaEntrega > 0 && (
                          <div>Taxa de entrega: R$ {taxaEntrega.toFixed(2)}</div>
                        )}
                        <div className="font-semibold text-gray-900">
                          Total: R$ {total.toFixed(2)}
                        </div>
                      </div>
                    )
                  })()}
                  <div className="border-t pt-2 space-y-1 text-xs text-gray-800">
                    {pedidoDetalhe.formaEntrega === 'entrega' && pedidoDetalhe.enderecoEntrega && (
                      <>
                        <div className="font-semibold">Endereço</div>
                        <div className="text-[11px] text-gray-700">
                          {pedidoDetalhe.enderecoEntrega.rua}{' '}
                          {pedidoDetalhe.enderecoEntrega.numero}{' '}
                          {pedidoDetalhe.enderecoEntrega.bairro
                            ? `- ${pedidoDetalhe.enderecoEntrega.bairro}`
                            : ''}
                          {pedidoDetalhe.enderecoEntrega.complemento
                            ? ` · ${pedidoDetalhe.enderecoEntrega.complemento}`
                            : ''}
                        </div>
                      </>
                    )}
                    <div className="font-semibold mt-2">Pagamento</div>
                    <div>
                      Forma:{' '}
                      <span className="font-medium">
                        {pedidoDetalhe.pagamento?.tipo || 'não informado'}
                      </span>
                    </div>
                    <div>
                      Status:{' '}
                      <span className="font-medium">
                        {pedidoDetalhe.pagamento?.status || 'não informado'}
                      </span>
                    </div>
                  </div>
                  {pedidoDetalhe.pagamento?.tipo === 'pix' &&
                    pedidoDetalhe.pagamento?.status === 'pendente' && (
                      <div className="border-t pt-2 space-y-2 text-xs text-gray-800">
                        <div className="font-semibold">Pagamento Pix pendente</div>
                        <div className="mt-1">
                          {pedidoDetalhe.pagamento.qrcode &&
                          typeof pedidoDetalhe.pagamento.qrcode === 'string' &&
                          pedidoDetalhe.pagamento.qrcode.startsWith('data:') ? (
                            <img
                              src={pedidoDetalhe.pagamento.qrcode}
                              alt="QR Code Pix"
                              className="w-56 h-56 rounded-lg mx-auto"
                            />
                          ) : (
                            <div className="text-[11px] break-all">
                              QRCode: {pedidoDetalhe.pagamento.qrcode || 'indisponível'}
                            </div>
                          )}
                        </div>
                        {pix && pedidoId === pedidoDetalhe.id && (
                          <div className="text-[11px] break-all">
                            Copia e cola: {pix.copiaECola}
                          </div>
                        )}
                      </div>
                    )}
                  {pedidoDetalheLoading && (
                    <div className="text-xs text-gray-600">Carregando detalhes...</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
