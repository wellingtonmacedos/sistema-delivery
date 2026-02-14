import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value || ''
  const secret = process.env.JWT_SECRET || ''
  if (!token || !secret) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const d = jwt.verify(token, secret) as any
    return NextResponse.json({ ok: true, role: d.role, estabelecimentoId: d.estabelecimentoId || null, email: d.email })
  } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 401 })
  }
}
