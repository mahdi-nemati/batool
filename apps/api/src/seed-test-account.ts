/**
 * Batool comprehensive test-account seeder.
 *
 * Creates a dedicated test user and populates it with a large, realistic,
 * internally-consistent multi-month dataset (7 Jalali months ending at the
 * current month) using ONLY the application's real domain services — no raw
 * financial writes bypass the ledger business rules.
 *
 * Run: `bun src/seed-test-account.ts` from apps/api. Idempotency: the script
 * aborts with a clear error if the test username/email already exists; it never
 * touches other users.
 *
 * Credentials created:
 *   username: batool_test_user
 *   email:    batool.test@example.com
 *   password: BatoolTest@1405!
 *   nickname: کاربر تست
 *
 * Backdating limitations (by design of the domain services):
 *   - Installment pay() and Setar tuition pay() fix occurredAt = now, so those
 *     expenses land in the current month (documented in the final report).
 *   - Bank-account OPENING movements are dated now.
 */

import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AssetKind, DebtDirection, TransactionType } from "@batool/types";
import { AppModule } from "./app.module";
import { AuthService } from "./auth/auth.service";
import { BankAccountsService } from "./bank-accounts/bank-accounts.service";
import { CategoriesService } from "./categories/categories.service";
import { CounterpartiesService } from "./counterparties/counterparties.service";
import { DashboardService } from "./dashboard/dashboard.service";
import { DebtsService } from "./debts/debts.service";
import { PrismaService } from "./database/prisma.service";
import { FundsService } from "./funds/funds.service";
import { InstallmentsService } from "./installments/installments.service";
import { dueDateForOccurrence } from "./installments/due-date";
import { SetarService } from "./setar/setar.service";
import { TransactionsService } from "./transactions/transactions.service";
import { TransfersService } from "./transfers/transfers.service";
import { UsersService, type RegisterInput } from "./users/users.service";

const CREDENTIALS: RegisterInput = {
  username: "batool_test_user",
  email: "batool.test@example.com",
  password: "BatoolTest@1405!",
  nickname: "کاربر تست",
};

// ---------------------------------------------------------------------------
// Jalali / time helpers (mirror apps/api/src/installments/due-date.ts)
// ---------------------------------------------------------------------------

const TEHRAN = "Asia/Tehran";
const FA_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];
const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

const faNum = (n: number | bigint): string =>
  String(n).replace(/\d/g, (d: string) => FA_DIGITS[Number(d)] ?? d);

