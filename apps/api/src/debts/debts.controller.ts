import { Body, Controller, Get, Post } from "@nestjs/common";
import type { ApiResponse, AuthUser, DebtEventDto, DebtSummaryDto } from "@batool/types";
import { CurrentUser } from "../common/auth/decorators";
import { DebtsService } from "./debts.service";
import { CreateDebtEventDto, LinkShareDto, SettleDebtDto } from "./dto/debt.dto";

@Controller("debts")
export class DebtsController {
  constructor(private readonly service: DebtsService) {}

  @Post("events")
  async createEvent(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDebtEventDto,
  ): Promise<ApiResponse<DebtEventDto>> {
    return { data: await this.service.createObligation(user.id, dto) };
  }

  @Post("settlements")
  async settle(
    @CurrentUser() user: AuthUser,
    @Body() dto: SettleDebtDto,
  ): Promise<ApiResponse<DebtEventDto>> {
    return { data: await this.service.settle(user.id, dto) };
  }

  @Post("link-share")
  async linkShare(
    @CurrentUser() user: AuthUser,
    @Body() dto: LinkShareDto,
  ): Promise<ApiResponse<DebtEventDto>> {
    return {
      data: await this.service.linkShareToCounterparty(user.id, dto.shareId, dto.counterpartyId),
    };
  }

  @Get("summary")
  async summary(@CurrentUser() user: AuthUser): Promise<ApiResponse<DebtSummaryDto>> {
    return { data: await this.service.summary(user.id) };
  }
}
