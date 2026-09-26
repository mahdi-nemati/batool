import { Injectable } from "@nestjs/common";
import type { Fund, Prisma } from "@batool/database";
import { AssetKind, type FundDto } from "@batool/types";
import { PrismaService } from "../database/prisma.service";
import { ApiError } from "../common/errors/api-error";
import { LedgerService } from "../assets/ledger.service";
import { AssetRegistryService, type ResolvedAsset } from "../assets/asset-registry.service";
import type { CreateFundDto, UpdateFundDto } from "./dto/fund.dto";

/** Exact description recorded on the balance-return transfer of a deletion. */
const DELETION_RETURN_DESCRIPTION = "برگشت پول از صندوق حذف شده";

@Injectable()
export class FundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly registry: AssetRegistryService,
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
    const goalToman = dto.goalToman === undefined ? null : BigInt(dto.goalToman);
    // A new fund always starts at zero: its balance can only change through
    // transfers, which is what keeps "balance" a ledger fact, not a stored value.
    const fund = await this.prisma.fund.create({ data: { userId, name, goalToman } });
    return this.toDto(fund, 0n);
  }

  async list(userId: string): Promise<FundDto[]> {
    const funds = await this.prisma.fund.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return Promise.all(funds.map(async (fund) => this.toDto(fund, await this.balanceOf(fund))));
  }

  async get(userId: string, id: string): Promise<FundDto> {
    const fund = await this.requireFund(userId, id);
    return this.toDto(fund, await this.balanceOf(fund));
  }

  /** Edits descriptive fields only — the balance stays ledger-derived. */
  async update(userId: string, id: string, dto: UpdateFundDto): Promise<FundDto> {
    const fund = await this.requireFund(userId, id);
    const data: Prisma.FundUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name.length === 0) {
        throw ApiError.validation("name", "نام صندوق نمی‌تواند خالی باشد");
      }
      data.name = name;
    }
    if (dto.goalToman !== undefined) {
      // `null` clears the goal instead of leaving it silently unchanged.
      data.goalToman = dto.goalToman === null ? null : BigInt(dto.goalToman);
    }
    const updated =
      Object.keys(data).length === 0
        ? fund
        : await this.prisma.fund.update({ where: { id: fund.id }, data });
    return this.toDto(updated, await this.balanceOf(fund));
  }

  /**
   * Deletes a fund WITHOUT ever destroying its money.
   *
   * The remaining balance first goes back to the user's first-created Bank
   * Account as a real Fund → Bank transfer: a Transfer row plus the two signed
   * ledger legs, exactly like a manual transfer. Only then is the fund row
   * removed. Everything happens in ONE transaction, so a failure at any point
   * rolls back to "fund still exists, money untouched" — the balance can never
   * be silently lost. Funds may only send money to a Bank Account, which is
   * exactly the direction used here.
   */
  async remove(userId: string, id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const fund = await this.requireFund(userId, id, tx);
      const source: ResolvedAsset = {
        kind: AssetKind.FUND,
        id: fund.id,
        name: fund.name,
        currency: "TOMAN",
      };
      // "First Bank Account created by that user"; id breaks exact-tie cases.
      // Picking the candidate before locking is safe: a newer account can never
      // become the first one (accounts are never deleted).
      const bank = await tx.bankAccount.findFirst({
        where: { userId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      const destination: ResolvedAsset | null =
        bank === null
          ? null
          : { kind: AssetKind.BANK, id: bank.id, name: bank.name, currency: "TOMAN" };

      // Lock BOTH endpoints in the exact order transfers use, BEFORE reading the
      // balance. Locking the fund first and the bank later would invert that
      // order and could deadlock against a concurrent Bank ↔ Fund transfer, and
      // reading the balance before locking could observe a stale figure.
      if (destination === null) {
        await this.registry.lock(tx, source, userId);
      } else {
        const [first, second] =
          `${source.kind}:${source.id}` <= `${destination.kind}:${destination.id}`
            ? [source, destination]
            : [destination, source];
        await this.registry.lock(tx, first, userId);
        await this.registry.lock(tx, second, userId);
      }

      const balance = await this.balanceOf(fund, tx);
      if (balance < 0n) {
        // Unreachable while every debit is balance-guarded, but refuse rather
        // than delete a fund whose ledger does not add up.
        throw ApiError.conflict("موجودی این صندوق نامعتبر است و حذف آن ممکن نیست");
      }

      if (balance > 0n) {
        if (destination === null || bank === null) {
          throw ApiError.conflict(
            "برای بازگرداندن موجودی صندوق باید حداقل یک حساب بانکی داشته باشید؛ ابتدا حساب بسازید",
          );
        }
        const occurredAt = new Date();
        const transfer = await tx.transfer.create({
          data: {
            userId,
            sourceKind: AssetKind.FUND,
            sourceId: fund.id,
            destinationKind: AssetKind.BANK,
            destinationId: bank.id,
            amountToman: balance,
            description: DELETION_RETURN_DESCRIPTION,
            occurredAt,
          },
        });
        // Balanced pair: the fund drains to exactly zero while the bank is
        // credited the same amount, so the user's total money is unchanged.
        const movement = (asset: ResolvedAsset, amountToman: bigint) => ({
          userId,
          assetKind: asset.kind,
          assetId: asset.id,
          reason: "TRANSFER" as const,
          transferId: transfer.id,
          amountToman,
          occurredAt,
        });
        await tx.assetMovement.create({ data: movement(source, -balance) });
        await tx.assetMovement.create({ data: movement(destination, balance) });
      }

      // AssetMovement only references a fund through an optional relation
      // (SetNull on delete), and Transfer stores the endpoints as plain ids, so
      // historical ledger rows survive. The movement that drains the fund to
      // zero is its last word in the ledger.
      await tx.fund.delete({ where: { id: fund.id } });
    });
  }

  private async requireFund(
    userId: string,
    id: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<Fund> {
    const fund = await client.fund.findFirst({ where: { id, userId } });
    if (fund === null) {
      throw ApiError.notFound();
    }
    return fund;
  }

  private balanceOf(
    fund: Fund,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<bigint> {
    return this.ledger.sumToman(client, AssetKind.FUND, fund.id);
  }
}
