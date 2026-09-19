import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CategoryType, type ApiResponse, type CategoryDto } from "@batool/types";
import { Roles } from "../common/auth/decorators";
import { ApiError } from "../common/errors/api-error";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto";

function parseType(raw: string | undefined): CategoryType | undefined {
  if (raw === undefined || raw.length === 0) {
    return undefined;
  }
  if (raw === CategoryType.INCOME || raw === CategoryType.EXPENSE) {
    return raw;
  }
  throw ApiError.validation("type", "نوع نامعتبر است");
}

@Controller("categories")
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  // Authenticated users pick from active categories.
  @Get()
  async listActive(@Query("type") type?: string): Promise<ApiResponse<CategoryDto[]>> {
    return { data: await this.service.listActive(parseType(type)) };
  }

  @Roles("ADMIN")
  @Get("all")
  async listAll(): Promise<ApiResponse<CategoryDto[]>> {
    return { data: await this.service.listAll() };
  }

  @Roles("ADMIN")
  @Post()
  async create(@Body() dto: CreateCategoryDto): Promise<ApiResponse<CategoryDto>> {
    return { data: await this.service.create(dto) };
  }

  @Roles("ADMIN")
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<ApiResponse<CategoryDto>> {
    return { data: await this.service.update(id, dto) };
  }
}
