import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const DEV_USERS: Record<string, { sub: string; role: 'SUPER_ADMIN' | 'ADMIN_ESTABELECIMENTO'; pwd: string; estabelecimentoId: string | null }> = {
  'super@admin.local': { sub: 'dev_super', role: 'SUPER_ADMIN', pwd: 'super123', estabelecimentoId: null },
  'admin@est.local': { sub: 'dev_admin', role: 'ADMIN_ESTABELECIMENTO', pwd: 'admin123', estabelecimentoId: 'dev_est_01' }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '').trim()
  const secret = process.env.JWT_SECRET || ''
  if (!email || !password || !secret) return Response.json({ error: 'dados inválidos' }, { status: 400 })

  let payload: { sub: string; email: string; role: any; estabelecimentoId: string | null } | null = null

  try {
    const user = await prisma.adminUser.findUnique({ where: { email } })
    if (user) {
      const ok = await bcrypt.compare(password, user.passwordHash)
      if (ok) {
        payload = { sub: user.id, email: user.email, role: user.role, estabelecimentoId: user.estabelecimentoId || null }
      }
    }
  } catch (dbErr) {
    const dev = DEV_USERS[email]
    if (dev && dev.pwd === password) {
      payload = { sub: dev.sub, email, role: dev.role, estabelecimentoId: dev.estabelecimentoId }
    }
  }

  if (!payload) {
    const dev = DEV_USERS[email]
    if (dev && dev.pwd === password) {
      payload = { sub: dev.sub, email, role: dev.role, estabelecimentoId: dev.estabelecimentoId }
    }
  }

  if (!payload) return Response.json({ error: 'credenciais inválidas' }, { status: 401 })

  const token = jwt.sign(payload, secret, { expiresIn: '7d' })
  const res = NextResponse.json({ ok: true, role: payload!.role, estabelecimentoId: payload!.estabelecimentoId })
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
