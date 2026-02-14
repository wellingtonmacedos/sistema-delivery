import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

function getSuperAdmin(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value || ''
  const secret = process.env.JWT_SECRET || ''
  if (!token || !secret) return null
  try {
    const d = jwt.verify(token, secret) as any
    if (d.role !== 'SUPER_ADMIN') return null
    return d
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const sa = getSuperAdmin(req)
  if (!sa) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      role: true,
      estabelecimentoId: true,
      createdAt: true,
      estabelecimento: { select: { id: true, nome: true, slug: true } }
    }
  })
  return NextResponse.json({ admins: users })
}

export async function POST(req: NextRequest) {
  const sa = getSuperAdmin(req)
  if (!sa) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const b = await req.json()
  const email = String(b.email || '').trim().toLowerCase()
  const password = String(b.password || '').trim()
  const estabelecimentoId = String(b.estabelecimentoId || '')
  const role = String(b.role || 'ADMIN_ESTABELECIMENTO') as any
  if (!email || !password || !estabelecimentoId) {
    return NextResponse.json({ error: 'dados obrigatórios' }, { status: 400 })
  }
  const exists = await prisma.adminUser.findUnique({ where: { email } })
  if (exists) return NextResponse.json({ error: 'email já cadastrado' }, { status: 400 })
  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.adminUser.create({
    data: { email, passwordHash: hash, estabelecimentoId, role }
  })
  return NextResponse.json({ admin: { id: user.id, email: user.email, role: user.role, estabelecimentoId: user.estabelecimentoId } })
}

export async function PUT(req: NextRequest) {
  const sa = getSuperAdmin(req)
  if (!sa) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const b = await req.json()
  const id = String(b.id || '')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  const data: any = {}
  if (typeof b.email === 'string') data.email = String(b.email).trim().toLowerCase()
  if (typeof b.estabelecimentoId === 'string') data.estabelecimentoId = String(b.estabelecimentoId)
  if (typeof b.role === 'string') data.role = String(b.role)
  if (typeof b.password === 'string' && b.password.trim()) {
    data.passwordHash = await bcrypt.hash(String(b.password).trim(), 10)
  }
  const user = await prisma.adminUser.update({
    where: { id },
    data
  })
  return NextResponse.json({ admin: { id: user.id, email: user.email, role: user.role, estabelecimentoId: user.estabelecimentoId } })
}

export async function DELETE(req: NextRequest) {
  const sa = getSuperAdmin(req)
  if (!sa) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const b = await req.json()
  const id = String(b.id || '')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  await prisma.adminUser.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
