type OrderItem = { quantidade: number; nome: string }

type OrderForWhatsApp = {
  codigo?: string
  cliente_nome?: string
  cliente_telefone?: string
  total?: number | string
  items?: OrderItem[]
}

export function formatOrderMessage(order: OrderForWhatsApp) {
  const codigo = String(order?.codigo || '').trim()
  const clienteNome = String(order?.cliente_nome || '').trim()
  const clienteTelefone = String(order?.cliente_telefone || '').trim()

  const itensList = Array.isArray(order?.items) ? order.items : []
  const itens =
    itensList.length > 0
      ? itensList.map(i => `• ${Number(i.quantidade || 0)}x ${String(i.nome || '').trim()}`).join('\n')
      : '• (sem itens)'

  const totalRaw = order?.total
  const totalFmt =
    typeof totalRaw === 'number'
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRaw)
      : String(totalRaw || '').trim()

  return [
    '🛒 *NOVO PEDIDO*',
    '',
    codigo ? `Pedido: ${codigo}` : 'Pedido:',
    '',
    clienteNome ? `Cliente: ${clienteNome}` : 'Cliente:',
    clienteTelefone ? `Telefone: ${clienteTelefone}` : 'Telefone:',
    '',
    'Itens:',
    itens,
    '',
    totalFmt ? `Total: ${totalFmt}` : 'Total:'
  ].join('\n')
}
