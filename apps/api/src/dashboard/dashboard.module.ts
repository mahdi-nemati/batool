import { Module } from "@nestjs/common";
import { AssetsModule } from "../assets/assets.module";
import { DebtsModule } from "../debts/debts.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [AssetsModule, DebtsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
