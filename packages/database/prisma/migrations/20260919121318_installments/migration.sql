-- CreateTable
CREATE TABLE "Installment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amountToman" BIGINT NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "dueDayOfMonth" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Installment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallmentPayment" (
    "id" TEXT NOT NULL,
    "installmentId" TEXT NOT NULL,
    "occurrenceNo" INTEGER NOT NULL,
    "amountToman" BIGINT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "financialTransactionId" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstallmentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Installment_userId_archived_idx" ON "Installment"("userId", "archived");

-- CreateIndex
CREATE UNIQUE INDEX "InstallmentPayment_financialTransactionId_key" ON "InstallmentPayment"("financialTransactionId");

-- CreateIndex
CREATE INDEX "InstallmentPayment_installmentId_idx" ON "InstallmentPayment"("installmentId");

-- CreateIndex
CREATE UNIQUE INDEX "InstallmentPayment_installmentId_occurrenceNo_key" ON "InstallmentPayment"("installmentId", "occurrenceNo");

-- AddForeignKey
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentPayment" ADD CONSTRAINT "InstallmentPayment_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "Installment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentPayment" ADD CONSTRAINT "InstallmentPayment_financialTransactionId_fkey" FOREIGN KEY ("financialTransactionId") REFERENCES "FinancialTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
