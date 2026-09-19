import { Module } from "@nestjs/common";
import { AssetsModule } from "../assets/assets.module";
import { TransfersController } from "./transfers.controller";
import { TransfersService } from "./transfers.service";

@Module({
  imports: [AssetsModule],
  controllers: [TransfersController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}
