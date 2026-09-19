import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import type { ApiResponse, AuthUser, BankAccountDto } from "@batool/types";
import { CurrentUser } from "../common/auth/decorators";
import { BankAccountsService } from "./bank-accounts.service";
import { CreateBankAccountDto } from "./dto/bank-account.dto";

@Controller("bank-accounts")
export class BankAccountsController {
  constructor(private readonly service: BankAccountsService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser): Promise<ApiResponse<BankAccountDto[]>> {
    return { data: await this.service.list(user.id) };
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBankAccountDto,
  ): Promise<ApiResponse<BankAccountDto>> {
    return { data: await this.service.create(user.id, dto) };
  }

  @Get(":id")
  async get(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<ApiResponse<BankAccountDto>> {
    return { data: await this.service.get(user.id, id) };
  }
}
