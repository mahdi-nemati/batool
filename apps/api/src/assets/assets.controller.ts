import { Controller, Get } from "@nestjs/common";
import type { ApiResponse, AuthUser, GoldWalletDto, UsdWalletDto } from "@batool/types";
import { CurrentUser } from "../common/auth/decorators";
import { PrismaService } from "../database/prisma.service";
import { LedgerService } from "./ledger.service";
import { WalletService } from "./wallet.service";

@Controller("assets")
export class AssetsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly wallets: WalletService,
  ) {}

  @Get("gold")
  async gold(@CurrentUser() user: AuthUser): Promise<ApiResponse<GoldWalletDto>> {
    const wallet = await this.wallets.ensureGold(this.prisma, user.id);
    const balance = await this.ledger.sumGram(this.prisma, "GOLD", wallet.id);
    return {
      data: {
        id: wallet.id,
        balanceGram: balance.toString(),
        createdAt: wallet.createdAt.toISOString(),
      },
    };
  }

  @Get("usd")
  async usd(@CurrentUser() user: AuthUser): Promise<ApiResponse<UsdWalletDto>> {
    const wallet = await this.wallets.ensureUsd(this.prisma, user.id);
    const balance = await this.ledger.sumUsd(this.prisma, "USD", wallet.id);
    return {
      data: {
        id: wallet.id,
        balanceUsd: balance.toString(),
        createdAt: wallet.createdAt.toISOString(),
      },
    };
  }
}
