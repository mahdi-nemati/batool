import type { DebtSummaryDto } from "./debts";
import type { FinancialTransactionDto } from "./transactions";

export interface DashboardMonthOption {
  key: string;
  label: string;
}

export interface DashboardMonth {
  key: string;
  label: string;
  start: string;
  end: string;
}

export interface DashboardBalanceDto {
  id: string;
  name: string;
  balanceToman: number;
  isActive: boolean;
}

export interface DashboardExpenseCategoryDto {
  categoryId: string;
  name: string;
  amountToman: number;
  percentage: number;
}

export interface DashboardInstallmentDto {
  id: string;
  name: string;
  amountToman: number;
  nextDueDate: string;
  status: "UPCOMING" | "DUE" | "OVERDUE";
}

export interface DashboardSetarDto {
  payable: boolean;
  amountToman: number | null;
  currentCycleNo: number;
  sessionsInCurrentCycle: number;
  sessionsRemaining: number;
}

export interface DashboardSummaryDto {
  month: DashboardMonth;
  monthOptions: DashboardMonthOption[];
  balances: {
    banks: DashboardBalanceDto[];
    funds: DashboardBalanceDto[];
    totalToman: number;
  };
  quantities: {
    goldGram: string;
    usd: string;
  };
  monthly: {
    incomeToman: number;
    expenseToman: number;
    netCashFlowToman: number;
  };
  expenseCategories: DashboardExpenseCategoryDto[];
  recentTransactions: FinancialTransactionDto[];
  debtSummary: DebtSummaryDto;
  obligations: {
    installments: DashboardInstallmentDto[];
    setar: DashboardSetarDto;
  };
}
