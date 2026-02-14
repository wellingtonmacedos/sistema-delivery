import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if ((pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) || pathname.startsWith('/super-admin')) {
    const token = req.cookies.get('admin_token')?.value || ''
    if (!token) {
      const url = new URL('/admin/login', req.url)
      return NextResponse.redirect(url)
    }
    try {
      const parts = token.split('.')
      if (parts.length !== 3) throw new Error('invalid token')
      const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8'))
      if (pathname.startsWith('/super-admin')) {
        if (payload.role !== 'SUPER_ADMIN') {
          const url = new URL('/admin', req.url)
          return NextResponse.redirect(url)
        }
        return NextResponse.next()
      }
      return NextResponse.next()
    } catch {
      const url = new URL('/admin/login', req.url)
      return NextResponse.redirect(url)
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/super-admin/:path*']
}
