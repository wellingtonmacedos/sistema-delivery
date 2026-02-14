const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  await prisma.configuracao.upsert({
    where: { id: 1 },
    update: { taxaEntrega: 8.0, tempoEstimado: 30 },
    create: { id: 1, taxaEntrega: 8.0, tempoEstimado: 30 }
  })

  const produtos = [
    { categoria: 'Lanches', nome: 'X-Burger', descricao: 'Pão, carne, queijo', preco: 18.9 },
    { categoria: 'Lanches', nome: 'X-Salada', descricao: 'Pão, carne, queijo, salada', preco: 20.9 },
    { categoria: 'Porções', nome: 'Batata Frita', descricao: 'Porção média', preco: 16.0 },
    { categoria: 'Bebidas', nome: 'Refrigerante Lata', descricao: '350ml', preco: 6.0 },
    { categoria: 'Sobremesas', nome: 'Pudim', descricao: 'Fatia', preco: 8.0 }
  ]
  for (const p of produtos) {
    const exists = await prisma.produto.findFirst({ where: { nome: p.nome } })
    if (!exists) {
      await prisma.produto.create({
        data: { categoria: p.categoria, nome: p.nome, descricao: p.descricao, preco: p.preco, ativo: true }
      })
    }
  }

  const estSlug = 'lanchonete-demo'
  let est = await prisma.estabelecimento.findUnique({ where: { slug: estSlug } })
  if (!est) {
    est = await prisma.estabelecimento.create({
      data: {
        nome: 'Lanchonete Demo',
        slug: estSlug,
        perfil: 'LANCHONETE',
        ativo: true
      }
    })
  }

  const superEmail = 'super@admin.local'
  const superExists = await prisma.adminUser.findUnique({ where: { email: superEmail } })
  if (!superExists) {
    const hash = await bcrypt.hash('super123', 10)
    await prisma.adminUser.create({
      data: {
        email: superEmail,
        passwordHash: hash,
        role: 'SUPER_ADMIN'
      }
    })
  }

  const adminEmail = 'admin@est.local'
  const adminExists = await prisma.adminUser.findUnique({ where: { email: adminEmail } })
  if (!adminExists) {
    const hash = await bcrypt.hash('admin123', 10)
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        passwordHash: hash,
        role: 'ADMIN_ESTABELECIMENTO',
        estabelecimentoId: est.id
      }
    })
  }
}

main()
  .catch(e => {
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
