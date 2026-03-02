import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'

function getAdmin(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value || ''
  const secret = process.env.JWT_SECRET || ''
  if (!token || !secret) return null
  try {
    const d = jwt.verify(token, secret) as any
    return d
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const admin = getAdmin(req)
  if (!admin) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const estId = admin.estabelecimentoId || null
  if (!estId || admin.role !== 'ADMIN_ESTABELECIMENTO') return Response.json({ error: 'unauthorized' }, { status: 401 })
  const data = await req.formData()
  const file = data.get('file') as File | null
  if (!file) return Response.json({ error: 'arquivo obrigatório' }, { status: 400 })
  const type = file.type || ''
  if (!type.startsWith('image/')) return Response.json({ error: 'apenas imagem' }, { status: 400 })
  const max = 1024 * 1024
  if (file.size > max) return Response.json({ error: 'arquivo grande' }, { status: 400 })
  const bytes = Buffer.from(await file.arrayBuffer())
  const dir = path.join(process.cwd(), 'public', 'uploads')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const ext = type.split('/')[1] || 'png'
  const name = `avatar_${Date.now()}.${ext}`
  const full = path.join(dir, name)
  fs.writeFileSync(full, bytes)
  const url = `/uploads/${name}`
  await prisma.estabelecimento.update({
    where: { id: estId },
    data: { avatarBotUrl: url }
  })
  return Response.json({ ok: true, avatarBotUrl: url })
}

