const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  console.log('[seed-distribuidora] iniciando...')

  const estSlug = 'distribuidora-demo'
  let est = await prisma.estabelecimento.findUnique({ where: { slug: estSlug } })
  if (!est) {
    est = await prisma.estabelecimento.create({
      data: {
        nome: 'Distribuidora Demo',
        slug: estSlug,
        perfil: 'DISTRIBUIDORA',
        ativo: true,
        descricao: 'Distribuidora de bebidas com os melhores preços!',
        telefone: '11999998888',
        taxaEntregaPadrao: 10,
        permitirRetirada: true,
        aberto: true,
        entregaHabilitada: true,
        raioAtendimentoKm: 5,
        tempoEntregaMinutos: 30,
        valorMinimoPedido: 10,
        corPrimaria: '#0ea5e9',
        corBot: '#e0f2fe',
        corFundoChat: '#f8fafc',
        corTexto: '#0f172a',
        nomeBot: 'Atendimento Distribuidora',
        mensagemBoasVindas: 'Olá! Seja bem-vindo(a)! Aqui você encontra as melhores ofertas de bebidas 🍻'
      }
    })
    console.log('[seed-distribuidora] estabelecimento criado id=', est.id)
  } else {
    est = await prisma.estabelecimento.update({
      where: { id: est.id },
      data: {
        perfil: 'DISTRIBUIDORA',
        entregaHabilitada: true,
        raioAtendimentoKm: 5,
        tempoEntregaMinutos: 30,
        valorMinimoPedido: 10
      }
    })
    console.log('[seed-distribuidora] estabelecimento já existente atualizado id=', est.id)
  }
  const estId = est.id

  const categoriasPadrao = [
    { nome: 'Cervejas', icone: '🍺', ordemExibicao: 1 },
    { nome: 'Destilados', icone: '🥃', ordemExibicao: 2 },
    { nome: 'Vinhos', icone: '🍷', ordemExibicao: 3 },
    { nome: 'Refrigerantes', icone: '🥤', ordemExibicao: 4 },
    { nome: 'Águas', icone: '💧', ordemExibicao: 5 },
    { nome: 'Energéticos', icone: '⚡', ordemExibicao: 6 },
    { nome: 'Sucos', icone: '🧃', ordemExibicao: 7 },
    { nome: 'Gelo', icone: '🧊', ordemExibicao: 8 },
    { nome: 'Itens para festas', icone: '🎉', ordemExibicao: 9 },
    { nome: 'Outros', icone: '➕', ordemExibicao: 10 }
  ]
  for (const c of categoriasPadrao) {
    const existe = await prisma.categoria.findFirst({
      where: { nome: c.nome, estabelecimentoId: estId }
    })
    if (!existe) {
      await prisma.categoria.create({
        data: {
          nome: c.nome,
          icone: c.icone,
          ordemExibicao: c.ordemExibicao,
          ativo: true,
          estabelecimentoId: estId
        }
      })
    }
  }
  console.log('[seed-distribuidora] categorias padrão garantidas')

  const adminEmail = 'admin@distribuidora.com'
  const adminExists = await prisma.adminUser.findUnique({ where: { email: adminEmail } })
  if (!adminExists) {
    const hash = await bcrypt.hash('admin123', 10)
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        passwordHash: hash,
        role: 'ADMIN_ESTABELECIMENTO',
        estabelecimentoId: estId
      }
    })
    console.log('[seed-distribuidora] admin criado:', adminEmail)
  } else {
    const hash = await bcrypt.hash('admin123', 10)
    await prisma.adminUser.update({
      where: { id: adminExists.id },
      data: { passwordHash: hash, estabelecimentoId: estId }
    })
    console.log('[seed-distribuidora] admin atualizado:', adminEmail)
  }

  const produtosExemplo = [
    {
      nome: 'Heineken Lata 350ml',
      categoria: 'Cervejas',
      marca: 'Heineken',
      unidade: 'Lata',
      descricao: 'Cerveja premium Pilsen lager 350ml',
      preco: 6.5,
      precoEmbalagem: 72,
      qtdPorEmbalagem: 12,
      ativo: true,
      destaque: true
    },
    {
      nome: 'Coca-Cola 2L',
      categoria: 'Refrigerantes',
      marca: 'Coca-Cola',
      unidade: 'Garrafa',
      descricao: 'Refrigerante de cola 2 litros (garrafa PET retornável)',
      preco: 9.5,
      ativo: true,
      destaque: true
    },
    {
      nome: 'Coca-Cola Lata 350ml',
      categoria: 'Refrigerantes',
      marca: 'Coca-Cola',
      unidade: 'Lata',
      descricao: 'Refrigerante de cola em lata 350ml',
      preco: 4.5,
      precoEmbalagem: 48,
      qtdPorEmbalagem: 12,
      ativo: true
    },
    {
      nome: 'Saco de Gelo 5kg',
      categoria: 'Gelo',
      marca: 'Crystal',
      unidade: 'Saco',
      descricao: 'Gelo em cubos 5kg (produto resfriado)',
      preco: 12,
      ativo: true,
      destaque: true
    },
    {
      nome: 'Água Mineral 1L',
      categoria: 'Águas',
      marca: 'Crystal',
      unidade: 'Garrafa',
      descricao: 'Água mineral natural sem gás 1L',
      preco: 3.5,
      precoEmbalagem: 36,
      qtdPorEmbalagem: 12,
      ativo: true
    },
    {
      nome: 'Smirnoff Vodka 998ml',
      categoria: 'Destilados',
      marca: 'Smirnoff',
      unidade: 'Garrafa',
      descricao: 'Vodka original 998ml garrafa',
      preco: 79.9,
      ativo: true
    },
    {
      nome: 'Red Bull 250ml',
      categoria: 'Energéticos',
      marca: 'Red Bull',
      unidade: 'Lata',
      descricao: 'Energético 250ml lata',
      preco: 8.9,
      precoEmbalagem: 100.8,
      qtdPorEmbalagem: 24,
      ativo: true,
      destaque: true
    },
    {
      nome: 'Suco Del Valle 1L',
      categoria: 'Sucos',
      marca: 'Del Valle',
      unidade: 'Garrafa',
      descricao: 'Suco pronto de laranja 1 litro',
      preco: 7.5,
      ativo: true
    }
  ]

  for (const p of produtosExemplo) {
    const existe = await prisma.produto.findFirst({
      where: { nome: p.nome, estabelecimentoId: estId }
    })
    if (!existe) {
      await prisma.produto.create({
        data: {
          ...p,
          estabelecimentoId: estId
        }
      })
    } else {
      await prisma.produto.update({
        where: { id: existe.id },
        data: { ...p }
      })
    }
  }
  console.log('[seed-distribuidora] produtos exemplo criados/atualizados:', produtosExemplo.length)

  console.log('[seed-distribuidora] OK. Login admin@distribuidora.com / admin123')
}

main()
  .catch(e => {
    console.error('[seed-distribuidora] ERRO:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
