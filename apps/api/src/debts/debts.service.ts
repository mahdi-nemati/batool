import { Injectable } from "@nestjs/common";
import { Prisma } from "@batool/database";
import {
  AssetKind,
  DebtDirection,
  DebtEntryKind,
  DebtViewDirection,
  type CounterpartyDto,
  type DebtEventDto,
  type DebtSummaryDto,
  type DebtSummaryEntryDto,
  type DebtViewDirection as DV,
} from "@batool/types";
import { PrismaService } from "../database/prisma.service";
import { ApiError } from "../common/errors/api-error";
import { parseToman } from "../common/validation/money";
import { AssetRegistryService } from "../assets/asset-registry.service";
import type { CreateDebtEventDto, SettleDebtDto } from "./dto/debt.dto";

type Client = Prisma.TransactionClient | PrismaService;
type DebtEventRow = Prisma.DebtEventGetPayload<object>;

/**
 * Signed contribution of a debt event to the owner's net balance
 * (positive = counterparty owes owner). Net is ALWAYS derived from events — the
 * outstanding balance is never stored.
 */
export function signedDelta(kind: DebtEntryKind, direction: DebtDirection, amount: bigint): bigint {
  const obligationSign = direction === DebtDirection.OWES_ME ? 1n : -1n;
  return kind === DebtEntryKind.OBLIGATION ? obligationSign * amount : -obligationSign * amount;
}

export function viewFromNet(net: bigint): { direction: DV; outstanding: bigint } {
  if (net > 0n) {
    return { direction: DebtViewDirection.OWES_ME, outstanding: net };
  }
  if (net < 0n) {
    return { direction: DebtViewDirection.I_OWE, outstanding: -net };
  }
  return { direction: DebtViewDirection.SETTLED, outstanding: 0n };
}

