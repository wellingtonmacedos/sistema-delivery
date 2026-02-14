import { prisma } from '@/lib/db'

export async function GET() {
  const clientes = await prisma.cliente.findMany({
    orderBy: { createdAt: 'desc' }
  })
  return Response.json({ clientes })
}
