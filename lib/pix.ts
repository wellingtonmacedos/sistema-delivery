type PixCobranca = {
  txid: string
  qrcode: string
  copiaECola: string
}

export async function gerarCobrancaPix(pedidoId: string, valor: number): Promise<PixCobranca> {
  const url = process.env.PIX_API_URL || ''
  const key = process.env.PIX_API_KEY || ''
  const payload = { pedidoId, valor }
  const res = await fetch(url + '/cobranca', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    throw new Error('Falha ao gerar cobrança Pix')
  }
  const data = await res.json()
  return {
    txid: data.txid,
    qrcode: data.qrcode,
    copiaECola: data.copiaECola
  }
}
