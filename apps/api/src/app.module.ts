import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AssetsModule } from "./assets/assets.module";
import { AuthModule } from "./auth/auth.module";
import { BankAccountsModule } from "./bank-accounts/bank-accounts.module";
import { CategoriesModule } from "./categories/categories.module";
import { AuthGuard } from "./common/auth/auth.guard";
import { CounterpartiesModule } from "./counterparties/counterparties.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { DebtsModule } from "./debts/debts.module";
import { CsrfMiddleware } from "./common/auth/csrf.middleware";
import { RolesGuard } from "./common/auth/roles.guard";
import { SessionContextMiddleware } from "./common/auth/session-context.middleware";
import { ConfigModule } from "./common/config/config.module";
import { FundsModule } from "./funds/funds.module";
import { PrismaModule } from "./database/prisma.module";
import { HealthModule } from "./health/health.module";
import { InstallmentsModule } from "./installments/installments.module";
import { SetarModule } from "./setar/setar.module";
import { TransactionsModule } from "./transactions/transactions.module";
import { TransfersModule } from "./transfers/transfers.module";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuthModule,
    HealthModule,
    AssetsModule,
    BankAccountsModule,
    FundsModule,
    CategoriesModule,
    DebtsModule,
    CounterpartiesModule,
    DashboardModule,
    InstallmentsModule,
    SetarModule,
    TransactionsModule,
    TransfersModule,
  ],
  providers: [
    // Global, default-deny authorization. Public routes opt out via @Public();
    // role-restricted routes opt in via @Roles(...).
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // CSRF origin check first, then resolve the session into req.user.
    // `{*path}` is the path-to-regexp v8 catch-all (Express 5 / Nest 11).
    consumer.apply(CsrfMiddleware, SessionContextMiddleware).forRoutes("{*path}");
  }
}
