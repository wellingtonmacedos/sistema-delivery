import { z } from 'zod'

export const ClienteSchema = z.object({
  nome: z.string().min(1).max(120),
  telefone: z.string().min(8).max(20),
  enderecos: z.any().optional()
})

export const ClienteQuerySchema = z.object({
  telefone: z.string().min(8).max(20)
})

export const ProdutoCreateSchema = z.object({
  categoria: z.string().min(1).max(60),
  categoriaId: z.string().optional(),
  nome: z.string().min(1).max(120),
  descricao: z.string().max(500).optional().nullable(),
  preco: z.number().nonnegative(),
  marca: z.string().max(80).optional().nullable(),
  unidade: z.string().max(40).optional().nullable(),
  qtdPorEmbalagem: z.number().int().positive().optional().nullable(),
  precoEmbalagem: z.number().nonnegative().optional().nullable(),
  adicionais: z.any().optional(),
  ativo: z.boolean().optional(),
  destaque: z.boolean().optional(),
  ordemExibicao: z.number().int().nonnegative().optional().nullable(),
  controlarEstoque: z.boolean().optional(),
  estoque: z.number().int().nonnegative().optional().nullable(),
  tempoPreparoMinutos: z.number().int().nonnegative().optional().nullable(),
  fotoUrl: z.string().optional().nullable(),
  maxSabores: z.number().int().nonnegative().optional().nullable(),
  maxSorvetes: z.number().int().nonnegative().optional().nullable(),
  maxAcompanhamentos: z.number().int().nonnegative().optional().nullable(),
  maxCoberturas: z.number().int().nonnegative().optional().nullable()
})

export const ProdutoUpdateSchema = z.object({
  categoria: z.string().min(1).max(60).optional(),
  categoriaId: z.string().optional(),
  nome: z.string().min(1).max(120).optional(),
  descricao: z.string().max(500).optional().nullable(),
  preco: z.number().nonnegative().optional(),
  marca: z.string().max(80).optional().nullable(),
  unidade: z.string().max(40).optional().nullable(),
  qtdPorEmbalagem: z.number().int().positive().optional().nullable(),
  precoEmbalagem: z.number().nonnegative().optional().nullable(),
  adicionais: z.any().optional(),
  ativo: z.boolean().optional(),
  destaque: z.boolean().optional(),
  ordemExibicao: z.number().int().nonnegative().optional().nullable(),
  controlarEstoque: z.boolean().optional(),
  estoque: z.number().int().nonnegative().optional().nullable(),
  tempoPreparoMinutos: z.number().int().nonnegative().optional().nullable(),
  fotoUrl: z.string().optional().nullable(),
  maxSabores: z.number().int().nonnegative().optional().nullable(),
  maxSorvetes: z.number().int().nonnegative().optional().nullable(),
  maxAcompanhamentos: z.number().int().nonnegative().optional().nullable(),
  maxCoberturas: z.number().int().nonnegative().optional().nullable()
})

export const CategoriaCreateSchema = z.object({
  nome: z.string().min(1).max(120),
  icone: z.string().max(8).optional(),
  imagemUrl: z.string().optional().nullable(),
  ordemExibicao: z.number().int().nonnegative().optional(),
  ativo: z.boolean().optional()
})

export const CategoriaUpdateSchema = z.object({
  nome: z.string().min(1).max(120).optional(),
  icone: z.string().max(8).optional(),
  imagemUrl: z.string().optional().nullable(),
  ordemExibicao: z.number().int().nonnegative().optional(),
  ativo: z.boolean().optional()
})

export const LanchoneteVariacaoCreateSchema = z.object({
  produtoId: z.string().min(1),
  nome: z.string().min(1).max(120),
  valorAdicional: z.number().nonnegative(),
  obrigatoria: z.boolean().optional(),
  ativo: z.boolean().optional()
})

export const LanchoneteVariacaoUpdateSchema = z.object({
  nome: z.string().min(1).max(120).optional(),
  valorAdicional: z.number().nonnegative().optional(),
  obrigatoria: z.boolean().optional(),
  ativo: z.boolean().optional()
})

export const LanchoneteAdicionalCreateSchema = z.object({
  produtoId: z.string().min(1),
  nome: z.string().min(1).max(120),
  valor: z.number().nonnegative(),
  maximoPermitido: z.number().int().positive().optional(),
  obrigatorio: z.boolean().optional(),
  ativo: z.boolean().optional()
})

