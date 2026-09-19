import { Module } from "@nestjs/common";
import { AssetsModule } from "../assets/assets.module";
import { InstallmentsController } from "./installments.controller";
import { InstallmentsService } from "./installments.service";

@Module({
  imports: [AssetsModule],
  controllers: [InstallmentsController],
  providers: [InstallmentsService],
  exports: [InstallmentsService],
})
export class InstallmentsModule {}
