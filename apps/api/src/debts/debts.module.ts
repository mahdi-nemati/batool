import { Module } from "@nestjs/common";
import { AssetsModule } from "../assets/assets.module";
import { DebtsController } from "./debts.controller";
import { DebtsService } from "./debts.service";

@Module({
  imports: [AssetsModule],
  controllers: [DebtsController],
  providers: [DebtsService],
  exports: [DebtsService],
})
export class DebtsModule {}
