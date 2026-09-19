'use client'

import { useEffect, useRef, useState } from 'react'
import {
  currency,
  resumoFinanceiro,
  formatarEndereco,
  pagamentoLabel,
  statusPagtoLabel,
  pedidoCodigoCurto,
  formaEntregaLabel,
  normalizarAdicionais
} from '@/lib/comanda'

type Estabelecimento = {
  id: string
  nome: string
  logoUrl?: string | null
  telefone?: string | null
  endereco?: any
  perfil?: string | null
}

type ClienteSimple = {
  nome: string
  telefone: string
}

type ItemSimple = {
  id: string
  quantidade: number
  subtotal: string | number
  adicionais?: any
  observacoes?: string | null
  produto: { id: string; nome: string } | null
}

type PagamentoSimple = {
  tipo?: string | null
  status?: string | null
  valor?: string | number | null
}

type CupomSimple = { codigo?: string | null } | null

type OpcoesAcai = {
  sabores?: { id: string; nome: string }[]
  sorvetes?: { id: string; nome: string }[]
  acompanhamentos?: { id: string; nome: string }[]
  coberturas?: { id: string; nome: string }[]
  complementos?: { id: string; nome: string }[]
} | null

type Props = {
  modo: 'comanda' | 'completo'
  estabelecimento: Estabelecimento
  cliente: ClienteSimple
  pedido: {
    id: string
    status: string
    total: string | number
    valorDesconto?: string | number | null
    formaEntrega: string
    enderecoEntrega?: any | null
    createdAt: string
    cupom?: CupomSimple
    pagamento?: PagamentoSimple | null
  }
  itens: ItemSimple[]
  opcoesAcai: OpcoesAcai
}

function getCssComanda58(isCompleto: boolean): string {
  const fontSize = isCompleto ? '10.5px' : '10px'
  return `
    @page { size: 58mm auto; margin: 0; }
    html, body { background: #fff; color: #000; }
    #comanda-root {
      width: 58mm;
      max-width: 58mm;
      margin: 0 auto;
      padding: 2mm 1.5mm 3mm;
      font-family: 'Courier New', 'Courier', monospace;
      font-size: ${fontSize};
      line-height: 1.35;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media screen {
      html, body { margin: 0; padding: 0; background: #e5e7eb !important; }
      body { overflow-x: hidden; }
      body aside,
      body > div:first-child > aside,
      body .no-print-ui,
      header, nav, footer,
      body [data-admin-ui],
      .no-print {
        display: none !important;
      }
      main:has(> div > #comanda-root),
      body div[class*="pl-64"],
      body div[class*="md:pl-64"] {
        padding-left: 0 !important;
        margin-left: 0 !important;
      }
      #comanda-root {
        box-shadow: 0 4px 18px rgba(0,0,0,0.12);
        margin: 16px auto 24px auto;
        display: block;
      }
    }
    @media print {
      html, body,
      body > div,
      body > div > div,
      body > div > div > div,
      body > div > div > div > main,
      main,
      main > div,
      main > div > div {
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        box-shadow: none !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      body aside,
      body .no-print-ui,
      header, nav, footer,
      body [data-admin-ui],
      .no-print,
      body > * > *:not(#__next):not(main):not(div),
      .\\@admin-layout-wrapper > *:not(#comanda-root-parent),
      main > div > div > *:not(#comanda-root-parent):not(:has(#comanda-root)) {
        display: none !important;
      }
      #comanda-root-parent,
      body:has(#comanda-root) > *,
      main:has(#comanda-root),
      main > div:has(#comanda-root),
      main > div > div:has(#comanda-root),
      main > div > div > div:has(#comanda-root),
      body div:has(> #comanda-root) {
        display: block !important;
        visibility: visible !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      #comanda-root {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: auto !important;
        bottom: auto !important;
        z-index: 2147483647 !important;
        box-shadow: none !important;
        margin: 0 !important;
        padding: 0 1mm 1mm !important;
        width: 58mm !important;
        max-width: 58mm !important;
        background: #fff !important;
        visibility: visible !important;
        display: block !important;
      }
      body {
        visibility: hidden !important;
      }
      #comanda-root,
      #comanda-root *,
      body:has(#comanda-root),
      html:has(#comanda-root) {
        visibility: visible !important;
      }
    }
    .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
    .text-bold { font-weight: 700; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .uppercase { text-transform: uppercase; }
    .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 2mm; }
    .col-left { flex: 1 1 auto; min-width: 0; word-break: break-word; }
    .col-right { flex: 0 0 auto; text-align: right; white-space: nowrap; }
    .sep { border-top: 1px dashed #000; margin: 1.2mm 0; }
    .item-line { margin-top: 1mm; break-inside: avoid; page-break-inside: avoid; }
    .sub { margin-left: 2mm; color: #111; }
  `
}

