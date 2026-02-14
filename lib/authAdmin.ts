import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { prisma } from './db'

export async function getCurrentAdminWithEstabelecimento() {
  const token = cookies().get('admin_token')?.value
  const secret = process.env.JWT_SECRET || ''
  if (!token || !secret) return null
  try {
    const decoded = jwt.verify(token, secret) as any
    const admin = await prisma.adminUser.findUnique({ where: { id: decoded.sub } })
    if (!admin) return null
    const est =
      admin.estabelecimentoId
        ? await prisma.estabelecimento.findUnique({ where: { id: admin.estabelecimentoId } })
        : null
    return { admin, estabelecimento: est }
  } catch {
    return null
  }
}
