import { Injectable } from "@nestjs/common";
import { Prisma } from "@batool/database";
import {
  CounterpartyKind,
  type ConnectionDto,
  type CounterpartyDto,
  type CounterpartyHistoryDto,
} from "@batool/types";
import { PrismaService } from "../database/prisma.service";
import { ApiError } from "../common/errors/api-error";
import type { PageRequest } from "../common/pagination/pagination";
import { DebtsService } from "../debts/debts.service";
import type { CreateExternalCounterpartyDto, UpdateCounterpartyDto } from "./dto/counterparty.dto";

@Injectable()
export class CounterpartiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly debts: DebtsService,
  ) {}

  // ---- external counterparties -------------------------------------------

  async createExternal(
    userId: string,
    dto: CreateExternalCounterpartyDto,
  ): Promise<CounterpartyDto> {
    const name = dto.name.trim();
    if (name.length === 0) {
      throw ApiError.validation("name", "نام طرف حساب نمی‌تواند خالی باشد");
    }
    const dup = await this.prisma.counterparty.findFirst({
      where: { ownerUserId: userId, kind: CounterpartyKind.EXTERNAL, name, archived: false },
    });
    if (dup !== null) {
      throw ApiError.conflict("یک طرف حساب فعال هم‌نام قبلاً وجود دارد");
    }
    const cp = await this.prisma.counterparty.create({
      data: { ownerUserId: userId, kind: CounterpartyKind.EXTERNAL, name },
    });
    return this.debts.toCounterpartyDto(this.prisma, cp, 0n);
  }

  async update(userId: string, id: string, dto: UpdateCounterpartyDto): Promise<CounterpartyDto> {
    const cp = await this.prisma.counterparty.findFirst({ where: { id, ownerUserId: userId } });
    if (cp === null) {
      throw ApiError.notFound();
    }
    const data: Prisma.CounterpartyUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name.length === 0) {
        throw ApiError.validation("name", "نام نمی‌تواند خالی باشد");
      }
      data.name = name;
    }
    if (dto.archived !== undefined) {
      // Archive is reversible and never deletes historical debt events.
      data.archived = dto.archived;
    }
    if (Object.keys(data).length === 0) {
      return this.debts.toCounterpartyDto(
        this.prisma,
        cp,
        await this.debts.netFor(this.prisma, cp.id),
      );
    }
    const updated = await this.prisma.counterparty.update({ where: { id }, data });
    return this.debts.toCounterpartyDto(
      this.prisma,
      updated,
      await this.debts.netFor(this.prisma, id),
    );
  }

  async list(userId: string): Promise<CounterpartyDto[]> {
    const cps = await this.prisma.counterparty.findMany({
      where: { ownerUserId: userId },
      orderBy: { createdAt: "asc" },
    });
    const nets = await this.debts.netMapForUser(userId);
    return Promise.all(
      cps.map((cp) => this.debts.toCounterpartyDto(this.prisma, cp, nets.get(cp.id) ?? 0n)),
    );
  }

  async detail(userId: string, id: string, page: PageRequest): Promise<CounterpartyHistoryDto> {
    // Validates ownership; throws 404 for foreign/unknown counterparties.
    return this.debts.history(userId, id, page);
  }

  // ---- connections (registered users) ------------------------------------

  async connect(userId: string, username: string): Promise<ConnectionDto> {
    const target = await this.prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
    });
    if (target === null) {
      throw ApiError.notFound();
    }
    if (target.id === userId) {
      throw ApiError.validation("username", "نمی‌توانید با خودتان ارتباط برقرار کنید");
    }
    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    // Normalized unordered pair so the relationship is stored identically for both.
    const [aId, bId] = userId < target.id ? [userId, target.id] : [target.id, userId];
    const connection = await this.prisma.userConnection.upsert({
      where: { aId_bId: { aId, bId } },
      create: { aId, bId },
      update: {},
    });

    // Ensure a counterparty exists in EACH user's context (symmetric view).
    const mine = await this.ensureUserCounterparty(userId, target.id, target.nickname);
    const theirs = await this.ensureUserCounterparty(target.id, userId, me.nickname);
    await this.debts.synchronizeLinkedCounterparty(this.prisma, mine);
    await this.debts.synchronizeLinkedCounterparty(this.prisma, theirs);

    return {
      id: connection.id,
      username: target.username,
      nickname: target.nickname,
      counterpartyId: mine.id,
      createdAt: connection.createdAt.toISOString(),
    };
  }

  /** findFirst→create/update (avoids Prisma's nullable-part unique upsert ambiguity). */
  private async ensureUserCounterparty(ownerId: string, linkedUserId: string, name: string) {
    const existing = await this.prisma.counterparty.findFirst({
      where: { ownerUserId: ownerId, linkedUserId },
    });
    if (existing !== null) {
      return this.prisma.counterparty.update({
        where: { id: existing.id },
        data: { name, archived: false },
      });
    }
    return this.prisma.counterparty.create({
      data: { ownerUserId: ownerId, linkedUserId, kind: CounterpartyKind.USER, name },
    });
  }

  async listConnections(userId: string): Promise<ConnectionDto[]> {
    const conns = await this.prisma.userConnection.findMany({
      where: { OR: [{ aId: userId }, { bId: userId }] },
      orderBy: { createdAt: "desc" },
    });
    const result: ConnectionDto[] = [];
    for (const c of conns) {
      const otherId = c.aId === userId ? c.bId : c.aId;
      const other = await this.prisma.user.findUnique({ where: { id: otherId } });
      if (other === null) {
        continue;
      }
      const cp = await this.prisma.counterparty.findFirst({
        where: { ownerUserId: userId, linkedUserId: otherId },
      });
      result.push({
        id: c.id,
        username: other.username,
        nickname: other.nickname,
        counterpartyId: cp?.id ?? "",
        createdAt: c.createdAt.toISOString(),
      });
    }
    return result;
  }
}
