-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MovementReason" ADD VALUE 'INCOME';
ALTER TYPE "MovementReason" ADD VALUE 'EXPENSE';

-- AlterTable
ALTER TABLE "AssetMovement" ADD COLUMN     "transactionId" TEXT;

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amountToman" BIGINT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "assetKind" "AssetKind" NOT NULL,
    "assetId" TEXT NOT NULL,
    "description" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionShare" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "isOwner" BOOLEAN NOT NULL,
    "label" TEXT,
    "amountToman" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Category_type_isActive_idx" ON "Category"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_type_key" ON "Category"("name", "type");

-- CreateIndex
CREATE INDEX "FinancialTransaction_userId_occurredAt_idx" ON "FinancialTransaction"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "FinancialTransaction_userId_type_idx" ON "FinancialTransaction"("userId", "type");

-- CreateIndex
CREATE INDEX "FinancialTransaction_categoryId_idx" ON "FinancialTransaction"("categoryId");

-- CreateIndex
CREATE INDEX "TransactionShare_transactionId_idx" ON "TransactionShare"("transactionId");

-- CreateIndex
CREATE INDEX "AssetMovement_transactionId_idx" ON "AssetMovement"("transactionId");

-- AddForeignKey
ALTER TABLE "AssetMovement" ADD CONSTRAINT "AssetMovement_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "FinancialTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionShare" ADD CONSTRAINT "TransactionShare_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "FinancialTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
