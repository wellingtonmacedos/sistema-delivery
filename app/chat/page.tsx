'use client'
import ArcadeMenu from '@/components/arcade/ArcadeMenu'
import { sendOrderToWhatsApp } from '@/lib/whatsapp/sendOrderToWhatsApp'
import { useParams, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { safePerfil, perfilLabel } from '@/lib/perfil'
import { calcularStatusAbertura, type StatusAberturaResultado } from '@/lib/horarioFuncionamento'

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
type WhatsOrder = {
  codigo: string
  cliente_nome: string
  cliente_telefone: string
  total: number
  items: { quantidade: number; nome: string }[]
}
type Estado =
  | 'aguardando_telefone'
  | 'aguardando_nome'
  | 'menu_principal'
  | 'pesquisando_produto'
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

export default function ChatPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const tenantSlug =
    typeof (params as any)?.slug === 'string' ? String((params as any).slug)
    : searchParams?.get('est') ? String(searchParams.get('est'))
    : undefined
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
  const [resumoTotal, setResumoTotal] = useState<{
    total: number
    taxaEntrega: number
    desconto?: number
    cupomAplicado?: boolean | null
    cupomMotivo?: string | null
    baseCalculoElegivel?: number | null
    categoriaLabel?: string | null
    produtoLabel?: string | null
    itensAplicados?: {
      produtoId: string
      produtoNome?: string | null
      quantidade: number
      subtotal: number
      descontoRecebido: number
    }[] | null
  } | null>(null)
  const [cupomCodigo, setCupomCodigo] = useState<string>('')
  const [pedidoId, setPedidoId] = useState<string | null>(null)
  const [pix, setPix] = useState<{ txid: string; qrcode: string; copiaECola: string; simulado?: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusAbertura, setStatusAbertura] = useState<StatusAberturaResultado | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [perfil, setPerfil] = useState<'LANCHONETE' | 'ACAITERIA' | 'PIZZARIA' | 'DISTRIBUIDORA'>('LANCHONETE')
  const [acaiOpcoes, setAcaiOpcoes] = useState<any | null>(null)
  const [pizzaOpcoes, setPizzaOpcoes] = useState<any | null>(null)
  const [adicionaisSelecionados, setAdicionaisSelecionados] = useState<any>({})
  const [trocoValor, setTrocoValor] = useState<string>('')
  const [meusPedidos, setMeusPedidos] = useState<any[]>([])
  const [meusPedidosAberto, setMeusPedidosAberto] = useState(false)
  const [mostrarArcade, setMostrarArcade] = useState(false)
  const [mostrarAcoesPedido, setMostrarAcoesPedido] = useState(false)
  const [mostrarAcoesWhatsApp, setMostrarAcoesWhatsApp] = useState(false)
  const [mostrarAcoesRepetirPedido, setMostrarAcoesRepetirPedido] = useState(false)
  const [ultimoPedido, setUltimoPedido] = useState<any | null>(null)
  const [pedidoWhatsApp, setPedidoWhatsApp] = useState<WhatsOrder | null>(null)
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
    telefoneLoja?: string | null
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
    telefoneLoja: null,
    bordaBaloes: 'ARREDONDADO',
    sombraBaloes: false
  })
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchResults, setSearchResults] = useState<Produto[]>([])
  const [searchLoading, setSearchLoading] = useState<boolean>(false)
  const [avisoRepetirPedido, setAvisoRepetirPedido] = useState<string | null>(null)
  const [tipoCompraPorProdutoId, setTipoCompraPorProdutoId] = useState<Record<string, 'unitario' | 'embalagem'>>({})
  const [quantidadePorProdutoId, setQuantidadePorProdutoId] = useState<Record<string, number>>({})
  const [valorMinimoPedido, setValorMinimoPedido] = useState<number | null>(null)

  const limitSabores = produtoSelecionado?.maxSabores ?? acaiOpcoes?.config?.maxSabores ?? 1
  const limitSorvetes = produtoSelecionado?.maxSorvetes ?? acaiOpcoes?.config?.maxSorvetes ?? 1
  const limitAcompanhamentos = produtoSelecionado?.maxAcompanhamentos ?? acaiOpcoes?.config?.maxAcompanhamentos ?? 3
  const limitCoberturas = produtoSelecionado?.maxCoberturas ?? acaiOpcoes?.config?.maxCoberturas ?? 1

  const lastPedidoStatusRef = useRef<string | null>(null)
  const conviteJogoPedidoIdRef = useRef<string | null>(null)
  const conviteWhatsAppPedidoIdRef = useRef<string | null>(null)
  const bootedRef = useRef(false)

  function enviarMensagensBot(textos: string[]) {
    setMensagens(m => [...m, ...textos.map(texto => ({ de: 'bot' as const, texto }))])
  }

  function abrirDetalhesPedidoAtual() {
    if (!pedidoId) return
    setMeusPedidosAberto(true)
    mostrarDetalhesPedido(pedidoId)
  }

  function enviarPedidoParaWhatsApp() {
    const numero = String(theme.telefoneLoja || '').trim()
    if (!numero) {
      setMensagens(m => [...m, { de: 'bot', texto: 'O WhatsApp da loja não está configurado no momento.' }])
      return
    }
    if (!pedidoWhatsApp) return
    sendOrderToWhatsApp(pedidoWhatsApp, { whatsapp: numero })
    setMostrarAcoesWhatsApp(false)
  }

  async function iniciarNovoPedido() {
    setMostrarAcoesRepetirPedido(false)
    setUltimoPedido(null)
    setAvisoRepetirPedido(null)
    setCarrinho([])
    setCategoriaSelecionada(null)
    setProdutoSelecionado(null)
    setQuantidade(1)
    setAdicionaisSelecionados({})
    setMensagens(m => [...m, { de: 'bot', texto: 'Perfeito! Vamos ao cardápio 😊' }])
    const aberto = await carregarPerfil()
    if (!aberto) {
      setMensagens(m => [...m, { de: 'bot', texto: mensagemFechado() }])
      setEstado('finalizado')
      return
    }
    await carregarCategorias()
    setEstado('escolhendo_categoria')
  }

  async function repetirPedido() {
    if (!ultimoPedido || !Array.isArray(ultimoPedido.itens) || ultimoPedido.itens.length === 0) return
    setMostrarAcoesRepetirPedido(false)
    setAvisoRepetirPedido(null)
    setMensagens(m => [...m, { de: 'bot', texto: '🔁 Repetindo seu último pedido...' }])
    const aberto = await carregarPerfil()
    if (!aberto) {
      setMensagens(m => [...m, { de: 'bot', texto: mensagemFechado() }])
      setEstado('finalizado')
      return
    }
    const itensAntigos = ultimoPedido.itens.filter((i: any) => i?.produto?.id)
    const idsUnicos = Array.from(new Set(itensAntigos.map((i: any) => String(i.produto.id))))
    let produtosAtivos: any[] = []
    try {
      const r = await fetch('/api/produtos?ids=' + idsUnicos.join(','), {
        headers: headersWith(),
        cache: 'no-store' as any
      })
      if (r.ok) {
        const d = await r.json()
        produtosAtivos = Array.isArray(d?.produtos) ? d.produtos.filter((p: any) => p && p.ativo !== false) : []
      }
    } catch {}
    const itensCarrinho: ItemCarrinho[] = []
    const indisponiveis: string[] = []
    for (const itemAntigo of itensAntigos) {
      const pid = String(itemAntigo.produto.id)
      const produtoAtual = produtosAtivos.find(p => String(p.id) === pid)
      if (!produtoAtual) {
        indisponiveis.push(String(itemAntigo.produto.nome || 'Item'))
        continue
      }
      const qtdOriginal = Number(itemAntigo.quantidade || 1)
      const adicionaisAntigos = itemAntigo.adicionais
      const querEmbalagem = adicionaisAntigos?.tipoCompra === 'embalagem'
      const temPrecoEmbalagem = produtoAtual.precoEmbalagem != null
      const tipoCompra: 'unitario' | 'embalagem' = querEmbalagem && temPrecoEmbalagem ? 'embalagem' : 'unitario'
      const precoUsado = tipoCompra === 'embalagem' ? Number(produtoAtual.precoEmbalagem) : Number(produtoAtual.preco)
      const subtotal = precoUsado * qtdOriginal
      const produtoMontado: Produto = {
        id: String(produtoAtual.id),
        nome: String(produtoAtual.nome || 'Item'),
        descricao: produtoAtual.descricao || undefined,
        preco: Number(produtoAtual.preco || 0),
        categoria: String(produtoAtual.categoria || ''),
        adicionais: produtoAtual.adicionais,
        fotoUrl: produtoAtual.fotoUrl ?? null,
        maxSabores: produtoAtual.maxSabores ?? null,
        maxSorvetes: produtoAtual.maxSorvetes ?? null,
        maxAcompanhamentos: produtoAtual.maxAcompanhamentos ?? null,
        maxCoberturas: produtoAtual.maxCoberturas ?? null
      }
      ;(produtoMontado as any).precoEmbalagem = produtoAtual.precoEmbalagem
      ;(produtoMontado as any).qtdPorEmbalagem = produtoAtual.qtdPorEmbalagem
      ;(produtoMontado as any).marca = produtoAtual.marca
      ;(produtoMontado as any).unidade = produtoAtual.unidade
      const novosAdicionais: any = { ...(adicionaisAntigos || {}), tipoCompra }
      itensCarrinho.push({
        produto: produtoMontado,
        quantidade: qtdOriginal,
        adicionais: novosAdicionais
      })
    }
    if (indisponiveis.length > 0) {
      setAvisoRepetirPedido('⚠️ Alguns produtos não estão mais disponíveis: ' + indisponiveis.join(', '))
    }
    setCarrinho(itensCarrinho)
    setCategoriaSelecionada(null)
    setProdutoSelecionado(null)
    setQuantidade(1)
    setAdicionaisSelecionados({})
    setMensagens(m => [
      ...m,
      { de: 'bot', texto: 'Seu pedido foi carregado no carrinho.' },
      { de: 'bot', texto: 'Deseja confirmar o pedido ou alterar algo?' }
    ])
    setEstado('confirmando_itens')
  }

  useEffect(() => {
    if (bootedRef.current) return
    bootedRef.current = true

    async function boot() {
      const telefoneCache =
        typeof window !== 'undefined' ? window.localStorage.getItem('cliente_telefone') : null
      const tel = String(telefoneCache || '').replace(/\D/g, '')
      if (tel && /^\d{10,13}$/.test(tel)) {
        setTelefone(tel)
        setLoading(true)
        try {
          const r = await fetch('/api/clientes?telefone=' + encodeURIComponent(tel), { headers: headersWith() })
          const ct = r.headers.get('content-type') || ''
          if (r.ok && ct.includes('application/json')) {
            const d = await r.json()
            if (d?.cliente) {
              setClienteOk(true)
              setClienteNomeDb(String(d.cliente.nome || ''))
              const rawEnd = (d.cliente as any).enderecos
              let lista: any[] = []
              if (Array.isArray(rawEnd)) lista = rawEnd
              else if (rawEnd && typeof rawEnd === 'object') lista = [rawEnd]
              setEnderecosCliente(lista)

              setMensagens(m => [
                ...m,
                { de: 'bot', texto: `👋 Olá novamente, ${String(d.cliente.nome || 'cliente')}!` }
              ])

              const pr = await fetch(
                '/api/pedidos?telefone=' + encodeURIComponent(tel) + '&ultimo=1',
                { headers: headersWith() }
              )
              const pct = pr.headers.get('content-type') || ''
              if (pr.ok && pct.includes('application/json')) {
                const pd = await pr.json()
                const p = pd?.pedido
                if (p && Array.isArray(p.itens) && p.itens.length > 0) {
                  setUltimoPedido(p)
                  const itensTxt = p.itens
                    .map((i: any) => `• ${String(i?.produto?.nome || 'Item')}`)
                    .join('\n')
                  setMensagens(m => [
                    ...m,
                    {
                      de: 'bot',
                      texto: `Seu último pedido foi:\n\n${itensTxt}\n\nDeseja repetir o mesmo pedido?`
                    }
                  ])
                  setMostrarAcoesRepetirPedido(true)
                  setEstado('menu_principal')
                  return
                }
              }

              setMensagens(m => [...m, { de: 'bot', texto: 'Que bom ter você de volta 😊' }])
              const aberto = await carregarPerfil()
              if (!aberto) {
                setMensagens(m => [...m, { de: 'bot', texto: mensagemFechado() }])
                setEstado('finalizado')
                return
              }
              await carregarCategorias()
              setEstado('escolhendo_categoria')
              return
            }
          }
        } catch {}
        setLoading(false)
      }

      setMensagens([
        {
          de: 'bot',
          texto: 'Olá 👋 Seja bem-vindo!\nPara começarmos, informe seu telefone com DDD.'
        }
      ])
    }

    boot().finally(() => setLoading(false))
  }, [tenantSlug])

  useEffect(() => {
    carregarPerfil()
  }, [tenantSlug])

  function headersWith(extra?: HeadersInit) {
    const base: Record<string, string> = tenantSlug ? { 'x-estabelecimento-slug': tenantSlug } : {}
    return { ...(extra as any), ...base }
  }

  function mensagemFechado(): string {
    const s = statusAbertura
    const linhas = ['🔒 Atendimento fechado no momento.']
    if (s?.motivo) linhas.push(s.motivo)
    if (s?.horarioHojeAbre && s?.horarioHojeFecha) {
      linhas.push(`Horário hoje: ${s.horarioHojeAbre} → ${s.horarioHojeFecha}`)
    }
    linhas.push('Volte mais tarde 😊')
    return linhas.join('\n')
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
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('cliente_telefone', telefone)
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
    if (typeof window !== 'undefined' && telefone) {
      window.localStorage.setItem('cliente_telefone', telefone)
    }
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
        const pf = safePerfil(t?.perfil) || 'LANCHONETE'
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
          telefoneLoja: t?.telefone || null,
          bordaBaloes: t?.bordaBaloes || 'ARREDONDADO',
          sombraBaloes: t?.sombraBaloes ?? false
        })
        const minRaw = Number(t?.valorMinimoPedido)
        setValorMinimoPedido(isNaN(minRaw) || minRaw <= 0 ? null : minRaw)
        const status = calcularStatusAbertura({
          abertoManual: t?.aberto,
          diasAtivos: t?.diasAtivos,
          horarioAbertura: t?.horarioAbertura,
          horarioFechamento: t?.horarioFechamento
        })
        setStatusAbertura(status)
        if (!status.aberto) {
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
      preparando: perfil === 'DISTRIBUIDORA' ? '📦 Separando seu pedido' : '👨‍🍳 Em preparação',
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
    let adicionais: any = perfil === 'ACAITERIA' || perfil === 'PIZZARIA' ? adicionaisSelecionados : undefined
    if (perfil === 'DISTRIBUIDORA') {
      const tp = tipoCompraPorProdutoId[produtoSelecionado.id] || 'unitario'
      if (adicionais && typeof adicionais === 'object' && !Array.isArray(adicionais)) {
        adicionais.tipoCompra = tp
      } else {
        adicionais = { tipoCompra: tp }
      }
    }
    setCarrinho(c => [...c, { produto: produtoSelecionado, quantidade, adicionais }])
    setProdutoSelecionado(null)
    setQuantidade(1)
    setAdicionaisSelecionados({})
    setEstado('confirmando_itens')
  }

  function adicionarItemInline(p: Produto, tipoCompra: 'unitario' | 'embalagem', quantidade: number) {
    if (!p || !p.id) return
    const qtd = Math.max(1, Math.floor(Number(quantidade) || 1) || 1)
    setQuantidadePorProdutoId(m => ({ ...m, [p.id]: qtd }))
    const precoUnit = Number(p.preco || 0)
    const precoEmb = (p as any).precoEmbalagem != null ? Number((p as any).precoEmbalagem) : null
    const temEmb = precoEmb != null
    const finalTipo = temEmb ? tipoCompra : 'unitario'
    const precoUsado = finalTipo === 'embalagem' ? precoEmb! : precoUnit
    const subtotal = precoUsado * qtd
    setCarrinho(c => [...c, { produto: p, quantidade: qtd, adicionais: { tipoCompra: finalTipo } }])
    const labelTipo = finalTipo === 'embalagem' ? ' (Embalagem)' : ''
    const un = (p as any).unidade || 'un'
    const nome = String(p.nome || 'Item')
    const subtotalFmt = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    setMensagens(m => [
      ...m,
      { de: 'bot', texto: `✅ Adicionado: **${nome}${labelTipo}** x ${qtd}${un} · Subtotal **${subtotalFmt}**` }
    ])
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
          if (typeof d?.total === 'number') {
            setResumoTotal({
              total: d.total,
              taxaEntrega: Number(d.taxaEntrega || 0),
              desconto: Number(d.desconto || 0),
              cupomAplicado: typeof d?.cupomAplicado === 'boolean' ? d.cupomAplicado : null,
              cupomMotivo: typeof d?.cupomMotivo === 'string' ? d.cupomMotivo : null,
              baseCalculoElegivel: typeof d?.baseCalculoElegivel === 'number' ? Number(d.baseCalculoElegivel) : null,
              categoriaLabel: typeof d?.categoriaLabel === 'string' && d.categoriaLabel ? d.categoriaLabel : null,
              produtoLabel: typeof d?.produtoLabel === 'string' && d.produtoLabel ? d.produtoLabel : null,
              itensAplicados: Array.isArray(d?.itensAplicados) && d.itensAplicados.length > 0 ? d.itensAplicados : null
            })
          } else {
            setResumoTotal(null)
          }
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
    if (statusAbertura && !statusAbertura.aberto) {
      const linhas = ['🔒 Atendimento fechado no momento.']
      if (statusAbertura?.motivo) linhas.push(statusAbertura.motivo)
      if (statusAbertura?.horarioHojeAbre && statusAbertura?.horarioHojeFecha) {
        linhas.push(`Horário de hoje: ${statusAbertura.horarioHojeAbre} → ${statusAbertura.horarioHojeFecha}`)
      }
      linhas.push('Volte mais tarde 😊')
      setMensagens(m => [...m, { de: 'bot', texto: linhas.join('\n') }])
      return
    }
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
          if (err?.error) {
            const raw = String(err.error)
            if (/valor.*m[ií]nimo|m[ií]nimo.*pedido/i.test(raw)) {
              msg = '⚠️ ' + raw + '\n\nAdicione mais itens no carrinho para atingir o valor mínimo.'
            } else if (/dados.*inv[aá]lidos|inv[aá]lidos/i.test(raw)) {
              msg = '⚠️ Alguns dados do pedido estão incompletos. Tente novamente.'
            } else if (/produto.*inv[aá]lido|cliente.*n[aã]o.*encontrado/i.test(raw)) {
              msg = '⚠️ ' + raw + '. Recarregue a página e tente novamente.'
            } else {
              msg = '⚠️ ' + raw
            }
          }
        } catch {}
        setMensagens(m => [...m, { de: 'bot', texto: msg }])
        setEstado('confirmando_itens')
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
          let msgDetalhe = ''
          try {
            const errPix = await rp.json()
            if (errPix?.error) msgDetalhe = String(errPix.error)
          } catch {}
          const mensagem =
            msgDetalhe.trim()
              ? `Seu pedido ${d.pedido.id} foi criado, mas houve erro ao gerar o Pix:\n⚠️ ${msgDetalhe}\n\nEscolha outra forma de pagamento abaixo.`
              : `Seu pedido ${d.pedido.id} foi criado, mas houve erro ao gerar o Pix. Escolha outra forma de pagamento abaixo.`
          setMensagens(m => [...m, { de: 'bot', texto: mensagem }])
          setEstado('escolhendo_pagamento')
          return
        }
        const pct = rp.headers.get('content-type') || ''
        if (pct.includes('application/json')) {
          const pixData = await rp.json()
          setPix(pixData)
        }
        setMostrarAcoesPedido(false)
        setMostrarAcoesWhatsApp(false)
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
        const nomeCliente = (clienteNomeDb || `${nome} ${sobrenome}`.trim() || 'Cliente').trim()
        setPedidoWhatsApp({
          codigo: pedidoCodigoCurto(d.pedido.id),
          cliente_nome: nomeCliente,
          cliente_telefone: telefone,
          total,
          items: carrinho.map(i => ({ quantidade: i.quantidade, nome: i.produto.nome }))
        })
        enviarMensagensBot([
          '🎉 Pedido confirmado!\n\nSeu pedido foi registrado com sucesso.',
          'Deseja enviar o pedido para o WhatsApp da loja\npara agilizar o preparo? 📲',
          '⏱ Tempo estimado de preparo: 15–25 minutos.',
          'Enquanto seu pedido fica pronto,\nque tal jogar um pouco? 🎮'
        ])
        conviteWhatsAppPedidoIdRef.current = d.pedido.id
        conviteJogoPedidoIdRef.current = d.pedido.id
        lastPedidoStatusRef.current = 'preparando'
        setMostrarAcoesPedido(true)
        setMostrarAcoesWhatsApp(true)
      }
      setEstado('finalizado')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!pedidoId) return
    let alive = true
    lastPedidoStatusRef.current = null

    async function tick() {
      try {
        const r = await fetch(`/api/pedidos/${pedidoId}`, { headers: headersWith() })
        const ct = r.headers.get('content-type') || ''
        if (!r.ok || !ct.includes('application/json')) return
        const d = await r.json()
        const status = String(d?.pedido?.status || '')
        if (!status) return
        if (!alive) return

        const prev = lastPedidoStatusRef.current
        lastPedidoStatusRef.current = status

        if (pedidoDetalhe?.id === pedidoId) {
          setPedidoDetalhe((cur: any) => (cur?.id === pedidoId ? d.pedido : cur))
        }

        if (!prev) {
          if (status === 'pago' && (conviteJogoPedidoIdRef.current !== pedidoId || conviteWhatsAppPedidoIdRef.current !== pedidoId)) {
            const p = d?.pedido
            if (p) {
              const itens = Array.isArray(p.itens) ? p.itens : []
              setPedidoWhatsApp({
                codigo: pedidoCodigoCurto(pedidoId!),
                cliente_nome: String(p?.cliente?.nome || clienteNomeDb || `${nome} ${sobrenome}`.trim() || 'Cliente').trim(),
                cliente_telefone: String(p?.cliente?.telefone || telefone || '').trim(),
                total: Number(p?.total || 0),
                items: itens.map((i: any) => ({ quantidade: Number(i.quantidade || 0), nome: String(i?.produto?.nome || 'Item') }))
              })
            }
            enviarMensagensBot([
              '🎉 Pedido confirmado!\n\nSeu pedido foi registrado com sucesso.',
              'Deseja enviar o pedido para o WhatsApp da loja\npara agilizar o preparo? 📲',
              '⏱ Tempo estimado de preparo: 15–25 minutos.',
              'Enquanto seu pedido fica pronto,\nque tal jogar um pouco? 🎮'
            ])
            conviteWhatsAppPedidoIdRef.current = pedidoId
            conviteJogoPedidoIdRef.current = pedidoId
            setMostrarAcoesPedido(true)
            setMostrarAcoesWhatsApp(true)
          }
          return
        }

        if (status !== prev) {
          if (status === 'pago' && (conviteJogoPedidoIdRef.current !== pedidoId || conviteWhatsAppPedidoIdRef.current !== pedidoId)) {
            const p = d?.pedido
            if (p) {
              const itens = Array.isArray(p.itens) ? p.itens : []
              setPedidoWhatsApp({
                codigo: pedidoCodigoCurto(pedidoId!),
                cliente_nome: String(p?.cliente?.nome || clienteNomeDb || `${nome} ${sobrenome}`.trim() || 'Cliente').trim(),
                cliente_telefone: String(p?.cliente?.telefone || telefone || '').trim(),
                total: Number(p?.total || 0),
                items: itens.map((i: any) => ({ quantidade: Number(i.quantidade || 0), nome: String(i?.produto?.nome || 'Item') }))
              })
            }
            enviarMensagensBot([
              '🎉 Pedido confirmado!\n\nSeu pedido foi registrado com sucesso.',
              'Deseja enviar o pedido para o WhatsApp da loja\npara agilizar o preparo? 📲',
              '⏱ Tempo estimado de preparo: 15–25 minutos.',
              'Enquanto seu pedido fica pronto,\nque tal jogar um pouco? 🎮'
            ])
            conviteWhatsAppPedidoIdRef.current = pedidoId
            conviteJogoPedidoIdRef.current = pedidoId
            setMostrarAcoesPedido(true)
            setMostrarAcoesWhatsApp(true)
          }
          if (status === 'preparando') {
            setMensagens(m => [...m, { de: 'bot', texto: '👨‍🍳 Seu pedido já está sendo preparado!' }])
          }
          if (status === 'saiu_para_entrega') {
            setMensagens(m => [...m, { de: 'bot', texto: '🛵 Seu pedido saiu para entrega!\nEstá quase chegando 😄' }])
          }
        }
      } catch {}
    }

    tick()
    const id = window.setInterval(tick, 10_000)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [pedidoId, tenantSlug, pedidoDetalhe?.id])

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

  useEffect(() => {
    if (!(searchQuery.length >= 2) || estado !== 'pesquisando_produto') {
      if (searchResults.length > 0) setSearchResults([])
      return
    }
    const id = window.setTimeout(() => {
      setSearchLoading(true)
      fetch('/api/produtos/search?q=' + encodeURIComponent(searchQuery) + '&limit=20', { headers: headersWith() })
        .then(r => r.json())
        .then(d => setSearchResults(d.produtos || []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false))
    }, 300)
    return () => window.clearTimeout(id)
  }, [searchQuery, estado, tenantSlug])

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
        {statusAbertura && !statusAbertura.aberto && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-[11px] text-red-800 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 font-semibold text-red-900">
              <span>🔒</span>
              <span>Atendimento fechado</span>
            </div>
            {statusAbertura.motivo && (
              <div className="leading-snug">{statusAbertura.motivo}</div>
            )}
            {statusAbertura.horarioHojeAbre && statusAbertura.horarioHojeFecha && (
              <div className="text-red-700/90 leading-snug">
                Hoje: <span className="font-medium">{statusAbertura.horarioHojeAbre} → {statusAbertura.horarioHojeFecha}</span>
              </div>
            )}
          </div>
        )}
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
          {mostrarAcoesRepetirPedido && (
            <div className="chat-actions flex items-center gap-2 flex-wrap">
              <button
                type="button"
                className="px-3 py-2 rounded-full text-xs font-semibold text-white shadow-sm disabled:opacity-50"
                style={{ backgroundColor: theme.corPrimaria }}
                onClick={repetirPedido}
                disabled={!ultimoPedido}
              >
                🔁 Repetir pedido
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-full text-xs font-semibold border border-gray-300 bg-white"
                onClick={iniciarNovoPedido}
              >
                🍔 Fazer novo pedido
              </button>
            </div>
          )}
          {mostrarAcoesWhatsApp && (
            <div className="chat-actions flex items-center gap-2 flex-wrap">
              <button
                type="button"
                className="btn-whatsapp px-3 py-2 rounded-full text-xs font-semibold text-white shadow-sm disabled:opacity-50"
                style={{ backgroundColor: '#25D366' }}
                onClick={enviarPedidoParaWhatsApp}
                disabled={!pedidoWhatsApp || !String(theme.telefoneLoja || '').trim()}
              >
                📲 Enviar no WhatsApp
              </button>
              <button
                type="button"
                className="btn-secondary px-3 py-2 rounded-full text-xs font-semibold border border-gray-300 bg-white"
                onClick={() => {
                  setMostrarAcoesWhatsApp(false)
                  abrirDetalhesPedidoAtual()
                }}
              >
                📦 Apenas acompanhar pedido
              </button>
            </div>
          )}
          {mostrarAcoesPedido && (
            <div className="chat-actions flex items-center gap-2">
              <button
                type="button"
                className="btn-arcade px-3 py-2 rounded-full text-xs font-semibold text-white shadow-sm"
                style={{ backgroundColor: theme.corPrimaria }}
                onClick={() => setMostrarArcade(true)}
              >
                🎮 Jogar agora
              </button>
              <button
                type="button"
                className="btn-status px-3 py-2 rounded-full text-xs font-semibold border border-gray-300 bg-white"
                onClick={abrirDetalhesPedidoAtual}
              >
                📦 Ver status do pedido
              </button>
            </div>
          )}
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
                {perfil === 'DISTRIBUIDORA' && (
                  <div className="mt-3 border border-gray-200 rounded-xl bg-white p-3">
                    <div className="text-sm font-semibold">🔎 Busca rápida</div>
                    <div className="text-xs text-gray-600 mt-0.5">Encontre produtos por nome, marca ou categoria</div>
                    <div className="mt-2">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Digite o nome do produto... (ex: heineken)"
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    {estado !== 'pesquisando_produto' && (
                      <button
                        type="button"
                        onClick={() => setEstado('pesquisando_produto')}
                        className="mt-2 w-full px-3 py-2 rounded-lg text-sm font-semibold text-white"
                        style={{ backgroundColor: theme.corPrimaria }}
                      >
                        Abrir busca completa
                      </button>
                    )}
                  </div>
                )}
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
          {estado === 'pesquisando_produto' && perfil === 'DISTRIBUIDORA' && (
            <div className="flex">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 text-gray-900 px-3 py-2 w-full">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">🔎 Resultados da busca</div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {searchLoading ? 'Buscando...' : `${searchResults.length} produto(s) encontrado(s)`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEstado('escolhendo_categoria')}
                    className="px-3 py-1 rounded-full text-xs border border-gray-300 bg-white"
                  >
                    Voltar
                  </button>
                </div>
                <div className="mt-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Digite o nome do produto... (ex: heineken)"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                {searchLoading && (
                  <div className="mt-3 text-xs text-gray-600">Pesquisando...</div>
                )}
                {!searchLoading && searchResults.length === 0 && searchQuery.length >= 2 && (
                  <div className="mt-3 text-xs text-gray-600">Nenhum produto encontrado. Tente outro termo.</div>
                )}
                {!searchLoading && searchResults.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {searchResults.map(p => {
                      const tipoCompra: 'unitario' | 'embalagem' = tipoCompraPorProdutoId[p.id] || 'unitario'
                      const precoUnitario = Number(p.preco)
                      const precoEmbalagem = (p as any).precoEmbalagem != null ? Number((p as any).precoEmbalagem) : null
                      const temEmbalagem = precoEmbalagem != null
                      const marca = (p as any).marca || p.categoria
                      const unidade = (p as any).unidade || 'un'
                      const qtdPorEmbalagem = (p as any).qtdPorEmbalagem
                      const quantidadeCard = Number(quantidadePorProdutoId[p.id] ?? 1)
                      const subtotalCard =
                        (tipoCompra === 'embalagem' && temEmbalagem ? precoEmbalagem! : precoUnitario) *
                        Math.max(1, Math.floor(quantidadeCard) || 1)
                      return (
                        <div key={p.id} className="flex gap-3 rounded-xl bg-white border border-gray-200 p-2">
                          {p.fotoUrl ? (
                            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                              <img src={p.fotoUrl} alt={p.nome} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center text-lg">
                              📦
                            </div>
                          )}
                          <div className="flex-1 flex flex-col min-w-0">
                            <div className="text-sm font-semibold truncate">{p.nome}</div>
                            <div className="text-xs text-gray-500 truncate">{marca}</div>
                            <div className="text-xs text-gray-500">
                              {unidade}{qtdPorEmbalagem ? ` · Embalagem c/ ${qtdPorEmbalagem}` : ''}
                            </div>
                            {temEmbalagem ? (
                              <div className="mt-1 flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-gray-900">R$ {precoUnitario.toFixed(2)}</span>
                                <div className="flex items-center gap-1 text-xs bg-gray-200 rounded-full p-0.5">
                                  <label className={`flex items-center gap-1 px-2 py-0.5 rounded-full cursor-pointer ${tipoCompra === 'unitario' ? 'bg-white shadow-sm' : ''}`}>
                                    <input
                                      type="radio"
                                      name={`tipo-${p.id}`}
                                      checked={tipoCompra === 'unitario'}
                                      onChange={() => setTipoCompraPorProdutoId(m => ({ ...m, [p.id]: 'unitario' }))}
                                      className="w-3 h-3"
                                    />
                                    <span>Unitário</span>
                                  </label>
                                  <label className={`flex items-center gap-1 px-2 py-0.5 rounded-full cursor-pointer ${tipoCompra === 'embalagem' ? 'bg-white shadow-sm' : ''}`}>
                                    <input
                                      type="radio"
                                      name={`tipo-${p.id}`}
                                      checked={tipoCompra === 'embalagem'}
                                      onChange={() => setTipoCompraPorProdutoId(m => ({ ...m, [p.id]: 'embalagem' }))}
                                      className="w-3 h-3"
                                    />
                                    <span>Embalagem</span>
                                  </label>
                                </div>
                                <span className="text-sm font-semibold text-gray-900">R$ {precoEmbalagem!.toFixed(2)}</span>
                              </div>
                            ) : (
                              <div className="mt-1 text-sm font-semibold text-gray-900">R$ {precoUnitario.toFixed(2)}</div>
                            )}
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1 bg-gray-50">
                                <label htmlFor={`q-card-search-${p.id}`} className="text-xs text-gray-500">
                                  Quant.
                                </label>
                                <input
                                  id={`q-card-search-${p.id}`}
                                  type="number"
                                  min={1}
                                  step={1}
                                  value={quantidadeCard}
                                  onChange={e =>
                                    setQuantidadePorProdutoId(m => ({
                                      ...m,
                                      [p.id]: Math.max(1, Math.floor(Number(e.target.value) || 1))
                                    }))
                                  }
                                  className="w-16 border-0 bg-transparent text-sm font-semibold text-gray-900 outline-none p-0 text-center"
                                />
                                <span className="text-xs text-gray-500">{unidade}</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                Subtotal:{' '}
                                <span className="font-semibold text-gray-900">
                                  R$ {subtotalCard.toFixed(2).replace('.', ',')}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => adicionarItemInline(p, tipoCompra, quantidadeCard)}
                                className="px-3 py-1 rounded-full text-xs font-medium text-white ml-auto"
                                style={{ backgroundColor: theme.corPrimaria }}
                              >
                                + Adicionar
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
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
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 text-gray-900 px-3 py-2 w-full">
                {perfil === 'DISTRIBUIDORA' ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">Produtos em {categoriaSelecionada || 'categoria'}</div>
                      <button
                        type="button"
                        onClick={() => setEstado('escolhendo_categoria')}
                        className="px-3 py-1 rounded-full text-xs border border-gray-300 bg-white"
                      >
                        Voltar
                      </button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {produtos.map(p => {
                        const tipoCompra: 'unitario' | 'embalagem' = tipoCompraPorProdutoId[p.id] || 'unitario'
                        const precoUnitario = Number(p.preco)
                        const precoEmbalagem = (p as any).precoEmbalagem != null ? Number((p as any).precoEmbalagem) : null
                        const temEmbalagem = precoEmbalagem != null
                        const marca = (p as any).marca || p.categoria
                        const unidade = (p as any).unidade || 'un'
                        const qtdPorEmbalagem = (p as any).qtdPorEmbalagem
                        const quantidadeCard = Number(quantidadePorProdutoId[p.id] ?? 1)
                        const subtotalCard =
                          (tipoCompra === 'embalagem' && temEmbalagem ? precoEmbalagem! : precoUnitario) *
                          Math.max(1, Math.floor(quantidadeCard) || 1)
                        return (
                          <div key={p.id} className="flex gap-3 rounded-xl bg-white border border-gray-200 p-2">
                            {p.fotoUrl ? (
                              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                                <img src={p.fotoUrl} alt={p.nome} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center text-lg">
                                📦
                              </div>
                            )}
                            <div className="flex-1 flex flex-col min-w-0">
                              <div className="text-sm font-semibold truncate">{p.nome}</div>
                              <div className="text-xs text-gray-500 truncate">{marca}</div>
                              <div className="text-xs text-gray-500">
                                {unidade}{qtdPorEmbalagem ? ` · Embalagem c/ ${qtdPorEmbalagem}` : ''}
                              </div>
                              {temEmbalagem ? (
                                <div className="mt-1 flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-gray-900">R$ {precoUnitario.toFixed(2)}</span>
                                  <div className="flex items-center gap-1 text-xs bg-gray-200 rounded-full p-0.5">
                                    <label className={`flex items-center gap-1 px-2 py-0.5 rounded-full cursor-pointer ${tipoCompra === 'unitario' ? 'bg-white shadow-sm' : ''}`}>
                                      <input
                                        type="radio"
                                        name={`tipo2-${p.id}`}
                                        checked={tipoCompra === 'unitario'}
                                        onChange={() => setTipoCompraPorProdutoId(m => ({ ...m, [p.id]: 'unitario' }))}
                                        className="w-3 h-3"
                                      />
                                      <span>Unitário</span>
                                    </label>
                                    <label className={`flex items-center gap-1 px-2 py-0.5 rounded-full cursor-pointer ${tipoCompra === 'embalagem' ? 'bg-white shadow-sm' : ''}`}>
                                      <input
                                        type="radio"
                                        name={`tipo2-${p.id}`}
                                        checked={tipoCompra === 'embalagem'}
                                        onChange={() => setTipoCompraPorProdutoId(m => ({ ...m, [p.id]: 'embalagem' }))}
                                        className="w-3 h-3"
                                      />
                                      <span>Embalagem</span>
                                    </label>
                                  </div>
                                  <span className="text-sm font-semibold text-gray-900">R$ {precoEmbalagem!.toFixed(2)}</span>
                                </div>
                              ) : (
                                <div className="mt-1 text-sm font-semibold text-gray-900">R$ {precoUnitario.toFixed(2)}</div>
                              )}
                              <div className="mt-2 flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1 bg-gray-50">
                                  <label htmlFor={`q-card-cat-${p.id}`} className="text-xs text-gray-500">
                                    Quant.
                                  </label>
                                  <input
                                    id={`q-card-cat-${p.id}`}
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={quantidadeCard}
                                    onChange={e =>
                                      setQuantidadePorProdutoId(m => ({
                                        ...m,
                                        [p.id]: Math.max(1, Math.floor(Number(e.target.value) || 1))
                                      }))
                                    }
                                    className="w-16 border-0 bg-transparent text-sm font-semibold text-gray-900 outline-none p-0 text-center"
                                  />
                                  <span className="text-xs text-gray-500">{unidade}</span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  Subtotal:{' '}
                                  <span className="font-semibold text-gray-900">
                                    R$ {subtotalCard.toFixed(2).replace('.', ',')}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => adicionarItemInline(p, tipoCompra, quantidadeCard)}
                                  className="px-3 py-1 rounded-full text-xs font-medium text-white ml-auto"
                                  style={{ backgroundColor: theme.corPrimaria }}
                                >
                                  + Adicionar
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : perfil === 'ACAITERIA' ? (
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
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 text-gray-900 px-3 py-2 w-full">
                {perfil === 'DISTRIBUIDORA' ? (
                  <>
                    <div className="font-medium text-sm">
                      {produtoSelecionado.nome}
                    </div>
                    {(produtoSelecionado as any).marca ? (
                      <div className="text-xs text-gray-500">{(produtoSelecionado as any).marca}</div>
                    ) : null}
                    <div className="mt-2 text-sm">Escolha o tipo de compra e informe a quantidade desejada:</div>
                    <div className="mt-2">
                      {(() => {
                        const precoUnitario = Number(produtoSelecionado.preco)
                        const precoEmbalagem =
                          (produtoSelecionado as any).precoEmbalagem != null
                            ? Number((produtoSelecionado as any).precoEmbalagem)
                            : null
                        const temEmbalagem = precoEmbalagem != null
                        const unidade = (produtoSelecionado as any).unidade || 'un'
                        const qtdPorEmbalagem = (produtoSelecionado as any).qtdPorEmbalagem
                        const tipoCompra: 'unitario' | 'embalagem' =
                          tipoCompraPorProdutoId[produtoSelecionado.id] || 'unitario'
                        const precoUsado = tipoCompra === 'embalagem' && temEmbalagem ? precoEmbalagem! : precoUnitario
                        const subtotal = precoUsado * Math.max(1, Math.floor(quantidade) || 1)
                        return (
                          <>
                            {temEmbalagem ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-gray-900">R$ {precoUnitario.toFixed(2)}</span>
                                <div className="flex items-center gap-1 text-xs bg-gray-200 rounded-full p-0.5">
                                  <label
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full cursor-pointer ${tipoCompra === 'unitario' ? 'bg-white shadow-sm' : ''}`}
                                  >
                                    <input
                                      type="radio"
                                      name="tipo-qtd"
                                      checked={tipoCompra === 'unitario'}
                                      onChange={() =>
                                        setTipoCompraPorProdutoId(m => ({
                                          ...m,
                                          [produtoSelecionado.id]: 'unitario'
                                        }))
                                      }
                                      className="w-3 h-3"
                                    />
                                    <span>Unitário</span>
                                  </label>
                                  <label
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full cursor-pointer ${tipoCompra === 'embalagem' ? 'bg-white shadow-sm' : ''}`}
                                  >
                                    <input
                                      type="radio"
                                      name="tipo-qtd"
                                      checked={tipoCompra === 'embalagem'}
                                      onChange={() =>
                                        setTipoCompraPorProdutoId(m => ({
                                          ...m,
                                          [produtoSelecionado.id]: 'embalagem'
                                        }))
                                      }
                                      className="w-3 h-3"
                                    />
                                    <span>Embalagem</span>
                                  </label>
                                </div>
                                <span className="text-sm font-semibold text-gray-900">R$ {precoEmbalagem!.toFixed(2)}</span>
                                {qtdPorEmbalagem ? (
                                  <span className="text-xs text-gray-500">(emb. c/ {qtdPorEmbalagem} {unidade})</span>
                                ) : null}
                              </div>
                            ) : (
                              <div className="text-sm font-semibold text-gray-900">R$ {precoUnitario.toFixed(2)} / {unidade}</div>
                            )}
                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                              <label className="text-xs text-gray-600" htmlFor="qtd-dist-qty">
                                Quantidade ({tipoCompra === 'embalagem' ? 'embalagens' : unidade}):
                              </label>
                              <input
                                id="qtd-dist-qty"
                                type="number"
                                min={1}
                                step={1}
                                value={quantidade}
                                onChange={e => setQuantidade(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                                className="w-24 border rounded-lg px-2 py-1"
                              />
                              <div className="text-xs text-gray-500 ml-auto">
                                Subtotal:{' '}
                                <span className="font-semibold text-gray-900">
                                  R$ {subtotal.toFixed(2).replace('.', ',')}
                                </span>
                              </div>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEstado('escolhendo_produto')
                          setProdutoSelecionado(null)
                        }}
                        className="px-3 py-1 rounded-full border text-xs bg-white"
                      >
                        Voltar
                      </button>
                      <button
                        onClick={adicionarItem}
                        className="px-3 py-1 rounded-lg ml-auto"
                        style={{ backgroundColor: theme.corPrimaria, color: '#fff' }}
                      >
                        Adicionar ao pedido
                      </button>
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>
          )}
          {estado === 'confirmando_itens' && (
            <div className="flex">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 text-gray-900 px-3 py-2">
                {avisoRepetirPedido && (
                  <div className="mb-2 p-2 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-800 whitespace-pre-wrap">
                    {avisoRepetirPedido}
                  </div>
                )}
                Itens selecionados:
                <ul className="mt-2 space-y-1">
                  {carrinho.map((i, idx) => {
                    const tp = i.adicionais?.tipoCompra === 'embalagem' ? 'embalagem' : 'unitario'
                    const precoUnit = Number(i.produto.preco || 0)
                    const precoEmb = (i.produto as any).precoEmbalagem != null ? Number((i.produto as any).precoEmbalagem) : null
                    const precoUsado = tp === 'embalagem' && precoEmb != null ? precoEmb : precoUnit
                    const subt = precoUsado * Math.max(1, Number(i.quantidade || 1))
                    return (
                      <li key={idx} className="text-sm">
                        <div className="font-medium">
                          {i.produto.nome} x {i.quantidade}
                          {tp === 'embalagem' && (
                            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-medium">
                              📦 Embalagem
                              {i.produto && (i.produto as any).qtdPorEmbalagem ? (
                                <span>(com {(i.produto as any).qtdPorEmbalagem} unidades)</span>
                              ) : null}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          Subtotal: R$ {subt.toFixed(2).replace('.', ',')}
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
                    )
                  })}
                </ul>
                {(() => {
                  let totalItens = 0
                  for (const i of carrinho) {
                    const tp = i.adicionais?.tipoCompra === 'embalagem' ? 'embalagem' : 'unitario'
                    const precoUnit = Number(i.produto.preco || 0)
                    const precoEmb = (i.produto as any).precoEmbalagem != null ? Number((i.produto as any).precoEmbalagem) : null
                    const precoUsado = tp === 'embalagem' && precoEmb != null ? precoEmb : precoUnit
                    totalItens += precoUsado * Math.max(1, Number(i.quantidade || 1))
                  }
                  const temMinimo = valorMinimoPedido != null && valorMinimoPedido > 0
                  const abaixoMinimo = temMinimo && totalItens < valorMinimoPedido
                  const falta = temMinimo && abaixoMinimo ? valorMinimoPedido - totalItens : 0
                  return (
                    <>
                      <div className="mt-3 pt-2 border-t border-gray-200 flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-xs text-gray-600">Total dos itens:</div>
                        <div className="font-semibold text-gray-900">
                          R$ {totalItens.toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                      {temMinimo && (
                        <div className={`mt-2 p-2 rounded-lg text-xs whitespace-pre-wrap ${abaixoMinimo ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
                          {abaixoMinimo ? (
                            <>
                              ⚠️ <b>Valor mínimo do pedido:</b> R$ {Number(valorMinimoPedido).toFixed(2).replace('.', ',')}.
                              {'\n'}Faltam <b>R$ {Number(falta).toFixed(2).replace('.', ',')}</b> para finalizar. Adicione mais itens.
                            </>
                          ) : (
                            <>✅ Acima do valor mínimo (R$ {Number(valorMinimoPedido).toFixed(2).replace('.', ',')}). Tudo pronto para finalizar!</>
                          )}
                        </div>
                      )}
                      <div className="mt-3 flex gap-2">
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
                          className={`px-3 py-1 rounded-full text-white ${abaixoMinimo ? 'opacity-50 cursor-not-allowed' : 'bg-primary'}`}
                          disabled={abaixoMinimo}
                          onClick={() => {
                            if (abaixoMinimo) return
                            setMensagens(m => [...m, { de: 'bot', texto: 'Deseja retirada no balcão ou entrega?' }])
                            setEstado('confirmando_endereco')
                          }}
                          title={abaixoMinimo ? 'Adicione mais itens para atingir o valor mínimo' : ''}
                        >
                          Continuar
                        </button>
                      </div>
                    </>
                  )
                })()}
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
                    {cupomCodigo.trim() && resumoTotal.cupomMotivo && (
                      <div
                        className={
                          'mt-2 rounded-lg px-3 py-1.5 text-xs border ' +
                          (resumoTotal.cupomAplicado === true
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-amber-50 border-amber-200 text-amber-800')
                        }
                      >
                        {resumoTotal.cupomAplicado === true ? '✅ ' : '⚠️ '}
                        Cupom <span className="font-mono font-medium">{cupomCodigo.trim().toUpperCase()}</span>:{' '}
                        {resumoTotal.cupomMotivo}
                      </div>
                    )}
                    {resumoTotal.cupomAplicado === true &&
                      resumoTotal.itensAplicados &&
                      resumoTotal.itensAplicados.length > 0 && (
                        <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-[11px] text-emerald-900">
                          <div className="font-semibold mb-1">
                            🎯 Itens que receberam o desconto deste cupom:
                          </div>
                          <ul className="space-y-1">
                            {resumoTotal.itensAplicados.map(ia => (
                              <li key={ia.produtoId} className="flex items-center justify-between gap-2">
                                <span className="truncate">
                                  <span className="font-medium">{ia.quantidade}x</span>{' '}
                                  {ia.produtoNome || ia.produtoId}
                                </span>
                                <span className="font-mono whitespace-nowrap">
                                  − R$ {Number(ia.descontoRecebido || 0).toFixed(2)}
                                </span>
                              </li>
                            ))}
                          </ul>
                          {typeof resumoTotal.baseCalculoElegivel === 'number' && (
                            <div className="mt-1.5 pt-1 border-t border-emerald-200/60 text-emerald-800">
                              Base de cálculo elegível:{' '}
                              <span className="font-mono font-semibold">
                                R$ {Number(resumoTotal.baseCalculoElegivel).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
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
                <div className="flex items-center gap-2">
                  <div className="font-medium">Pagamento Pix</div>
                  {pix.simulado && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold">
                      Ambiente de demonstração
                    </span>
                  )}
                </div>
                <div className="text-sm mt-1">TxID: {pix.txid}</div>
                <div className="mt-2">
                  {pix.qrcode && (typeof pix.qrcode !== 'string' || pix.qrcode.startsWith('data:')) ? (
                    <img src={pix.qrcode as any} alt="QR Code Pix" className="w-60 h-60 rounded-lg" />
                  ) : (
                    <div className="text-sm">QRCode: {pix.qrcode}</div>
                  )}
                </div>
                <div className="mt-2 text-sm">
                  <div className="font-medium mb-1">Copia e cola:</div>
                  <div className="select-all break-all bg-white/70 dark:bg-black/10 border border-black/10 rounded-lg p-2 text-[11px] font-mono leading-relaxed">
                    {pix.copiaECola}
                  </div>
                  <button
                    className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ backgroundColor: theme.corPrimaria, color: '#fff' }}
                    onClick={async () => {
                      try {
                        if (navigator?.clipboard?.writeText) {
                          await navigator.clipboard.writeText(pix.copiaECola)
                        }
                      } catch {}
                    }}
                  >
                    📋 Copiar código Pix
                  </button>
                </div>
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
        {mostrarArcade && (
        <div className="absolute inset-0 z-50 animate-in fade-in zoom-in duration-300 overflow-hidden">
          <ArcadeMenu onBack={() => setMostrarArcade(false)} theme={theme} />
        </div>
      )}
    </div>
  </main>
)
}
