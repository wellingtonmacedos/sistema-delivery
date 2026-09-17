'use client'

import { useEffect } from 'react'
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

export default function Comanda58(props: Props) {
  const {
    modo,
    estabelecimento,
    cliente,
    pedido,
    itens,
    opcoesAcai
  } = props

  useEffect(() => {
    if (typeof window === 'undefined') return
    const t = setTimeout(() => {
      try {
        window.print()
      } catch {}
    }, 500)
    return () => clearTimeout(t)
  }, [])

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

  const isCompleto = modo === 'completo'

  return (
    <div id="comanda-root">
      <style>{`
        @page { size: 58mm auto; margin: 0; }
        html, body { background: #fff; color: #000; }
        #comanda-root {
          width: 58mm;
          max-width: 58mm;
          margin: 0 auto;
          padding: 2mm 1.5mm 3mm;
          font-family: 'Courier New', 'Courier', monospace;
          font-size: ${isCompleto ? '10.5px' : '10px'};
          line-height: 1.35;
          color: #000;
          background: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @media screen {
          html, body { margin: 0; padding: 0; background: #e5e7eb !important; }
          body { overflow-x: hidden; }
          /* Esconder sidebar/header do admin/layout para visualização limpa */
          body aside,
          body > div:first-child > aside,
          body .no-print-ui,
          header, nav, footer,
          body [data-admin-ui],
          body > * > *:not(#__next):not(main):not(div),
          .\\@admin-layout-wrapper > *:not(#comanda-root-parent) {
            display: none !important;
          }
          /* Forçar não ter padding lateral do admin layout */
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
          body > *:not(#__next):not(#comanda-root), 
          aside, nav, header, footer, .no-print { display: none !important; }
          #comanda-root {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 1mm 1mm !important;
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
      `}</style>

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
  )
}
