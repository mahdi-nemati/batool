-- AlterTable
ALTER TABLE "DebtEvent" ADD COLUMN     "mirroredFromId" TEXT;

-- CreateIndex
CREATE INDEX "DebtEvent_mirroredFromId_idx" ON "DebtEvent"("mirroredFromId");

-- AddForeignKey
ALTER TABLE "DebtEvent" ADD CONSTRAINT "DebtEvent_mirroredFromId_fkey" FOREIGN KEY ("mirroredFromId") REFERENCES "DebtEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