export default function Comanda58(props: Props) {
  const {
    modo,
    estabelecimento,
    cliente,
    pedido,
    itens,
    opcoesAcai
  } = props

  const isCompleto = modo === 'completo'
  const cssInline = getCssComanda58(isCompleto)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const placeholderRef = useRef<HTMLSpanElement | null>(null)
  const montadoRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (montadoRef.current) return
    montadoRef.current = true
    try {
      const existingStyle = document.getElementById('comanda58-inline-style')
      if (!existingStyle) {
        const s = document.createElement('style')
        s.id = 'comanda58-inline-style'
        s.setAttribute('data-comanda', 'true')
        s.textContent = getCssComanda58(isCompleto)
        document.head.appendChild(s)
      }
    } catch {}
    const t = setTimeout(() => {
      try {
        const root = document.getElementById('comanda-root')
        if (root && root.parentElement && root.parentElement.tagName !== 'BODY') {
          const placeholder = document.createElement('span')
          placeholder.id = 'comanda-placeholder-restore'
          placeholder.style.display = 'none'
          root.parentElement.insertBefore(placeholder, root)
          placeholderRef.current = placeholder
          document.body.appendChild(root)
        }
        setTimeout(() => {
          try { window.print() } catch {}
        }, 150)
      } catch (e) {
        try { window.print() } catch {}
      }
    }, 500)
    return () => {
      clearTimeout(t)
      try {
        const root = document.getElementById('comanda-root')
        const placeholder = placeholderRef.current || document.getElementById('comanda-placeholder-restore')
        if (root && placeholder && placeholder.parentElement) {
          placeholder.parentElement.insertBefore(root, placeholder)
          placeholder.remove()
          placeholderRef.current = null
        }
      } catch {}
    }
  }, [isCompleto])

  const { subtotal, desconto, taxaEntrega, total } = resumoFinanceiro({
    itens,
    total: pedido.total,
    valorDesconto: pedido.valorDesconto
  })

  const data = new Date(pedido.createdAt)
  const endLinhas = formatarEndereco(pedido.enderecoEntrega)
  const estabEnd = formatarEndereco(estabelecimento.endereco)

  const lineSeparator = '—'.repeat(32)
  const lineSeparatorThin = '-'.repeat(32)

  return (
    <div id="comanda-root-parent" style={{ display: 'block' }} suppressHydrationWarning>
      <div id="comanda-root" ref={rootRef} suppressHydrationWarning>
        <style
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: cssInline }}
        />

      {/* ===== CABEÇALHO ===== */}
      <div className="text-center break-inside-avoid">
        {estabelecimento.logoUrl ? (
          <div style={{ margin: '0 auto 1.2mm', maxWidth: '38mm' }}>
            <img
              src={estabelecimento.logoUrl}
              alt={estabelecimento.nome}
              style={{
                maxWidth: '38mm',
                maxHeight: isCompleto ? '22mm' : '18mm',
                objectFit: 'contain',
                display: 'block',
                margin: '0 auto'
              }}
            />
          </div>
        ) : null}
        <div className="text-bold uppercase" style={{ fontSize: isCompleto ? '13px' : '12px' }}>
          {estabelecimento.nome}
        </div>
        {estabEnd.map((l, i) => (
          <div key={i} style={{ fontSize: '9px' }}>{l}</div>
        ))}
        {estabelecimento.telefone ? (
          <div style={{ fontSize: '9px' }}>Tel.: {estabelecimento.telefone}</div>
        ) : null}
      </div>

      <div className="sep"></div>

      {/* ===== IDENTIFICAÇÃO PEDIDO ===== */}
      <div className="break-inside-avoid">
        <div className="row">
          <div className="col-left">
            <span className="text-bold">PEDIDO #{pedidoCodigoCurto(pedido.id)}</span>
          </div>
          <div className="col-right">
            {data.toLocaleDateString('pt-BR')}
          </div>
        </div>
        <div className="row">
          <div className="col-left">
            {formaEntregaLabel(pedido.formaEntrega)}
          </div>
          <div className="col-right">{data.toLocaleTimeString('pt-BR')}</div>
        </div>
        {pedido.cupom?.codigo ? (
          <div style={{ fontSize: '9px' }}>Cupom: {pedido.cupom.codigo}</div>
        ) : null}
      </div>

      <div className="sep"></div>

      {/* ===== CLIENTE ===== */}
      <div className="break-inside-avoid">
        <div className="text-bold uppercase">Cliente</div>
        <div>{cliente.nome}</div>
        <div style={{ fontSize: '9.5px' }}>
          <a
            href={`https://wa.me/${String(cliente.telefone || '').replace(/\D/g, '')}`}
            style={{ color: '#000', textDecoration: 'none' }}
            onClick={e => e.preventDefault()}
          >
            {cliente.telefone}
          </a>
        </div>
        {pedido.formaEntrega === 'entrega' && endLinhas.length > 0 ? (
          <div style={{ marginTop: '0.8mm' }}>
            {endLinhas.map((l, i) => (
              <div key={i} style={{ fontSize: '9.5px' }}>{l}</div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="sep"></div>

      {/* ===== ITENS ===== */}
      <div>
        <div className="row text-bold uppercase" style={{ fontSize: isCompleto ? '10.5px' : '10px' }}>
          <div className="col-left">Itens do Pedido</div>
        </div>
        <div style={{ fontSize: '9.5px', color: '#222' }}>{lineSeparatorThin}</div>

        {itens.length === 0 ? (
          <div style={{ marginTop: '1mm' }}>Nenhum item no pedido.</div>
        ) : (
          itens.map((i) => {
            const nomeProd = i.produto?.nome || 'Produto'
            const precoUni = Number(i.subtotal || 0) / (i.quantidade || 1)
            const norm = normalizarAdicionais(i.adicionais, opcoesAcai || undefined)
            return (
              <div key={i.id} className="item-line">
                <div className="row">
                  <div className="col-left">
                    <span className="text-bold">{i.quantidade}x</span>{' '}
                    <span>{nomeProd}</span>
                    {isCompleto ? (
                      <div style={{ fontSize: '8.5px', color: '#333' }}>
                        (uni: {currency.format(precoUni)})
                      </div>
                    ) : null}
                  </div>
                  <div className="col-right text-bold">
                    {currency.format(Number(i.subtotal || 0))}
                  </div>
                </div>

                {norm.variacoes.length > 0 ? (
                  <div className="sub" style={{ fontSize: '9px' }}>
                    • {norm.variacoes.join(', ')}
                  </div>
                ) : null}

                {norm.sabores.length > 0 ? (
                  <div className="sub" style={{ fontSize: '9px' }}>
                    Sabor: {norm.sabores.join(', ')}
                  </div>
                ) : null}

                {norm.sorvetes.length > 0 ? (
                  <div className="sub" style={{ fontSize: '9px' }}>
                    Sorvete: {norm.sorvetes.join(', ')}
                  </div>
                ) : null}

                {norm.acompanhamentos.length > 0 ? (
                  <div className="sub" style={{ fontSize: '9px' }}>
                    Acomp: {norm.acompanhamentos.join(', ')}
                  </div>
                ) : null}

                {norm.coberturas.length > 0 ? (
                  <div className="sub" style={{ fontSize: '9px' }}>
                    Cob: {norm.coberturas.join(', ')}
                  </div>
                ) : null}

                {norm.complementos.length > 0 ? (
                  <div className="sub" style={{ fontSize: '9px' }}>
                    Comp: {norm.complementos.join(', ')}
                  </div>
                ) : null}

                {norm.extras.length > 0 ? (
                  <div className="sub" style={{ fontSize: '9px' }}>
                    + {norm.extras.map(e => e.label).join(', ')}
                  </div>
                ) : null}

                {i.observacoes ? (
                  <div className="sub text-bold" style={{ fontSize: '9px' }}>
                    Obs: {i.observacoes}
                  </div>
                ) : null}
              </div>
            )
          })
        )}
      </div>

      <div className="sep"></div>

      {/* ===== FINANCEIRO ===== */}
      <div className="break-inside-avoid">
        <div className="row">
          <div className="col-left">Subtotal itens</div>
          <div className="col-right">{currency.format(subtotal)}</div>
        </div>
        {taxaEntrega > 0.001 ? (
          <div className="row">
            <div className="col-left">Taxa de entrega</div>
            <div className="col-right">{currency.format(taxaEntrega)}</div>
          </div>
        ) : null}
        {desconto > 0.001 ? (
          <div className="row">
            <div className="col-left">Desconto</div>
            <div className="col-right">- {currency.format(desconto)}</div>
          </div>
        ) : null}
        <div style={{ borderTop: '1px dashed #000', margin: '1mm 0' }}></div>
        <div className="row text-bold uppercase" style={{ fontSize: isCompleto ? '12px' : '11px' }}>
          <div className="col-left">Total</div>
          <div className="col-right">{currency.format(total)}</div>
        </div>
      </div>

      <div className="sep"></div>

      {/* ===== PAGAMENTO ===== */}
      <div className="break-inside-avoid">
        <div className="text-bold uppercase">Pagamento</div>
        <div className="row">
          <div className="col-left">Método</div>
          <div className="col-right">
            {pagamentoLabel(pedido.pagamento?.tipo)}
          </div>
        </div>
        <div className="row">
          <div className="col-left">Status</div>
          <div className="col-right">{statusPagtoLabel(pedido.pagamento?.status)}</div>
        </div>
        {isCompleto && pedido.pagamento?.valor ? (
          <div className="row">
            <div className="col-left">Valor pago</div>
            <div className="col-right">{currency.format(Number(pedido.pagamento.valor || 0))}</div>
          </div>
        ) : null}
      </div>

      <div className="sep"></div>

      {/* ===== RODAPÉ ===== */}
      <div className="text-center break-inside-avoid">
        <div style={{ fontSize: '8.5px', color: '#222' }}>
          * Não é documento fiscal *
        </div>
        <div style={{ fontSize: '9px', marginTop: '0.8mm' }}>
          Obrigado pela preferência! 🙏
        </div>
        <div style={{ fontSize: '8px', color: '#444', marginTop: '1mm' }}>
          Desenvolvido por W-Tech Solutions
        </div>
      </div>

      {/* Para impressora térmica cortar papel: branco no final */}
      <div style={{ height: isCompleto ? '6mm' : '4mm' }}></div>
    </div>
    </div>
  )
}
