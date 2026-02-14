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
  nome: z.string().min(1).max(120),
  descricao: z.string().max(500).optional(),
  preco: z.number().nonnegative(),
  adicionais: z.any().optional(),
  ativo: z.boolean().optional()
})

export const ProdutoUpdateSchema = z.object({
  categoria: z.string().min(1).max(60).optional(),
  nome: z.string().min(1).max(120).optional(),
  descricao: z.string().max(500).optional().nullable(),
  preco: z.number().nonnegative().optional(),
  adicionais: z.any().optional(),
  ativo: z.boolean().optional()
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
  trocoPara: z.number().nonnegative().optional()
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
