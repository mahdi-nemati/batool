import type { ApiResponse, CategoryDto, CategoryType } from "@batool/types";
import { SERVER_API_ORIGIN, request } from "./client";

export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
}

const unwrap = <T>(p: Promise<ApiResponse<T>>) => p.then((r) => r.data);

export const listActiveCategories = (type?: CategoryType) =>
  unwrap(request<ApiResponse<CategoryDto[]>>(`/categories${type ? `?type=${type}` : ""}`));

export const listAllCategories = () =>
  unwrap(request<ApiResponse<CategoryDto[]>>("/categories/all"));

export const createCategory = (body: CreateCategoryInput) =>
  unwrap(
    request<ApiResponse<CategoryDto>>("/categories", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

export const updateCategory = (
  id: string,
  body: { name?: string; type?: CategoryType; isActive?: boolean },
) =>
  unwrap(
    request<ApiResponse<CategoryDto>>(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );

/** Server-side active categories for a page's initial render. */
export async function listActiveCategoriesServer(
  cookieHeader: string | undefined,
): Promise<CategoryDto[]> {
  const headers = cookieHeader ? { cookie: cookieHeader } : undefined;
  return unwrap(
    request<ApiResponse<CategoryDto[]>>("/categories", {
      baseUrl: SERVER_API_ORIGIN,
      cache: "no-store",
      ...(headers ? { headers } : {}),
    }),
  );
}
