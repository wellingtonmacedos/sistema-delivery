import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '').trim()
  const secret = process.env.JWT_SECRET || ''
  if (!email || !password || !secret) return Response.json({ error: 'dados inválidos' }, { status: 400 })
  const user = await prisma.adminUser.findUnique({ where: { email } })
  if (!user) return Response.json({ error: 'credenciais inválidas' }, { status: 401 })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return Response.json({ error: 'credenciais inválidas' }, { status: 401 })
  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, estabelecimentoId: user.estabelecimentoId || null },
    secret,
    { expiresIn: '7d' }
  )
  const res = NextResponse.json({ ok: true, role: user.role, estabelecimentoId: user.estabelecimentoId || null })
  const secure = process.env.NODE_ENV === 'production'
  res.cookies.set('admin_token', token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 3600
  })
  return res
}
