import { Module } from "@nestjs/common";
import { DebtsModule } from "../debts/debts.module";
import { ConnectionsController, CounterpartiesController } from "./counterparties.controller";
import { CounterpartiesService } from "./counterparties.service";

@Module({
  imports: [DebtsModule],
  controllers: [CounterpartiesController, ConnectionsController],
  providers: [CounterpartiesService],
  exports: [CounterpartiesService],
})
export class CounterpartiesModule {}
