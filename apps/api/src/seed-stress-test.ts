/**
 * Adds a large, read-heavy dataset to the existing Batool test account.
 *
 * Run from apps/api:
 *   bun src/seed-stress-test.ts
 *
 * The fixed marker makes the script safe to run accidentally twice: a second
 * run aborts instead of duplicating or deleting data.
 */

import { PrismaClient } from "@batool/database";

const prisma = new PrismaClient();
const USER_ID = "cmudu6zxo0000lx10yh8tz559";
const MARKER = "stress-test:v1";
const CHUNK_SIZE = 500;

function chunks<T>(rows: T[], size = CHUNK_SIZE): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    result.push(rows.slice(index, index + size));
  }
  return result;
}

function id(): string {
  return crypto.randomUUID();
}

function atOffset(index: number, total: number): Date {
  const span = 540 * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - span + Math.floor((span * index) / Math.max(total - 1, 1)));
}

async function run(): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: USER_ID },
    select: { id: true, username: true },
  });
  if (user === null) throw new Error(`Test user not found: ${USER_ID}`);

  const existingMarker = await prisma.financialTransaction.count({
    where: { userId: USER_ID, description: { startsWith: MARKER } },
  });
  if (existingMarker > 0) {
    throw new Error(`${MARKER} already exists; refusing to duplicate stress data.`);
  }

  const [accounts, incomeCategories, expenseCategories] = await Promise.all([
    prisma.bankAccount.findMany({ where: { userId: USER_ID, isActive: true }, orderBy: { createdAt: "asc" } }),
    prisma.category.findMany({ where: { type: "INCOME", isActive: true }, select: { id: true } }),
    prisma.category.findMany({ where: { type: "EXPENSE", isActive: true }, select: { id: true } }),
  ]);
  if (accounts.length < 2) throw new Error("At least two active bank accounts are required.");
  if (incomeCategories.length === 0 || expenseCategories.length === 0) {
    throw new Error("At least one active income and expense category are required.");
  }

  const [source, destination] = accounts;
  if (source === undefined || destination === undefined) {
    throw new Error("Could not resolve two bank accounts.");
  }

  const now = new Date();
  const counterparties = Array.from({ length: 250 }, (_, index) => ({
    id: id(),
    ownerUserId: USER_ID,
    kind: "EXTERNAL" as const,
    name: `طرف حساب آزمایشی ${String(index + 1).padStart(4, "0")}`,
    createdAt: new Date(now.getTime() - (250 - index) * 86_400_000),
    updatedAt: now,
  }));
  const counterpartyIds = counterparties.map((counterparty) => counterparty.id);

  const funds = Array.from({ length: 40 }, (_, index) => ({
    id: id(),
    userId: USER_ID,
    name: `صندوق آزمایشی ${String(index + 1).padStart(3, "0")}`,
    goalToman: BigInt(10_000_000 + index * 250_000),
    createdAt: new Date(now.getTime() - (40 - index) * 86_400_000),
    updatedAt: now,
  }));

  const transactionRows: {
    id: string;
    userId: string;
    type: "INCOME" | "EXPENSE";
    amountToman: bigint;
    categoryId: string;
    assetKind: "BANK";
    assetId: string;
    description: string;
    occurredAt: Date;
  }[] = [];
  const movementRows: {
    id: string;
    userId: string;
    assetKind: "BANK";
    assetId: string;
    reason: "INCOME" | "EXPENSE";
    transactionId: string;
    amountToman: bigint;
    occurredAt: Date;
  }[] = [];

  const transactionCount = 8_000;
  for (let index = 0; index < transactionCount; index += 1) {
    const income = index < transactionCount / 2;
    const transactionId = id();
    const occurredAt = atOffset(index, transactionCount);
    const amount = BigInt(income ? 180_000 + (index % 11) * 25_000 : 70_000 + (index % 17) * 15_000);
    const category = income
      ? incomeCategories[index % incomeCategories.length]
      : expenseCategories[index % expenseCategories.length];
    if (category === undefined) throw new Error("Category lookup returned an empty row.");
    transactionRows.push({
      id: transactionId,
      userId: USER_ID,
      type: income ? "INCOME" : "EXPENSE",
      amountToman: amount,
      categoryId: category.id,
      assetKind: "BANK",
      assetId: income ? source.id : destination.id,
      description: `${MARKER}:${income ? "income" : "expense"}:${String(index + 1).padStart(5, "0")}`,
      occurredAt,
    });
    movementRows.push({
      id: id(),
      userId: USER_ID,
      assetKind: "BANK",
      assetId: income ? source.id : destination.id,
      reason: income ? "INCOME" : "EXPENSE",
      transactionId,
      amountToman: income ? amount : -amount,
      occurredAt,
    });
  }

  // Keep the destination account positive after the deliberately dense expense
  // stream. These are ordinary income rows, so the stress dataset remains a
  // valid ledger rather than relying on an impossible negative bank balance.
  for (let index = 0; index < 1_000; index += 1) {
    const transactionId = id();
    const occurredAt = atOffset(index, 1_000);
    const amount = 1_000_000n;
    const category = incomeCategories[index % incomeCategories.length];
    if (category === undefined) throw new Error("Category lookup returned an empty row.");
    transactionRows.push({
      id: transactionId,
      userId: USER_ID,
      type: "INCOME",
      amountToman: amount,
      categoryId: category.id,
      assetKind: "BANK",
      assetId: destination.id,
      description: `${MARKER}:rebalance:${String(index + 1).padStart(4, "0")}`,
      occurredAt,
    });
    movementRows.push({
      id: id(),
      userId: USER_ID,
      assetKind: "BANK",
      assetId: destination.id,
      reason: "INCOME",
      transactionId,
      amountToman: amount,
      occurredAt,
    });
  }

  const transferRows: {
    id: string;
    userId: string;
    sourceKind: "BANK";
    sourceId: string;
    destinationKind: "BANK";
    destinationId: string;
    amountToman: bigint;
    description: string;
    occurredAt: Date;
  }[] = [];
  const transferMovements: {
    id: string;
    userId: string;
    assetKind: "BANK";
    assetId: string;
    reason: "TRANSFER";
    transferId: string;
    amountToman: bigint;
    occurredAt: Date;
  }[] = [];
  const transferCount = 3_000;
  for (let index = 0; index < transferCount; index += 1) {
    const transferId = id();
    const occurredAt = atOffset(index, transferCount);
    const amount = BigInt(25_000 + (index % 8) * 5_000);
    transferRows.push({
      id: transferId,
      userId: USER_ID,
      sourceKind: "BANK",
      sourceId: source.id,
      destinationKind: "BANK",
      destinationId: destination.id,
      amountToman: amount,
      description: `${MARKER}:transfer:${String(index + 1).padStart(5, "0")}`,
      occurredAt,
    });
    transferMovements.push(
      {
        id: id(),
        userId: USER_ID,
        assetKind: "BANK",
        assetId: source.id,
        reason: "TRANSFER",
        transferId,
        amountToman: -amount,
        occurredAt,
      },
      {
        id: id(),
        userId: USER_ID,
        assetKind: "BANK",
        assetId: destination.id,
        reason: "TRANSFER",
        transferId,
        amountToman: amount,
        occurredAt,
      },
    );
  }

  const debtEvents = Array.from({ length: 1_500 }, (_, index) => ({
    id: id(),
    ownerUserId: USER_ID,
    counterpartyId: counterpartyIds[index % counterpartyIds.length] as string,
    kind: "OBLIGATION" as const,
    direction: index % 2 === 0 ? ("OWES_ME" as const) : ("I_OWE" as const),
    amountToman: BigInt(100_000 + (index % 23) * 50_000),
    description: `${MARKER}:debt:${String(index + 1).padStart(4, "0")}`,
    occurredAt: atOffset(index, 1_500),
  }));

  const installments = Array.from({ length: 80 }, (_, index) => ({
    id: id(),
    userId: USER_ID,
    name: `قسط آزمایشی ${String(index + 1).padStart(3, "0")}`,
    description: `${MARKER}:installment`,
    amountToman: BigInt(150_000 + (index % 20) * 25_000),
    totalCount: 12 + (index % 13),
    dueDayOfMonth: 1 + (index % 28),
    startDate: new Date(now.getTime() - (80 - index) * 86_400_000),
    createdAt: new Date(now.getTime() - (80 - index) * 86_400_000),
    updatedAt: now,
  }));

  const profile = await prisma.setarProfile.findUnique({ where: { userId: USER_ID } });
  const setarProfile =
    profile ??
    (await prisma.setarProfile.create({
      data: { userId: USER_ID, tuitionAmountToman: 3_000_000 },
    }));
  const lastSession = await prisma.setarSession.findFirst({
    where: { setarProfileId: setarProfile.id },
    orderBy: { sessionNo: "desc" },
    select: { sessionNo: true },
  });
  const sessions = Array.from({ length: 500 }, (_, index) => ({
    id: id(),
    setarProfileId: setarProfile.id,
    sessionNo: (lastSession?.sessionNo ?? 0) + index + 1,
    occurredAt: atOffset(index, 500),
    description: `${MARKER}:setar:${String(index + 1).padStart(4, "0")}`,
  }));

  await prisma.$transaction(async (tx) => {
    await tx.counterparty.createMany({ data: counterparties });
    await tx.fund.createMany({ data: funds });
    for (const batch of chunks(transactionRows)) await tx.financialTransaction.createMany({ data: batch });
    for (const batch of chunks(movementRows)) await tx.assetMovement.createMany({ data: batch });
    for (const batch of chunks(transferRows)) await tx.transfer.createMany({ data: batch });
    for (const batch of chunks(transferMovements)) await tx.assetMovement.createMany({ data: batch });
    for (const batch of chunks(debtEvents)) await tx.debtEvent.createMany({ data: batch });
    for (const batch of chunks(installments)) await tx.installment.createMany({ data: batch });
    for (const batch of chunks(sessions)) await tx.setarSession.createMany({ data: batch });
  }, { timeout: 120_000 });

  console.log(`Stress data added for ${user.username} (${USER_ID})`);
  console.log(`counterparties: ${counterparties.length}`);
  console.log(`funds: ${funds.length}`);
  console.log(`transactions: ${transactionRows.length}`);
  console.log(`transfers: ${transferRows.length}`);
  console.log(`debt events: ${debtEvents.length}`);
  console.log(`installments: ${installments.length}`);
  console.log(`setar sessions: ${sessions.length}`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
