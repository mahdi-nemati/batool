import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import type {
  ApiResponse,
  AuthUser,
  InstallmentDetailDto,
  InstallmentDto,
  InstallmentPaymentDto,
} from "@batool/types";
import { CurrentUser } from "../common/auth/decorators";
import { InstallmentsService } from "./installments.service";
import {
  CreateInstallmentDto,
  PayInstallmentDto,
  UpdateInstallmentDto,
} from "./dto/installment.dto";

@Controller("installments")
export class InstallmentsController {
  constructor(private readonly service: InstallmentsService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser): Promise<ApiResponse<InstallmentDto[]>> {
    return { data: await this.service.list(user.id) };
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateInstallmentDto,
  ): Promise<ApiResponse<InstallmentDto>> {
    return { data: await this.service.create(user.id, dto) };
  }

  @Get(":id")
  async detail(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<ApiResponse<InstallmentDetailDto>> {
    return { data: await this.service.detail(user.id, id) };
  }

  @Get(":id/payments")
  async payments(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<ApiResponse<InstallmentPaymentDto[]>> {
    return { data: await this.service.payments(user.id, id) };
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateInstallmentDto,
  ): Promise<ApiResponse<InstallmentDto>> {
    return { data: await this.service.update(user.id, id, dto) };
  }

  @Post(":id/pay")
  async pay(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: PayInstallmentDto,
  ): Promise<ApiResponse<InstallmentDetailDto>> {
    return { data: await this.service.pay(user.id, id, dto) };
  }
}
