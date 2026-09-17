import { prisma } from '@/lib/db'
import { getCurrentAdminWithEstabelecimento } from '@/lib/authAdmin'
import { notFound } from 'next/navigation'
import Comanda58 from './Comanda58'

export const dynamic = 'force-dynamic'

export default async function ImprimirPedidoPage(props: {
  params: { id: string }
  searchParams: { m?: string | string[] | undefined }
}) {
  const pedidoId = props.params?.id
  const ctx = await getCurrentAdminWithEstabelecimento()
  if (!ctx?.admin) return notFound()

  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: {
      estabelecimento: true,
      cliente: true,
      pagamento: true,
      cupom: true,
      itens: { include: { produto: { select: { id: true, nome: true, fotoUrl: true } } } }
    }
  })

  if (!pedido) return notFound()

  const isSuperAdmin = ctx.admin.role === 'SUPER_ADMIN'
  const adminEstId = ctx.estabelecimento?.id || null
  const pedidoEstId = pedido.estabelecimentoId || null

  if (!isSuperAdmin && adminEstId && pedidoEstId && adminEstId !== pedidoEstId) {
    return notFound()
  }
  if (!isSuperAdmin && pedidoEstId && !adminEstId) {
    return notFound()
  }
  if (!isSuperAdmin && !pedidoEstId && adminEstId) {
    return notFound()
  }

  let opcoesAcai: {
    sabores: { id: string; nome: string }[]
    sorvetes: { id: string; nome: string }[]
    acompanhamentos: { id: string; nome: string }[]
    coberturas: { id: string; nome: string }[]
    complementos: { id: string; nome: string }[]
  } | null = null

  const perfil = pedido.estabelecimento?.perfil || ctx.estabelecimento?.perfil || ''
  const estIdOpcoes = pedido.estabelecimentoId || ctx.estabelecimento?.id
  if (perfil === 'ACAITERIA' && estIdOpcoes) {
    const [sabInit, sorInit, acoInit, cobInit, compInit] = await Promise.all([
      prisma.acaiSabor.findMany({ where: { estabelecimentoId: estIdOpcoes }, orderBy: { nome: 'asc' }, select: { id: true, nome: true } }),
      prisma.acaiSorvete.findMany({ where: { estabelecimentoId: estIdOpcoes }, orderBy: { nome: 'asc' }, select: { id: true, nome: true } }),
      prisma.acaiAcompanhamento.findMany({ where: { estabelecimentoId: estIdOpcoes }, orderBy: { nome: 'asc' }, select: { id: true, nome: true } }),
      prisma.acaiCobertura.findMany({ where: { estabelecimentoId: estIdOpcoes }, orderBy: { nome: 'asc' }, select: { id: true, nome: true } }),
      prisma.acaiComplemento.findMany({ where: { estabelecimentoId: estIdOpcoes }, orderBy: { nome: 'asc' }, select: { id: true, nome: true } })
    ])
    const [sab, sor, aco, cob, comp] = await Promise.all([
      sabInit.length > 0
        ? Promise.resolve(sabInit)
        : prisma.acaiSabor.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' }, select: { id: true, nome: true } }),
      sorInit.length > 0
        ? Promise.resolve(sorInit)
        : prisma.acaiSorvete.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' }, select: { id: true, nome: true } }),
      acoInit.length > 0
        ? Promise.resolve(acoInit)
        : prisma.acaiAcompanhamento.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' }, select: { id: true, nome: true } }),
      cobInit.length > 0
        ? Promise.resolve(cobInit)
        : prisma.acaiCobertura.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' }, select: { id: true, nome: true } }),
      compInit.length > 0
        ? Promise.resolve(compInit)
        : prisma.acaiComplemento.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' }, select: { id: true, nome: true } })
    ])
    opcoesAcai = { sabores: sab, sorvetes: sor, acompanhamentos: aco, coberturas: cob, complementos: comp }
  }

  const modoRaw = Array.isArray(props.searchParams?.m) ? props.searchParams.m[0] : (props.searchParams?.m || 'comanda')
  const modo = modoRaw === 'completo' ? 'completo' : 'comanda'

  return (
    <Comanda58
      modo={modo}
      estabelecimento={{
        id: pedido.estabelecimento?.id || estIdOpcoes || '',
        nome: pedido.estabelecimento?.nome || ctx.estabelecimento?.nome || 'Estabelecimento',
        logoUrl: pedido.estabelecimento?.logoUrl || ctx.estabelecimento?.logoUrl || null,
        telefone: pedido.estabelecimento?.telefone || ctx.estabelecimento?.telefone || null,
        endereco: pedido.estabelecimento?.endereco || ctx.estabelecimento?.endereco || null,
        perfil: pedido.estabelecimento?.perfil || ctx.estabelecimento?.perfil || null
      }}
      cliente={{
        nome: pedido.cliente?.nome || 'Cliente',
        telefone: pedido.cliente?.telefone || ''
      }}
      pedido={{
        id: pedido.id,
        status: pedido.status,
        total: pedido.total,
        valorDesconto: pedido.valorDesconto,
        formaEntrega: pedido.formaEntrega,
        enderecoEntrega: pedido.enderecoEntrega,
        createdAt: pedido.createdAt.toISOString(),
        cupom: pedido.cupom ? { codigo: pedido.cupom.codigo } : null,
        pagamento: pedido.pagamento
          ? {
              tipo: pedido.pagamento.tipo,
              status: pedido.pagamento.status,
              valor: pedido.pagamento.valor
            }
          : null
      }}
      itens={pedido.itens.map(i => ({
        id: i.id,
        quantidade: i.quantidade,
        subtotal: i.subtotal,
        adicionais: i.adicionais,
        observacoes: i.observacoes,
        produto: i.produto
          ? { id: i.produto.id, nome: i.produto.nome }
          : null
      }))}
      opcoesAcai={opcoesAcai}
    />
  )
}
