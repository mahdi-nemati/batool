import { Module } from "@nestjs/common";
import { AssetsModule } from "../assets/assets.module";
import { FundsController } from "./funds.controller";
import { FundsService } from "./funds.service";

@Module({
  imports: [AssetsModule],
  controllers: [FundsController],
  providers: [FundsService],
  exports: [FundsService],
})
export class FundsModule {}
