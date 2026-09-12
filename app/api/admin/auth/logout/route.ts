import { NextRequest, NextResponse } from 'next/server'

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  })
  res.cookies.delete('admin_token')
  return res
}

export async function GET(req: NextRequest) {
  return POST(req)
}
