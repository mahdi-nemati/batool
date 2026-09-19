import { Module } from "@nestjs/common";
import { AssetsModule } from "../assets/assets.module";
import { BankAccountsController } from "./bank-accounts.controller";
import { BankAccountsService } from "./bank-accounts.service";

@Module({
  imports: [AssetsModule],
  controllers: [BankAccountsController],
  providers: [BankAccountsService],
  exports: [BankAccountsService],
})
export class BankAccountsModule {}
