import { Module } from "@nestjs/common";
import { AssetsModule } from "../assets/assets.module";
import { DebtsModule } from "../debts/debts.module";
import { TransactionsController } from "./transactions.controller";
import { TransactionsService } from "./transactions.service";

@Module({
  imports: [AssetsModule, DebtsModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
