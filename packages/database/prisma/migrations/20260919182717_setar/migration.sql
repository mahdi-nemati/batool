-- CreateTable
CREATE TABLE "SetarProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tuitionAmountToman" BIGINT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SetarProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetarSession" (
    "id" TEXT NOT NULL,
    "setarProfileId" TEXT NOT NULL,
    "sessionNo" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SetarSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetarTuitionPayment" (
    "id" TEXT NOT NULL,
    "setarProfileId" TEXT NOT NULL,
    "cycleNo" INTEGER NOT NULL,
    "amountToman" BIGINT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "financialTransactionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SetarTuitionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SetarProfile_userId_archived_idx" ON "SetarProfile"("userId", "archived");

-- CreateIndex
CREATE UNIQUE INDEX "SetarProfile_userId_key" ON "SetarProfile"("userId");

-- CreateIndex
CREATE INDEX "SetarSession_setarProfileId_occurredAt_idx" ON "SetarSession"("setarProfileId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "SetarSession_setarProfileId_sessionNo_key" ON "SetarSession"("setarProfileId", "sessionNo");

-- CreateIndex
CREATE UNIQUE INDEX "SetarTuitionPayment_financialTransactionId_key" ON "SetarTuitionPayment"("financialTransactionId");

-- CreateIndex
CREATE INDEX "SetarTuitionPayment_setarProfileId_idx" ON "SetarTuitionPayment"("setarProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "SetarTuitionPayment_setarProfileId_cycleNo_key" ON "SetarTuitionPayment"("setarProfileId", "cycleNo");

-- AddForeignKey
ALTER TABLE "SetarProfile" ADD CONSTRAINT "SetarProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetarSession" ADD CONSTRAINT "SetarSession_setarProfileId_fkey" FOREIGN KEY ("setarProfileId") REFERENCES "SetarProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetarTuitionPayment" ADD CONSTRAINT "SetarTuitionPayment_setarProfileId_fkey" FOREIGN KEY ("setarProfileId") REFERENCES "SetarProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetarTuitionPayment" ADD CONSTRAINT "SetarTuitionPayment_financialTransactionId_fkey" FOREIGN KEY ("financialTransactionId") REFERENCES "FinancialTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
