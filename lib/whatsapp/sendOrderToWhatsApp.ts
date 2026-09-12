import { formatOrderMessage } from './formatOrderMessage'

type EstabelecimentoContato = {
  whatsapp?: string | null
  telefone?: string | null
}

export function sendOrderToWhatsApp(order: any, estabelecimento: EstabelecimentoContato) {
  const message = encodeURIComponent(formatOrderMessage(order))
  const raw = String(estabelecimento?.whatsapp || estabelecimento?.telefone || '').trim()
  const phone = raw.replace(/\D/g, '')
  const url = phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`
  window.open(url, '_blank')
}