@Injectable()
export class DebtsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: AssetRegistryService,
  ) {}

  // ---- ownership ----------------------------------------------------------

  /**
   * Loads a counterparty in the owner's context and rejects archived ones for
   * new events. Registered (USER-kind) counterparties are resolved by their
   * stable user id, never by the username string.
   */
  async assertActiveOwned(client: Client, userId: string, counterpartyId: string) {
    const cp = await client.counterparty.findFirst({
      where: { id: counterpartyId, ownerUserId: userId },
    });
    if (cp === null) {
      throw ApiError.notFound();
    }
    if (cp.archived) {
      throw ApiError.counterpartyArchived();
    }
    return cp;
  }

  private async linkedUsername(
    client: Client,
    linkedUserId: string | null,
  ): Promise<string | null> {
    if (linkedUserId === null) {
      return null;
    }
    const u = await client.user.findUnique({ where: { id: linkedUserId } });
    return u?.username ?? null;
  }

  private async assetName(userId: string, kind: AssetKind, id: string): Promise<string> {
    if (kind === AssetKind.BANK) {
      const a = await this.prisma.bankAccount.findFirst({ where: { id, userId } });
      return a?.name ?? "حساب حذف‌شده";
    }
    const f = await this.prisma.fund.findFirst({ where: { id, userId } });
    return f?.name ?? "صندوق حذف‌شده";
  }

  private async toEventDto(userId: string, e: DebtEventRow): Promise<DebtEventDto> {
    const asset =
      e.kind === DebtEntryKind.SETTLEMENT && e.assetKind !== null && e.assetId !== null
        ? {
            kind: e.assetKind,
            id: e.assetId,
            name: await this.assetName(userId, e.assetKind, e.assetId),
          }
        : null;
    return {
      id: e.id,
      kind: e.kind,
      direction: e.direction,
      amountToman: Number(e.amountToman),
      description: e.description,
      occurredAt: e.occurredAt.toISOString(),
      createdAt: e.createdAt.toISOString(),
      sourceShareId: e.sourceShareId,
      asset,
    };
  }

  async toCounterpartyDto(
    client: Client,
    cp: Prisma.CounterpartyGetPayload<object>,
    net: bigint,
  ): Promise<CounterpartyDto> {
    const { direction, outstanding } = viewFromNet(net);
    return {
      id: cp.id,
      kind: cp.kind,
      name: cp.name,
      linkedUsername: await this.linkedUsername(client, cp.linkedUserId),
      archived: cp.archived,
      netToman: Number(net),
      direction,
      outstandingToman: Number(outstanding),
      createdAt: cp.createdAt.toISOString(),
      updatedAt: cp.updatedAt.toISOString(),
    };
  }

  // ---- net derivation -----------------------------------------------------

  async netFor(client: Client, counterpartyId: string): Promise<bigint> {
    const events = await client.debtEvent.findMany({
      where: { counterpartyId },
      select: { kind: true, direction: true, amountToman: true },
    });
    return events.reduce((acc, e) => acc + signedDelta(e.kind, e.direction, e.amountToman), 0n);
  }

  async netMapForUser(userId: string): Promise<Map<string, bigint>> {
    const events = await this.prisma.debtEvent.findMany({
      where: { ownerUserId: userId },
      select: { counterpartyId: true, kind: true, direction: true, amountToman: true },
    });
    const map = new Map<string, bigint>();
    for (const e of events) {
      map.set(
        e.counterpartyId,
        (map.get(e.counterpartyId) ?? 0n) + signedDelta(e.kind, e.direction, e.amountToman),
      );
    }
    return map;
  }

  // ---- obligation events --------------------------------------------------

  /** Public: user manually records an obligation event. */
  async createObligation(userId: string, dto: CreateDebtEventDto): Promise<DebtEventDto> {
    const amount = parseToman(dto.amountToman);
    const occurredAt = this.parseOccurredAt(dto.occurredAt);
    const description = this.cleanDescription(dto.description);
    await this.assertActiveOwned(this.prisma, userId, dto.counterpartyId);
    const created = await this.prisma.debtEvent.create({
      data: {
        ownerUserId: userId,
        counterpartyId: dto.counterpartyId,
        kind: DebtEntryKind.OBLIGATION,
        direction: dto.direction,
        amountToman: amount,
        occurredAt,
        ...(description !== undefined ? { description } : {}),
      },
    });
    return this.toEventDto(userId, created);
  }

  /**
   * Internal (tx-aware): creates a receivable from a split-expense share. Used
   * both inline by the expense creation and by the resolve-share endpoint. It
   * writes NO cash movement (the expense already did) and links the share.
   */
  async createReceivableForShare(
    client: Client,
    params: {
      userId: string;
      counterpartyId: string;
      shareId: string;
      amount: bigint;
      occurredAt: Date;
    },
  ): Promise<void> {
    await client.debtEvent.create({
      data: {
        ownerUserId: params.userId,
        counterpartyId: params.counterpartyId,
        kind: DebtEntryKind.OBLIGATION,
        direction: DebtDirection.OWES_ME,
        amountToman: params.amount,
        sourceShareId: params.shareId,
        occurredAt: params.occurredAt,
        description: "طلب از تقسیم هزینه",
      },
    });
  }

  /** Resolve a Phase-3 participant share (label-only) into a receivable. */
  async linkShareToCounterparty(
    userId: string,
    shareId: string,
    counterpartyId: string,
  ): Promise<DebtEventDto> {
    const cp = await this.assertActiveOwned(this.prisma, userId, counterpartyId);
    const share = await this.prisma.transactionShare.findFirst({
      where: { id: shareId, transaction: { userId, type: "EXPENSE" }, isOwner: false },
      include: { transaction: true },
    });
    if (share === null) {
      throw ApiError.notFound();
    }
    // Idempotent guard: a share maps to at most one receivable.
    const existing = await this.prisma.debtEvent.findFirst({ where: { sourceShareId: shareId } });
    if (existing !== null) {
      throw ApiError.conflict("این سهم قبلاً به یک رویداد بدهی تبدیل شده است");
    }
    const created = await this.prisma.debtEvent.create({
      data: {
        ownerUserId: userId,
        counterpartyId: cp.id,
        kind: DebtEntryKind.OBLIGATION,
        direction: DebtDirection.OWES_ME,
        amountToman: share.amountToman,
        sourceShareId: share.id,
        occurredAt: share.transaction.occurredAt,
        description: "طلب از تقسیم هزینه",
      },
    });
    return this.toEventDto(userId, created);
  }

  // ---- settlement ---------------------------------------------------------

  /**
   * Dedicated settlement action. Direction is DERIVED from the current net:
   *   net > 0 (they owe me)  → they pay me  → asset credited, outstanding reduced.
   *   net < 0 (I owe them)   → I pay them   → asset debited (balance-guarded), outstanding reduced.
   *   net == 0               → nothing to settle.
   * The DebtEvent (SETTLEMENT) and its single AssetMovement are written atomically.
   */
  async settle(userId: string, dto: SettleDebtDto): Promise<DebtEventDto> {
    const amount = parseToman(dto.amountToman);
    const occurredAt = this.parseOccurredAt(dto.occurredAt);
    const description = this.cleanDescription(dto.description);

    return this.prisma.$transaction(async (tx) => {
      const cp = await this.assertActiveOwned(tx, userId, dto.counterpartyId);
      // Serialize settlements for one relationship before deriving its net.
      await tx.$queryRaw`SELECT id FROM "Counterparty" WHERE id = ${cp.id} FOR UPDATE`;
      const net = await this.netFor(tx, cp.id);
      if (net === 0n) {
        throw ApiError.nothingToSettle();
      }

      const receive = net > 0n; // they owe me → I receive
      const outstanding = receive ? net : -net;
      if (amount > outstanding) {
        throw ApiError.settlementExceedsOutstanding(Number(outstanding));
      }

      const asset = await this.registry.resolve(tx, userId, dto.assetKind, dto.assetId);
      if (asset.currency !== "TOMAN") {
        throw ApiError.validation("assetId", "منبع تسویه باید حساب بانکی یا صندوق باشد");
      }
      await this.registry.lock(tx, asset, userId);
      if (!receive) {
        const balance = await this.registry.balanceOf(tx, asset);
        if ((balance as bigint) - amount < 0n) {
          throw ApiError.insufficientBalance();
        }
      }

      const direction = receive ? DebtDirection.OWES_ME : DebtDirection.I_OWE;
      const event = await tx.debtEvent.create({
        data: {
          ownerUserId: userId,
          counterpartyId: cp.id,
          kind: DebtEntryKind.SETTLEMENT,
          direction,
          amountToman: amount,
          assetKind: asset.kind,
          assetId: asset.id,
          occurredAt,
          ...(description !== undefined ? { description } : {}),
        },
      });

      // Single signed cash leg on the ledger (never Gold/USD).
      await tx.assetMovement.create({
        data: {
          userId,
          assetKind: asset.kind,
          assetId: asset.id,
          reason: "SETTLEMENT",
          debtEventId: event.id,
          amountToman: receive ? amount : -amount,
          occurredAt,
        },
      });

      return this.toEventDto(userId, event);
    });
  }

  // ---- reads --------------------------------------------------------------

  async history(
    userId: string,
    counterpartyId: string,
  ): Promise<{ counterparty: CounterpartyDto; events: DebtEventDto[] }> {
    const cp = await this.prisma.counterparty.findFirst({
      where: { id: counterpartyId, ownerUserId: userId },
    });
    if (cp === null) {
      throw ApiError.notFound();
    }
    const rows = await this.prisma.debtEvent.findMany({
      where: { counterpartyId },
      orderBy: { occurredAt: "asc" },
    });
    const net = rows.reduce((acc, e) => acc + signedDelta(e.kind, e.direction, e.amountToman), 0n);
    const [counterparty, events] = await Promise.all([
      this.toCounterpartyDto(this.prisma, cp, net),
      Promise.all(rows.map((e) => this.toEventDto(userId, e))),
    ]);
    return { counterparty, events };
  }

  async summary(userId: string): Promise<DebtSummaryDto> {
    const counterparties = await this.prisma.counterparty.findMany({
      where: { ownerUserId: userId },
      orderBy: { createdAt: "asc" },
    });
    const nets = await this.netMapForUser(userId);
    let receivable = 0n;
    let payable = 0n;
    const entries: DebtSummaryEntryDto[] = [];
    for (const cp of counterparties) {
      const net = nets.get(cp.id) ?? 0n;
      const { direction, outstanding } = viewFromNet(net);
      if (net > 0n) {
        receivable += net;
      } else if (net < 0n) {
        payable += -net;
      }
      if (outstanding > 0n) {
        entries.push({
          counterpartyId: cp.id,
          name: cp.name,
          kind: cp.kind,
          direction,
          outstandingToman: Number(outstanding),
        });
      }
    }
    const netAll = receivable - payable;
    return {
      totalReceivableToman: Number(receivable),
      totalPayableToman: Number(payable),
      netToman: Number(netAll),
      counterparties: entries,
    };
  }

  // ---- helpers ------------------------------------------------------------

  private parseOccurredAt(value: string | undefined): Date {
    if (value === undefined) {
      return new Date();
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw ApiError.validation("occurredAt", "تاریخ نامعتبر است");
    }
    return date;
  }

  private cleanDescription(value: string | undefined): string | undefined {
    if (value === undefined) {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }
}
