import { Controller, Get, Query } from "@nestjs/common";
import type {
  ApiResponse,
  AuthUser,
  DashboardStatisticsDto,
  DashboardSummaryDto,
} from "@batool/types";
import { CurrentUser } from "../common/auth/decorators";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get("summary")
  async summary(
    @CurrentUser() user: AuthUser,
    @Query("month") month?: string,
  ): Promise<ApiResponse<DashboardSummaryDto>> {
    return { data: await this.service.summary(user.id, month) };
  }

  @Get("statistics")
  async statistics(
    @CurrentUser() user: AuthUser,
    @Query("month") month?: string,
  ): Promise<ApiResponse<DashboardStatisticsDto>> {
    return { data: await this.service.statistics(user.id, month) };
  }
}
