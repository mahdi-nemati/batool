import { Controller, Get } from "@nestjs/common";
import type { HealthDto, ReadinessDto } from "@batool/types";
import { Public } from "../common/auth/decorators";
import { PrismaService } from "../database/prisma.service";

@Controller("health")
@Public()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  liveness(): HealthDto {
    return {
      status: "ok",
      service: "batool-api",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("ready")
  async readiness(): Promise<ReadinessDto> {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: "ok",
      service: "batool-api",
      database: "up",
      timestamp: new Date().toISOString(),
    };
  }
}
