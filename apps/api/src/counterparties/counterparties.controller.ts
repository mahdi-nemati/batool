import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import type {
  ApiResponse,
  AuthUser,
  ConnectionDto,
  CounterpartyHistoryDto,
  CounterpartyDto,
  PaginatedResponse,
} from "@batool/types";
import { CurrentUser } from "../common/auth/decorators";
import { parsePage } from "../common/pagination/pagination";
import { CounterpartiesService } from "./counterparties.service";
import {
  ConnectUserDto,
  CreateExternalCounterpartyDto,
  UpdateCounterpartyDto,
} from "./dto/counterparty.dto";

@Controller("counterparties")
export class CounterpartiesController {
  constructor(private readonly service: CounterpartiesService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("search") search?: string,
  ): Promise<ApiResponse<PaginatedResponse<CounterpartyDto>>> {
    return { data: await this.service.list(user.id, parsePage(page, pageSize), search) };
  }

  @Post()
  async createExternal(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateExternalCounterpartyDto,
  ): Promise<ApiResponse<CounterpartyDto>> {
    return { data: await this.service.createExternal(user.id, dto) };
  }

  @Get(":id")
  async detail(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ): Promise<ApiResponse<CounterpartyHistoryDto>> {
    return { data: await this.service.detail(user.id, id, parsePage(page, pageSize)) };
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateCounterpartyDto,
  ): Promise<ApiResponse<CounterpartyDto>> {
    return { data: await this.service.update(user.id, id, dto) };
  }
}

@Controller("connections")
export class ConnectionsController {
  constructor(private readonly service: CounterpartiesService) {}

  @Post()
  async connect(
    @CurrentUser() user: AuthUser,
    @Body() dto: ConnectUserDto,
  ): Promise<ApiResponse<ConnectionDto>> {
    return { data: await this.service.connect(user.id, dto.username) };
  }

  @Get()
  async list(@CurrentUser() user: AuthUser): Promise<ApiResponse<ConnectionDto[]>> {
    return { data: await this.service.listConnections(user.id) };
  }
}
