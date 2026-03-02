-- CreateEnum
CREATE TYPE "TemaChat" AS ENUM ('PADRAO', 'DARK', 'MODERNO', 'MINIMAL');

-- CreateEnum
CREATE TYPE "BordaBalao" AS ENUM ('ARREDONDADO', 'MEDIO', 'RETO');

-- CreateEnum
CREATE TYPE "TipoCupom" AS ENUM ('PERCENTUAL', 'VALOR_FIXO', 'FRETE_GRATIS');

-- AlterTable
ALTER TABLE "ConfiguracaoAcaiteria" ADD COLUMN     "minAcompanhamentos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "minCoberturas" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "minComplementos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "minSabores" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "minSorvetes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Estabelecimento" ADD COLUMN     "aberto" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "avatarBotUrl" TEXT,
ADD COLUMN     "bordaBaloes" "BordaBalao" NOT NULL DEFAULT 'ARREDONDADO',
ADD COLUMN     "descricao" TEXT,
ADD COLUMN     "diasAtivos" JSONB,
ADD COLUMN     "endereco" JSONB,
ADD COLUMN     "horarioAbertura" TEXT,
ADD COLUMN     "horarioFechamento" TEXT,
ADD COLUMN     "mensagemBoasVindas" TEXT,
ADD COLUMN     "nomeBot" TEXT NOT NULL DEFAULT 'Atendimento',
ADD COLUMN     "permitirRetirada" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sombraBaloes" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxaEntregaPadrao" DECIMAL(10,2),
ADD COLUMN     "telefone" TEXT,
ADD COLUMN     "temaChat" "TemaChat" NOT NULL DEFAULT 'PADRAO';

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "cupomId" TEXT,
ADD COLUMN     "valorDesconto" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "categoriaId" TEXT,
ADD COLUMN     "controlarEstoque" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dataFimPromocao" TIMESTAMP(3),
ADD COLUMN     "dataInicioPromocao" TIMESTAMP(3),
ADD COLUMN     "destaque" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estoque" INTEGER,
ADD COLUMN     "fotoUrl" TEXT,
ADD COLUMN     "horarioFim" TEXT,
ADD COLUMN     "horarioInicio" TEXT,
ADD COLUMN     "ordemExibicao" INTEGER,
ADD COLUMN     "precoPromocional" DECIMAL(10,2),
ADD COLUMN     "promocaoAtiva" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tempoPreparoMinutos" INTEGER;

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "estabelecimentoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "icone" TEXT,
    "ordemExibicao" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variacao" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valorAdicional" DECIMAL(10,2) NOT NULL,
    "obrigatoria" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Variacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Adicional" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "maximoPermitido" INTEGER,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Adicional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Combo" (
    "id" TEXT NOT NULL,
    "estabelecimentoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "precoFixo" DECIMAL(10,2) NOT NULL,
    "permitirSubstituicao" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Combo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComboItem" (
    "id" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,

    CONSTRAINT "ComboItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cupom" (
    "id" TEXT NOT NULL,
    "estabelecimentoId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "TipoCupom" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "valorMinimoPedido" DECIMAL(10,2),
    "limiteTotalUso" INTEGER,
    "limitePorCliente" INTEGER,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cupom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CupomUso" (
    "id" TEXT NOT NULL,
    "cupomId" TEXT NOT NULL,
    "clienteId" TEXT,
    "pedidoId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CupomUso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cupom_estabelecimentoId_codigo_key" ON "Cupom"("estabelecimentoId", "codigo");

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variacao" ADD CONSTRAINT "Variacao_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adicional" ADD CONSTRAINT "Adicional_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Combo" ADD CONSTRAINT "Combo_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboItem" ADD CONSTRAINT "ComboItem_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "Combo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboItem" ADD CONSTRAINT "ComboItem_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_cupomId_fkey" FOREIGN KEY ("cupomId") REFERENCES "Cupom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cupom" ADD CONSTRAINT "Cupom_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CupomUso" ADD CONSTRAINT "CupomUso_cupomId_fkey" FOREIGN KEY ("cupomId") REFERENCES "Cupom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CupomUso" ADD CONSTRAINT "CupomUso_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CupomUso" ADD CONSTRAINT "CupomUso_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
