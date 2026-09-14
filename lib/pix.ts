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

function gerarPayloadPixFake(valor: number, txid: string, pedidoId: string): string {
  const valorStr = Number(valor).toFixed(2)
  const beneficiario = 'LOJA DEMONSTRACAO LTDA'
  const cidade = 'SAO PAULO'
  const chave = 'pix-demo@exemplo.com.br'
  function tl(id: string, val: string) {
    return id + val.length.toString().padStart(2, '0') + val
  }
  const payloadFmt = tl('00', '01')
  const pointInit = tl('01', '12')
  const merchantAcct =
    tl('00', 'br.gov.bcb.pix') +
    tl('01', chave)
  const merchantCat = tl('52', '0000')
  const currency = tl('53', '986')
  const amount = tl('54', valorStr)
  const country = tl('58', 'BR')
  const name = tl('59', beneficiario.slice(0, 25))
  const cityTl = tl('60', cidade.slice(0, 15))
  const addData = tl('05', txid.slice(0, 25))
  const txIdField = tl('62', addData)
  const semCrc =
    payloadFmt +
    pointInit +
    tl('26', merchantAcct) +
    merchantCat +
    currency +
    amount +
    country +
    name +
    cityTl +
    txIdField +
    '6304'
  return semCrc + crc16CcittFalse(semCrc)
}

function gerarQrCodeDataUrl(texto: string): string {
  const size = 256
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="#ffffff"/><text x="50%" y="44%" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#111" font-weight="700">PIX DEMO</text><text x="50%" y="54%" text-anchor="middle" font-family="monospace" font-size="10" fill="#333">${texto.slice(0, 32)}...</text><text x="50%" y="66%" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#555">(ambiente de teste)</text></svg>`
  )
}

function gerarCobrancaPixSimulada(pedidoId: string, valor: number): PixCobranca {
  const txid = gerarTxIdLocal(pedidoId)
  const copiaECola = gerarPayloadPixFake(valor, txid, pedidoId)
  const qrcode = gerarQrCodeDataUrl(copiaECola)
  return { txid, qrcode, copiaECola, simulado: true }
}

export async function gerarCobrancaPix(pedidoId: string, valor: number): Promise<PixCobranca> {
  const url = (process.env.PIX_API_URL || '').trim()
  const key = (process.env.PIX_API_KEY || '').trim()
  const temApi = url.length > 0 && key.length > 0
  if (!temApi) {
    return gerarCobrancaPixSimulada(pedidoId, valor)
  }
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
      throw new Error(`API Pix retornou status ${res.status} ${res.statusText || ''}. ${bodyText ? 'Resposta: ' + bodyText.slice(0, 400) : ''}`)
    }
    const data = await res.json()
    if (!data || typeof data !== 'object') {
      throw new Error('Resposta API Pix em formato inválido')
    }
    const txid = String(data.txid || data.tx_id || '').trim() || gerarTxIdLocal(pedidoId)
    const qrcode = String(data.qrcode || data.qrCode || data.emv || '').trim() || gerarQrCodeDataUrl(txid)
    const copiaECola = String(data.copiaECola || data.copyPaste || data.emv || qrcode || '').trim() || gerarPayloadPixFake(valor, txid, pedidoId)
    return { txid, qrcode, copiaECola }
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      return gerarCobrancaPixSimulada(pedidoId, valor)
    }
    const isErroConexao =
      !e ||
      /ECONNREFUSED|fetch failed|ENOTFOUND|getaddrinfo|timeout|timed out|abort/i.test(String(e?.message || e))
    if (isErroConexao) {
      return gerarCobrancaPixSimulada(pedidoId, valor)
    }
    throw e
  }
}
