import { prisma } from '@/lib/db'

export async function logSistema(tipo: string, mensagem: string) {
  try {
    await prisma.logSistema.create({ data: { tipo, mensagem } })
  } catch {}
}
