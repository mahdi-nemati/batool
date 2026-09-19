import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { AssetKind, type ApiResponse, type AuthUser, type TransferDto } from "@batool/types";
import { CurrentUser } from "../common/auth/decorators";
import { TransfersService } from "./transfers.service";
import { CreateTransferDto } from "./dto/transfer.dto";

const FILTER_KINDS: AssetKind[] = [AssetKind.BANK, AssetKind.FUND, AssetKind.GOLD, AssetKind.USD];

function parseKind(raw: string | undefined): AssetKind | undefined {
  return FILTER_KINDS.includes(raw as AssetKind) ? (raw as AssetKind) : undefined;
}

@Controller("transfers")
export class TransfersController {
  constructor(private readonly service: TransfersService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query("kind") kind?: string,
  ): Promise<ApiResponse<TransferDto[]>> {
    return { data: await this.service.list(user.id, parseKind(kind)) };
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTransferDto,
  ): Promise<ApiResponse<TransferDto>> {
    return { data: await this.service.create(user.id, dto) };
  }
}
