import { NextRequest } from 'next/server'
import { resolveTenant } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const est = await resolveTenant(req)
  if (!est) return Response.json({ error: 'estabelecimento não encontrado' }, { status: 404 })
  return Response.json({
    estabelecimento: {
      id: est.id,
      nome: est.nome,
      slug: est.slug,
      perfil: est.perfil,
      ativo: est.ativo,
      logoUrl: est.logoUrl || null,
      corPrimaria: est.corPrimaria,
      corBot: est.corBot,
      corTexto: est.corTexto,
      corFundoChat: est.corFundoChat
    }
  })
}
