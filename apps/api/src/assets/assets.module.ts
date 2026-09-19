import { Module } from "@nestjs/common";
import { AssetsController } from "./assets.controller";
import { AssetRegistryService } from "./asset-registry.service";
import { LedgerService } from "./ledger.service";
import { WalletService } from "./wallet.service";

@Module({
  controllers: [AssetsController],
  providers: [LedgerService, WalletService, AssetRegistryService],
  exports: [LedgerService, WalletService, AssetRegistryService],
})
export class AssetsModule {}
