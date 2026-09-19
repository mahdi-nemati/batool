// Phase 3 seed: global default Persian categories (idempotent upsert).
// Optionally promotes an existing user to ADMIN when SEED_ADMIN_USERNAME is set
// (dev/test convenience — there is no admin-registration UI in the MVP).
import { PrismaClient } from "../src/index";

const prisma = new PrismaClient();

const EXPENSE_CATEGORIES = [
  "غذا",
  "حمل‌ونقل",
  "خرید",
  "قبوض",
  "تفریح",
  "سلامت",
  "آموزش",
  "مسکن",
  "اقساط",
  "شهریه سه‌تار",
  "متفرقه",
];

const INCOME_CATEGORIES = ["حقوق", "فریلنس", "پاداش", "هدیه", "بازگشت هزینه", "متفرقه"];

async function main(): Promise<void> {
  for (const name of EXPENSE_CATEGORIES) {
    await prisma.category.upsert({
      where: { name_type: { name, type: "EXPENSE" } },
      create: { name, type: "EXPENSE", isSystem: true },
      update: {},
    });
  }
  for (const name of INCOME_CATEGORIES) {
    await prisma.category.upsert({
      where: { name_type: { name, type: "INCOME" } },
      create: { name, type: "INCOME", isSystem: true },
      update: {},
    });
  }

  const adminUsername = process.env.SEED_ADMIN_USERNAME;
  if (adminUsername !== undefined && adminUsername.length > 0) {
    const updated = await prisma.user.updateMany({
      where: { username: adminUsername },
      data: { role: "ADMIN" },
    });
    console.log(`Seed: promoted ${adminUsername} to ADMIN (count=${updated.count})`);
  }

  console.log("Seed: default categories ensured.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
