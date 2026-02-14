import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '').trim()
  if (!email || !password) return Response.json({ error: 'email e senha obrigatórios' }, { status: 400 })
  const exists = await prisma.adminUser.findUnique({ where: { email } })
  if (exists) return Response.json({ error: 'email já cadastrado' }, { status: 400 })
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.adminUser.create({ data: { email, passwordHash } })
  return Response.json({ user: { id: user.id, email: user.email } })
}
