import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { TipoCupom } from '@prisma/client'

const CupomUpdateSchema = z.object({
  descricao: z.string().max(240).optional(),
  tipo: z.nativeEnum(TipoCupom).optional(),
  valor: z.number().nonnegative().optional(),
  valorMinimoPedido: z.number().nonnegative().optional().nullable(),
  limiteTotalUso: z.number().int().positive().optional().nullable(),
  limitePorCliente: z.number().int().positive().optional().nullable(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  ativo: z.boolean().optional()
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const parsed = CupomUpdateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const data: any = {}
  const d = parsed.data
  if (typeof d.descricao === 'string') data.descricao = d.descricao
  if (typeof d.tipo === 'string') data.tipo = d.tipo
  if (typeof d.valor === 'number') data.valor = d.valor
  if (d.valorMinimoPedido !== undefined) data.valorMinimoPedido = d.valorMinimoPedido
  if (d.limiteTotalUso !== undefined) data.limiteTotalUso = d.limiteTotalUso
  if (d.limitePorCliente !== undefined) data.limitePorCliente = d.limitePorCliente
  if (typeof d.dataInicio === 'string') data.dataInicio = new Date(d.dataInicio)
  if (typeof d.dataFim === 'string') data.dataFim = new Date(d.dataFim)
  if (typeof d.ativo === 'boolean') data.ativo = d.ativo
  const row = await prisma.cupom.update({ where: { id: params.id }, data })
  return Response.json({ cupom: row })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.cupom.delete({ where: { id: params.id } })
  return Response.json({ ok: true })
}

