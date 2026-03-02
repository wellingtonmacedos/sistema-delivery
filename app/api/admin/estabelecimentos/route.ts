import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import jwt from 'jsonwebtoken'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token) return Response.json({ error: 'unauthorized' }, { status: 401 })
  
  try {
    const secret = process.env.JWT_SECRET || ''
    jwt.verify(token, secret)
  } catch {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const estabelecimentos = await prisma.estabelecimento.findMany({
    select: {
      id: true,
      nome: true,
      slug: true,
      perfil: true,
      ativo: true
    },
    orderBy: { createdAt: 'asc' }
  })

  return Response.json(estabelecimentos)
}