export const LanchoneteAdicionalUpdateSchema = z.object({
  nome: z.string().min(1).max(120).optional(),
  valor: z.number().nonnegative().optional(),
  maximoPermitido: z.number().int().positive().optional(),
  obrigatorio: z.boolean().optional(),
  ativo: z.boolean().optional()
})

export const ComboCreateSchema = z.object({
  nome: z.string().min(1).max(120),
  descricao: z.string().max(500).optional(),
  precoFixo: z.number().nonnegative(),
  permitirSubstituicao: z.boolean().optional(),
  ativo: z.boolean().optional()
})

export const ComboItemCreateSchema = z.object({
  comboId: z.string().min(1),
  produtoId: z.string().min(1)
})

export const PedidoCreateSchema = z.object({
  clienteTelefone: z.string().min(8).max(20),
  itens: z.array(
    z.object({
      produtoId: z.string().min(1),
      quantidade: z.number().int().positive(),
      adicionais: z.any().optional(),
      observacoes: z.string().max(500).optional()
    })
  ),
  formaEntrega: z.enum(['entrega', 'retirada']),
  enderecoEntrega: z.any().nullable().optional(),
  metodoPagamento: z.enum(['pix', 'dinheiro', 'cartao']).optional(),
  trocoPara: z.number().nonnegative().optional(),
  cupomCodigo: z.string().max(32).optional()
})

export const PixCreateSchema = z.object({
  pedidoId: z.string().min(1)
})

export const WebhookPixSchema = z.object({
  txid: z.string().min(1),
  status: z.string().min(1)
})

export const ConfigSchema = z.object({
  taxaEntrega: z.number().nonnegative().optional(),
  tempoEstimado: z.number().int().positive().optional(),
  pixApiKey: z.string().min(1).optional(),
  pixChave: z.string().min(1).optional()
})

export const AcaiSaborCreateSchema = z.object({
  nome: z.string().min(1).max(120),
  descricao: z.string().max(500).optional(),
  ativo: z.boolean().optional()
})
export const AcaiSaborUpdateSchema = z.object({
  nome: z.string().min(1).max(120).optional(),
  descricao: z.string().max(500).optional().nullable(),
  ativo: z.boolean().optional()
})

export const AcaiSorveteCreateSchema = z.object({
  nome: z.string().min(1).max(120),
  ativo: z.boolean().optional()
})
export const AcaiSorveteUpdateSchema = z.object({
  nome: z.string().min(1).max(120).optional(),
  ativo: z.boolean().optional()
})

export const AcaiAcompanhamentoCreateSchema = z.object({
  nome: z.string().min(1).max(120),
  ativo: z.boolean().optional()
})
export const AcaiAcompanhamentoUpdateSchema = z.object({
  nome: z.string().min(1).max(120).optional(),
  ativo: z.boolean().optional()
})

export const AcaiCoberturaCreateSchema = z.object({
  nome: z.string().min(1).max(120),
  ativo: z.boolean().optional()
})
export const AcaiCoberturaUpdateSchema = z.object({
  nome: z.string().min(1).max(120).optional(),
  ativo: z.boolean().optional()
})

export const AcaiComplementoCreateSchema = z.object({
  nome: z.string().min(1).max(120),
  valorAdicional: z.number().nonnegative(),
  ativo: z.boolean().optional()
})
export const AcaiComplementoUpdateSchema = z.object({
  nome: z.string().min(1).max(120).optional(),
  valorAdicional: z.number().nonnegative().optional(),
  ativo: z.boolean().optional()
})

export const PizzaTamanhoCreateSchema = z.object({
  nome: z.string().min(1).max(120),
  precoBase: z.number().nonnegative(),
  ativo: z.boolean().optional()
})
export const PizzaTamanhoUpdateSchema = z.object({
  nome: z.string().min(1).max(120).optional(),
  precoBase: z.number().nonnegative().optional(),
  ativo: z.boolean().optional()
})

export const PizzaSaborCreateSchema = z.object({
  nome: z.string().min(1).max(120),
  descricao: z.string().max(500).optional(),
  ativo: z.boolean().optional()
})
export const PizzaSaborUpdateSchema = z.object({
  nome: z.string().min(1).max(120).optional(),
  descricao: z.string().max(500).optional().nullable(),
  ativo: z.boolean().optional()
})
