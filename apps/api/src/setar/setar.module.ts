import { Module } from "@nestjs/common";
import { AssetsModule } from "../assets/assets.module";
import { SetarController } from "./setar.controller";
import { SetarService } from "./setar.service";

@Module({
  imports: [AssetsModule],
  controllers: [SetarController],
  providers: [SetarService],
  exports: [SetarService],
})
export class SetarModule {}
