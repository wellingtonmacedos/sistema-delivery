import { NextRequest } from 'next/server'
import { resolveTenant } from '@/lib/tenant'
import path from 'path'
import fs from 'fs'

function readFileSafe(p: string) {
  try {
    return fs.readFileSync(p, 'utf8')
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const est = await resolveTenant(req)
  const base = process.cwd()
  let filePath: string | null = null
  const perfil = est?.perfil || 'LANCHONETE'
  if (perfil === 'ACAITERIA') {
    filePath = path.join(base, 'chatbot', 'acaiteria_prompt.txt')
  } else if (perfil === 'LANCHONETE') {
    filePath = path.join(base, 'chatbot-lanchonete.prompt')
  } else if (perfil === 'PIZZARIA') {
    filePath = path.join(base, 'chatbot', 'pizzaria_prompt.txt')
  }
  if (!filePath) return Response.json({ error: 'perfil não suportado' }, { status: 404 })
  const content = readFileSafe(filePath)
  if (!content) return Response.json({ error: 'prompt não encontrado' }, { status: 404 })
  return Response.json({
    perfil,
    slug: est?.slug || null,
    prompt: content
  })
}