const jalaliFormat = new Intl.DateTimeFormat("en-US-u-ca-persian", {
  timeZone: TEHRAN,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function jalaliParts(date: Date): { y: number; m: number; d: number } {
  const values = Object.fromEntries(
    jalaliFormat.formatToParts(date).map((part) => [part.type, Number(part.value)]),
  );
  return { y: values.year ?? NaN, m: values.month ?? NaN, d: values.day ?? NaN };
}

function gregorianForJalali(year: number, month: number, day: number): Date | null {
  const estimate = Date.UTC(year + 621, 2, 21, 12);
  for (let offset = -370; offset <= 370; offset += 1) {
    const candidate = new Date(estimate + offset * 86400000);
    const parts = jalaliParts(candidate);
    if (parts.y === year && parts.m === month && parts.d === day) {
      return new Date(
        Date.UTC(candidate.getUTCFullYear(), candidate.getUTCMonth(), candidate.getUTCDate()),
      );
    }
  }
  return null;
}

/** UTC Date for a Jalali date at a chosen UTC hour (Tehran = +03:30). */
function J(jy: number, jm: number, jd: number, hour = 9): Date {
  const g = gregorianForJalali(jy, jm, jd);
  if (g === null) {
    throw new Error(`jalali ${jy}/${jm}/${jd} does not exist`);
  }
  return new Date(Date.UTC(g.getUTCFullYear(), g.getUTCMonth(), g.getUTCDate(), hour, 30));
}

function shiftJalali(year: number, month: number, delta: number): { y: number; m: number } {
  const index = year * 12 + month - 1 + delta;
  return { y: Math.floor(index / 12), m: (index % 12) + 1 };
}

// ---------------------------------------------------------------------------
// Dataset design
// ---------------------------------------------------------------------------

type Acc = "MAIN" | "DAILY" | "SAVINGS";

interface IncomeDef {
  off: number; // relative offset from current Jalali month (-6 .. 0)
  day: number;
  cat: string;
  amount: number;
  desc: string;
  acc: Acc;
}

interface ExpenseDef {
  off: number;
  day: number;
  cat: string;
  amount: number;
  desc: string;
  acc: Acc;
}

type SplitDef = ExpenseDef & {
  /** `cp` is the counterparty nickname; it is also the participant label. */
  shares: { amount: number; cp: string }[];
};

const INCOMES: IncomeDef[] = [
  // salary each month
  ...([-6, -5, -4, -3, -2, -1, 0] as const).map((off): IncomeDef => ({
    off,
    day: 26,
    cat: "حقوق",
    amount: 22_000_000,
    desc: `حقوق ماه ${faNum(off + 7)}`,
    acc: "MAIN",
  })),
  // freelance (two invoices per month) → daily account
  ...[
    [-6, 1_500_000, "پیش‌پرداخت پروژه دپلوی‌منت"],
    [-6, 1_500_000, "تسویه فاکتور اسفند"],
    [-5, 2_000_000, "پیش‌پرداخت پروژه فروشگاه"],
    [-5, 2_000_000, "میان‌دوره پروژه فروشگاه"],
    [-4, 3_000_000, "تسویه پروژه فروشگاه"],
    [-4, 3_000_000, "پیش‌پرداخت پروژه داشبورد"],
    [-3, 1_000_000, "تسویه پروژه داشبورد"],
    [-3, 1_000_000, "پروژه کوچک آپ"],
    [-2, 4_000_000, "تسویه پروژه پنل مدیریت"],
    [-2, 4_000_000, "پیش‌پرداخت پروژه اپلیکیشن"],
    [-1, 1_500_000, "میان‌دوره پروژه اپلیکیشن"],
    [-1, 1_500_000, "پروژه اصلاح باگ"],
    [0, 4_000_000, "تسویه پروژه اپلیکیشن"],
    [0, 4_000_000, "پیش‌پرداخت پروژه جدید"],
  ].map(([off, amount, desc]): IncomeDef => ({
    off: off as number,
    day: 14,
    cat: "فریلنس",
    amount: amount as number,
    desc: desc as string,
    acc: "DAILY",
  })),
  { off: -5, day: 8, cat: "هدیه", amount: 2_000_000, desc: "عیدی نوروز", acc: "DAILY" },
  { off: -4, day: 18, cat: "پاداش", amount: 2_000_000, desc: "پاداش سهماهه", acc: "DAILY" },
  { off: 0, day: 10, cat: "پاداش", amount: 1_500_000, desc: "پاداش پروژه تحویل‌شده", acc: "DAILY" },
  {
    off: -2,
    day: 20,
    cat: "بازگشت هزینه",
    amount: 800_000,
    desc: "بازگشت هزینه بیمه",
    acc: "DAILY",
  },
  {
    off: 0,
    day: 17,
    cat: "بازگشت هزینه",
    amount: 600_000,
    desc: "بازگشت هزینه اینترنت",
    acc: "DAILY",
  },
  { off: -1, day: 16, cat: "متفرقه", amount: 1_000_000, desc: "سود سپرده بانکی", acc: "DAILY" },
];

// Manual expenses per offset. Current month is lighter on purpose: the
// installment / Setar pay() expenses land there via the real services.
const MONTHLY_EXPENSES: Record<number, ExpenseDef[]> = {
  [-6]: [
    { off: -6, day: 1, cat: "مسکن", amount: 6_500_000, desc: "اجاره خانه", acc: "MAIN" },
    { off: -6, day: 3, cat: "قبض و خدمات", amount: 800_000, desc: "اینترنت خانگی", acc: "MAIN" },
    { off: -6, day: 5, cat: "قبوض", amount: 1_300_000, desc: "قبض برق، آب و گاز", acc: "MAIN" },
    { off: -6, day: 6, cat: "غذا", amount: 700_000, desc: "رستوران آخر هفته", acc: "DAILY" },
    { off: -6, day: 4, cat: "خوراک", amount: 850_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    { off: -6, day: 11, cat: "خوراک", amount: 900_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    { off: -6, day: 18, cat: "خوراک", amount: 780_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    { off: -6, day: 25, cat: "خوراک", amount: 820_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    {
      off: -6,
      day: 8,
      cat: "خرید",
      amount: 1_200_000,
      desc: "سوپرمارکت و نیازهای خانه",
      acc: "DAILY",
    },
    { off: -6, day: 7, cat: "حملونقل", amount: 850_000, desc: "بنزین", acc: "DAILY" },
    { off: -6, day: 14, cat: "حملونقل", amount: 350_000, desc: "کرایه و اسنپ", acc: "DAILY" },
    { off: -6, day: 12, cat: "تفریح", amount: 800_000, desc: "سینما و کافه", acc: "MAIN" },
    { off: -6, day: 16, cat: "سلامت", amount: 450_000, desc: "داروخانه", acc: "MAIN" },
    { off: -6, day: 20, cat: "متفرقه", amount: 300_000, desc: "هزینه‌های کوچک", acc: "MAIN" },
  ],
  [-5]: [
    { off: -5, day: 1, cat: "مسکن", amount: 6_500_000, desc: "اجاره خانه", acc: "MAIN" },
    { off: -5, day: 3, cat: "قبض و خدمات", amount: 800_000, desc: "اینترنت خانگی", acc: "MAIN" },
    { off: -5, day: 5, cat: "قبوض", amount: 1_100_000, desc: "قبض برق، آب و گاز", acc: "MAIN" },
    { off: -5, day: 10, cat: "پوشاک", amount: 2_200_000, desc: "خرید لباس عید", acc: "MAIN" },
    { off: -5, day: 4, cat: "خوراک", amount: 830_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    { off: -5, day: 11, cat: "خوراک", amount: 880_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    { off: -5, day: 18, cat: "خوراک", amount: 760_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    { off: -5, day: 26, cat: "خوراک", amount: 1_050_000, desc: "خرید عید نوروز", acc: "DAILY" },
    { off: -5, day: 8, cat: "خرید", amount: 1_400_000, desc: "سوپرمارکت عید", acc: "DAILY" },
    { off: -5, day: 7, cat: "حملونقل", amount: 920_000, desc: "بنزین و عوارض", acc: "DAILY" },
    { off: -5, day: 14, cat: "حملونقل", amount: 380_000, desc: "کرایه و اسنپ", acc: "DAILY" },
    { off: -5, day: 12, cat: "تفریح", amount: 950_000, desc: "یک‌روز گردش عید", acc: "MAIN" },
    { off: -5, day: 22, cat: "متفرقه", amount: 250_000, desc: "قلک و نیازهای کوچک", acc: "MAIN" },
  ],
  [-4]: [
    { off: -4, day: 1, cat: "مسکن", amount: 6_500_000, desc: "اجاره خانه", acc: "MAIN" },
    { off: -4, day: 3, cat: "قبض و خدمات", amount: 800_000, desc: "اینترنت خانگی", acc: "MAIN" },
    { off: -4, day: 5, cat: "قبوض", amount: 1_250_000, desc: "قبض برق، آب و گاز", acc: "MAIN" },
    { off: -4, day: 22, cat: "آموزش", amount: 1_200_000, desc: "کتاب و دوره آنلاین", acc: "MAIN" },
    { off: -4, day: 4, cat: "خوراک", amount: 840_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    { off: -4, day: 11, cat: "خوراک", amount: 860_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    { off: -4, day: 18, cat: "خوراک", amount: 760_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    { off: -4, day: 26, cat: "خوراک", amount: 800_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    {
      off: -4,
      day: 8,
      cat: "خرید",
      amount: 1_150_000,
      desc: "سوپرمارکت و نیازهای خانه",
      acc: "DAILY",
    },
    { off: -4, day: 7, cat: "حملونقل", amount: 830_000, desc: "بنزین", acc: "DAILY" },
    { off: -4, day: 14, cat: "حملونقل", amount: 340_000, desc: "کرایه و اسنپ", acc: "DAILY" },
    { off: -4, day: 12, cat: "تفریح", amount: 750_000, desc: "کافه و خیابان‌گردی", acc: "MAIN" },
    { off: -4, day: 19, cat: "متفرقه", amount: 280_000, desc: "چای و تنقلات", acc: "MAIN" },
  ],
  [-3]: [
    { off: -3, day: 1, cat: "مسکن", amount: 6_500_000, desc: "اجاره خانه", acc: "MAIN" },
    { off: -3, day: 3, cat: "قبض و خدمات", amount: 800_000, desc: "اینترنت خانگی", acc: "MAIN" },
    { off: -3, day: 5, cat: "قبوض", amount: 1_100_000, desc: "قبض برق، آب و گاز", acc: "MAIN" },
    { off: -3, day: 16, cat: "سلامت", amount: 550_000, desc: "پاراکلینیک و آزمایش", acc: "MAIN" },
    { off: -3, day: 4, cat: "خوراک", amount: 820_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    { off: -3, day: 11, cat: "خوراک", amount: 890_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    { off: -3, day: 18, cat: "خوراک", amount: 770_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    { off: -3, day: 26, cat: "خوراک", amount: 810_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    { off: -3, day: 8, cat: "خرید", amount: 1_180_000, desc: "سوپرمارکت", acc: "DAILY" },
    { off: -3, day: 7, cat: "حملونقل", amount: 860_000, desc: "بنزین", acc: "DAILY" },
    { off: -3, day: 14, cat: "حملونقل", amount: 350_000, desc: "کرایه و اسنپ", acc: "DAILY" },
    { off: -3, day: 12, cat: "تفریح", amount: 820_000, desc: "سینما", acc: "MAIN" },
    { off: -3, day: 21, cat: "متفرقه", amount: 300_000, desc: "هزینه‌های کوچک", acc: "MAIN" },
  ],
  [-2]: [
    { off: -2, day: 1, cat: "مسکن", amount: 6_500_000, desc: "اجاره خانه", acc: "MAIN" },
    { off: -2, day: 3, cat: "قبض و خدمات", amount: 800_000, desc: "اینترنت خانگی", acc: "MAIN" },
    { off: -2, day: 5, cat: "قبوض", amount: 1_350_000, desc: "قبض تابستانی", acc: "MAIN" },
    { off: -2, day: 10, cat: "تفریح", amount: 4_000_000, desc: "هزینه سفر قشم", acc: "MAIN" },
    { off: -2, day: 4, cat: "خوراک", amount: 840_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    { off: -2, day: 11, cat: "خوراک", amount: 860_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    { off: -2, day: 18, cat: "خوراک", amount: 780_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    { off: -2, day: 26, cat: "خوراک", amount: 830_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    { off: -2, day: 8, cat: "خرید", amount: 1_200_000, desc: "سوپرمارکت", acc: "DAILY" },
    { off: -2, day: 7, cat: "حملونقل", amount: 870_000, desc: "بنزین", acc: "DAILY" },
    { off: -2, day: 14, cat: "حملونقل", amount: 360_000, desc: "کرایه و اسنپ", acc: "DAILY" },
    { off: -2, day: 22, cat: "متفرقه", amount: 320_000, desc: "هزینه‌های کوچک", acc: "MAIN" },
  ],
  [-1]: [
    { off: -1, day: 1, cat: "مسکن", amount: 6_500_000, desc: "اجاره خانه", acc: "MAIN" },
    { off: -1, day: 3, cat: "قبض و خدمات", amount: 800_000, desc: "اینترنت خانگی", acc: "MAIN" },
    { off: -1, day: 5, cat: "قبوض", amount: 1_200_000, desc: "قبض برق، آب و گاز", acc: "MAIN" },
    { off: -1, day: 11, cat: "پوشاک", amount: 2_400_000, desc: "خرید لباس پاییزی", acc: "MAIN" },
    { off: -1, day: 15, cat: "سلامت", amount: 420_000, desc: "داروخانه", acc: "MAIN" },
    { off: -1, day: 4, cat: "خوراک", amount: 830_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    { off: -1, day: 11, cat: "خوراک", amount: 870_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    { off: -1, day: 18, cat: "خوراک", amount: 760_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    { off: -1, day: 26, cat: "خوراک", amount: 810_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    { off: -1, day: 8, cat: "خرید", amount: 1_190_000, desc: "سوپرمارکت", acc: "DAILY" },
    { off: -1, day: 7, cat: "حملونقل", amount: 850_000, desc: "بنزین", acc: "DAILY" },
    { off: -1, day: 14, cat: "حملونقل", amount: 350_000, desc: "کرایه و اسنپ", acc: "DAILY" },
    { off: -1, day: 12, cat: "تفریح", amount: 780_000, desc: "کافه", acc: "MAIN" },
    { off: -1, day: 20, cat: "متفرقه", amount: 300_000, desc: "هزینه‌های کوچک", acc: "MAIN" },
  ],
  [0]: [
    { off: 0, day: 1, cat: "مسکن", amount: 6_500_000, desc: "اجاره خانه", acc: "MAIN" },
    { off: 0, day: 3, cat: "قبض و خدمات", amount: 800_000, desc: "اینترنت خانگی", acc: "MAIN" },
    { off: 0, day: 5, cat: "قبوض", amount: 1_300_000, desc: "قبض برق، آب و گاز", acc: "MAIN" },
    { off: 0, day: 4, cat: "خوراک", amount: 840_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    { off: 0, day: 11, cat: "خوراک", amount: 860_000, desc: "خرید هفتگی بازار", acc: "DAILY" },
    { off: 0, day: 8, cat: "خرید", amount: 1_200_000, desc: "سوپرمارکت", acc: "DAILY" },
    { off: 0, day: 7, cat: "حملونقل", amount: 860_000, desc: "بنزین", acc: "DAILY" },
    { off: 0, day: 14, cat: "حملونقل", amount: 350_000, desc: "کرایه و اسنپ", acc: "DAILY" },
    { off: 0, day: 12, cat: "تفریح", amount: 800_000, desc: "سینما", acc: "MAIN" },
    { off: 0, day: 20, cat: "متفرقه", amount: 300_000, desc: "هزینه‌های کوچک", acc: "MAIN" },
  ],
};

// Split expenses with counterparty-linked shares (→ OWES_ME receivables).
const SPLITS: SplitDef[] = [
  {
    off: -2,
    day: 14,
    cat: "تفریح",
    amount: 3_600_000,
    desc: "شام دوستانه",
    acc: "DAILY",
    shares: [
      { amount: 1_200_000, cp: "سارا" },
      { amount: 1_200_000, cp: "مهدی" },
    ],
  },
  {
    off: -1,
    day: 9,
    cat: "تفریح",
    amount: 4_000_000,
    desc: "ناهار جمع رفقا",
    acc: "DAILY",
    shares: [
      { amount: 1_500_000, cp: "سارا" },
      { amount: 1_500_000, cp: "مریم" },
    ],
  },
];

const COUNTERPARTIES = ["سارا", "مهدی", "مریم", "احمد", "رضا", "شرکت نرم‌افزاری آریا"];

interface DebtDef {
  off: number;
  day: number;
  cp: string;
  direction: DebtDirection;
  amount: number;
  desc: string;
}

const DEBT_OBLIGATIONS: DebtDef[] = [
  {
    off: -5,
    day: 18,
    cp: "احمد",
    direction: DebtDirection.I_OWE,
    amount: 3_000_000,
    desc: "قرض از احمد",
  },
  {
    off: -4,
    day: 12,
    cp: "مریم",
    direction: DebtDirection.I_OWE,
    amount: 4_500_000,
    desc: "قرض از مریم",
  },
  {
    off: -2,
    day: 9,
    cp: "مهدی",
    direction: DebtDirection.OWES_ME,
    amount: 2_500_000,
    desc: "قرض به مهدی",
  },
  {
    off: -1,
    day: 15,
    cp: "سارا",
    direction: DebtDirection.OWES_ME,
    amount: 5_000_000,
    desc: "قرض به سارا",
  },
];

/**
 * Debt payments only. The service rejects a payment when the current user is
 * not the debtor, so every entry here belongs to a counterparty the seeded user
 * owes; there is no "receive" settlement.
 */
const DEBT_SETTLEMENTS: {
  off: number;
  day: number;
  cp: string;
  amount: number;
  acc: Acc;
  desc: string;
}[] = [
  {
    off: -3,
    day: 22,
    cp: "احمد",
    amount: 3_000_000,
    acc: "MAIN",
    desc: "تسویه کامل قرض از احمد",
  },
  {
    // The seeded user owes مهدی nothing (the مهدی debt runs the other way), so
    // the second payment belongs to مریم, whose 4,500,000 obligation was reduced
    // to 3,000,000 by her 1,500,000 share of the split lunch.
    off: 0,
    day: 4,
    cp: "مریم",
    amount: 1_500_000,
    acc: "MAIN",
    desc: "بخشی از قرض به مریم پرداخت شد",
  },
];

interface TransferOp {
  off: number;
  day: number;
  srcKind: AssetKind;
  srcId?: string;
  dstKind: AssetKind;
  dstId?: string;
  toman: number;
  gram?: number;
  usd?: number;
  label: string;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const log = (msg: string): void => console.log(`  • ${msg}`);
  const prisma = app.get(PrismaService);
  let createdUserId: string | undefined;

  try {
    const users = app.get(UsersService);
    const auth = app.get(AuthService);
    const categories = app.get(CategoriesService);
    const banks = app.get(BankAccountsService);
    const funds = app.get(FundsService);
    const txs = app.get(TransactionsService);
    const counterparties = app.get(CounterpartiesService);
    const transfers = app.get(TransfersService);
    const debts = app.get(DebtsService);
    const installments = app.get(InstallmentsService);
    const setar = app.get(SetarService);
    const dashboard = app.get(DashboardService);

    // ---- guard: never clobber an existing account -------------------------
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username: CREDENTIALS.username.trim().toLowerCase() },
          { email: users.normalizeEmail(CREDENTIALS.email) },
        ],
      },
    });
    if (existing !== null) {
      throw new Error(
        `[seed] abort: username/email already taken by user id=${existing.id}. ` +
          `Refusing to modify existing accounts.`,
      );
    }

    // ---- 1. user ----------------------------------------------------------
    const user = await users.create(CREDENTIALS);
    const userId = user.id;
    createdUserId = userId;
    log(`user "${CREDENTIALS.username}" created (id=${userId})`);

    // ---- 2. categories ----------------------------------------------------
    // Names are matched after stripping ZWNJ (U+200C) so dataset spellings can't
    // drift from the seeded ones (e.g. «حمل‌ونقل» vs «حملونقل»).
    const keyNormalize = (s: string): string => s.replace(/\u200c/g, "");
    const catMap = new Map<string, string>();
    for (const c of await categories.listAll()) {
      catMap.set(keyNormalize(`${c.type}:${c.name}`), c.id);
    }
    const ensureCategory = async (name: string, type: "INCOME" | "EXPENSE"): Promise<void> => {
      const key = keyNormalize(`${type}:${name}`);
      if (!catMap.has(key)) {
        const created = await categories.create({ name, type });
        catMap.set(key, created.id);
        log(`category added: ${type} «${name}»`);
      }
    };
    await ensureCategory("پروژه", "INCOME");
    await ensureCategory("درمان", "EXPENSE");
    await ensureCategory("خودرو", "EXPENSE");
    // Installment payments and Setar tuition look these categories up by name.
    await ensureCategory("اقساط", "EXPENSE");
    await ensureCategory("شهریه سه‌تار", "EXPENSE");
    // Every category referenced by the dataset above must exist, otherwise the
    // run aborts on the first transaction of an unseeded category.
    for (const name of new Set(INCOMES.map((d) => d.cat))) {
      await ensureCategory(name, "INCOME");
    }
    for (const name of new Set(
      Object.values(MONTHLY_EXPENSES)
        .flat()
        .map((d) => d.cat),
    )) {
      await ensureCategory(name, "EXPENSE");
    }
    for (const name of new Set(SPLITS.map((d) => d.cat))) {
      await ensureCategory(name, "EXPENSE");
    }
    const catId = (type: "INCOME" | "EXPENSE", name: string): string => {
      const id = catMap.get(keyNormalize(`${type}:${name}`));
      if (id === undefined) {
        throw new Error(`[seed] missing category ${type}:${name}`);
      }
      return id;
    };

    // ---- 3. accounts & funds ----------------------------------------------
    const [mainAcc, savingsAcc, dailyAcc] = await Promise.all([
      banks.create(userId, { name: "حساب اصلی (ملی)", initialBalanceToman: 45_000_000 }),
      banks.create(userId, { name: "حساب پس‌انداز (ملت)", initialBalanceToman: 80_000_000 }),
      banks.create(userId, { name: "حساب روزمره (سامان)", initialBalanceToman: 12_000_000 }),
    ]);
    log("3 bank accounts created");
    const accId = (a: Acc): string =>
      a === "MAIN" ? mainAcc.id : a === "DAILY" ? dailyAcc.id : savingsAcc.id;

    const [emergFund, laptopFund, tripFund, charityFund] = await Promise.all([
      funds.create(userId, { name: "صندوق اضطراری", goalToman: 50_000_000 }),
      funds.create(userId, { name: "صندوق خرید لپ‌تاپ", goalToman: 35_000_000 }),
      funds.create(userId, { name: "صندوق سفر", goalToman: 30_000_000 }),
      funds.create(userId, { name: "صندوق خیریه", goalToman: 20_000_000 }),
    ]);
    log("4 funds created");

    // ---- 4. time window + incomes -----------------------------------------
    const now = new Date();
    const today = jalaliParts(now);
    const months = Array.from({ length: 7 }, (_, i) => shiftJalali(today.y, today.m, i - 6));
    const monthOf = (off: number): { y: number; m: number } => {
      const mo = months[off + 6];
      if (mo === undefined) {
        throw new Error(`[seed] invalid month offset ${off}`);
      }
      return mo;
    };
    const at = (off: number, day: number): Date => {
      const mo = monthOf(off);
      // Current-month events are clamped to "today" so the seed always produces
      // current-month data regardless of when it is run (works even on day 1).
      const d = off === 0 ? Math.min(day, Math.max(today.d, 1)) : day;
      return J(mo.y, mo.m, d);
    };
    const monthLabel = (off: number): string =>
      `${FA_MONTHS[monthOf(off).m - 1]} ${faNum(monthOf(off).y)}`;
    const isPastDay = (off: number, _day: number): boolean => off <= 0;

    let incomeCount = 0;
    for (const inc of INCOMES) {
      if (!isPastDay(inc.off, inc.day)) continue;
      await txs.create(userId, {
        type: TransactionType.INCOME,
        amountToman: inc.amount,
        categoryId: catId("INCOME", inc.cat),
        assetKind: AssetKind.BANK,
        assetId: accId(inc.acc),
        description: `${inc.desc} — ${monthLabel(inc.off)}`,
        occurredAt: at(inc.off, inc.day).toISOString(),
      });
      incomeCount += 1;
    }
    log(`incomes created: ${incomeCount}`);

    // ---- 5. counterparties (needed before split expenses) -----------------
    const cpIds = new Map<string, string>();
    for (const name of COUNTERPARTIES) {
      const cp = await counterparties.createExternal(userId, { name });
      cpIds.set(name, cp.id);
    }
    log(`counterparties created: ${COUNTERPARTIES.length}`);

    // ---- 6. expenses (manual + split) -------------------------------------
    let expenseCount = 0;
    for (const exp of Object.values(MONTHLY_EXPENSES).flat()) {
      if (!isPastDay(exp.off, exp.day)) continue;
      await txs.create(userId, {
        type: TransactionType.EXPENSE,
        amountToman: exp.amount,
        categoryId: catId("EXPENSE", exp.cat),
        assetKind: AssetKind.BANK,
        assetId: accId(exp.acc),
        description: `${exp.desc} — ${monthLabel(exp.off)}`,
        occurredAt: at(exp.off, exp.day).toISOString(),
      });
      expenseCount += 1;
    }
    for (const split of SPLITS) {
      if (!isPastDay(split.off, split.day)) continue;
      await txs.create(userId, {
        type: TransactionType.EXPENSE,
        amountToman: split.amount,
        categoryId: catId("EXPENSE", split.cat),
        assetKind: AssetKind.BANK,
        assetId: accId(split.acc),
        description: `${split.desc} — ${monthLabel(split.off)}`,
        occurredAt: at(split.off, split.day).toISOString(),
        shares: split.shares.map((s) => {
          const counterpartyId = cpIds.get(s.cp);
          if (counterpartyId === undefined) {
            throw new Error(`[seed] counterparty ${s.cp} not created`);
          }
          // The counterparty nickname is the participant label (single source
          // of truth), exactly like the API does.
          return { label: s.cp, amountToman: s.amount, counterpartyId };
        }),
      });
      expenseCount += 1;
    }
    log(`expenses created: ${expenseCount} (incl. ${SPLITS.length} split)`);

    // ---- 7. debt obligations & settlements --------------------------------
    for (const d of DEBT_OBLIGATIONS) {
      await debts.createObligation(userId, {
        counterpartyId: cpIds.get(d.cp) ?? "",
        direction: d.direction,
        amountToman: d.amount,
        description: d.desc,
        occurredAt: at(d.off, d.day).toISOString(),
      });
    }
    for (const s of DEBT_SETTLEMENTS) {
      await debts.settle(userId, {
        counterpartyId: cpIds.get(s.cp) ?? "",
        amountToman: s.amount,
        assetKind: AssetKind.BANK,
        assetId: accId(s.acc),
        description: s.desc,
        occurredAt: at(s.off, s.day).toISOString(),
      });
    }
    log("debt obligations & settlements created");

    // ---- 8. transfers (inserted in movement-safe order) -------------------
    const ops: TransferOp[] = [
      // bank → bank sweeps
      {
        off: -3,
        day: 17,
        srcKind: AssetKind.BANK,
        srcId: savingsAcc.id,
        dstKind: AssetKind.BANK,
        dstId: mainAcc.id,
        toman: 2_000_000,
        label: "انتقال پس‌انداز → اصلی",
      },
      {
        off: -1,
        day: 17,
        srcKind: AssetKind.BANK,
        srcId: savingsAcc.id,
        dstKind: AssetKind.BANK,
        dstId: mainAcc.id,
        toman: 2_000_000,
        label: "انتقال پس‌انداز → اصلی",
      },
      // savings → funds (deposits first)
      ...([-6, -5, -4, -3, -2, -1, 0] as const).map((off): TransferOp => ({
        off,
        day: 16,
        srcKind: AssetKind.BANK,
        srcId: savingsAcc.id,
        dstKind: AssetKind.FUND,
        dstId: emergFund.id,
        toman: 2_000_000,
        label: "واریز به صندوق اضطراری",
      })),
      ...([-5, -4, -3, -2, -1, 0] as const).map((off): TransferOp => ({
        off,
        day: 18,
        srcKind: AssetKind.BANK,
        srcId: savingsAcc.id,
        dstKind: AssetKind.FUND,
        dstId: laptopFund.id,
        toman: 1_500_000,
        label: "واریز به صندوق لپ‌تاپ",
      })),
      ...([-5, -4, -3, -2] as const).map((off): TransferOp => ({
        off,
        day: 20,
        srcKind: AssetKind.BANK,
        srcId: savingsAcc.id,
        dstKind: AssetKind.FUND,
        dstId: tripFund.id,
        toman: 1_200_000,
        label: "واریز به صندوق سفر",
      })),
      ...([-4, -2, 0] as const).map((off): TransferOp => ({
        off,
        day: 22,
        srcKind: AssetKind.BANK,
        srcId: dailyAcc.id,
        dstKind: AssetKind.FUND,
        dstId: charityFund.id,
        toman: 500_000,
        label: "واریز به صندوق خیریه",
      })),
      // fund → bank (after that fund's deposits)
      {
        off: -2,
        day: 8,
        srcKind: AssetKind.FUND,
        srcId: tripFund.id,
        dstKind: AssetKind.BANK,
        dstId: dailyAcc.id,
        toman: 4_000_000,
        label: "برداشت صندوق سفر برای سفر",
      },
      // gold (buys before the sell)
      {
        off: -5,
        day: 21,
        srcKind: AssetKind.BANK,
        srcId: savingsAcc.id,
        dstKind: AssetKind.GOLD,
        toman: 11_200_000,
        gram: 2,
        label: "خرید ۲ گرم طلا",
      },
      {
        off: -3,
        day: 21,
        srcKind: AssetKind.BANK,
        srcId: savingsAcc.id,
        dstKind: AssetKind.GOLD,
        toman: 17_100_000,
        gram: 3,
        label: "خرید ۳ گرم طلا",
      },
      {
        off: -2,
        day: 27,
        srcKind: AssetKind.GOLD,
        dstKind: AssetKind.BANK,
        dstId: savingsAcc.id,
        toman: 5_950_000,
        gram: 1,
        label: "فروش ۱ گرم طلا",
      },
      {
        off: 0,
        day: 13,
        srcKind: AssetKind.BANK,
        srcId: mainAcc.id,
        dstKind: AssetKind.GOLD,
        toman: 11_600_000,
        gram: 2,
        label: "خرید ۲ گرم طلا",
      },
      // USD (buys before the sell)
      {
        off: -6,
        day: 23,
        srcKind: AssetKind.BANK,
        srcId: savingsAcc.id,
        dstKind: AssetKind.USD,
        toman: 14_325_000,
        usd: 150,
        label: "خرید ۱۵۰ دلار",
      },
      {
        off: -3,
        day: 15,
        srcKind: AssetKind.USD,
        dstKind: AssetKind.BANK,
        dstId: savingsAcc.id,
        toman: 7_760_000,
        usd: 80,
        label: "فروش ۸۰ دلار",
      },
      {
        off: -2,
        day: 7,
        srcKind: AssetKind.BANK,
        srcId: mainAcc.id,
        dstKind: AssetKind.USD,
        toman: 19_300_000,
        usd: 200,
        label: "خرید ۲۰۰ دلار",
      },
      {
        off: 0,
        day: 9,
        srcKind: AssetKind.BANK,
        srcId: mainAcc.id,
        dstKind: AssetKind.USD,
        toman: 24_500_000,
        usd: 250,
        label: "خرید ۲۵۰ دلار",
      },
    ];

    let transferCount = 0;
    for (const op of ops) {
      if (!isPastDay(op.off, op.day)) continue;
      const dto: {
        sourceKind: AssetKind;
        sourceId?: string;
        destinationKind: AssetKind;
        destinationId?: string;
        amountToman: number;
        amountGram?: string;
        amountUsd?: string;
        occurredAt: string;
      } = {
        sourceKind: op.srcKind,
        destinationKind: op.dstKind,
        amountToman: op.toman,
        occurredAt: at(op.off, op.day).toISOString(),
      };
      if (op.srcId !== undefined) dto.sourceId = op.srcId;
      if (op.dstId !== undefined) dto.destinationId = op.dstId;
      if (op.gram !== undefined) dto.amountGram = String(op.gram);
      if (op.usd !== undefined) dto.amountUsd = String(op.usd);
      await transfers.create(userId, dto);
      transferCount += 1;
    }
    log(`transfers created: ${transferCount}`);

    // ---- 9. installments --------------------------------------------------
    interface InstallPlan {
      name: string;
      amount: number;
      total: number;
      dueDay: number;
      startOff: number;
      payments: number;
    }
    const plans: InstallPlan[] = [
      { name: "اقساط موبایل", amount: 1_200_000, total: 8, dueDay: 2, startOff: -6, payments: 6 },
      { name: "اقساط مبل سالن", amount: 850_000, total: 8, dueDay: 4, startOff: -6, payments: 6 },
      { name: "اقساط تلویزیون", amount: 650_000, total: 6, dueDay: 1, startOff: -3, payments: 3 },
      {
        name: "اقساط تعمیر ماشین",
        amount: 300_000,
        total: 6,
        dueDay: 7,
        startOff: -6,
        payments: 0,
      },
      {
        name: "اقساط یخچال فریزر",
        amount: 500_000,
        total: 12,
        dueDay: 20,
        startOff: 0,
        payments: 0,
      },
    ];
    const installmentIds: string[] = [];
    for (const p of plans) {
      const start = at(p.startOff, 1);
      const created = await installments.create(userId, {
        name: p.name,
        amountToman: p.amount,
        totalCount: p.total,
        dueDayOfMonth: p.dueDay,
        startDate: start.getTime(),
      });
      installmentIds.push(created.id);
      for (let i = 0; i < p.payments; i += 1) {
        await installments.pay(userId, created.id, {
          assetKind: AssetKind.BANK,
          assetId: mainAcc.id,
        });
      }
    }
    log(`installment plans created: ${plans.length} (payments recorded now)`);

    // ---- 10. Setar ---------------------------------------------------------
    await setar.create(userId, { tuitionAmountToman: 3_000_000 });
    const session = async (off: number, day: number, desc: string): Promise<void> => {
      await setar.createSession(userId, { occurredAt: at(off, day).getTime(), description: desc });
    };
    await session(-6, 5, "جلسه ۱ از چرخه ۱");
    await session(-5, 6, "جلسه ۲ از چرخه ۱");
    await session(-4, 7, "جلسه ۳ از چرخه ۱");
    await session(-3, 8, "جلسه ۴ از چرخه ۱");
    await setar.pay(userId, { assetKind: AssetKind.BANK, assetId: mainAcc.id });
    await session(-2, 9, "جلسه ۱ از چرخه ۲");
    await session(-1, 10, "جلسه ۲ از چرخه ۲");
    await session(0, 2, "جلسه ۳ از چرخه ۲");
    await session(0, 11, "جلسه ۴ از چرخه ۲");
    await setar.pay(userId, { assetKind: AssetKind.BANK, assetId: mainAcc.id });
    await session(0, 18, "جلسه ۱ از چرخه ۳");
    await session(0, 25, "جلسه ۲ از چرخه ۳");
    log("setar profile, 10 sessions and 2 tuition payments created");

    // ---- 11. verification --------------------------------------------------
    console.log("\n========== VERIFICATION ==========");

    const login = await auth.login(
      { email: CREDENTIALS.email, password: CREDENTIALS.password },
      { userAgent: "seed-script", ipAddress: "127.0.0.1" },
    );
    console.log(`login OK → token issued for ${login.user.username}`);

    const setarProfileId = (await prisma.setarProfile.findUnique({ where: { userId } }))?.id;

    const [
      bankCount,
      fundCount,
      txnCount,
      transferCountDb,
      cpCount,
      debtCount,
      instCount,
      instPayCount,
      sessCount,
      setarPayCount,
      movCount,
      goldWalCount,
      usdWalCount,
    ] = await Promise.all([
      prisma.bankAccount.count({ where: { userId } }),
      prisma.fund.count({ where: { userId } }),
      prisma.financialTransaction.count({ where: { userId } }),
      prisma.transfer.count({ where: { userId } }),
      prisma.counterparty.count({ where: { ownerUserId: userId } }),
      prisma.debtEvent.count({ where: { ownerUserId: userId } }),
      prisma.installment.count({ where: { userId } }),
      prisma.installmentPayment.count({ where: { installment: { userId } } }),
      prisma.setarSession.count({ where: setarProfileId !== undefined ? { setarProfileId } : {} }),
      prisma.setarTuitionPayment.count({
        where: setarProfileId !== undefined ? { setarProfileId } : {},
      }),
      prisma.assetMovement.count({ where: { userId } }),
      prisma.goldWallet.count({ where: { userId } }),
      prisma.usdWallet.count({ where: { userId } }),
    ]);
    console.log(`bank accounts: ${bankCount}, funds: ${fundCount}`);
    console.log(`transactions: ${txnCount} (income+expense), transfers: ${transferCountDb}`);
    console.log(`counterparties: ${cpCount}, debt events: ${debtCount}`);
    console.log(`installments: ${instCount} (payments: ${instPayCount})`);
    console.log(`setar sessions: ${sessCount}, tuition payments: ${setarPayCount}`);
    console.log(
      `gold wallets: ${goldWalCount}, usd wallets: ${usdWalCount}, ledger movements: ${movCount}`,
    );

    // monthly aggregates (real service path)
    const summary = await dashboard.summary(userId);
    console.log(
      `dashboard summary (current month): income=${faNum(summary.monthly.incomeToman)} expenses=${faNum(summary.monthly.expenseToman)} net=${faNum(summary.monthly.netCashFlowToman)}`,
    );

    const txnRows = await prisma.financialTransaction.findMany({ where: { userId } });
    const byMonth = new Map<string, { income: number; expense: number }>();
    for (const r of txnRows) {
      const p = jalaliParts(r.occurredAt);
      const key = `${p.y}-${p.m}`;
      const entry = byMonth.get(key) ?? { income: 0, expense: 0 };
      if (r.type === "INCOME") entry.income += Number(r.amountToman);
      else entry.expense += Number(r.amountToman);
      byMonth.set(key, entry);
    }
    console.log("monthly income/expense:");
    for (const [key, v] of [...byMonth.entries()].sort()) {
      console.log(
        `  ${FA_MONTHS[Number(key.split("-")[1]) - 1]} ${faNum(Number(key.split("-")[0]))}: +${faNum(v.income)} / -${faNum(v.expense)}`,
      );
    }

    // asset balances (derived from movements, never stored)
    const balRows = await prisma.assetMovement.groupBy({
      by: ["assetKind", "assetId"],
      where: { userId },
      _sum: { amountToman: true, amountGram: true, amountUsd: true },
    });
    for (const r of balRows) {
      const toman = r._sum.amountToman !== null ? Number(r._sum.amountToman) : 0;
      const gram = r._sum.amountGram !== null ? r._sum.amountGram.toNumber() : 0;
      const usd = r._sum.amountUsd !== null ? r._sum.amountUsd.toNumber() : 0;
      if (r.assetKind === "BANK") {
        const b = await prisma.bankAccount.findUnique({ where: { id: r.assetId } });
        console.log(`  BANK ${b?.name ?? "?"}: ${faNum(toman)}`);
      } else if (r.assetKind === "FUND") {
        const f = await prisma.fund.findUnique({ where: { id: r.assetId } });
        console.log(`  FUND ${f?.name ?? "?"}: ${faNum(toman)}`);
      } else if (r.assetKind === "GOLD") {
        console.log(`  GOLD: ${gram} grams`);
      } else if (r.assetKind === "USD") {
        console.log(`  USD: ${usd} dollars`);
      }
    }

    // upcoming / overdue installments (next unpaid occurrence)
    const instRows = await prisma.installment.findMany({
      where: { userId },
      include: { _count: { select: { payments: true } } },
    });
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    console.log("installments (next unpaid occurrence):");
    for (const inst of instRows) {
      const next = inst._count.payments + 1;
      const due = dueDateForOccurrence(inst.startDate, inst.dueDayOfMonth, next);
      const du = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
      const remainingDays = Math.ceil((du - todayUtc) / 86400000);
      const status =
        remainingDays < 0
          ? `${faNum(-remainingDays)} روز معوق`
          : remainingDays === 0
            ? "سررسید امروز"
            : `${faNum(remainingDays)} روز دیگر`;
      console.log(
        `  ${inst.name}: پرداخت‌شده ${faNum(inst._count.payments)}/${faNum(inst.totalCount)} — قسط بعدی ${status}`,
      );
    }

    console.log("\n========== DONE ==========");
    console.log(
      `\nTest account ready:\n  username: ${CREDENTIALS.username}\n  email: ${CREDENTIALS.email}\n  password: ${CREDENTIALS.password}\n  nickname: ${CREDENTIALS.nickname}\n  user id: ${userId}`,
    );
  } catch (err) {
    if (createdUserId !== undefined) {
      try {
        await prisma.user.delete({ where: { id: createdUserId } });
        console.log(`seed failed → rolled back test user ${createdUserId} (related data cascaded)`);
      } catch (rollbackErr) {
        console.error(`rollback failed for user ${createdUserId}:`, rollbackErr);
      }
    }
    throw err;
  } finally {
    await app.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
