import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const config = await prisma.configuracao.findUnique({ where: { id: 1 } })
  return Response.json({ config })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { taxaEntrega, tempoEstimado, pixApiKey, pixChave } = body
  const config = await prisma.configuracao.upsert({
    where: { id: 1 },
    update: { taxaEntrega, tempoEstimado, pixApiKey, pixChave },
    create: { id: 1, taxaEntrega, tempoEstimado, pixApiKey, pixChave }
  })
  return Response.json({ config })
}
