import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import type {
  ApiResponse,
  AuthUser,
  SetarSessionDto,
  SetarStatusDto,
  SetarTuitionPaymentDto,
} from "@batool/types";
import { CurrentUser } from "../common/auth/decorators";
import { SetarService } from "./setar.service";
import {
  CreateSetarDto,
  CreateSetarSessionDto,
  PaySetarTuitionDto,
  UpdateSetarDto,
} from "./dto/setar.dto";

@Controller("setar")
export class SetarController {
  constructor(private readonly service: SetarService) {}

  /** Current derived status (profile is null until the user creates it). */
  @Get()
  async status(@CurrentUser() user: AuthUser): Promise<ApiResponse<SetarStatusDto>> {
    return { data: await this.service.status(user.id) };
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSetarDto,
  ): Promise<ApiResponse<SetarStatusDto>> {
    return { data: await this.service.create(user.id, dto) };
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateSetarDto,
  ): Promise<ApiResponse<SetarStatusDto>> {
    return { data: await this.service.update(user.id, id, dto) };
  }

  @Get("sessions")
  async sessions(@CurrentUser() user: AuthUser): Promise<ApiResponse<SetarSessionDto[]>> {
    return { data: await this.service.sessions(user.id) };
  }

  @Post("sessions")
  async createSession(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSetarSessionDto,
  ): Promise<ApiResponse<SetarStatusDto>> {
    return { data: await this.service.createSession(user.id, dto) };
  }

  @Get("payments")
  async payments(@CurrentUser() user: AuthUser): Promise<ApiResponse<SetarTuitionPaymentDto[]>> {
    return { data: await this.service.payments(user.id) };
  }

  @Post("pay")
  async pay(
    @CurrentUser() user: AuthUser,
    @Body() dto: PaySetarTuitionDto,
  ): Promise<ApiResponse<SetarStatusDto>> {
    return { data: await this.service.pay(user.id, dto) };
  }
}
