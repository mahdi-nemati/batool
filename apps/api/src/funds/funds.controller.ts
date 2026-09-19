import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import type { ApiResponse, AuthUser, FundDto } from "@batool/types";
import { CurrentUser } from "../common/auth/decorators";
import { FundsService } from "./funds.service";
import { CreateFundDto } from "./dto/fund.dto";

@Controller("funds")
export class FundsController {
  constructor(private readonly service: FundsService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser): Promise<ApiResponse<FundDto[]>> {
    return { data: await this.service.list(user.id) };
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateFundDto,
  ): Promise<ApiResponse<FundDto>> {
    return { data: await this.service.create(user.id, dto) };
  }

  @Get(":id")
  async get(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<ApiResponse<FundDto>> {
    return { data: await this.service.get(user.id, id) };
  }
}
