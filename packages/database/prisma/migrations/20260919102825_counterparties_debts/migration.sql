-- CreateEnum
CREATE TYPE "CounterpartyKind" AS ENUM ('EXTERNAL', 'USER');

-- CreateEnum
CREATE TYPE "DebtDirection" AS ENUM ('OWES_ME', 'I_OWE');

-- CreateEnum
CREATE TYPE "DebtEntryKind" AS ENUM ('OBLIGATION', 'SETTLEMENT');

-- AlterEnum
ALTER TYPE "MovementReason" ADD VALUE 'SETTLEMENT';

-- AlterTable
ALTER TABLE "AssetMovement" ADD COLUMN     "debtEventId" TEXT;

-- CreateTable
CREATE TABLE "Counterparty" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "kind" "CounterpartyKind" NOT NULL,
    "name" TEXT NOT NULL,
    "linkedUserId" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Counterparty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserConnection" (
    "id" TEXT NOT NULL,
    "aId" TEXT NOT NULL,
    "bId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebtEvent" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "counterpartyId" TEXT NOT NULL,
    "kind" "DebtEntryKind" NOT NULL,
    "direction" "DebtDirection" NOT NULL,
    "amountToman" BIGINT NOT NULL,
    "description" TEXT,
    "sourceShareId" TEXT,
    "assetKind" "AssetKind",
    "assetId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Counterparty_ownerUserId_archived_idx" ON "Counterparty"("ownerUserId", "archived");

-- CreateIndex
CREATE UNIQUE INDEX "Counterparty_ownerUserId_linkedUserId_key" ON "Counterparty"("ownerUserId", "linkedUserId");

-- CreateIndex
CREATE INDEX "UserConnection_bId_idx" ON "UserConnection"("bId");

-- CreateIndex
CREATE UNIQUE INDEX "UserConnection_aId_bId_key" ON "UserConnection"("aId", "bId");

-- CreateIndex
CREATE INDEX "DebtEvent_ownerUserId_occurredAt_idx" ON "DebtEvent"("ownerUserId", "occurredAt");

-- CreateIndex
CREATE INDEX "DebtEvent_counterpartyId_idx" ON "DebtEvent"("counterpartyId");

-- CreateIndex
CREATE INDEX "DebtEvent_sourceShareId_idx" ON "DebtEvent"("sourceShareId");

-- CreateIndex
CREATE INDEX "AssetMovement_debtEventId_idx" ON "AssetMovement"("debtEventId");

-- AddForeignKey
ALTER TABLE "AssetMovement" ADD CONSTRAINT "AssetMovement_debtEventId_fkey" FOREIGN KEY ("debtEventId") REFERENCES "DebtEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Counterparty" ADD CONSTRAINT "Counterparty_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Counterparty" ADD CONSTRAINT "Counterparty_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConnection" ADD CONSTRAINT "UserConnection_aId_fkey" FOREIGN KEY ("aId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConnection" ADD CONSTRAINT "UserConnection_bId_fkey" FOREIGN KEY ("bId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtEvent" ADD CONSTRAINT "DebtEvent_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtEvent" ADD CONSTRAINT "DebtEvent_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtEvent" ADD CONSTRAINT "DebtEvent_sourceShareId_fkey" FOREIGN KEY ("sourceShareId") REFERENCES "TransactionShare"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
