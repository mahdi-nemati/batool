import { Injectable } from "@nestjs/common";
import type { Fund } from "@batool/database";
import type { FundDto } from "@batool/types";
import { PrismaService } from "../database/prisma.service";
import { ApiError } from "../common/errors/api-error";
import { LedgerService } from "../assets/ledger.service";
import type { CreateFundDto } from "./dto/fund.dto";

@Injectable()
export class FundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  private toDto(fund: Fund, balanceToman: bigint): FundDto {
    return {
      id: fund.id,
      name: fund.name,
      goalToman: fund.goalToman === null ? null : Number(fund.goalToman),
      balanceToman: Number(balanceToman),
      createdAt: fund.createdAt.toISOString(),
      updatedAt: fund.updatedAt.toISOString(),
    };
  }

  async create(userId: string, dto: CreateFundDto): Promise<FundDto> {
    const name = dto.name.trim();
    if (name.length === 0) {
      throw ApiError.validation("name", "نام صندوق نمی‌تواند خالی باشد");
    }
    const goalToman = dto.goalToman !== undefined ? BigInt(dto.goalToman) : null;
    // A new fund starts at zero and only ever changes through transfers.
    const fund = await this.prisma.fund.create({ data: { userId, name, goalToman } });
    return this.toDto(fund, 0n);
  }

  async list(userId: string): Promise<FundDto[]> {
    const funds = await this.prisma.fund.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return Promise.all(
      funds.map(async (f) => this.toDto(f, await this.ledger.sumToman(this.prisma, "FUND", f.id))),
    );
  }

  async get(userId: string, id: string): Promise<FundDto> {
    const fund = await this.prisma.fund.findFirst({ where: { id, userId } });
    if (fund === null) {
      throw ApiError.notFound();
    }
    return this.toDto(fund, await this.ledger.sumToman(this.prisma, "FUND", fund.id));
  }
}
