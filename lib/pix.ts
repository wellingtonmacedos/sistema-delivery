import { MercadoPagoConfig, Payment } from 'mercadopago'

export type PixConfig = {
  accessTokenEnv?: string
  apiUrlEnv?: string
  apiKeyEnv?: string
  accessTokenDb?: string
  chavePix?: string
  beneficiario?: string
  cidade?: string
}

type PixCobranca = {
  txid: string
  qrcode: string
  copiaECola: string
  simulado?: boolean
}

function gerarTxIdLocal(pedidoId: string): string {
  const rand = Math.random().toString(36).slice(2, 14)
  const ts = Date.now().toString(36)
  return (pedidoId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) + ts + rand).slice(0, 32).toUpperCase()
}

function crc16CcittFalse(str: string): string {
  const data = new TextEncoder().encode(str)
  let crc = 0xffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).padStart(4, '0').toUpperCase()
}

function gerarPayloadPixLocal(
  valor: number,
  txid: string,
  chavePix: string,
  beneficiario: string,
  cidade: string
): string {
  const valorStr = Number(valor).toFixed(2)
  function tl(id: string, val: string) {
    return id + val.length.toString().padStart(2, '0') + val
  }
  const payloadFmt = tl('00', '01')
  const pointInit = tl('01', '12')
  const merchantAcct = tl('00', 'br.gov.bcb.pix') + tl('01', (chavePix || 'pix-demo@exemplo.com.br').slice(0, 99))
  const merchantCat = tl('52', '0000')
  const currency = tl('53', '986')
  const amount = tl('54', valorStr)
  const country = tl('58', 'BR')
  const name = tl('59', (beneficiario || 'LOJA DEMONSTRACAO LTDA').slice(0, 25))
  const cityTl = tl('60', (cidade || 'SAO PAULO').slice(0, 15))
  const addData = tl('05', txid.slice(0, 25))
  const txIdField = tl('62', addData)
  const semCrc =
    payloadFmt + pointInit + tl('26', merchantAcct) + merchantCat + currency + amount + country + name + cityTl + txIdField + '6304'
  return semCrc + crc16CcittFalse(semCrc)
}

function gerarQrCodeDataUrl(texto: string): string {
  const size = 256
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="#ffffff"/><text x="50%" y="44%" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#111" font-weight="700">PIX DEMO</text><text x="50%" y="54%" text-anchor="middle" font-family="monospace" font-size="10" fill="#333">${texto.slice(0, 32)}...</text><text x="50%" y="66%" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#555">(ambiente de teste)</text></svg>`
    )
  )
}

function gerarCobrancaPixSimulada(
  pedidoId: string,
  valor: number,
  chavePix?: string,
  beneficiario?: string,
  cidade?: string
): PixCobranca {
  const txid = gerarTxIdLocal(pedidoId)
  const copiaECola = gerarPayloadPixLocal(valor, txid, chavePix || '', beneficiario || '', cidade || '')
  const qrcode = gerarQrCodeDataUrl(copiaECola)
  return { txid, qrcode, copiaECola, simulado: true }
}

async function gerarViaApiExterna(
  pedidoId: string,
  valor: number,
  url: string,
  key: string
): Promise<PixCobranca | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    const res = await fetch(url.replace(/\/$/, '') + '/cobranca', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({ pedidoId, valor }),
      signal: controller.signal
    })
    clearTimeout(timeout)
    if (!res.ok) {
      let bodyText = ''
      try { bodyText = await res.text() } catch {}
      console.warn('[pix externa] status', res.status, res.statusText, bodyText?.slice(0, 200))
      return null
    }
    const data = await res.json()
    if (!data || typeof data !== 'object') return null
    const txid = String(data.txid || data.tx_id || '').trim() || gerarTxIdLocal(pedidoId)
    const qrcode = String(data.qrcode || data.qrCode || data.emv || '').trim() || gerarQrCodeDataUrl(txid)
    const copiaECola = String(data.copiaECola || data.copyPaste || data.emv || qrcode || '').trim()
    return { txid, qrcode, copiaECola }
  } catch (e: any) {
    const isTimeout = e?.name === 'AbortError'
    const isConexao = !e || /ECONNREFUSED|fetch failed|ENOTFOUND|getaddrinfo|timeout|timed out|abort/i.test(String(e?.message || e))
    if (isTimeout || isConexao) {
      console.warn('[pix externa] indisponível:', e?.message || e)
      return null
    }
    throw e
  }
}

