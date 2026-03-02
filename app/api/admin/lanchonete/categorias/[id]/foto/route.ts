import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function getAdmin(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token) return null
  try {
    const secret = process.env.JWT_SECRET || 'secret'
    const decoded = jwt.verify(token, secret) as any
    return decoded
  } catch {
    return null
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const id = params.id
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Apenas imagens são permitidas' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Diretorios de upload
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'categorias')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    // Nome unico
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${id}-${Date.now()}.${ext}`
    const filePath = path.join(uploadDir, fileName)

    fs.writeFileSync(filePath, buffer)

    const url = `/uploads/categorias/${fileName}`

    // Atualiza no banco
    await prisma.categoria.update({
      where: { id },
      data: { imagemUrl: url }
    })

    return NextResponse.json({ success: true, url })
  } catch (error: any) {
    console.error('Erro upload:', error)
    return NextResponse.json({ error: 'Erro ao processar upload' }, { status: 500 })
  }
}
