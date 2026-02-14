'use client'
import { useEffect, useRef, useState } from 'react'

type Produto = { id: string; nome: string; descricao?: string; preco: number; categoria: string; adicionais?: any }
type ItemCarrinho = { produto: Produto; quantidade: number; adicionais?: any }
type Estado =
  | 'aguardando_telefone'
  | 'aguardando_nome'
  | 'escolhendo_categoria'
  | 'escolhendo_produto'
  | 'escolhendo_quantidade'
  | 'escolhendo_adicionais'
  | 'confirmando_itens'
  | 'confirmando_endereco'
  | 'cadastrando_endereco'
  | 'escolhendo_pagamento'
  | 'finalizado'

export default function ChatPage() {
  const [estado, setEstado] = useState<Estado>('aguardando_telefone')
  const [mensagens, setMensagens] = useState<{ de: 'bot' | 'user'; texto: string }[]>([
    { de: 'bot', texto: 'Olá 👋 Seja bem-vindo!\nPara começarmos, informe seu telefone com DDD.' }
  ])
  const [telefone, setTelefone] = useState('')
  const [nome, setNome] = useState('')
  const [clienteOk, setClienteOk] = useState(false)
  const [categorias, setCategorias] = useState<string[]>([])
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [quantidade, setQuantidade] = useState<number>(1)
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [formaEntrega, setFormaEntrega] = useState<'entrega' | 'retirada'>('retirada')
  const [endereco, setEndereco] = useState<any | null>(null)
  const [resumoTotal, setResumoTotal] = useState<{ total: number; taxaEntrega: number } | null>(null)
  const [pedidoId, setPedidoId] = useState<string | null>(null)
  const [pix, setPix] = useState<{ txid: string; qrcode: string; copiaECola: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [perfil, setPerfil] = useState<'LANCHONETE' | 'ACAITERIA' | 'PIZZARIA'>('LANCHONETE')
  const [acaiOpcoes, setAcaiOpcoes] = useState<any | null>(null)
  const [pizzaOpcoes, setPizzaOpcoes] = useState<any | null>(null)
  const [adicionaisSelecionados, setAdicionaisSelecionados] = useState<any>({})
  const [theme, setTheme] = useState<{ corPrimaria: string; corBot: string; corTexto: string; corFundoChat: string; logoUrl?: string | null }>({
    corPrimaria: '#22c55e',
    corBot: '#f3f4f6',
    corTexto: '#111827',
    corFundoChat: '#f9fafb',
    logoUrl: null
  })

  async function iniciarCliente() {
    if (!telefone) return
    setLoading(true)
    try {
      if (!/^\d{10,13}$/.test(telefone)) {
        setMensagens(m => [...m, { de: 'bot', texto: 'Telefone inválido. Informe somente números com DDD.' }])
        setLoading(false)
        return
      }
      const r = await fetch('/api/clientes?telefone=' + encodeURIComponent(telefone))
      if (!r.ok) {
        setMensagens(m => [
          ...m,
          { de: 'bot', texto: 'Não encontrei seu cadastro.\nQual seu nome?' }
        ])
        setEstado('aguardando_nome')
        return
      }
      const ct = r.headers.get('content-type') || ''
      if (!ct.includes('application/json')) {
        setMensagens(m => [
          ...m,
          { de: 'bot', texto: 'Não encontrei seu cadastro.\nQual seu nome?' }
        ])
        setEstado('aguardando_nome')
        return
      }
      const d = await r.json()
      if (d?.cliente) {
        setClienteOk(true)
        setMensagens(m => [...m, { de: 'bot', texto: `Olá, ${d.cliente.nome}! 😊\nVamos fazer seu pedido.` }])
        await carregarPerfil()
        await carregarCategorias()
        setEstado('escolhendo_categoria')
      } else {
        setMensagens(m => [
          ...m,
          { de: 'bot', texto: 'Não encontrei seu cadastro.\nQual seu nome?' }
        ])
        setEstado('aguardando_nome')
      }
    } finally {
      setLoading(false)
    }
  }

  async function salvarNovoCliente() {
    if (!nome.trim()) return
    setLoading(true)
    await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, telefone })
    })
    setClienteOk(true)
    setMensagens(m => [...m, { de: 'bot', texto: `Cadastro realizado.\nVamos fazer seu pedido, ${nome}.` }])
    await carregarPerfil()
    await carregarCategorias()
    setEstado('escolhendo_categoria')
    setLoading(false)
  }

  async function carregarPerfil() {
    try {
      const r = await fetch('/api/estabelecimento')
      if (r.ok) {
        const d = await r.json()
        const pf = d?.estabelecimento?.perfil || 'LANCHONETE'
        setPerfil(pf)
        const t = d?.estabelecimento
        setTheme({
          corPrimaria: t?.corPrimaria || '#22c55e',
          corBot: t?.corBot || '#f3f4f6',
          corTexto: t?.corTexto || '#111827',
          corFundoChat: t?.corFundoChat || '#f9fafb',
          logoUrl: t?.logoUrl || null
        })
        if (pf === 'ACAITERIA') {
          const ra = await fetch('/api/acaiteria/opcoes')
          if (ra.ok) {
            const oa = await ra.json()
            setAcaiOpcoes(oa)
          }
        } else if (pf === 'PIZZARIA') {
          const rp = await fetch('/api/pizzaria/opcoes')
          if (rp.ok) {
            const op = await rp.json()
            setPizzaOpcoes(op)
          }
        }
      }
    } catch {}
  }

  async function carregarCategorias() {
    try {
      const res = await fetch('/api/produtos/categorias')
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
      const res = await fetch('/api/produtos?categoria=' + encodeURIComponent(cat))
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteTelefone: telefone, itens, formaEntrega })
      })
      if (r.ok) {
        const ct = r.headers.get('content-type') || ''
        if (ct.includes('application/json')) {
          const d = await r.json()
          setResumoTotal(
            typeof d?.total === 'number'
              ? { total: d.total, taxaEntrega: Number(d.taxaEntrega || 0) }
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
    const r = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clienteTelefone: telefone,
        itens,
        formaEntrega,
        enderecoEntrega: formaEntrega === 'entrega' ? endereco : null,
        metodoPagamento: metodo,
        trocoPara
      })
    })
    if (!r.ok) {
      setLoading(false)
      return
    }
    const ct = r.headers.get('content-type') || ''
    if (!ct.includes('application/json')) {
      setLoading(false)
      return
    }
    const d = await r.json()
    setPedidoId(d.pedido.id)
    if (metodo === 'pix') {
      const rp = await fetch('/api/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidoId: d.pedido.id })
      })
      if (rp.ok) {
        const pct = rp.headers.get('content-type') || ''
        if (pct.includes('application/json')) {
          const pixData = await rp.json()
          setPix(pixData)
        }
      }
    }
    setEstado('finalizado')
    setLoading(false)
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [mensagens, estado, produtos, carrinho, pix])

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: theme.corFundoChat }}>
      <div className="w-full max-w-[480px] h-[80vh] rounded-2xl shadow-xl bg-white flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b">
          <div className="w-full flex items-center justify-center">
            {theme.logoUrl ? (
              <img src={theme.logoUrl} alt="Logo" style={{ maxHeight: 64, objectFit: 'contain' }} />
            ) : (
              <div className="text-lg font-semibold">Chatbot Delivery</div>
            )}
          </div>
          <div className="text-sm" style={{ color: '#777' }}>Atendimento automático com Pix</div>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 p-4">
          {mensagens.map((m, i) => (
            <div key={i} className={`flex ${m.de === 'bot' ? '' : 'justify-end'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 ${m.de === 'bot' ? 'rounded-tl-sm' : 'rounded-tr-sm'}`}
                style={{
                  backgroundColor: m.de === 'bot' ? theme.corBot : theme.corPrimaria,
                  color: m.de === 'bot' ? theme.corTexto : '#ffffff'
                }}
              >
                {m.texto}
              </div>
            </div>
          ))}
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
          {estado === 'escolhendo_produto' && (
            <div className="flex">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 text-gray-900 px-3 py-2">
                Selecione um produto:
                <ul className="mt-2 space-y-2">
                  {produtos.map(p => (
                    <li key={p.id} className="flex items-center justify-between gap-2">
                      <span>
                        {p.nome} — R$ {Number(p.preco).toFixed(2)}
                      </span>
                      <button
                        onClick={() => {
                          setProdutoSelecionado(p)
                          setEstado('escolhendo_quantidade')
                        }}
                      className="px-3 py-1 rounded-full hover:opacity-90 transition"
                      style={{ backgroundColor: theme.corPrimaria, color: '#fff' }}
                      >
                        Escolher
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {estado === 'escolhendo_quantidade' && produtoSelecionado && (
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
                    <li key={idx}>
                      {i.produto.nome} x {i.quantidade}
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
                {formaEntrega === 'entrega' && (
                  <div className="mt-3 space-y-2">
                    <input className="w-full border rounded-lg px-2 py-1" placeholder="Rua" onChange={e => setEndereco((prev: any) => ({ ...(prev || {}), rua: e.target.value }))} />
                    <input className="w-full border rounded-lg px-2 py-1" placeholder="Número" onChange={e => setEndereco((prev: any) => ({ ...(prev || {}), numero: e.target.value }))} />
                    <input className="w-full border rounded-lg px-2 py-1" placeholder="Bairro" onChange={e => setEndereco((prev: any) => ({ ...(prev || {}), bairro: e.target.value }))} />
                    <input
                      className="w-full border rounded-lg px-2 py-1"
                      placeholder="Complemento (opcional)"
                      onChange={e => setEndereco((prev: any) => ({ ...(prev || {}), complemento: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') mostrarResumoTotal()
                      }}
                    />
                    <button className="px-3 py-1 rounded-full" onClick={mostrarResumoTotal} style={{ backgroundColor: theme.corPrimaria, color: '#fff' }}>
                      Continuar
                    </button>
                  </div>
                )}
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
                    <div className="mt-1 font-medium">Total: R$ {Number(resumoTotal.total).toFixed(2)}</div>
                  </>
                ) : (
                  <div className="text-sm">Não foi possível calcular o total agora.</div>
                )}
                <div className="mt-3">Como deseja pagar?</div>
                <div className="mt-2 flex gap-2 flex-wrap">
                  <button className="px-3 py-1 rounded-full border" onClick={() => finalizarPedido('dinheiro')}>
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
            <div className="flex gap-2">
              <input
                placeholder="Seu nome"
                value={nome}
                onChange={e => setNome(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && nome.trim()) salvarNovoCliente()
                }}
                className="flex-1 border rounded-xl px-3 py-2"
              />
              <button
                onClick={salvarNovoCliente}
                disabled={!nome.trim()}
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
                    <div className="text-sm">Selecione complementos (até {acaiOpcoes.config.maxComplementos}):</div>
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {acaiOpcoes.complementos.map((c: any) => {
                        const selected = Array.isArray(adicionaisSelecionados.complementos) && adicionaisSelecionados.complementos.includes(c.id)
                        return (
                          <button
                            key={c.id}
                            onClick={() => {
                              setAdicionaisSelecionados((prev: any) => {
                                const cur = Array.isArray(prev.complementos) ? prev.complementos.slice() : []
                                if (selected) {
                                  return { ...prev, complementos: cur.filter((x: string) => x !== c.id) }
                                } else {
                                  if (cur.length >= acaiOpcoes.config.maxComplementos) return prev
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
                <div className="mt-3 flex justify-end">
                  <button className="px-3 py-1 rounded-full" onClick={adicionarItem} style={{ backgroundColor: theme.corPrimaria, color: '#fff' }}>
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
