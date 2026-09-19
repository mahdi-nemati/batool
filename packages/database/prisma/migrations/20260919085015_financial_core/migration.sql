-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('BANK', 'FUND', 'GOLD', 'USD');

-- CreateEnum
CREATE TYPE "MovementReason" AS ENUM ('OPENING', 'TRANSFER');

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fund" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goalToman" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoldWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoldWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsdWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsdWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceKind" "AssetKind" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "destinationKind" "AssetKind" NOT NULL,
    "destinationId" TEXT NOT NULL,
    "amountToman" BIGINT,
    "amountGram" DECIMAL(24,8),
    "amountUsd" DECIMAL(24,8),
    "description" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetMovement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetKind" "AssetKind" NOT NULL,
    "assetId" TEXT NOT NULL,
    "reason" "MovementReason" NOT NULL,
    "transferId" TEXT,
    "amountToman" BIGINT,
    "amountGram" DECIMAL(24,8),
    "amountUsd" DECIMAL(24,8),
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bankAccountId" TEXT,
    "fundId" TEXT,
    "goldWalletId" TEXT,
    "usdWalletId" TEXT,

    CONSTRAINT "AssetMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankAccount_userId_isActive_idx" ON "BankAccount"("userId", "isActive");

-- CreateIndex
CREATE INDEX "Fund_userId_idx" ON "Fund"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GoldWallet_userId_key" ON "GoldWallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UsdWallet_userId_key" ON "UsdWallet"("userId");

-- CreateIndex
CREATE INDEX "Transfer_userId_occurredAt_idx" ON "Transfer"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "AssetMovement_userId_assetKind_assetId_idx" ON "AssetMovement"("userId", "assetKind", "assetId");

-- CreateIndex
CREATE INDEX "AssetMovement_transferId_idx" ON "AssetMovement"("transferId");

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fund" ADD CONSTRAINT "Fund_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoldWallet" ADD CONSTRAINT "GoldWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsdWallet" ADD CONSTRAINT "UsdWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMovement" ADD CONSTRAINT "AssetMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMovement" ADD CONSTRAINT "AssetMovement_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMovement" ADD CONSTRAINT "AssetMovement_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMovement" ADD CONSTRAINT "AssetMovement_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMovement" ADD CONSTRAINT "AssetMovement_goldWalletId_fkey" FOREIGN KEY ("goldWalletId") REFERENCES "GoldWallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMovement" ADD CONSTRAINT "AssetMovement_usdWalletId_fkey" FOREIGN KEY ("usdWalletId") REFERENCES "UsdWallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
