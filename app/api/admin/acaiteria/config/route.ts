import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveTenant } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const est = await resolveTenant(req)
  if (!est) return Response.json({ error: 'estabelecimento não encontrado' }, { status: 404 })
  const cfg = await prisma.configuracaoAcaiteria.findUnique({ where: { estabelecimentoId: est.id } })
  return Response.json({
    config: {
      minSabores: cfg?.minSabores ?? 0,
      maxSabores: cfg?.maxSabores ?? 3,
      minSorvetes: cfg?.minSorvetes ?? 0,
      maxSorvetes: cfg?.maxSorvetes ?? 2,
      minAcompanhamentos: cfg?.minAcompanhamentos ?? 0,
      maxAcompanhamentos: cfg?.maxAcompanhamentos ?? 4,
      minCoberturas: cfg?.minCoberturas ?? 0,
      maxCoberturas: cfg?.maxCoberturas ?? 2,
      minComplementos: cfg?.minComplementos ?? 0,
      maxComplementos: cfg?.maxComplementos ?? 3
    }
  })
}

export async function POST(req: NextRequest) {
  const est = await resolveTenant(req)
  if (!est) return Response.json({ error: 'estabelecimento não encontrado' }, { status: 404 })
  const body = await req.json()
  const data: any = {}
  const keys = [
    'minSabores','maxSabores',
    'minSorvetes','maxSorvetes',
    'minAcompanhamentos','maxAcompanhamentos',
    'minCoberturas','maxCoberturas',
    'minComplementos','maxComplementos'
  ]
  for (const k of keys) {
    const v = Number(body[k])
    if (!Number.isNaN(v) && v >= 0) data[k] = Math.floor(v)
  }
  await prisma.configuracaoAcaiteria.upsert({
    where: { estabelecimentoId: est.id },
    update: data,
    create: { estabelecimentoId: est.id, ...data }
  })
  return Response.json({ ok: true })
}
