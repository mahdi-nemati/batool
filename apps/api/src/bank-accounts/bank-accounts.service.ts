import { Injectable } from "@nestjs/common";
import type { BankAccount } from "@batool/database";
import type { BankAccountDto } from "@batool/types";
import { PrismaService } from "../database/prisma.service";
import { ApiError } from "../common/errors/api-error";
import { parseToman, tomanToNumber } from "../common/validation/money";
import { LedgerService } from "../assets/ledger.service";
import type { CreateBankAccountDto } from "./dto/bank-account.dto";

@Injectable()
export class BankAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  private toDto(account: BankAccount, balanceToman: bigint): BankAccountDto {
    return {
      id: account.id,
      name: account.name,
      isActive: account.isActive,
      balanceToman: tomanToNumber(balanceToman),
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };
  }

  async create(userId: string, dto: CreateBankAccountDto): Promise<BankAccountDto> {
    const name = dto.name.trim();
    if (name.length === 0) {
      throw ApiError.validation("name", "نام حساب نمی‌تواند خالی باشد");
    }
    const initial = parseToman(dto.initialBalanceToman, "initialBalanceToman", true);

    const account = await this.prisma.$transaction(async (tx) => {
      const created = await tx.bankAccount.create({ data: { userId, name } });
      if (initial > 0n) {
        // The initial balance is recorded as an OPENING ledger event, so the
        // balance remains fully derived — never a mutable column.
        await tx.assetMovement.create({
          data: {
            userId,
            assetKind: "BANK",
            assetId: created.id,
            reason: "OPENING",
            amountToman: initial,
          },
        });
      }
      return created;
    });

    return this.toDto(account, initial);
  }

  async list(userId: string): Promise<BankAccountDto[]> {
    const accounts = await this.prisma.bankAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return Promise.all(
      accounts.map(async (a) =>
        this.toDto(a, await this.ledger.sumToman(this.prisma, "BANK", a.id)),
      ),
    );
  }

  async get(userId: string, id: string): Promise<BankAccountDto> {
    const account = await this.prisma.bankAccount.findFirst({ where: { id, userId } });
    if (account === null) {
      throw ApiError.notFound();
    }
    return this.toDto(account, await this.ledger.sumToman(this.prisma, "BANK", account.id));
  }
}