async function gerarViaMercadoPago(
  pedidoId: string,
  valor: number,
  accessToken: string,
  chavePix?: string,
  beneficiario?: string,
  cidade?: string
): Promise<PixCobranca | null> {
  if (!accessToken || !accessToken.trim()) return null
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    const client = new MercadoPagoConfig({ accessToken: accessToken.trim(), options: { timeout: 15000 } })
    const payment = new Payment(client)
    const txid = gerarTxIdLocal(pedidoId)
    const expiracao = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const result: any = await payment.create({
      body: {
        transaction_amount: Number(valor),
        payment_method_id: 'pix',
        date_of_expiration: expiracao.toISOString(),
        description: `Pedido ${pedidoId}`,
        external_reference: pedidoId,
        metadata: {
          pedido_id: pedidoId,
          txid,
          pix_chave: chavePix || '',
          beneficiario: beneficiario || '',
          cidade: cidade || ''
        },
        payer: {
          email: 'cliente@cliente.com.br',
          first_name: 'Cliente',
          last_name: 'Delivery',
          identification: { type: 'CPF', number: '00000000000' }
        }
      },
      requestOptions: {
        idempotencyKey: `PED-${pedidoId}-${Date.now()}`
      }
    })
    clearTimeout(timeout)
    const tx = (result as any)?.point_of_interaction?.transaction_data
    if (!tx) {
      console.warn('[pix mp] sem transaction_data:', JSON.stringify(result).slice(0, 400))
      return null
    }
    const mpId = String((result as any)?.id || txid)
    const copiaECola = String(tx.qr_code || tx.emv || '').trim()
    const qrcodeRaw = String(tx.qr_code_base64 || tx.qr_code || '').trim()
    const qrcode = qrcodeRaw.startsWith('data:')
      ? qrcodeRaw
      : qrcodeRaw.length > 500
        ? 'data:image/png;base64,' + qrcodeRaw
        : gerarQrCodeDataUrl(qrcodeRaw || copiaECola)
    return {
      txid: mpId,
      qrcode,
      copiaECola: copiaECola || gerarPayloadPixLocal(valor, mpId, chavePix || '', beneficiario || '', cidade || '')
    }
  } catch (e: any) {
    const msg = String(e?.message || e || 'erro mp')
    const isConexao = /timeout|timed out|abort|ENOTFOUND|ECONNREFUSED|fetch failed|getaddrinfo/i.test(msg)
    if (isConexao) {
      console.warn('[pix mp] indisponível:', msg?.slice(0, 200))
      return null
    }
    console.error('[pix mp] erro:', msg, e?.cause ? String(e.cause).slice(0, 300) : '')
    return null
  }
}

export async function gerarCobrancaPix(
  pedidoId: string,
  valor: number,
  cfg: PixConfig = {}
): Promise<PixCobranca> {
  const accessToken = (cfg.accessTokenDb || cfg.accessTokenEnv || '').trim()
  const chavePix = (cfg.chavePix || '').trim()
  const beneficiario = (cfg.beneficiario || '').trim()
  const cidade = (cfg.cidade || '').trim()

  if (accessToken.length > 0) {
    const r = await gerarViaMercadoPago(pedidoId, valor, accessToken, chavePix, beneficiario, cidade)
    if (r) return r
  }

  const apiUrl = (cfg.apiUrlEnv || '').trim()
  const apiKey = (cfg.apiKeyEnv || '').trim()
  if (apiUrl && apiKey) {
    const r = await gerarViaApiExterna(pedidoId, valor, apiUrl, apiKey)
    if (r) return r
  }

  return gerarCobrancaPixSimulada(pedidoId, valor, chavePix, beneficiario, cidade)
}
