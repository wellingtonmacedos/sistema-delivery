import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'

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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sa = getSuperAdmin(req)
  if (!sa) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const estId = String(params?.id || '').trim()
  if (!estId) return NextResponse.json({ ok: false, error: 'id_obrigatorio' }, { status: 400 })
  const est = await prisma.estabelecimento.findUnique({ where: { id: estId } })
  if (!est) return NextResponse.json({ ok: false, error: 'estabelecimento_nao_encontrado' }, { status: 404 })

  const data = await req.formData()
  const file = data.get('file') as File | null
  if (!file) return NextResponse.json({ ok: false, error: 'arquivo_obrigatorio' }, { status: 400 })
  const type = file.type || ''
  if (!type.startsWith('image/')) return NextResponse.json({ ok: false, error: 'apenas_imagem' }, { status: 400 })
  const max = 2 * 1024 * 1024
  if (file.size > max) return NextResponse.json({ ok: false, error: 'arquivo_grande_max_2mb' }, { status: 400 })

  const bytes = Buffer.from(await file.arrayBuffer())
  const dir = path.join(process.cwd(), 'public', 'uploads')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const ext = (type.split('/')[1] || 'png').split('+')[0]
  const safeSlug = est.slug.replace(/[^a-z0-9-]/gi, '_') || estId
  const name = `est_${safeSlug}_logo_${Date.now()}.${ext}`
  const full = path.join(dir, name)
  fs.writeFileSync(full, bytes)
  const url = `/uploads/${name}`

  await prisma.estabelecimento.update({ where: { id: estId }, data: { logoUrl: url } })
  return NextResponse.json({ ok: true, logoUrl: url })
}
