import { Injectable } from "@nestjs/common";
import { Prisma } from "@batool/database";
import type { Category, CategoryType as PrismaCategoryType } from "@batool/database";
import type { CategoryDto, CategoryType } from "@batool/types";
import { PrismaService } from "../database/prisma.service";
import { ApiError } from "../common/errors/api-error";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(c: Category): CategoryDto {
    return {
      id: c.id,
      name: c.name,
      type: c.type as CategoryType,
      isActive: c.isActive,
      isSystem: c.isSystem,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }

  /** Active categories for selection in the transaction forms. */
  async listActive(type?: CategoryType): Promise<CategoryDto[]> {
    const where: Prisma.CategoryWhereInput = { isActive: true };
    if (type !== undefined) {
      where.type = type;
    }
    const rows = await this.prisma.category.findMany({
      where,
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
    return rows.map((c) => this.toDto(c));
  }

  /** All categories (including soft-deleted) — admin management view. */
  async listAll(): Promise<CategoryDto[]> {
    const rows = await this.prisma.category.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
    return rows.map((c) => this.toDto(c));
  }

  async create(dto: { name: string; type: CategoryType }): Promise<CategoryDto> {
    const name = dto.name.trim();
    if (name.length === 0) {
      throw ApiError.validation("name", "نام دسته‌بندی نمی‌تواند خالی باشد");
    }
    try {
      const created = await this.prisma.category.create({
        data: { name, type: dto.type as PrismaCategoryType },
      });
      return this.toDto(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw ApiError.conflict("یک دسته‌بندی هم‌نام با همین نوع قبلاً وجود دارد");
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: { name?: string; type?: CategoryType; isActive?: boolean },
  ): Promise<CategoryDto> {
    const existing = await this.assertExists(id);
    const data: Prisma.CategoryUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name.length === 0) {
        throw ApiError.validation("name", "نام دسته‌بندی نمی‌تواند خالی باشد");
      }
      data.name = name;
    }
    if (dto.type !== undefined && dto.type !== existing.type) {
      // A category's type may never be flipped while financial history references
      // it — this protects historical transactions and the system «اقساط» category
      // that installment payments depend on remaining an EXPENSE.
      const used = await this.prisma.financialTransaction.count({ where: { categoryId: id } });
      if (used > 0 || existing.isSystem) {
        throw ApiError.conflict(
          existing.isSystem
            ? "نوع دسته‌بندی سیستمی قابل تغییر نیست"
            : "نوع دسته‌بندی دارای تراکنش قابل تغییر نیست",
        );
      }
      data.type = dto.type;
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }
    if (Object.keys(data).length === 0) {
      return this.toDto(await this.prisma.category.findUniqueOrThrow({ where: { id } }));
    }
    try {
      return this.toDto(await this.prisma.category.update({ where: { id }, data }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw ApiError.conflict("یک دسته‌بندی هم‌نام با همین نوع قبلاً وجود دارد");
      }
      throw error;
    }
  }

  private async assertExists(id: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (category === null) {
      throw ApiError.notFound();
    }
    return category;
  }
}
