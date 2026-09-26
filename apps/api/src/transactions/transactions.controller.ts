import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import {
  AssetKind,
  TransactionType,
  type ApiResponse,
  type AuthUser,
  type FinancialTransactionDto,
  type PaginatedResponse,
} from "@batool/types";
import { CurrentUser } from "../common/auth/decorators";
import { parsePage } from "../common/pagination/pagination";
import { TransactionsService, type ListFilters } from "./transactions.service";
import { CreateTransactionDto } from "./dto/transaction.dto";

function parseType(raw?: string): TransactionType | undefined {
  if (raw === TransactionType.INCOME || raw === TransactionType.EXPENSE) {
    return raw;
  }
  return undefined;
}

function parseKind(raw?: string): AssetKind | undefined {
  if (
    raw === AssetKind.BANK ||
    raw === AssetKind.FUND ||
    raw === AssetKind.GOLD ||
    raw === AssetKind.USD
  ) {
    return raw;
  }
  return undefined;
}

@Controller("transactions")
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTransactionDto,
  ): Promise<ApiResponse<FinancialTransactionDto>> {
    return { data: await this.service.create(user.id, dto) };
  }

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query("type") type?: string,
    @Query("categoryId") categoryId?: string,
    @Query("assetKind") assetKind?: string,
    @Query("assetId") assetId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ): Promise<ApiResponse<PaginatedResponse<FinancialTransactionDto>>> {
    const filters: ListFilters = {
      ...(type !== undefined ? { type: parseType(type) } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(assetKind !== undefined ? { assetKind: parseKind(assetKind) } : {}),
      ...(assetId !== undefined ? { assetId } : {}),
      ...(from !== undefined ? { from } : {}),
      ...(to !== undefined ? { to } : {}),
    };
    return { data: await this.service.list(user.id, filters, parsePage(page, pageSize)) };
  }

  @Get(":id")
  async get(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<ApiResponse<FinancialTransactionDto>> {
    return { data: await this.service.get(user.id, id) };
  }
}
